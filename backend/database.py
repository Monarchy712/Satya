from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DATABASE_URL

# Use psycopg (v3) driver — replace postgresql:// with postgresql+psycopg://
_url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1) if DATABASE_URL else ""

# DNS Bypass: Inject hostaddr to avoid getaddrinfo failures on restricted networks
_connect_args = {}
if "neon.tech" in _url:
    # This IP is one of the verified endpoints for ap-southeast-1.aws.neon.tech
    _connect_args["hostaddr"] = "13.228.46.236"

engine = create_engine(
    _url, 
    connect_args=_connect_args,
    pool_pre_ping=True, 
    pool_size=5, 
    max_overflow=10
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
