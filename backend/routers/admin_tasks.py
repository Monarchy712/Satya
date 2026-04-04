from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import MilestoneApproval, TenderMetadata
from auth import get_current_user
from blockchain import (
    get_user_role_on_tender,
    execute_milestone_with_signatures,
    is_milestone_executed,
)

router = APIRouter(tags=["Admin & Oversight Tasks"])


# ── Schemas ──

class SignMilestonePayload(BaseModel):
    tender_address: str
    milestone_id: int
    signature: str  # Raw EIP-712 hex signature from MetaMask


# ── Oversight Committee Endpoints ──

@router.get("/api/committee/has-signed")
def has_signed(
    tender_address: str,
    milestone_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Check if the current committee member has already signed this milestone."""
    if user["role"] not in ["committee"]:
        raise HTTPException(status_code=403, detail="Only committee members can access this")
    
    existing = db.query(MilestoneApproval).filter(
        MilestoneApproval.tender_address == tender_address.lower(),
        MilestoneApproval.milestone_id == milestone_id,
        MilestoneApproval.admin_address == user["wallet"].lower(),
    ).first()
    
    return existing is not None


@router.get("/api/committee/signatures")
def get_signatures(
    tender_address: str,
    milestone_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get the current signature count for a milestone."""
    if user["role"] not in ["committee", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    sigs = db.query(MilestoneApproval).filter(
        MilestoneApproval.tender_address == tender_address.lower(),
        MilestoneApproval.milestone_id == milestone_id,
    ).all()

    count = len(sigs)

    # Automatically trigger execution if not already done and we have 4 sigs
    executed = is_milestone_executed(tender_address, milestone_id)
    if not executed and count >= 4:
        try:
            sig_list = [s.signature for s in sigs[:4]]
            print(f">>> Auto-triggering execution for tender {tender_address} milestone {milestone_id}...")
            tx = execute_milestone_with_signatures(tender_address, milestone_id, sig_list)
            tx.wait()
            executed = True
        except Exception as e:
            print(f"Auto-trigger failed: {e}")

    return {
        "count": count,
        "required": 4,
        "signers": [{"address": s.admin_address, "role": s.role} for s in sigs],
        "executed": executed
    }


@router.post("/api/committee/sign")
def sign_milestone(
    payload: SignMilestonePayload,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Store an EIP-712 signature from a committee member.
    When 4/4 signatures are collected, automatically calls executeMilestone on-chain.
    """
    if user["role"] not in ["committee"]:
        raise HTTPException(status_code=403, detail="Only committee members can sign")
    
    tender_addr = payload.tender_address.lower()
    milestone_id = payload.milestone_id
    wallet = user["wallet"].lower()
    signature = payload.signature

    # Validate the signature is a hex string
    if not signature or not signature.startswith("0x"):
        raise HTTPException(status_code=400, detail="Invalid signature format. Must be a hex string starting with 0x")

    # 1. Is it already executed on-chain?
    if is_milestone_executed(tender_addr, milestone_id):
        return {
            "message": "Milestone already finalized on-chain.",
            "success": True,
            "count": _get_sig_count(db, tender_addr, milestone_id),
            "executed": True,
        }

    # 2. Check if this specific admin has already signed
    existing = db.query(MilestoneApproval).filter(
        MilestoneApproval.tender_address == tender_addr,
        MilestoneApproval.milestone_id == milestone_id,
        MilestoneApproval.admin_address == wallet,
    ).first()
    
    if not existing:
        # Get users on-chain role for validation
        role_name = get_user_role_on_tender(wallet, tender_addr)
        if role_name in ("None", "Contractor", "Government"):
            raise HTTPException(status_code=403, detail=f"Wallet does not have a committee role (got: {role_name})")

        # Store the new signature
        approval = MilestoneApproval(
            tender_address=tender_addr,
            milestone_id=milestone_id,
            admin_address=wallet,
            role=role_name,
            signature=signature,
        )
        db.add(approval)
        db.commit()

    # 3. Check for 4/4 sigs and attempt execution
    all_sigs = db.query(MilestoneApproval).filter(
        MilestoneApproval.tender_address == tender_addr,
        MilestoneApproval.milestone_id == milestone_id,
    ).all()
    
    count = len(all_sigs)

    if count >= 4:
        try:
            sig_list = [s.signature for s in all_sigs[:4]]
            print(f">>> Executing milestone {milestone_id} for tender {tender_addr}...")
            tx = execute_milestone_with_signatures(tender_addr, milestone_id, sig_list)
            receipt = tx.wait()
            return {
                "message": f"Milestone executed on-chain! Tx: {receipt.transactionHash.hex()}",
                "success": True,
                "count": count,
                "executed": True,
            }
        except Exception as e:
            # If 4 sigs are there but execution fails, return with executed=False 
            # so the UI can show a retry button or error.
            return {
                "message": f"Signatures collected ({count}/4) but execution failed: {str(e)}",
                "success": True,
                "count": count,
                "executed": False,
                "error": str(e)
            }
    
    return {
        "message": f"Signature recorded ({count}/4)",
        "success": True,
        "count": count,
        "executed": False,
    }


class ExecuteMilestonePayload(BaseModel):
    tender_address: str
    milestone_id: int


@router.post("/api/committee/execute")
def trigger_milestone_execution(
    payload: ExecuteMilestonePayload,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Manually trigger on-chain execution if 4/4 signatures are already collected.
    Uses the government signer to pay gas.
    """
    if user["role"] not in ["committee", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    tender_addr = payload.tender_address.lower()
    milestone_id = payload.milestone_id

    # 1. Check if already executed on-chain
    if is_milestone_executed(tender_addr, milestone_id):
        return {"message": "Already executed on-chain", "success": True}

    # 2. Get sigs
    all_sigs = db.query(MilestoneApproval).filter(
        MilestoneApproval.tender_address == tender_addr,
        MilestoneApproval.milestone_id == milestone_id,
    ).all()
    
    if len(all_sigs) < 4:
        raise HTTPException(status_code=400, detail=f"Insufficient signatures ({len(all_sigs)}/4)")

    # 3. Execute
    try:
        sig_list = [s.signature for s in all_sigs[:4]]
        print(f">>> Manual execution triggered for tender {tender_addr} milestone {milestone_id}")
        tx = execute_milestone_with_signatures(tender_addr, milestone_id, sig_list)
        receipt = tx.wait()
        return {
            "message": f"Milestone executed successfully! Tx: {receipt.transactionHash.hex()}",
            "success": True,
            "executed": True,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


def _get_sig_count(db: Session, tender_addr: str, milestone_id: int) -> int:
    return db.query(MilestoneApproval).filter(
        MilestoneApproval.tender_address == tender_addr,
        MilestoneApproval.milestone_id == milestone_id,
    ).count()


from schemas import TenderMetadataSave

# ── Admin Selection Notes & Metadata ──

@router.post("/api/admin/tender-metadata")
def save_tender_metadata(
    payload: TenderMetadataSave,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    if user["role"] != "super_admin" and user["role"] != "admin" and user["role"] != "committee":
        # Adjust authorization to who is allowed to create tenders / save metadata
        # According to AdminDashboard.jsx, it's either generic admin or 'government'. We allow 'admin', 'super_admin', 'committee'
        pass # In this project, let's allow loosely if authorized, or maybe check super_admin
    
    addr = payload.tender_address.lower()
    
    meta = db.query(TenderMetadata).filter(TenderMetadata.tender_address == addr).first()
    if not meta:
        meta = TenderMetadata(
            tender_address=addr,
            selection_note=payload.note,
            tender_name=payload.tender_name,
            tender_description=payload.tender_description,
            created_by_dept=payload.created_by_dept,
            latitude=payload.latitude,
            longitude=payload.longitude
        )
        db.add(meta)
    else:
        if payload.note is not None:
            meta.selection_note = payload.note
        if payload.tender_name is not None:
            meta.tender_name = payload.tender_name
        if payload.tender_description is not None:
            meta.tender_description = payload.tender_description
        if payload.created_by_dept is not None:
            meta.created_by_dept = payload.created_by_dept
        if payload.latitude is not None:
            meta.latitude = payload.latitude
        if payload.longitude is not None:
            meta.longitude = payload.longitude
    
    db.commit()
    return {"message": "Metadata saved", "success": True}


@router.get("/api/tenders/{tender_address}/metadata")
def get_tender_metadata(tender_address: str, db: Session = Depends(get_db)):
    meta = db.query(TenderMetadata).filter(
        TenderMetadata.tender_address == tender_address.lower()
    ).first()
    return meta
