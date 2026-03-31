from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from auth import decode_token
from config import JWT_SECRET, ROBOFLOW_API_KEY, PRIVATE_KEY
from blockchain import contract, w3, account, get_identity_hash
from ml_utils import analyze_image, get_average_confidence
from fastapi import UploadFile, File
from typing import List

router = APIRouter(prefix="/api/reports", tags=["Reports"])

class ReportSubmit(BaseModel):
    contract_id: str
    cid: str
    confidence: float

class MLValidateRequest(BaseModel):
    description: str
    image_urls: list[str] = []


def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload

# Blockchain logic is now handled in blockchain.py


@router.post("/validate")
async def validate_report(
    files: List[UploadFile] = File(...),
    user=Depends(get_current_user)
):
    """
    Real ML Validation Service using Roboflow.
    Checks images for construction defects.
    If NO defects are found across any images, the user is BANNED.
    """
    if user.get("role") != "citizen":
        raise HTTPException(status_code=403, detail="Only citizens can validate reports")

    best_score = 0.0
    all_results = []
    
    # Process each image, calculating average confidence for each
    for file in files[:3]:
        content = await file.read()
        res = analyze_image(content)
        avg_conf = get_average_confidence(res)
        score = avg_conf * 100
        
        all_results.append({
            "filename": file.filename,
            "confidence": avg_conf,
            "score": score,
            "predictions": res.get("predictions", [])
        })
        
        if score > best_score:
            best_score = score
            
        if best_score >= 30:
            break


    # 🚨 Automated Banning Logic (User Requirement)
    # If no defects detected (best_score < 30), BAN the user on-chain.
    if best_score < 30:
        # Get unique identity hash from JWT
        identity_hash = get_identity_hash(user.get("sub"))
        
        try:
            print(f"FRAUD DETECTED: Score {best_score} < 30. Banning user {identity_hash.hex()}...")
            # We need to ensure account/contract are initialized (handled globally in this file)
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
                "score": best_score,
                "message": f"AI rejected your report with a score of {round(best_score, 1)}. Threshold is 30. You have been BANNED for 30 days for fraudulent reporting.",
                "banned": True,
                "txHash": ban_hash.hex()
            }
        except Exception as e:
            print(f"Failed to ban user on-chain: {e}")
            raise HTTPException(status_code=500, detail=f"AI Validation failed. User ban attempt errored: {str(e)}")

    return {
        "success": True, 
        "score": best_score,
        "confidence": best_score / 100, # for compatibility
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

    # identity_hash = hmac.new(JWT_SECRET.encode(), aadhaar_last4.encode(), hashlib.sha256).digest()
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
        # Scale 0-1 confidence from ML to 0-100 for Blockchain
        confidence_scaled = int(payload.confidence * 100)
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
