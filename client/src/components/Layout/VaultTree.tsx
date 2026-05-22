import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Plus, Trash2, Copy, Edit2, ExternalLink, FolderPlus } from 'lucide-react';
import type { NoteTreeNode } from '../../stores/noteStore';
import { useNoteStore } from '../../stores/noteStore';

// ── Context Menu ──────────────────────────────────────────────────────────────
interface ContextMenuState {
  x: number;
  y: number;
  node: NoteTreeNode;
}

interface ContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
}

function ContextMenu({ menu, onClose }: ContextMenuProps) {
  const { saveNote, deleteNote } = useNoteStore();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position to stay inside viewport
  const x = Math.min(menu.x, window.innerWidth - 200);
  const y = Math.min(menu.y, window.innerHeight - 260);

  const item = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    danger = false
  ) => (
    <button
      key={label}
      onClick={() => { onClick(); onClose(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        width: '100%', padding: '7px 12px',
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '13px', textAlign: 'left',
        color: danger ? '#f87171' : 'var(--fg)',
        borderRadius: '4px',
        transition: 'background 0.1s',
        fontFamily: 'var(--font-body)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? 'rgba(248,113,113,0.08)' : 'var(--bg)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <span style={{ color: danger ? '#f87171' : 'var(--muted)', display: 'flex' }}>{icon}</span>
      {label}
    </button>
  );

  const divider = <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: y, left: x,
        zIndex: 9999,
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: '8px',
        padding: '4px',
        minWidth: '192px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)',
        animation: 'slideDown 0.1s ease-out',
      }}
    >
      {/* Page name header */}
      <div style={{
        padding: '6px 12px 6px', fontSize: '11px',
        color: 'var(--muted)', fontFamily: 'var(--font-mono)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        borderBottom: '1px solid var(--border)', marginBottom: '4px',
      }}>
        {menu.node.icon} {menu.node.title || 'Untitled'}
      </div>

      {item(<ExternalLink size={13} />, 'Open page', () => navigate(`/notes/${menu.node._id}`))}
      {item(<Edit2 size={13} />, 'Rename', () => navigate(`/notes/${menu.node._id}`))}

      {divider}

      {item(<FolderPlus size={13} />, 'New sub-page', async () => {
        const id = await saveNote({ title: 'Untitled', parentId: menu.node._id, icon: '📄' });
        navigate(`/notes/${id}`);
      })}
      {item(<Copy size={13} />, 'Duplicate page', async () => {
        const id = await saveNote({
          title: `${menu.node.title} (copy)`,
          content: menu.node.content,
          icon: menu.node.icon,
          tags: menu.node.tags,
          properties: menu.node.properties,
          parentId: menu.node.parentId,
        });
        navigate(`/notes/${id}`);
      })}

      {divider}

      {item(
        <Trash2 size={13} />,
        menu.node.children.length > 0
          ? `Delete page + ${menu.node.children.length} sub-page${menu.node.children.length > 1 ? 's' : ''}`
          : 'Delete page',
        async () => {
          const hasChildren = menu.node.children.length > 0;
          const msg = hasChildren
            ? `Delete "${menu.node.title}" and all ${menu.node.children.length} sub-page(s)?`
            : `Delete "${menu.node.title}"?`;
          if (confirm(msg)) {
            await deleteNote(menu.node._id);
            navigate('/');
          }
        },
        true
      )}
    </div>
  );
}

// ── Tree Item ─────────────────────────────────────────────────────────────────
interface TreeItemProps {
  node: NoteTreeNode;
  depth?: number;
  onContextMenu: (e: React.MouseEvent, node: NoteTreeNode) => void;
}

function TreeItem({ node, depth = 0, onContextMenu }: TreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { saveNote } = useNoteStore();
  const navigate = useNavigate();
  const location = useLocation();
  const hasChildren = node.children.length > 0;
  const isActive = location.pathname === `/notes/${node._id}`;

  const isChildActive = useCallback((n: NoteTreeNode): boolean =>
    location.pathname === `/notes/${n._id}` || n.children.some(isChildActive),
  [location.pathname]);

  const shouldAutoExpand = node.children.some(isChildActive);
  const isExpanded = expanded || shouldAutoExpand;

  const handleAddChild = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setExpanded(true);
    const id = await saveNote({ title: 'Untitled', parentId: node._id, icon: '📄' });
    navigate(`/notes/${id}`);
  };

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onContextMenu={e => { e.preventDefault(); onContextMenu(e, node); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '2px',
          paddingLeft: `${depth * 14}px`, paddingRight: '4px',
          borderRadius: '5px',
          background: isActive
            ? 'color-mix(in oklch, var(--accent) 10%, var(--bg))'
            : hovered
            ? 'var(--bg)'
            : 'transparent',
          borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
          transition: 'background 0.12s, border-color 0.12s',
          minHeight: '28px', cursor: 'pointer',
        }}
      >
        {/* Chevron */}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); setExpanded(!isExpanded); }}
          style={{
            background: 'none', border: 'none', padding: '2px', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
            color: hasChildren ? 'var(--muted)' : 'transparent',
            flexShrink: 0, width: '16px', transition: 'color 0.15s',
          }}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        {/* Icon + Title */}
        <Link
          to={`/notes/${node._id}`}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            textDecoration: 'none', flex: 1, minWidth: 0,
            color: isActive ? 'var(--accent)' : 'var(--fg)',
            fontSize: '13px', fontWeight: isActive ? 600 : 400,
            padding: '4px 2px', overflow: 'hidden',
          }}
        >
          <span style={{ fontSize: '13px', flexShrink: 0 }}>{node.icon || '📄'}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.title || 'Untitled'}
          </span>
        </Link>

        {/* Hover action buttons */}
        {hovered && (
          <div style={{ display: 'flex', gap: '1px', flexShrink: 0 }}>
            <button
              onClick={handleAddChild}
              title="Add sub-page"
              style={{ background: 'none', border: 'none', padding: '3px', color: 'var(--muted)', display: 'flex', alignItems: 'center', cursor: 'pointer', borderRadius: '3px' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
            >
              <Plus size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div style={{ borderLeft: '1.5px solid var(--border)', marginLeft: `${depth * 14 + 12}px` }}>
          {node.children.map(child => (
            <TreeItem key={child._id} node={child} depth={depth + 1} onContextMenu={onContextMenu} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── VaultTree root ─────────────────────────────────────────────────────────────
export default function VaultTree() {
  const { notes, getTree, saveNote } = useNoteStore();
  const navigate = useNavigate();
  const tree = getTree();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: NoteTreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleNewRootPage = async () => {
    const id = await saveNote({ title: 'Untitled', parentId: null, icon: '📄' });
    navigate(`/notes/${id}`);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', padding: '0 4px' }}>
        <div className="mono kicker" style={{ margin: 0, fontSize: '10px' }}>Vault</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{notes.length}</span>
          <button
            onClick={handleNewRootPage}
            title="New root page"
            style={{ background: 'none', border: 'none', padding: '2px', color: 'var(--muted)', display: 'flex', alignItems: 'center', cursor: 'pointer', borderRadius: '3px', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Tree */}
      {tree.length === 0 ? (
        <div
          onClick={handleNewRootPage}
          style={{ color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic', padding: '8px', cursor: 'pointer', borderRadius: '4px', border: '1px dashed var(--border)', textAlign: 'center', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
        >
          + Create first page
        </div>
      ) : (
        tree.map(node => (
          <TreeItem key={node._id} node={node} depth={0} onContextMenu={handleContextMenu} />
        ))
      )}

      {/* Context menu portal */}
      {contextMenu && (
        <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}
