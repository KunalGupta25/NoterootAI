import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNoteStore } from '../../stores/noteStore';
import { Search, FileText, ArrowRight, Clock } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

type ResultItem =
  | { type: 'note'; id: string; title: string; icon: string; excerpt: string; updatedAt: number; parentTitle?: string }
  | { type: 'action'; label: string; description: string; icon: React.ReactNode; action: () => void };

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { notes, saveNote } = useNoteStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Build results
  useEffect(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      // Default: recent notes + quick actions
      const recent = [...notes]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 6)
        .map(n => ({
          type: 'note' as const,
          id: n._id,
          title: n.title,
          icon: n.icon || '📄',
          excerpt: n.content.replace(/<[^>]+>/g, '').slice(0, 60) || 'Empty page',
          updatedAt: n.updatedAt,
          parentTitle: n.parentId ? notes.find(p => p._id === n.parentId)?.title : undefined,
        }));
      setResults(recent);
      setActiveIndex(0);
      return;
    }

    // Search notes by title + content
    const noteResults: ResultItem[] = notes
      .filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.replace(/<[^>]+>/g, '').toLowerCase().includes(q) ||
        (n.tags || []).some(t => t.includes(q))
      )
      .sort((a, b) => {
        // Prioritize title matches
        const aTitle = a.title.toLowerCase().includes(q) ? 1 : 0;
        const bTitle = b.title.toLowerCase().includes(q) ? 1 : 0;
        return bTitle - aTitle || b.updatedAt - a.updatedAt;
      })
      .slice(0, 8)
      .map(n => {
        const plainContent = n.content.replace(/<[^>]+>/g, '');
        const idx = plainContent.toLowerCase().indexOf(q);
        const excerpt = idx >= 0
          ? '...' + plainContent.slice(Math.max(0, idx - 20), idx + 60) + '...'
          : plainContent.slice(0, 60) || 'Empty page';
        return {
          type: 'note' as const,
          id: n._id,
          title: n.title,
          icon: n.icon || '📄',
          excerpt,
          updatedAt: n.updatedAt,
          parentTitle: n.parentId ? notes.find(p => p._id === n.parentId)?.title : undefined,
        };
      });

    // Quick actions
    const actions: ResultItem[] = [];
    if ('new page'.includes(q) || 'create'.includes(q)) {
      actions.push({
        type: 'action',
        label: 'New Page',
        description: 'Create a new blank page',
        icon: <FileText size={16} />,
        action: async () => {
          const newId = await saveNote({ title: 'Untitled', parentId: null, icon: '📄' });
          navigate(`/notes/${newId}`);
          onClose();
        },
      });
    }

    setResults([...actions, ...noteResults]);
    setActiveIndex(0);
  }, [query, notes]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[activeIndex];
      if (!item) return;
      if (item.type === 'note') {
        navigate(`/notes/${item.id}`);
        onClose();
      } else {
        item.action();
      }
    }
  }, [results, activeIndex, navigate, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
        backdropFilter: 'blur(2px)',
        animation: 'fadeIn 0.1s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '560px',
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          animation: 'slideDown 0.15s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <Search size={18} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, or type a command..."
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '16px', color: 'var(--fg)', fontFamily: 'var(--font-body)' }}
          />
          <kbd style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 6px', fontFamily: 'var(--font-mono)' }}>esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: '380px', overflowY: 'auto' }}>
          {results.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
              No results for "{query}"
            </div>
          ) : (
            <>
              {!query && results.length > 0 && (
                <div style={{ padding: '8px 18px 4px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={11} /> Recent
                </div>
              )}
              {results.map((item, i) => (
                <div
                  key={item.type === 'note' ? item.id : item.label}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 18px', cursor: 'pointer',
                    background: i === activeIndex ? 'var(--bg)' : 'transparent',
                    borderLeft: i === activeIndex ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => {
                    if (item.type === 'note') {
                      navigate(`/notes/${item.id}`);
                      onClose();
                    } else {
                      item.action();
                    }
                  }}
                >
                  {item.type === 'note' ? (
                    <>
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>{item.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                          {item.parentTitle && <><span style={{ color: 'var(--accent)' }}>{item.parentTitle}</span> · </>}
                          {item.excerpt}
                        </div>
                      </div>
                      {i === activeIndex && <ArrowRight size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                    </>
                  ) : (
                    <>
                      <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{item.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: '14px' }}>{item.label}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{item.description}</div>
                      </div>
                      {i === activeIndex && <ArrowRight size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                    </>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          <span><kbd style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '3px', padding: '1px 5px' }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '3px', padding: '1px 5px' }}>↵</kbd> open</span>
          <span><kbd style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '3px', padding: '1px 5px' }}>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
