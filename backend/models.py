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
    trust_score = Column(Float, default=50.0)
    nonce = Column(String, nullable=False, default=generate_nonce)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
