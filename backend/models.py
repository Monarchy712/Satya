import uuid
import secrets
from sqlalchemy import Column, String, Integer, Float, DateTime, func
from database import Base


def generate_nonce():
    return secrets.token_hex(16)


class Admin(Base):
    __tablename__ = "admins"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    wallet_address = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    access_level = Column(Integer, nullable=False)  # 1-5
    nonce = Column(String, nullable=False, default=generate_nonce)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    wallet_address = Column(String, unique=True, nullable=False, index=True)
    company_name = Column(String, nullable=False)
    registration_id = Column(String, unique=True, nullable=True)
    specialty = Column(String, nullable=True)
    license_no = Column(String, nullable=True)
    location = Column(String, nullable=True)
    trust_score = Column(Float, default=50.0)
    nonce = Column(String, nullable=False, default=generate_nonce)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TenderMetadata(Base):
    __tablename__ = "tender_metadata"

    tender_address = Column(String, primary_key=True)
    selection_note = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MilestoneApproval(Base):
    __tablename__ = "milestone_approvals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tender_address = Column(String, nullable=False, index=True)
    milestone_id = Column(Integer, nullable=False)
    admin_address = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Engineer, Compliance, Auditor, Authority
    signed_at = Column(DateTime(timezone=True), server_default=func.now())

