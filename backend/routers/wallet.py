import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Admin, Contractor
from schemas import WalletConnect, WalletVerify, NonceResponse, TokenResponse, ContractorCreate, MessageResponse
from auth import create_token, verify_signature, build_sign_message
from blockchain import check_is_government

router = APIRouter(prefix="/api/auth/wallet", tags=["Wallet Auth"])


@router.post("/connect", response_model=NonceResponse)
def wallet_connect(payload: WalletConnect, db: Session = Depends(get_db)):
    """
    Step 1 of MetaMask auth: accepts a wallet address, looks it up in
    admins and contractors tables, and returns a nonce to sign.
    """
    address = payload.wallet_address.lower()

    # Check admins first via Blockchain Source of Truth
    is_gov = check_is_government(address)
    if is_gov:
        # Upsert admin local presence solely to store the nonce logic securely
        admin = db.query(Admin).filter(Admin.wallet_address == address).first()
        if not admin:
            admin = Admin(wallet_address=address, name="Government Admin", access_level=0)
            db.add(admin)
            db.commit()
            db.refresh(admin)

        # Rotate nonce for security
        admin.nonce = secrets.token_hex(16)
        db.commit()
        return NonceResponse(
            nonce=admin.nonce,
            message=build_sign_message(admin.nonce),
            role="admin",
        )

    # Check contractors
    contractor = db.query(Contractor).filter(Contractor.wallet_address == address).first()
    if contractor:
        contractor.nonce = secrets.token_hex(16)
        db.commit()
        return NonceResponse(
            nonce=contractor.nonce,
            message=build_sign_message(contractor.nonce),
            role="contractor",
        )

    raise HTTPException(
        status_code=404,
        detail="Wallet address not registered. Contact an administrator.",
    )


@router.post("/verify", response_model=TokenResponse)
def wallet_verify(payload: WalletVerify, db: Session = Depends(get_db)):
    """
    Step 2 of MetaMask auth: verifies the signature against the nonce
    and issues a JWT if valid.
    """
    # Try admin / committee via Blockchain
    if check_is_government(address):
        # Super Admin check
        admin = db.query(Admin).filter(Admin.wallet_address == address).first()
        # Super Admin check - we look for them in our local DB to confirm access_level
        admin = db.query(Admin).filter(Admin.wallet_address == address).first()
        
        # If is_gov but not in local Admin table, we'll treat as 'committee' member
        is_super_admin = admin and admin.access_level == 0
        role = "super_admin" if is_super_admin else "committee"
        redirect_path = "/admin" if is_super_admin else "/oversight"
        
        # We need a nonce to verify signature. If they're not in the table, 
        # the 'connect' step should have added them. 
        if admin:
            message = build_sign_message(admin.nonce)
            if not verify_signature(address, message, payload.signature):
                raise HTTPException(status_code=401, detail="Signature verification failed.")
            
            admin.nonce = secrets.token_hex(16)
            db.commit()

            token = create_token({
                "sub": admin.id,
                "role": role,
                "name": admin.name,
                "access_level": admin.access_level,
                "wallet": address,
            })
            return TokenResponse(
                access_token=token,
                role=role,
                name=admin.name,
                access_level=admin.access_level,
                redirect_path=redirect_path
            )
        else:
            # Handle committee members who logged in but aren't in 'admins' table
            # connect() upserts them, so this shouldn't happen unless DB sync issue.
            raise HTTPException(status_code=401, detail="Admin session not initialized. Re-connect wallet.")

    # Try contractor
    contractor = db.query(Contractor).filter(Contractor.wallet_address == address).first()
    if contractor:
        message = build_sign_message(contractor.nonce)
        if not verify_signature(address, message, payload.signature):
            raise HTTPException(status_code=401, detail="Signature verification failed.")

        contractor.nonce = secrets.token_hex(16)
        db.commit()

        token = create_token({
            "sub": contractor.id,
            "role": "contractor",
            "name": contractor.company_name,
            "wallet": address,
        })
        return TokenResponse(
            access_token=token,
            role="contractor",
            name=contractor.company_name,
            redirect_path="/contractor"
        )

    raise HTTPException(status_code=404, detail="Wallet address not registered.")


# ── Contractor Registration (simple endpoint) ──

contractor_router = APIRouter(prefix="/api/contractors", tags=["Contractor Management"])


@contractor_router.post("/register", response_model=MessageResponse)
def register_contractor(payload: ContractorCreate, db: Session = Depends(get_db)):
    """Register a new contractor with wallet address and company name."""
    address = payload.wallet_address.lower()

    # Check if already exists
    existing = db.query(Contractor).filter(Contractor.wallet_address == address).first()
    if existing:
        raise HTTPException(status_code=409, detail="Wallet address already registered as a contractor.")

    # Also check admin table
    admin_exists = db.query(Admin).filter(Admin.wallet_address == address).first()
    if admin_exists:
        raise HTTPException(status_code=409, detail="Wallet address is registered as an admin.")

    contractor = Contractor(
        wallet_address=address,
        company_name=payload.company_name,
    )
    db.add(contractor)
    db.commit()

    return MessageResponse(
        message=f"Contractor '{payload.company_name}' registered successfully.",
        success=True,
    )


@contractor_router.get("/list")
def list_contractors(db: Session = Depends(get_db)):
    """List all registered contractors."""
    contractors = db.query(Contractor).all()
    return [
        {
            "id": c.id,
            "wallet_address": c.wallet_address,
            "company_name": c.company_name,
            "trust_score": c.trust_score,
            "created_at": str(c.created_at) if c.created_at else None,
        }
        for c in contractors
    ]
