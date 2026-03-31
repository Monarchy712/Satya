from fastapi import APIRouter, HTTPException
from typing import List
from blockchain import get_all_tenders_aggregated, get_tender_details
from schemas import TenderDetail, MessageResponse

router = APIRouter(prefix="/api/tenders", tags=["Tenders"])

@router.get("/list", response_model=List[TenderDetail])
def list_tenders():
    """Returns all tenders aggregated from the blockchain with full bid/milestone details."""
    try:
        data = get_all_tenders_aggregated()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch aggregated tender data: {str(e)}")

@router.get("/{address}", response_model=TenderDetail)
def get_tender(address: str):
    """Returns deep details for a single tender address."""
    try:
        data = get_tender_details(address)
        return data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Tender not found or sync failed: {str(e)}")
