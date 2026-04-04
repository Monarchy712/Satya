from fastapi import APIRouter, HTTPException, Depends, Header, UploadFile, File
from pydantic import BaseModel
from typing import List
from auth import get_current_user
from config import ROBOFLOW_API_KEY, PRIVATE_KEY
from blockchain import contract, w3, account, get_identity_hash
from ml_utils import analyze_image, calculate_image_score
from database import get_db
from models import TenderMetadata
from sqlalchemy.orm import Session
import exifread
import math
import io

router = APIRouter(prefix="/api/reports", tags=["Reports"])

class ReportSubmit(BaseModel):
    contract_id: str
    cid: str
    confidence: float

class MLValidateRequest(BaseModel):
    description: str
    image_urls: list[str] = []


# Blockchain logic is now handled in blockchain.py

def get_image_gps(image_bytes):
    """Extracts GPS latitude and longitude from image EXIF data."""
    tags = exifread.process_file(io.BytesIO(image_bytes))
    
    def _to_decimal(values, ref):
        d = float(values[0].num) / float(values[0].den)
        m = float(values[1].num) / float(values[1].den)
        s = float(values[2].num) / float(values[2].den)
        decimal = d + (m / 60.0) + (s / 3600.0)
        if ref in ['S', 'W']:
            decimal = -decimal
        return decimal

    try:
        lat_ref = tags.get('GPS GPSLatitudeRef').printable
        lat_values = tags.get('GPS GPSLatitude').values
        lon_ref = tags.get('GPS GPSLongitudeRef').printable
        lon_values = tags.get('GPS GPSLongitude').values
        
        return _to_decimal(lat_values, lat_ref), _to_decimal(lon_values, lon_ref)
    except Exception:
        return None, None

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculates the Haversine distance between two points in km."""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


@router.post("/validate")
async def validate_report(
    contract_id: str = Header(None),
    files: List[UploadFile] = File(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Real ML Validation Service using Roboflow.
    Checks images for construction defects.
    If NO defects are found across any images, the user is BANNED.
    """
    if user.get("role") != "citizen":
        raise HTTPException(status_code=403, detail="Only citizens can validate reports")

    max_score = 0.0
    all_results = []
    
    # ── 1. Geo-Location Verification (Pre-ML) ──
    # We check the first image for GPS metadata and compare with tender location
    if files:
        first_file = files[0]
        content = await first_file.read()
        await first_file.seek(0) # Reset pointer for ML processing later
        
        print(f"--- GEO-LOCATION CHECK: {contract_id} ---")
        if contract_id:
            meta = db.query(TenderMetadata).filter(TenderMetadata.tender_address == contract_id.lower()).first()
            if meta:
                if meta.latitude is not None and meta.longitude is not None:
                    img_lat, img_lon = get_image_gps(content)
                    
                    if img_lat is not None and img_lon is not None:
                        dist = calculate_distance(img_lat, img_lon, meta.latitude, meta.longitude)
                        print(f"Calculated Distance: {dist:.4f} km from project site.")
                        
                        if dist > 1.0:
                            print(f"ACTION: REJECTED - Report from {dist:.2f} km is beyond 1 km radius.")
                            return {
                                "success": False,
                                "confidence": 0,
                                "message": f"Geo-verification failed: Report detected from {dist:.2f} km away. Submissions must be within 1 km of the project site."
                            }
                        else:
                            print(f"ACTION: ACCEPTED - Report from {dist:.2f} km is within range. Proceeding to ML layer.")
                    else:
                        print("ACTION: PROCEEDING - No GPS metadata found in image, skipping range check.")
                else:
                    print("ACTION: PROCEEDING - Tender has no geographical metadata on-chain.")
            else:
                print(f"ACTION: PROCEEDING - No metadata found for address {contract_id}.")
        else:
            print("ACTION: PROCEEDING - No contract address provided for verification.")
        print("------------------------------------------")

    # ── 2. ML Analysis ──
    # Process each image until we find one that passes the threshold (20)
    for file in files[:3]:
        content = await file.read()
        res = analyze_image(content)
        score = calculate_image_score(res)
        
        all_results.append({
            "filename": file.filename,
            "confidence": score / 100,
            "score": score,
            "predictions": res.get("predictions", [])
        })
        
        if score > max_score:
            max_score = score
            
        if max_score >= 20.0:
            break

    # 🚨 Automated Banning Logic
    # If score is less than 20, BAN the user on-chain.
    if max_score < 20.0:
        # Get unique identity hash from JWT
        identity_hash = get_identity_hash(user.get("sub"))
        
        try:
            print(f"FRAUD DETECTED: Score {max_score} < 20. Banning user {identity_hash.hex()}...")
            if not contract:
                raise Exception("Contract not initialized")

            ban_tx = contract.functions.banUser(identity_hash).build_transaction({
                'from': account.address,
                'nonce': w3.eth.get_transaction_count(account.address),
                'maxFeePerGas': w3.eth.gas_price * 2,
                'maxPriorityFeePerGas': w3.eth.max_priority_fee or w3.to_wei(1, 'gwei'),
            })
            ban_signed = w3.eth.account.sign_transaction(ban_tx, private_key=PRIVATE_KEY)
            ban_hash = w3.eth.send_raw_transaction(ban_signed.rawTransaction)
            w3.eth.wait_for_transaction_receipt(ban_hash)
            
            return {
                "success": False,
                "confidence": max_score,
                "message": f"AI rejected your report (Score: {max_score:.1f}/100). You have been BANNED for 30 days for fraudulent reporting.",
                "banned": True,
                "txHash": ban_hash.hex()
            }
        except Exception as e:
            print(f"Failed to ban user on-chain: {e}")
            raise HTTPException(status_code=500, detail=f"AI Validation failed. User ban attempt errored: {str(e)}")

    return {
        "success": True, 
        "score": max_score,
        "confidence": max_score / 100, 
        "message": "AI analysis complete. Construction defects detected and verified.",
        "results": all_results
    }

