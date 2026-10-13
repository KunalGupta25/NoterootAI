from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.dependencies import require_database
from core.security import create_access_token, decrypt, encrypt, hash_password, require_user_id, verify_password
from schemas.auth import Credentials, LoginCredentials, SettingsUpdate

router = APIRouter(prefix="/api/auth", tags=["auth"])


def public_user(user: dict) -> dict[str, str]:
    return {"id": str(user["_id"]), "name": user["name"], "email": user["email"]}


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(payload: Credentials, database: AsyncIOMotorDatabase = Depends(require_database)) -> dict:
    name = payload.name.strip()
    email = str(payload.email).lower()
    if not name or len(payload.password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name, valid email, and 8+ character password are required")
    if await database.users.find_one({"email": email}, {"_id": 1}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    user = {
        "_id": str(uuid4()),
        "name": name,
        "email": email,
        "passwordHash": hash_password(payload.password),
        "providerKeys": {},
        "customProviders": [],
        "pluginSettings": {},
        "installedCommunityPlugins": [],
        "theme": "dark",
        "activeProvider": "gemini",
    }
    try:
        await database.users.insert_one(user)
    except Exception as error:
        if "duplicate key" in str(error).lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists") from error
        raise
    return {"token": create_access_token(user["_id"]), "user": public_user(user)}


@router.post("/login")
async def login(payload: LoginCredentials, database: AsyncIOMotorDatabase = Depends(require_database)) -> dict:
    user = await database.users.find_one({"email": str(payload.email).lower()})
    if not user or not verify_password(payload.password, user["passwordHash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return {"token": create_access_token(str(user["_id"])), "user": public_user(user)}


@router.get("/me")
async def me(user_id: str = Depends(require_user_id), database: AsyncIOMotorDatabase = Depends(require_database)) -> dict:
    user = await database.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"user": public_user(user)}


@router.get("/settings")
async def get_settings(user_id: str = Depends(require_user_id), database: AsyncIOMotorDatabase = Depends(require_database)) -> dict:
    user = await database.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    provider_keys = {provider: decrypt(key) for provider, key in user.get("providerKeys", {}).items()}
    custom_providers = []
    for provider in user.get("customProviders", []):
        item = dict(provider)
        item["apiKey"] = decrypt(item.get("apiKey", ""))
        custom_providers.append(item)
    return {
        "theme": user.get("theme", "dark"),
        "activeProvider": user.get("activeProvider", "gemini"),
        "providerKeys": provider_keys,
        "customProviders": custom_providers,
        "pluginSettings": user.get("pluginSettings", {}),
        "installedCommunityPlugins": user.get("installedCommunityPlugins", []),
    }


@router.put("/settings")
async def update_settings(
    payload: SettingsUpdate,
    user_id: str = Depends(require_user_id),
    database: AsyncIOMotorDatabase = Depends(require_database),
) -> dict[str, bool]:
    updates = payload.model_dump(exclude_unset=True, by_alias=True)
    if "providerKeys" in updates and updates["providerKeys"] is not None:
        updates["providerKeys"] = {provider: encrypt(value) for provider, value in updates["providerKeys"].items()}
    if "customProviders" in updates and updates["customProviders"] is not None:
        protected_providers = []
        for provider in updates["customProviders"]:
            item = dict(provider)
            if item.get("apiKey"):
                item["apiKey"] = encrypt(str(item["apiKey"]))
            protected_providers.append(item)
        updates["customProviders"] = protected_providers
    result = await database.users.update_one({"_id": user_id}, {"$set": updates})
    if not result.matched_count:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"success": True}
