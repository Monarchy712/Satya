from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Contractor, MilestoneApproval, TenderMetadata
from auth import get_current_user
from blockchain import get_tender_contract, get_government_signer, FACTORY_ADDRESS
import json

router = APIRouter(tags=["Admin & Oversight Tasks"])

# ── Oversight Committee ──

@router.get("/api/committee/has-signed")
def has_signed(tender_address: str, milestone_id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """Check if the current committee member has already signed this milestone."""
    if user["role"] not in ["committee", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = db.query(MilestoneApproval).filter(
        MilestoneApproval.tender_address == tender_address,
        MilestoneApproval.milestone_id == milestone_id,
        MilestoneApproval.admin_address == user["wallet"].lower()
    ).first()
    
    return existing is not None

@router.post("/api/committee/sign")
def sign_milestone(payload: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """Record a signature from a committee member. Trigger on-chain evaluation if 4/4 reached."""
    if user["role"] not in ["committee", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    tender_addr = payload["tender_address"].lower()
    milestone_id = payload["milestone_id"]
    
    # 1. Record the signature
    existing = db.query(MilestoneApproval).filter(
        MilestoneApproval.tender_address == tender_addr,
        MilestoneApproval.milestone_id == milestone_id,
        MilestoneApproval.admin_address == user["wallet"].lower()
    ).first()
    
    if existing:
        return {"message": "Already signed", "success": True}
    
    # In a real app, we'd verify which role the user has on-chain
    # For now, we'll assign a generic role based on order or just 'Member'
    new_sig = MilestoneApproval(
        tender_address=tender_addr,
        milestone_id=milestone_id,
        admin_address=user["wallet"].lower(),
        role="Member"
    )
    db.add(new_sig)
    db.commit()
    
    # 2. Check if 4/4 reached
    signatures = db.query(MilestoneApproval).filter(
        MilestoneApproval.tender_address == tender_addr,
        MilestoneApproval.milestone_id == milestone_id
    ).all()
    
    if len(signatures) >= 4:
        # TRIGGER BLOCKCHAIN EVALUATION
        try:
            print(f">>> 4/4 Signatures reached for Tender {tender_addr} Milestone {milestone_id}! Triggering on-chain evaluation...")
            tender = get_tender_contract(tender_addr, get_government_signer())
            
            # For simplicity, we auto-approve at 100% since 4 committee members signed
            tx = tender.evaluateMilestone(milestone_id, 100)
            receipt = tx.wait()
            return {"message": f"Milestone finalized on-chain! Tx: {receipt.hash}", "success": True}
        except Exception as e:
            print(f"CRITICAL: Failed to relay on-chain evaluation: {e}")
            raise HTTPException(status_code=500, detail=str(e))
            
    return {"message": f"Signature recorded ({len(signatures)}/4)", "success": True}

# ── Contractor ──

@router.post("/api/contractor/apply-milestone")
def apply_milestone(payload: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """Allow a contractor to signal that a milestone is ready for review."""
    if user["role"] != "contractor":
        raise HTTPException(status_code=403, detail="Only contractors can apply for review")
    
    tender_addr = payload["tender_address"].lower()
    milestone_id = payload["milestone_id"]
    
    try:
        tender = get_tender_contract(tender_addr, get_government_signer())
        # We call submitWorkForReview on behalf of the contractor 
        # (since current contract logic is onlyGovernment)
        tx = tender.submitWorkForReview(milestone_id)
        tx.wait()
        return {"message": "Project submitted for oversight committee review", "success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Admin Selection Notes ──

@router.post("/api/admin/tender-note")
def save_tender_note(payload: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    addr = payload["tender_address"].lower()
    note = payload["note"]
    
    meta = db.query(TenderMetadata).filter(TenderMetadata.tender_address == addr).first()
    if not meta:
        meta = TenderMetadata(tender_address=addr, selection_note=note)
        db.add(meta)
    else:
        meta.selection_note = note
    
    db.commit()
    return {"message": "Note saved", "success": True}

@router.get("/api/tenders/{tender_address}/metadata")
def get_tender_metadata(tender_address: str, db: Session = Depends(get_db)):
    meta = db.query(TenderMetadata).filter(TenderMetadata.tender_address == tender_address.lower()).first()
    return meta
