from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from eth_account.messages import encode_defunct
from eth_account import Account
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_MINUTES


def create_token(data: dict) -> str:
    """Create a JWT token with expiry."""
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRY_MINUTES)
    payload["iat"] = datetime.now(timezone.utc)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    """Decode and verify a JWT token."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None


def verify_signature(wallet_address: str, message: str, signature: str) -> bool:
    """
    Verify that a MetaMask signature was produced by the claimed wallet address.
    Returns True if the recovered signer matches the wallet_address.
    """
    try:
        msg = encode_defunct(text=message)
        recovered = Account.recover_message(msg, signature=signature)
        return recovered.lower() == wallet_address.lower()
    except Exception:
        return False


def build_sign_message(nonce: str) -> str:
    """Build the human-readable message that MetaMask will display for signing."""
    return (
        f"Welcome to Satya Sentinel!\n\n"
        f"Sign this message to verify your identity.\n\n"
        f"Nonce: {nonce}\n"
        f"This signature will not trigger a blockchain transaction."
    )
