import { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
import { useNoteStore } from '../stores/noteStore';
import { useNavigate } from 'react-router-dom';
import {
  Network, Search, ZoomIn, ZoomOut, RotateCcw,
  Maximize2, BookOpen, Plus, LayoutGrid,
  CircleDot, GitFork
} from 'lucide-react';
import { TUTORIAL_NOTE_CONTENT } from '../components/Onboarding/OnboardingModal';

type LayoutMode = 'cose' | 'concentric' | 'breadthfirst';

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const { notes, saveNote } = useNoteStore();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('cose');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);

  // Build real elements from user's vault notes
  const buildElements = useCallback((): cytoscape.ElementDefinition[] => {
    const elements: cytoscape.ElementDefinition[] = [];
    const edgeSet = new Set<string>();

    const colorPalette = [
      '#e05438', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#06b6d4'
    ];

    // Add nodes for every real note
    notes.forEach((note, idx) => {
      const color = colorPalette[idx % colorPalette.length];
      elements.push({
        data: {
          id: note._id,
          label: note.title || 'Untitled',
          icon: note.icon || '📄',
          color,
          parentId: note.parentId,
        },
      });
    });

    // 1. Hierarchy edges (Parent -> Child sub-pages)
    notes.forEach(note => {
      if (note.parentId && notes.some(p => p._id === note.parentId)) {
        const edgeId = `hier_${note.parentId}_${note._id}`;
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          elements.push({
            data: {
              id: edgeId,
              source: note.parentId,
              target: note._id,
              edgeType: 'hierarchy',
            },
          });
        }
      }
    });

    // 2. [[Wiki-link]] edges
    notes.forEach(note => {
      if (!note.content) return;
      const wikiRegex = /\[\[([^\]]+)\]\]/g;
      let match: RegExpExecArray | null;
      while ((match = wikiRegex.exec(note.content)) !== null) {
        const targetTitle = match[1].trim().toLowerCase();
        const targetNote = notes.find(n => (n.title || '').trim().toLowerCase() === targetTitle);
        if (targetNote && targetNote._id !== note._id) {
          const edgeId = `wiki_${note._id}_${targetNote._id}`;
          if (!edgeSet.has(edgeId)) {
            edgeSet.add(edgeId);
            elements.push({
              data: {
                id: edgeId,
                source: note._id,
                target: targetNote._id,
                edgeType: 'wiki',
              },
            });
          }
        }
      }
    });

    // 3. Shared Tag connections (if notes have common tags)
    const tagMap = new Map<string, string[]>();
    notes.forEach(note => {
      (note.tags || []).forEach(tag => {
        const list = tagMap.get(tag) || [];
        list.push(note._id);
        tagMap.set(tag, list);
      });
    });

    tagMap.forEach((noteIds, tag) => {
      if (noteIds.length > 1 && noteIds.length <= 5) {
        for (let i = 0; i < noteIds.length - 1; i++) {
          const edgeId = `tag_${tag}_${noteIds[i]}_${noteIds[i + 1]}`;
          if (!edgeSet.has(edgeId)) {
            edgeSet.add(edgeId);
            elements.push({
              data: {
                id: edgeId,
                source: noteIds[i],
                target: noteIds[i + 1],
                edgeType: 'tag',
              },
            });
          }
        }
      }
    });

    return elements;
  }, [notes]);

  const getLayoutOptions = useCallback((mode: LayoutMode) => {
    switch (mode) {
      case 'concentric':
        return {
          name: 'concentric',
          animate: true,
          animationDuration: 600,
          padding: 80,
          spacingFactor: 1.6,
          concentric: (node: any) => node.degree(),
          levelWidth: () => 1,
        };
      case 'breadthfirst':
        return {
          name: 'breadthfirst',
          animate: true,
          animationDuration: 600,
          directed: true,
          padding: 80,
          spacingFactor: 1.5,
        };
      case 'cose':
      default:
        return {
          name: 'cose',
          animate: true,
          animationDuration: 700,
          nodeDimensionsIncludeLabels: true, // Prevents labels from overlapping!
          nodeRepulsion: () => 350000,       // Large repulsion ensures human readability
          idealEdgeLength: () => 180,        // Long spacious edges
          edgeElasticity: () => 32,
          nestingFactor: 0.1,
          gravity: 0.18,                     // Low gravity prevents meshing
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0,
          padding: 80,
        };
    }
  }, []);

  const initGraph = useCallback(() => {
    if (!containerRef.current) return;

    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    const elements = buildElements();
    const nodeElems = elements.filter(e => !('source' in e.data));
    const edgeElems = elements.filter(e => 'source' in e.data);
    setNodeCount(nodeElems.length);
    setEdgeCount(edgeElems.length);

    if (nodeElems.length === 0) return;

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        // ── Human-Readable Node Styling with Badges ──
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'width': 18,
            'height': 18,
            'border-width': 2,
            'border-color': 'var(--surface)',
            'label': 'data(label)',
            'color': 'var(--fg)',
            'font-size': '11.5px',
            'font-family': "'Inter', system-ui, -apple-system, sans-serif",
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 6,
            'text-wrap': 'ellipsis',
            'text-max-width': '120px',
            // Text box halo for crystal clear readability
            'text-background-opacity': 0.88,
            'text-background-color': 'var(--surface)',
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'text-border-width': 1,
            'text-border-color': 'var(--border)',
            'transition-property': 'opacity, border-color, border-width, background-color',
            'transition-duration': 0.15,
          } as any,
        },
        // ── Edges ──
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': 'rgba(150, 150, 150, 0.35)',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': 'rgba(150, 150, 150, 0.45)',
            'arrow-scale': 0.6,
            'transition-property': 'opacity, line-color, width',
            'transition-duration': 0.15,
          } as any,
        },
        {
          selector: 'edge[edgeType = "wiki"]',
          style: {
            'line-color': 'rgba(224, 84, 56, 0.45)',
            'target-arrow-color': '#e05438',
            'width': 1.8,
          } as any,
        },
        {
          selector: 'edge[edgeType = "hierarchy"]',
          style: {
            'line-style': 'dashed',
            'line-dash-pattern': [4, 4],
            'line-color': 'rgba(59, 130, 246, 0.45)',
            'target-arrow-color': '#3b82f6',
          } as any,
        },
        // ── Highlighted / Dimmed states ──
        {
          selector: 'node.highlighted',
          style: {
            'border-width': 3,
            'border-color': '#e05438',
            'width': 24,
            'height': 24,
            'font-size': '13px',
            'z-index': 100,
          } as any,
        },
        {
          selector: 'edge.highlighted',
          style: {
            'line-color': '#e05438',
            'target-arrow-color': '#e05438',
            'width': 2.5,
            'z-index': 90,
          } as any,
        },
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.15,
          } as any,
        },
      ],
      layout: getLayoutOptions(layoutMode) as any,
    });

    // Node click handler: Highlight neighborhood & navigate on double click
    cyRef.current.on('tap', 'node', (evt) => {
      const node = evt.target;
      const id = node.id();
      setSelectedNodeId(id);

      // Neighborhood highlight
      const neighborhood = node.neighborhood().add(node);
      cyRef.current?.elements().removeClass('highlighted dimmed');
      cyRef.current?.elements().not(neighborhood).addClass('dimmed');
      neighborhood.addClass('highlighted');
    });

    // Double tap: navigate directly to the note
    cyRef.current.on('dbltap', 'node', (evt) => {
      const id = evt.target.id();
      navigate(`/notes/${id}`);
    });

    // Background tap: reset highlight
    cyRef.current.on('tap', (evt) => {
      if (evt.target === cyRef.current) {
        setSelectedNodeId(null);
        cyRef.current?.elements().removeClass('highlighted dimmed');
      }
    });
  }, [buildElements, getLayoutOptions, layoutMode, navigate]);

  useEffect(() => {
    initGraph();
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [initGraph]);

  // Live search filter
  useEffect(() => {
    if (!cyRef.current) return;
    if (!searchQuery.trim()) {
      cyRef.current.elements().removeClass('dimmed');
      return;
    }
    const q = searchQuery.toLowerCase();
    const matched = cyRef.current.nodes().filter(n =>
      (n.data('label') || '').toLowerCase().includes(q)
    );
    cyRef.current.elements().addClass('dimmed');
    matched.removeClass('dimmed').addClass('highlighted');
  }, [searchQuery]);

  const handleCreateTutorial = async () => {
    const id = await saveNote({
      title: 'Welcome & Tutorial Guide',
      content: TUTORIAL_NOTE_CONTENT,
      icon: '📚',
      parentId: null,
      tags: ['Tutorial', 'Getting Started'],
    });
    navigate(`/notes/${id}`);
  };

  const handleNewNote = async () => {
    const id = await saveNote({
      title: 'Untitled Note',
      parentId: null,
      icon: '📄',
      tags: ['Ideas'],
    });
    navigate(`/notes/${id}`);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        background: 'var(--bg)',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Top Header ── */}
      <div
        style={{
          padding: '20px 32px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(224, 84, 56, 0.1)',
              border: '1px solid rgba(224, 84, 56, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e05438',
              flexShrink: 0,
            }}
          >
            <Network size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  letterSpacing: '-0.3px',
                  margin: 0,
                  color: 'var(--fg)',
                }}
              >
                Knowledge Graph
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'var(--surface-2)',
                  color: 'var(--muted)',
                  border: '1px solid var(--border)',
                }}
              >
                {nodeCount} nodes • {edgeCount} connections
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '3px 0 0' }}>
              Spacious 2D network visualizing notes, wiki-links, and space hierarchies.
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter & Layout Toolbar ── */}
      <div
        style={{
          padding: '8px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        {/* Layout Mode Toggles */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-2)', padding: '3px', borderRadius: '6px' }}>
          <button
            onClick={() => setLayoutMode('cose')}
            title="Spacious Force Layout (COSE)"
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: 'none',
              background: layoutMode === 'cose' ? 'var(--surface)' : 'transparent',
              color: layoutMode === 'cose' ? '#e05438' : 'var(--muted)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: layoutMode === 'cose' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <GitFork size={13} /> Spacious Force
          </button>
          <button
            onClick={() => setLayoutMode('concentric')}
            title="Concentric Rings Layout"
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: 'none',
              background: layoutMode === 'concentric' ? 'var(--surface)' : 'transparent',
              color: layoutMode === 'concentric' ? '#e05438' : 'var(--muted)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: layoutMode === 'concentric' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <CircleDot size={13} /> Concentric
          </button>
          <button
            onClick={() => setLayoutMode('breadthfirst')}
            title="Tree Hierarchy Layout"
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: 'none',
              background: layoutMode === 'breadthfirst' ? 'var(--surface)' : 'transparent',
              color: layoutMode === 'breadthfirst' ? '#e05438' : 'var(--muted)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: layoutMode === 'breadthfirst' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <LayoutGrid size={13} /> Hierarchy
          </button>
        </div>

        {/* Live Search nodes */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: 'auto',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '4px 10px',
            width: '210px',
          }}
        >
          <Search size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--fg)',
              fontSize: '12.5px',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* ── Cytoscape Canvas Container ── */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg)',
        }}
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Empty state if vault has no notes */}
        {nodeCount === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '32px 40px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              maxWidth: '380px',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🕸️</div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--fg)', margin: '0 0 6px' }}>
              Your graph is waiting for notes
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
              Create pages and link them with <code>[[Page Title]]</code> to watch your personal knowledge network grow.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={handleCreateTutorial}
                style={{
                  background: 'var(--surface-2)',
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '7px 12px',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <BookOpen size={14} color="#e05438" /> Add Tutorial Note
              </button>
              <button
                onClick={handleNewNote}
                style={{
                  background: '#e05438',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={14} /> New Note
              </button>
            </div>
          </div>
        )}

        {/* Selected Node Details Card */}
        {selectedNodeId && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px 16px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div>
              <span style={{ color: 'var(--muted)', fontSize: '11px', display: 'block' }}>Selected Node</span>
              <strong style={{ color: 'var(--fg)', fontSize: '13.5px' }}>
                {notes.find(n => n._id === selectedNodeId)?.title || 'Note'}
              </strong>
            </div>
            <button
              onClick={() => navigate(`/notes/${selectedNodeId}`)}
              style={{
                background: '#e05438',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Open Page
            </button>
          </div>
        )}

        {/* Bottom-Left Legend */}
        {nodeCount > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '24px',
              left: '24px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--fg)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '2px', background: '#e05438' }} />
              <span>Vault Page</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 14, height: 2, background: '#e05438' }} />
              <span>Wiki-link [[...]]</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 14, height: 2, background: '#3b82f6', borderTop: '1px dashed #3b82f6' }} />
              <span>Sub-page Hierarchy</span>
            </div>
          </div>
        )}

        {/* Bottom-Right Zoom & Fit Controls */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <button
            onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25)}
            title="Zoom in"
            style={graphControlBtn}
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
            title="Zoom out"
            style={graphControlBtn}
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={() => cyRef.current?.fit(undefined, 60)}
            title="Fit to view"
            style={graphControlBtn}
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={() => cyRef.current?.center()}
            title="Center view"
            style={graphControlBtn}
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

const graphControlBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--muted)',
  cursor: 'pointer',
  padding: '6px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
