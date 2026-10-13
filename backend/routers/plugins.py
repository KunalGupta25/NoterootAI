from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from core.dependencies import require_database
from core.security import require_user_id
from schemas.plugins import PluginPublishRequest

router = APIRouter(prefix="/api/plugins", tags=["plugins"])


def serialize_plugin(plugin: dict, include_code: bool) -> dict:
    item = dict(plugin)
    item.pop("_id", None)
    if not include_code:
        item.pop("code", None)
    return item


@router.get("/market")
async def list_plugins(
    _: str = Depends(require_user_id),
    database: AsyncIOMotorDatabase = Depends(require_database),
) -> list[dict]:
    plugins = await database.marketplaceplugins.find({}).sort([("downloads", -1), ("createdAt", -1)]).to_list(length=None)
    return [serialize_plugin(plugin, include_code=False) for plugin in plugins]


@router.get("/market/{plugin_id}")
async def download_plugin(
    plugin_id: str,
    _: str = Depends(require_user_id),
    database: AsyncIOMotorDatabase = Depends(require_database),
) -> dict:
    plugin = await database.marketplaceplugins.find_one_and_update(
        {"pluginId": plugin_id},
        {"$inc": {"downloads": 1}},
        return_document=ReturnDocument.AFTER,
    )
    if not plugin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plugin not found")
    return serialize_plugin(plugin, include_code=True)


@router.post("/publish")
async def publish_plugin(
    payload: PluginPublishRequest,
    _: str = Depends(require_user_id),
    database: AsyncIOMotorDatabase = Depends(require_database),
) -> dict:
    values = payload.model_dump(by_alias=True)
    existing = await database.marketplaceplugins.find_one({"pluginId": values["pluginId"]})
    if existing:
        if existing.get("author") != values["author"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"A plugin with ID '{values['pluginId']}' already exists and is owned by a different author.",
            )
        values["downloads"] = existing.get("downloads", 0)
        values["createdAt"] = existing.get("createdAt")
        values["updatedAt"] = datetime.now(timezone.utc)
        await database.marketplaceplugins.replace_one({"pluginId": values["pluginId"]}, values)
        return serialize_plugin(values, include_code=True)

    values.update({"downloads": 0, "createdAt": datetime.now(timezone.utc), "updatedAt": datetime.now(timezone.utc)})
    try:
        await database.marketplaceplugins.insert_one(values)
    except Exception as error:
        if "duplicate key" in str(error).lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A plugin with this ID already exists.") from error
        raise
    return serialize_plugin(values, include_code=True)
