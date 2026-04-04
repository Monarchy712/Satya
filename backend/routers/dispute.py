from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user
from blockchain import get_tender_details, w3, TENDER_ABI

router = APIRouter(prefix="/api/dispute", tags=["Dispute"])

class RaiseDisputePayload(BaseModel):
    tender_address: str
    milestone_id: int
    reason: str

class VotePayload(BaseModel):
    tender_address: str
    support_government: bool

# Providing GET for disputes is easy via get_tender_details
@router.get("/{tender_address}")
def api_get_dispute(tender_address: str):
    details = get_tender_details(tender_address)
    if not details or "dispute" not in details:
        raise HTTPException(status_code=404, detail="Tender or dispute not found")
    
    # We should get the full voters list and hasVoted state directly if needed
    try:
        tender_contract = w3.eth.contract(address=w3.to_checksum_address(tender_address), abi=TENDER_ABI)
        disp = tender_contract.functions.dispute().call()
        # To find voters, unfortunately the contract might not have `getVoters()` exposed over RPC easily as it's an array without a direct getter.
        # However, we can read voters from the contract if a getter exists.
        # Since voters are an array, and there isn't a direct getVoters(), we will rely on frontend/Ethers to loop and fetch voters if it needs to.
        return {
            "dispute": details["dispute"],
            # voters will be fetched via events or direct mapping in frontend
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

