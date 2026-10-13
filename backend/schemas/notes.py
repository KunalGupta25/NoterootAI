from typing import Any

from pydantic import BaseModel, Field


class NotePayload(BaseModel):
    note_id: str | None = Field(default=None, alias="_id")
    title: str = "Untitled Note"
    content: str = ""
    tags: list[str] = Field(default_factory=list)
    parent_id: str | None = Field(default=None, alias="parentId")
    icon: str = "📄"
    properties: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}
