import hashlib
import os
from datetime import datetime, timedelta, timezone

import bcrypt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import HTTPException, Request, status
from jose import JWTError, jwt

from config import get_settings

TOKEN_EXPIRES_DAYS = 7
ALGORITHM = "HS256"


def _jwt_secret() -> str:
    settings = get_settings()
    if settings.jwt_secret:
        return settings.jwt_secret
    if settings.environment == "production":
        raise RuntimeError("JWT_SECRET must be configured in production")
    return "noteroot-dev-secret-change-me"


def create_access_token(user_id: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRES_DAYS)
    return jwt.encode({"userId": user_id, "exp": expires_at}, _jwt_secret(), algorithm=ALGORITHM)


async def require_user_id(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    token = header[7:] if header.startswith("Bearer ") else ""
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[ALGORITHM])
        user_id = payload.get("userId")
    except JWTError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from error
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return user_id


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def _encryption_key() -> bytes:
    configured = get_settings().encryption_key
    if configured:
        try:
            key = bytes.fromhex(configured)
        except ValueError as error:
            raise RuntimeError("ENCRYPTION_KEY must be hexadecimal") from error
        if len(key) != 32:
            raise RuntimeError("ENCRYPTION_KEY must contain 32 bytes encoded as hexadecimal")
        return key
    if get_settings().environment == "production":
        raise RuntimeError("ENCRYPTION_KEY must be configured in production")
    return hashlib.scrypt(b"noteroot-dev-secret-change-me", salt=b"salt", n=16384, r=8, p=1, dklen=32)


def encrypt(value: str) -> str:
    if not value:
        return value
    iv = os.urandom(16)
    encrypted = AESGCM(_encryption_key()).encrypt(iv, value.encode(), None)
    ciphertext, auth_tag = encrypted[:-16], encrypted[-16:]
    # Keep the Node.js `iv:authTag:ciphertext` format until Express is retired.
    return f"{iv.hex()}:{auth_tag.hex()}:{ciphertext.hex()}"


def decrypt(value: str) -> str:
    if not value:
        return value
    try:
        iv_hex, auth_tag_hex, ciphertext_hex = value.split(":", maxsplit=2)
        encrypted = bytes.fromhex(ciphertext_hex) + bytes.fromhex(auth_tag_hex)
        return AESGCM(_encryption_key()).decrypt(bytes.fromhex(iv_hex), encrypted, None).decode()
    except Exception:
        # Existing plain-text provider keys remain readable during migration.
        return value if ":" not in value else ""
