import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Admin, Contractor
from schemas import WalletConnect, WalletVerify, NonceResponse, TokenResponse, ContractorCreate, MessageResponse
from auth import create_token, verify_signature, build_sign_message

router = APIRouter(prefix="/api/auth/wallet", tags=["Wallet Auth"])


@router.post("/connect", response_model=NonceResponse)
def wallet_connect(payload: WalletConnect, db: Session = Depends(get_db)):
    """
    Step 1 of MetaMask auth: accepts a wallet address, looks it up in
    admins and contractors tables, and returns a nonce to sign.
    """
    address = payload.wallet_address.lower()

    # Check admins first
    admin = db.query(Admin).filter(Admin.wallet_address == address).first()
    if admin:
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
    address = payload.wallet_address.lower()

    # Try admin
    admin = db.query(Admin).filter(Admin.wallet_address == address).first()
    if admin:
        message = build_sign_message(admin.nonce)
        if not verify_signature(address, message, payload.signature):
            raise HTTPException(status_code=401, detail="Signature verification failed.")

        # Rotate nonce after successful auth
        admin.nonce = secrets.token_hex(16)
        db.commit()

        token = create_token({
            "sub": admin.id,
            "role": "admin",
            "name": admin.name,
            "access_level": admin.access_level,
            "wallet": address,
        })
        return TokenResponse(
            access_token=token,
            role="admin",
            name=admin.name,
            access_level=admin.access_level,
        )

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
