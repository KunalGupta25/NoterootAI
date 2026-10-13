from fastapi import APIRouter, Depends, HTTPException, status

from core.neo4j_driver import neo4j
from core.security import require_user_id

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("/")
@router.get("", include_in_schema=False)
async def get_graph(user_id: str = Depends(require_user_id)) -> list[dict]:
    if neo4j.driver is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Graph database unavailable")
    async with neo4j.driver.session() as session:
        result = await session.run(
            """
            MATCH (n:Note {userId: $user_id})
            OPTIONAL MATCH (n)-[r:LINKS_TO]->(m:Note)
            RETURN n, r, m
            """,
            user_id=user_id,
        )
        records = await result.data()
    nodes: dict[str, dict] = {}
    edges: list[dict] = []
    for record in records:
        node = record.get("n")
        if node:
            nodes[node["id"]] = {"data": {"id": node["id"], "label": node.get("title", "Untitled Note")}}
        target = record.get("m")
        if record.get("r") and target:
            edges.append({"data": {"id": f"{node['id']}-{target['id']}", "source": node["id"], "target": target["id"]}})
    return [*nodes.values(), *edges]
