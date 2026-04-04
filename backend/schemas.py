from pydantic import BaseModel, field_validator
from typing import Optional, List
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
    name: str
    access_level: int = 0
    redirect_path: str = "/"


class NonceResponse(BaseModel):
    nonce: str
    message: str
    role: str


class MessageResponse(BaseModel):
    message: str
    success: bool = True


# ── Tender Data (Aggregated from Blockchain) ──

class BidData(BaseModel):
    bidder: str
    amount: str


class MilestoneData(BaseModel):
    name: str
    percentage: int
    deadline: int
    status: int
    signatures_collected: int
    is_executed: bool


class TenderDetail(BaseModel):
    tender_address: str
    status: str
    contractor: str
    start_time: int
    end_time: int
    bidding_end_time: int
    winning_bid: str
    retained_percent: int
    current_milestone: int
    on_site_engineer: str
    compliance_officer: str
    financial_auditor: str
    sanctioning_authority: str
    bids: List[BidData]
    milestones: List[MilestoneData]
    tender_name: Optional[str] = None
    tender_description: Optional[str] = None
    created_by_dept: Optional[str] = None
    selection_note: Optional[str] = None

class TenderMetadataSave(BaseModel):
    tender_address: str
    tender_name: Optional[str] = None
    tender_description: Optional[str] = None
    created_by_dept: Optional[str] = None
    note: Optional[str] = None

# ── Contractor Registration ──

class ContractorMetadata(BaseModel):
    registration_id: Optional[str]
    specialty: Optional[str]
    license_no: Optional[str]
    location: Optional[str]
    trust_score: float


class ContractorCreate(BaseModel):
    wallet_address: str
    company_name: str

    @field_validator("wallet_address")
    @classmethod
    def validate_address(cls, v):
        if not re.match(r"^0x[a-fA-F0-9]{40}$", v):
            raise ValueError("Invalid Ethereum wallet address")
        return v.lower()
