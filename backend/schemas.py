from pydantic import BaseModel, field_validator
from typing import Optional
import re


# ── Aadhaar (Citizen) ──

class AadhaarSendOTP(BaseModel):
    aadhaar_number: str

    @field_validator("aadhaar_number")
    @classmethod
    def validate_aadhaar(cls, v):
        cleaned = re.sub(r"\s+", "", v)
        if not re.match(r"^\d{12}$", cleaned):
            raise ValueError("Aadhaar number must be exactly 12 digits")
        return cleaned


class AadhaarVerifyOTP(BaseModel):
    aadhaar_number: str
    otp: str


# ── Wallet (Admin / Contractor) ──

class WalletConnect(BaseModel):
    wallet_address: str

    @field_validator("wallet_address")
    @classmethod
    def validate_address(cls, v):
        if not re.match(r"^0x[a-fA-F0-9]{40}$", v):
            raise ValueError("Invalid Ethereum wallet address")
        return v.lower()


class WalletVerify(BaseModel):
    wallet_address: str
    signature: str

    @field_validator("wallet_address")
    @classmethod
    def validate_address(cls, v):
        return v.lower()


# ── Responses ──

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: Optional[str] = None
    access_level: Optional[int] = None


class NonceResponse(BaseModel):
    nonce: str
    message: str
    role: str


class MessageResponse(BaseModel):
    message: str
    success: bool = True


# ── Contractor Registration ──

class ContractorCreate(BaseModel):
    wallet_address: str
    company_name: str

    @field_validator("wallet_address")
    @classmethod
    def validate_address(cls, v):
        if not re.match(r"^0x[a-fA-F0-9]{40}$", v):
            raise ValueError("Invalid Ethereum wallet address")
        return v.lower()
