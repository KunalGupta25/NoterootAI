import { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
import { useNoteStore } from '../stores/noteStore';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ZoomIn, ZoomOut, Maximize2, Info, X } from 'lucide-react';

type NodeInfo = { id: string; title: string; icon: string; parentTitle?: string; childCount: number; linkCount: number };

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const { notes } = useNoteStore();
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });

  // Build elements from local vault
  const buildElements = useCallback((): cytoscape.ElementDefinition[] => {
    const elements: cytoscape.ElementDefinition[] = [];
    const edgesAdded = new Set<string>();

    // Add central NoteRoot node
    elements.push({
      data: {
        id: '__noteroot_center__',
        label: 'NoteRoot',
        icon: '🌌',
        type: 'center',
        linkCount: 0,
      }
    });

    const depths = new Map<string, number>();
    const getDepth = (noteId: string, visited = new Set<string>()): number => {
      if (depths.has(noteId)) return depths.get(noteId)!;
      if (visited.has(noteId)) return 1;
      visited.add(noteId);
      const note = notes.find(n => n._id === noteId);
      if (!note || !note.parentId) {
        depths.set(noteId, 1);
        return 1;
      }
      const d = 1 + getDepth(note.parentId, visited);
      depths.set(noteId, d);
      return d;
    };

    notes.forEach(note => {
      // Count wiki-links this note has
      const wikiLinks = (note.content.match(/\[\[([^\]]+)\]\]/g) || []).length;
      elements.push({
        data: {
          id: note._id,
          label: note.title || 'Untitled',
          icon: note.icon || '📄',
          type: note.parentId ? 'child' : 'root',
          depth: getDepth(note._id),
          linkCount: wikiLinks,
        },
      });
    });

    notes.forEach(note => {
      // Link root pages to the central NoteRoot node
      if (!note.parentId) {
        const eid = `c___noteroot_center__${note._id}`;
        if (!edgesAdded.has(eid)) {
          edgesAdded.add(eid);
          elements.push({ data: { id: eid, source: '__noteroot_center__', target: note._id, edgeType: 'center_link' } });
        }
      }

      // Parent → child hierarchy edges (dashed)
      if (note.parentId && notes.find(n => n._id === note.parentId)) {
        const eid = `h_${note.parentId}_${note._id}`;
        if (!edgesAdded.has(eid)) {
          edgesAdded.add(eid);
          elements.push({ data: { id: eid, source: note.parentId, target: note._id, edgeType: 'hierarchy' } });
        }
      }

      // [[Wiki-link]] edges (solid)
      const wikiRegex = /\[\[([^\]]+)\]\]/g;
      let m: RegExpExecArray | null;
      while ((m = wikiRegex.exec(note.content)) !== null) {
        const targetTitle = m[1].trim().toLowerCase();
        const target = notes.find(n => n.title.toLowerCase() === targetTitle);
        if (target && target._id !== note._id) {
          const eid = `w_${note._id}_${target._id}`;
          if (!edgesAdded.has(eid)) {
            edgesAdded.add(eid);
            elements.push({ data: { id: eid, source: note._id, target: target._id, edgeType: 'wiki' } });
          }
        }
      }
    });

    return elements;
  }, [notes]);

  const initGraph = useCallback(() => {
    if (!containerRef.current) return;

    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    const elements = notes.length > 0 ? buildElements() : [
      { data: { id: '__empty__', label: 'Create your first page', type: 'root', linkCount: 0 } },
    ];

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        // ── Default node: small white dot ──
        {
          selector: 'node',
          style: {
            'background-color': '#b0b8c8',
            'border-width': 0,
            'label': 'data(label)',
            'color': '#c8cdd8',
            'font-size': '10px',
            'font-family': 'Inter, -apple-system, sans-serif',
            'font-weight': 400,
            'width': 10,
            'height': 10,
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 5,
            'text-max-width': '90px',
            'text-wrap': 'ellipsis',
            'text-background-opacity': 0,
          } as any,
        },
        // ── Root page: slightly larger, brighter (Depth 1) ──
        {
          selector: 'node[type = "root"]',
          style: {
            'background-color': '#60a5fa', // Blue
            'width': 18,
            'height': 18,
            'font-size': '11px',
            'font-weight': 600,
            'color': '#bfdbfe',
          } as any,
        },
        // ── Center node: NoteRoot ──
        {
          selector: 'node[type = "center"]',
          style: {
            'background-color': '#eab308', // Yellow
            'width': 26,
            'height': 26,
            'font-size': '15px',
            'font-weight': 700,
            'color': '#fef08a',
            'border-width': 3,
            'border-color': '#fde047',
          } as any,
        },
        // ── Center link edges ──
        {
          selector: 'edge[edgeType = "center_link"]',
          style: {
            'width': 1.5,
            'line-color': '#475569',
            'curve-style': 'bezier',
          } as any,
        },
        // ── Child / sub-page (Depth 2) ──
        {
          selector: 'node[type = "child"][depth = 2]',
          style: {
            'background-color': '#34d399', // Emerald
            'width': 12,
            'height': 12,
            'font-size': '10px',
            'color': '#a7f3d0',
          } as any,
        },
        // ── Child / sub-page (Depth >= 3) ──
        {
          selector: 'node[type = "child"][depth >= 3]',
          style: {
            'background-color': '#c084fc', // Purple
            'width': 9,
            'height': 9,
            'font-size': '9px',
            'color': '#e9d5ff',
          } as any,
        },
        // ── Selected node: accent glow ──
        {
          selector: 'node:selected',
          style: {
            'background-color': '#c9a96e',
            'border-width': 2,
            'border-color': '#e8c97e',
            'width': 20,
            'height': 20,
          } as any,
        },
        // ── Wiki-link edges: thin solid directional ──
        {
          selector: 'edge[edgeType = "wiki"]',
          style: {
            'width': 1,
            'line-color': '#3a4256',
            'target-arrow-color': '#4a5268',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.6,
            'curve-style': 'bezier',
          } as any,
        },
        // ── Hierarchy edges: very thin dashed ──
        {
          selector: 'edge[edgeType = "hierarchy"]',
          style: {
            'width': 0.8,
            'line-color': '#2d3448',
            'line-style': 'dashed',
            'line-dash-pattern': [4, 4],
            'target-arrow-color': '#2d3448',
            'target-arrow-shape': 'vee',
            'arrow-scale': 0.5,
            'curve-style': 'bezier',
          } as any,
        },
        // ── Highlighted neighbours ──
        {
          selector: 'node.highlighted',
          style: {
            'background-color': '#c9a96e',
            'color': '#f0e0b8',
            'font-size': '11px',
          } as any,
        },
        {
          selector: 'node.dimmed',
          style: {
            'background-color': '#2a2f3e',
            'color': '#3a4256',
          } as any,
        },
        {
          selector: 'edge.highlighted',
          style: { 'line-color': '#c9a96e', 'target-arrow-color': '#c9a96e', 'width': 1.5 } as any,
        },
        {
          selector: 'edge.dimmed',
          style: { 'line-color': '#1e2230', 'target-arrow-color': '#1e2230' } as any,
        },
      ],
      layout: {
        name: 'cose',
        padding: 40,
        nodeRepulsion: () => 60000,
        idealEdgeLength: () => 60,
        edgeElasticity: () => 100,
        nestingFactor: 5,
        gravity: 0.25,
        numIter: 1200,
        initialTemp: 250,
        coolingFactor: 0.96,
        minTemp: 1.0,
        animate: true,
        animationDuration: 600,
        fit: true,
      } as any,
      minZoom: 0.2,
      maxZoom: 4,
    });

    setStats({
      nodes: cyRef.current.nodes().length,
      edges: cyRef.current.edges().length,
    });

    // Pull children when dragging a parent
    let dragPos = { x: 0, y: 0 };
    
    cyRef.current.on('grab', 'node', (evt) => {
      dragPos = { ...evt.target.position() };
    });

    cyRef.current.on('drag', 'node', (evt) => {
      if (!cyRef.current) return;
      const node = evt.target;
      const pos = node.position();
      const dx = pos.x - dragPos.x;
      const dy = pos.y - dragPos.y;
      dragPos = { ...pos };

      // Recursively find all descendants through hierarchy or center links
      const getDescendants = (n: cytoscape.NodeSingular, set = new Set<cytoscape.NodeSingular>()) => {
        n.outgoers('edge[edgeType="hierarchy"], edge[edgeType="center_link"]').targets().forEach(child => {
          if (!set.has(child)) {
            set.add(child);
            getDescendants(child, set);
          }
        });
        return set;
      };

      const descendants = getDescendants(node);
      descendants.forEach(child => {
        if (!child.grabbed()) {
          const p = child.position();
          child.position({ x: p.x + dx, y: p.y + dy });
        }
      });
    });

    // Hover highlight neighbours
    cyRef.current.on('mouseover', 'node', evt => {
      if (!cyRef.current) return;
      const node = evt.target;
      const cy = cyRef.current;
      cy.elements().addClass('dimmed');
      node.removeClass('dimmed').addClass('highlighted');
      node.neighborhood().removeClass('dimmed').addClass('highlighted');
    });

    cyRef.current.on('mouseout', 'node', () => {
      cyRef.current?.elements().removeClass('dimmed highlighted');
    });

    // Single click → show info panel
    cyRef.current.on('tap', 'node', evt => {
      if (!cyRef.current) return;
      const node = evt.target;
      const nid = node.id();
      if (nid === '__empty__' || nid === '__noteroot_center__') return;
      const noteData = notes.find(n => n._id === nid);
      if (!noteData) return;
      const parent = noteData.parentId ? notes.find(n => n._id === noteData.parentId) : undefined;
      const childCount = notes.filter(n => n.parentId === nid).length;
      const linkCount = cyRef.current!.edges(`[source = "${nid}"][edgeType = "wiki"]`).length;
      setSelectedNode({
        id: nid,
        title: noteData.title,
        icon: noteData.icon || '📄',
        parentTitle: parent?.title,
        childCount,
        linkCount,
      });
    });

    // Double-click → navigate
    cyRef.current.on('dblclick', 'node', evt => {
      if (!cyRef.current) return;
      const nid = evt.target.id();
      if (nid !== '__empty__' && nid !== '__noteroot_center__') navigate(`/notes/${nid}`);
    });

    cyRef.current.on('tap', evt => {
      if (!cyRef.current) return;
      if (evt.target === cyRef.current) setSelectedNode(null);
    });
  }, [notes, navigate, buildElements]);

  useEffect(() => {
    initGraph();
    return () => {
      // Null FIRST so any in-flight animation frames see null and bail
      const cy = cyRef.current;
      cyRef.current = null;
      cy?.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div className="mono kicker">Knowledge Graph</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontFamily: 'var(--font-display)' }}>Connection Map</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
            {stats.nodes} nodes · {stats.edges} connections · Hover to highlight · Double-click to open
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => initGraph()} title="Rebuild graph" style={{ padding: '6px 10px' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.3)} title="Zoom in" style={{ padding: '6px 10px' }}>
            <ZoomIn size={14} />
          </button>
          <button onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.77)} title="Zoom out" style={{ padding: '6px 10px' }}>
            <ZoomOut size={14} />
          </button>
          <button onClick={() => cyRef.current?.fit(undefined, 40)} title="Fit screen" style={{ padding: '6px 10px' }}>
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Graph canvas */}
      <div style={{
        position: 'relative', height: '600px',
        borderRadius: '8px', overflow: 'hidden',
        border: '1px solid #1e2230',
        background: 'linear-gradient(135deg, #0d1017 0%, #111520 50%, #0d1017 100%)',
      }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: '14px', left: '14px',
          background: 'rgba(13,16,23,0.85)', border: '1px solid #1e2a3a',
          borderRadius: '8px', padding: '10px 14px', fontSize: '11px',
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{ color: '#5a6280', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', fontSize: '10px' }}>Legend</div>
          {[
            { dot: '#eab308', size: 16, label: 'NoteRoot (Center)' },
            { dot: '#60a5fa', size: 14, label: 'Root (Level 1)' },
            { dot: '#34d399', size: 10, label: 'Sub-page (Level 2)' },
            { dot: '#c084fc', size: 8,  label: 'Sub-page (Level 3+)' },
            { dot: '#c9a96e', size: 10, label: 'Selected' },
          ].map(({ dot, size, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: '#8892a4' }}>
              <div style={{ width: size, height: size, borderRadius: '50%', background: dot, flexShrink: 0 }} />
              {label}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8892a4', marginTop: '2px' }}>
            <div style={{ width: '18px', height: '1px', borderTop: '1px solid #3a4256' }} /> Wiki-link
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8892a4', marginTop: '4px' }}>
            <div style={{ width: '18px', height: '1px', borderTop: '1px dashed #2d3448' }} /> Hierarchy
          </div>
        </div>

        {/* Node info panel */}
        {selectedNode && (
          <div style={{
            position: 'absolute', top: '14px', right: '14px',
            background: 'rgba(13,16,23,0.92)', border: '1px solid #1e2a3a',
            borderRadius: '10px', padding: '14px 16px', minWidth: '200px',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>{selectedNode.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#dde3f0' }}>{selectedNode.title}</div>
                  {selectedNode.parentTitle && (
                    <div style={{ fontSize: '11px', color: '#5a6280', marginTop: '2px' }}>↳ {selectedNode.parentTitle}</div>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: '#5a6280', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#c9a96e' }}>{selectedNode.childCount}</div>
                <div style={{ fontSize: '10px', color: '#5a6280' }}>sub-pages</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#c9a96e' }}>{selectedNode.linkCount}</div>
                <div style={{ fontSize: '10px', color: '#5a6280' }}>wiki-links</div>
              </div>
            </div>
            <button
              onClick={() => navigate(`/notes/${selectedNode.id}`)}
              style={{
                width: '100%', fontSize: '12px', padding: '7px 12px',
                background: '#1e2a3a', border: '1px solid #2a3a50',
                borderRadius: '6px', color: '#c9a96e', cursor: 'pointer',
                fontFamily: 'var(--font-body)', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#243040')}
              onMouseLeave={e => (e.currentTarget.style.background = '#1e2a3a')}
            >
              Open Page →
            </button>
          </div>
        )}

        {/* Empty state */}
        {notes.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: '#3a4256', pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.4 }}>🕸️</div>
            <div style={{ fontSize: '14px' }}>Create pages and link them with [[Page Name]] to build your graph</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '12px' }}>
        <Info size={11} />
        Use [[Page Name]] in your editor to create wiki-links. Sub-pages connect via hierarchy lines.
      </div>
    </div>
  );
}
