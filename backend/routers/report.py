from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
import hmac
import hashlib
from passlib.context import CryptContext
from web3 import Web3
from auth import decode_token
from config import JWT_SECRET, CONTRACT_ADDRESS, RPC_URL, PRIVATE_KEY
from eth_utils import keccak

router = APIRouter(prefix="/api/reports", tags=["Reports"])

class ReportSubmit(BaseModel):
    contract_id: str
    cid: str

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

# Ethereum Contract details (from implementation.md)


ABI = [
    {
      "inputs": [{"internalType": "bytes32", "name": "identityHash", "type": "bytes32"}],
      "name": "isBanned",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
      "name": "lastReportTime",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "string", "name": "cid", "type": "string"},
        {"internalType": "bytes32", "name": "identityHash", "type": "bytes32"},
        {"internalType": "uint256", "name": "confidence", "type": "uint256"}
      ],
      "name": "submitReport",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
]

w3 = Web3(Web3.HTTPProvider(RPC_URL))
try:
    account = w3.eth.account.from_key(PRIVATE_KEY)
    contract = w3.eth.contract(address=w3.to_checksum_address(CONTRACT_ADDRESS), abi=ABI)
except Exception as e:
    print(f"Web3 Initialisation Warning: {e}")
    contract = None


@router.post("/validate")
def validate_report(payload: MLValidateRequest, user=Depends(get_current_user)):
    """
    Mock ML Validation Service.
    In the next step, the user will add a real ML server.
    For now, we return a mock confidence score.
    """
    import random
    confidence = random.uniform(0.65, 0.95)
    return {"success": True, "confidence": confidence, "message": "ML analysis complete."}

@router.post("/submit")
def submit_report(payload: ReportSubmit, user=Depends(get_current_user)):
    if user.get("role") != "citizen":
        raise HTTPException(status_code=403, detail="Only citizens can submit reports")
    
    aadhaar_last4 = user.get("aadhaar_last4")
    if not aadhaar_last4:
        raise HTTPException(status_code=400, detail="Missing aadhaar context")

    # identity_hash = hmac.new(JWT_SECRET.encode(), aadhaar_last4.encode(), hashlib.sha256).digest()
    identity_hash = keccak(text="demo-user") # bytes32 format for solidity, matching ipfs_folder/src/App.jsx for MVP


    if not w3.is_connected() or not contract:
        raise HTTPException(status_code=500, detail="Blockchain Gateway Offline")

    # 1. Check ML bans
    is_banned = contract.functions.isBanned(identity_hash).call()
    if is_banned:
        raise HTTPException(status_code=403, detail="You are currently banned from reporting.")

    # 2. Check 7-day rate limit
    last_report = contract.functions.lastReportTime(identity_hash).call()
    current_time = w3.eth.get_block('latest').timestamp
    
    limit_seconds = 7 * 24 * 60 * 60
    if last_report > 0 and (current_time - last_report) < limit_seconds:
        raise HTTPException(status_code=429, detail="Limit exceeded: Only 1 report per week allowed.")

    # 3. Process Transaction
    try:
        confidence = 80 # default for MVP as per implementation
        
        tx = contract.functions.submitReport(
            payload.cid,
            identity_hash,
            confidence
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
