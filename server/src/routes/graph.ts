import { Router, Response } from 'express';
import { getSession } from '../neo4j';
import { AuthRequest, requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (n:Note {userId: $userId})
      OPTIONAL MATCH (n)-[r:LINKS_TO]->(m:Note)
      RETURN n, r, m
    `, { userId: req.userId });

    const nodesMap = new Map();
    const edges: any[] = [];

    result.records.forEach((record: any) => {
      const n = record.get('n');
      if (n) {
        nodesMap.set(n.properties.id, {
          data: { id: n.properties.id, label: n.properties.title }
        });
      }

      const r = record.get('r');
      const m = record.get('m');
      
      if (r && m) {
        edges.push({
          data: {
            id: `${n.properties.id}-${m.properties.id}`,
            source: n.properties.id,
            target: m.properties.id
          }
        });
      }
    });

    const elements = [
      ...Array.from(nodesMap.values()),
      ...edges
    ];

    res.json(elements);
  } catch (error) {
    console.error('Failed to fetch graph', error);
    res.status(500).json({ error: 'Failed to fetch graph data' });
  } finally {
    await session.close();
  }
});

export default router;