@router.post("/submit")
def submit_report(payload: ReportSubmit, user=Depends(get_current_user)):
    if user.get("role") != "citizen":
        raise HTTPException(status_code=403, detail="Only citizens can submit reports")
    
    aadhaar_last4 = user.get("aadhaar_last4")
    if not aadhaar_last4:
        raise HTTPException(status_code=400, detail="Missing aadhaar context")

    identity_hash = get_identity_hash(user.get("sub")) # bytes32 format for solidity


    if not w3.is_connected() or not contract:
        raise HTTPException(status_code=500, detail="Blockchain Gateway Offline")

    # 1. Check ML bans
    is_banned = contract.functions.isBanned(identity_hash).call()
    if is_banned:
        raise HTTPException(status_code=403, detail="You are currently banned from reporting.")

    # 2. Check registration and register if needed (Contract requirement)
    is_registered = contract.functions.registered(identity_hash).call()
    if not is_registered:
        print(f"Registering identity {identity_hash.hex()}...")
        reg_tx = contract.functions.registerUser(identity_hash).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'maxFeePerGas': w3.eth.gas_price * 2,
            'maxPriorityFeePerGas': w3.eth.max_priority_fee or w3.to_wei(1, 'gwei'),
        })
        reg_signed = w3.eth.account.sign_transaction(reg_tx, private_key=PRIVATE_KEY)
        reg_hash = w3.eth.send_raw_transaction(reg_signed.rawTransaction)
        w3.eth.wait_for_transaction_receipt(reg_hash)

    # 3. Check 7-day rate limit using getLatestReportTimestamp
    last_report = contract.functions.getLatestReportTimestamp(identity_hash).call()
    current_time = w3.eth.get_block('latest').timestamp
    
    limit_seconds = 7 * 24 * 60 * 60
    if last_report > 0 and (current_time - last_report) < limit_seconds:
        raise HTTPException(status_code=429, detail="Limit exceeded: Only 1 report per week allowed.")


    # 4. Process Transaction
    try:
        # Confidence score from ML is already scaled 0-100
        confidence_scaled = int(payload.confidence)
        # Ensure it stays within bounds [0, 100]
        confidence_final = max(0, min(100, confidence_scaled))
        
        tx = contract.functions.submitReport(
            payload.cid,
            identity_hash,
            confidence_final
        ).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            # EIP-1559 base fee parameters, standard on testnets
            'maxFeePerGas': w3.eth.gas_price * 2,
            'maxPriorityFeePerGas': w3.eth.max_priority_fee or w3.to_wei(1, 'gwei'),
        })

        signed_tx = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

        if receipt.status != 1:
            raise Exception("Smart contract execution failed")

        return {"success": True, "txHash": tx_hash.hex(), "cid": payload.cid}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
