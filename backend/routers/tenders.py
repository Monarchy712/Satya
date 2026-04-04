from fastapi import APIRouter, HTTPException, Depends
from typing import List
from sqlalchemy.orm import Session
from database import get_db
from models import TenderMetadata
from blockchain import get_all_tenders_aggregated, get_tender_details
from schemas import TenderDetail, MessageResponse

router = APIRouter(prefix="/api/tenders", tags=["Tenders"])

@router.get("/list", response_model=List[TenderDetail])
def list_tenders(db: Session = Depends(get_db)):
    """Returns all tenders aggregated from the blockchain with full bid/milestone details and db metadata."""
    try:
        data = get_all_tenders_aggregated()
        
        # Merge DB Metadata
        for td in data:
            meta = db.query(TenderMetadata).filter(TenderMetadata.tender_address == td["tender_address"].lower()).first()
            if meta:
                td["tender_name"] = meta.tender_name
                td["tender_description"] = meta.tender_description
                td["created_by_dept"] = meta.created_by_dept
                td["selection_note"] = meta.selection_note
            else:
                td["tender_name"] = None
                td["tender_description"] = None
                td["created_by_dept"] = None
                td["selection_note"] = None

        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch aggregated tender data: {str(e)}")

@router.get("/{address}", response_model=TenderDetail)
def get_tender(address: str, db: Session = Depends(get_db)):
    """Returns deep details for a single tender address."""
    try:
        data = get_tender_details(address)
        meta = db.query(TenderMetadata).filter(TenderMetadata.tender_address == address.lower()).first()
        if meta:
            data["tender_name"] = meta.tender_name
            data["tender_description"] = meta.tender_description
            data["created_by_dept"] = meta.created_by_dept
            data["selection_note"] = meta.selection_note
        else:
            data["tender_name"] = None
            data["tender_description"] = None
            data["created_by_dept"] = None
            data["selection_note"] = None
        return data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Tender not found or sync failed: {str(e)}")
