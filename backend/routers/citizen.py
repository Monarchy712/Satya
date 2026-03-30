from fastapi import APIRouter
from schemas import AadhaarSendOTP, AadhaarVerifyOTP, TokenResponse, MessageResponse
from auth import create_token
from blockchain import contract, get_identity_hash
from fastapi import HTTPException

router = APIRouter(prefix="/api/auth/aadhaar", tags=["Citizen Auth"])

VALID_OTP = "5334"

# In-memory store of Aadhaar numbers that have "requested" an OTP
_otp_sessions: set[str] = set()


@router.post("/send-otp", response_model=MessageResponse)
def send_otp(payload: AadhaarSendOTP):
    """
    Dummy Aadhaar OTP send. 
    Now checks if the Aadhaar is banned on the blockchain BEFORE sending the OTP.
    """
    cleaned_aadhaar = payload.aadhaar_number.replace(" ", "")
    
    # 🚨 Early Blockchain Check: Is this identity already banned?
    identity_hash = get_identity_hash(cleaned_aadhaar)
    if contract:
        try:
            is_banned = contract.functions.isBanned(identity_hash).call()
            if is_banned:
                raise HTTPException(status_code=403, detail="Your identity is currently banned on the blockchain for fraudulent reporting.")
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            print(f"Blockchain check failed at send-otp: {e}")

    _otp_sessions.add(payload.aadhaar_number)
    # Mask the Aadhaar for the response
    masked = "XXXX-XXXX-" + payload.aadhaar_number[-4:]
    return MessageResponse(
        message=f"OTP sent to mobile linked with Aadhaar {masked}",
        success=True,
    )


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(payload: AadhaarVerifyOTP):
    """
    Dummy OTP verification. OTP is always 5334.
    On success, returns a JWT with role=citizen.
    """
    cleaned_aadhaar = payload.aadhaar_number.replace(" ", "")

    if cleaned_aadhaar not in _otp_sessions:
        return TokenResponse(
            access_token="",
            role="citizen",
        )

    if payload.otp != VALID_OTP:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")

    # Remove from sessions after successful verification
    _otp_sessions.discard(cleaned_aadhaar)

    # 🚨 Blockchain Check: Is this identity banned?
    # Using the unique Aadhaar number for individual banning
    identity_hash = get_identity_hash(cleaned_aadhaar)
    if contract:
        try:
            is_banned = contract.functions.isBanned(identity_hash).call()
            if is_banned:
                raise HTTPException(status_code=403, detail="Your identity is currently banned on the blockchain for fraudulent reporting.")
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            print(f"Blockchain check failed: {e}")

    token = create_token({
        "sub": cleaned_aadhaar,
        "role": "citizen",
        "aadhaar_last4": cleaned_aadhaar[-4:],
    })

    return TokenResponse(
        access_token=token,
        role="citizen",
        name=f"Citizen •••• {cleaned_aadhaar[-4:]}",
    )
