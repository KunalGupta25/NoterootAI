from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database


def require_database() -> AsyncIOMotorDatabase:
    try:
        return get_database()
    except RuntimeError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable") from error
