import secrets
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Admin, Contractor
from schemas import WalletConnect, WalletVerify, NonceResponse, TokenResponse, ContractorCreate, MessageResponse, ContractorMetadata

from auth import create_token, verify_signature, build_sign_message
from blockchain import check_is_government, check_signatory_contracts, get_user_role_on_tender

router = APIRouter(prefix="/api/auth/wallet", tags=["Wallet Auth"])

@router.post("/connect", response_model=NonceResponse)
def wallet_connect(payload: WalletConnect, db: Session = Depends(get_db)):
    """
    Step 1: MetaMask connection. Returns a nonce for the wallet address.
    Determines role by checking:
      1. isGovernment on TenderFactory (gov/super_admin)
      2. Contractor DB registration
      3. getUserTenders + getRoleName (committee member)
    """
    address = payload.wallet_address.lower()
    
    # 1. Check if gov via Blockchain Source of Truth
    if check_is_government(address):
        admin = db.query(Admin).filter(Admin.wallet_address == address).first()
        if not admin:
            admin = Admin(wallet_address=address, name="Gov Official", access_level=0)
            db.add(admin)
            db.commit()
            db.refresh(admin)
        
        admin.nonce = secrets.token_hex(16)
        db.commit()
        return NonceResponse(nonce=admin.nonce, message=build_sign_message(admin.nonce), role="admin")

    # 2. Check registered contractors
    contractor = db.query(Contractor).filter(Contractor.wallet_address == address).first()
    if contractor:
        contractor.nonce = secrets.token_hex(16)
        db.commit()
        return NonceResponse(nonce=contractor.nonce, message=build_sign_message(contractor.nonce), role="contractor")

    # 3. Check if committee member via on-chain getUserTenders + getRoleName
    committee_tenders = check_signatory_contracts(address)
    if committee_tenders:
        # Auto-provision an admin row for the committee member so we can store nonce
        admin = db.query(Admin).filter(Admin.wallet_address == address).first()
        if not admin:
            # Fetch the actual on-chain role name for the first tender they're on
            role_name = get_user_role_on_tender(address, committee_tenders[0])
            admin = Admin(wallet_address=address, name=role_name, access_level=1)
            db.add(admin)
            db.commit()
            db.refresh(admin)
        
        admin.nonce = secrets.token_hex(16)
        db.commit()
        return NonceResponse(nonce=admin.nonce, message=build_sign_message(admin.nonce), role="committee")

    raise HTTPException(status_code=404, detail="Wallet address not registered. If you are a committee member, ensure the tender was created with your address.")


@router.post("/verify", response_model=TokenResponse)
def wallet_verify(payload: WalletVerify, db: Session = Depends(get_db)):
    """
    Step 2: Sign verification. Returns JWT and redirect path.
    """
    address = payload.wallet_address.lower()
    
    # 1. Try gov (Source of Truth: isGovernment on-chain)
    if check_is_government(address):
        admin = db.query(Admin).filter(Admin.wallet_address == address).first()
        if admin:
            if not verify_signature(address, build_sign_message(admin.nonce), payload.signature):
                raise HTTPException(status_code=401, detail="Signature verification failed.")
            
            admin.nonce = secrets.token_hex(16)
            db.commit()
            
            # Gov officials (access_level 0) get super_admin role
            token = create_token({"sub": admin.id, "role": "super_admin", "wallet": address})
            return TokenResponse(
                access_token=token, 
                role="super_admin", 
                name=admin.name, 
                access_level=0,
                redirect_path="/admin"
            )

    # 2. Contractor check
    contractor = db.query(Contractor).filter(Contractor.wallet_address == address).first()
    if contractor:
        if not verify_signature(address, build_sign_message(contractor.nonce), payload.signature):
            raise HTTPException(status_code=401, detail="Signature verification failed.")
        
        contractor.nonce = secrets.token_hex(16)
        db.commit()
        
        token = create_token({"sub": contractor.id, "role": "contractor", "wallet": address})
        return TokenResponse(
            access_token=token, 
            role="contractor", 
            name=contractor.company_name,
            redirect_path="/contractor"
        )

    # 3. Committee member (on-chain admin for a tender)
    committee_tenders = check_signatory_contracts(address)
    if committee_tenders:
        admin = db.query(Admin).filter(Admin.wallet_address == address).first()
        if admin:
            if not verify_signature(address, build_sign_message(admin.nonce), payload.signature):
                raise HTTPException(status_code=401, detail="Signature verification failed.")
            
            admin.nonce = secrets.token_hex(16)
            db.commit()

        # Get their on-chain role name for display
        role_name = get_user_role_on_tender(address, committee_tenders[0])
        
        token = create_token({"sub": address, "role": "committee", "wallet": address})
        return TokenResponse(
            access_token=token,
            role="committee",
            name=role_name,
            access_level=1,
            redirect_path="/oversight"
        )

    raise HTTPException(status_code=401, detail="Unauthorized. Wallet not linked to any on-chain role.")


# ── Contractor Management Router ──
contractor_router = APIRouter(prefix="/api/contractors", tags=["Contractor Management"])

@contractor_router.get("/list", response_model=List[ContractorMetadata])
def list_contractors(db: Session = Depends(get_db)):
    """Fetch all registered contractors."""
    return db.query(Contractor).all()

@contractor_router.post("/register", response_model=MessageResponse)
def register_contractor(payload: ContractorCreate, db: Session = Depends(get_db)):
    """Register a new contractor with wallet."""
    address = payload.wallet_address.lower()
    if db.query(Contractor).filter(Contractor.wallet_address == address).first():
        raise HTTPException(status_code=409, detail="Already registered.")
        
    contractor = Contractor(wallet_address=address, company_name=payload.company_name)
    db.add(contractor)
    db.commit()
    return MessageResponse(message="Registered successfully.", success=True)
