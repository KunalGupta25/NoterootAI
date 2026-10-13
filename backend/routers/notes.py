from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.dependencies import require_database
from core.security import require_user_id
from schemas.notes import NotePayload
from services.note_service import delete_note_from_graph, now, sync_note

router = APIRouter(prefix="/api/notes", tags=["notes"])


def public_note(note: dict) -> dict:
    note = dict(note)
    note["_id"] = str(note["_id"])
    return note


@router.post("/", status_code=status.HTTP_201_CREATED)
@router.post("", status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_note(
    payload: NotePayload,
    database: AsyncIOMotorDatabase = Depends(require_database),
    user_id: str = Depends(require_user_id),
) -> dict:
    note = payload.model_dump(by_alias=True, exclude={"_id"})
    note_id = payload.note_id or str(uuid4())
    note.update({"_id": note_id, "userId": user_id, "createdAt": now(), "updatedAt": now(), "backlinks": []})
    try:
        await database.notes.insert_one(note)
    except Exception as error:
        if "duplicate key" in str(error).lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A note with this ID already exists") from error
        raise
    await sync_note(note)
    return public_note(note)


@router.get("/")
@router.get("", include_in_schema=False)
async def get_notes(
    database: AsyncIOMotorDatabase = Depends(require_database),
    user_id: str = Depends(require_user_id),
) -> list[dict]:
    notes = await database.notes.find({"userId": user_id}).sort("updatedAt", -1).to_list(length=None)
    return [public_note(note) for note in notes]


@router.get("/{note_id}")
async def get_note(
    note_id: str,
    database: AsyncIOMotorDatabase = Depends(require_database),
    user_id: str = Depends(require_user_id),
) -> dict:
    note = await database.notes.find_one({"_id": note_id, "userId": user_id})
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return public_note(note)


@router.put("/{note_id}")
async def update_note(
    note_id: str,
    payload: NotePayload,
    database: AsyncIOMotorDatabase = Depends(require_database),
    user_id: str = Depends(require_user_id),
) -> dict:
    existing = await database.notes.find_one({"_id": note_id})
    if existing and existing.get("userId") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to update this note")
    note = payload.model_dump(by_alias=True, exclude={"_id"})
    note.update({"_id": note_id, "userId": user_id, "updatedAt": now()})
    if existing:
        note["createdAt"] = existing.get("createdAt", now())
        note["backlinks"] = existing.get("backlinks", [])
    else:
        note.update({"createdAt": now(), "backlinks": []})
    await database.notes.replace_one({"_id": note_id}, note, upsert=True)
    await sync_note(note, update_links=True)
    return public_note(note)


@router.delete("/{note_id}", status_code=status.HTTP_200_OK)
async def delete_note(
    note_id: str,
    database: AsyncIOMotorDatabase = Depends(require_database),
    user_id: str = Depends(require_user_id),
) -> dict[str, str]:
    result = await database.notes.delete_one({"_id": note_id, "userId": user_id})
    if not result.deleted_count:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    await delete_note_from_graph(note_id)
    return {"message": "Note deleted"}
