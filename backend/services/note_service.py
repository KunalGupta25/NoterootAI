import re
from datetime import datetime, timezone

from core.neo4j_driver import neo4j

WIKI_LINK_PATTERN = re.compile(r"\[\[(.*?)\]\]")


def now() -> datetime:
    return datetime.now(timezone.utc)


async def sync_note(note: dict, update_links: bool = False) -> None:
    if neo4j.driver is None:
        return
    async with neo4j.driver.session() as session:
        await session.run(
            "MERGE (n:Note {id: $id}) SET n.title = $title, n.userId = $user_id",
            id=note["_id"],
            title=note["title"],
            user_id=note["userId"],
        )
        if not update_links:
            return
        await session.run("MATCH (n:Note {id: $id})-[r:LINKS_TO]->() DELETE r", id=note["_id"])
        for linked_title in WIKI_LINK_PATTERN.findall(note.get("content", "")):
            title = linked_title.strip()
            if not title:
                continue
            await session.run(
                """
                MATCH (source:Note {id: $id, userId: $user_id})
                MERGE (target:Note {title: $title, userId: $user_id})
                ON CREATE SET target.id = randomUUID()
                MERGE (source)-[:LINKS_TO]->(target)
                """,
                id=note["_id"],
                user_id=note["userId"],
                title=title,
            )


async def delete_note_from_graph(note_id: str) -> None:
    if neo4j.driver is None:
        return
    async with neo4j.driver.session() as session:
        await session.run("MATCH (n:Note {id: $id}) DETACH DELETE n", id=note_id)
