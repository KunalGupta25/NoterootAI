import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNoteStore } from '../stores/noteStore';
import { useAuthStore } from '../stores/authStore';
import { Plus, MoreVertical, Star, Trash2, Edit3, FileText, BookOpen, Search, X, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { TUTORIAL_NOTE_CONTENT } from '../components/Onboarding/OnboardingModal';

export default function Dashboard() {
  const { notes, saveNote, deleteNote } = useNoteStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tagParam = searchParams.get('tag');

  const [activeTab, setActiveTab] = useState<'Recent' | 'Starred' | 'All'>('Recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [starredIds, setStarredIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('noteroot_starred_ids') || '[]');
    } catch {
      return [];
    }
  });

  // Close 3-dots menu on outside click or escape
  useEffect(() => {
    const handleOutsideClick = () => {
      if (menuOpenId) {
        setMenuOpenId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpenId(null);
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpenId]);

  const toggleStar = (id: string) => {
    setStarredIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('noteroot_starred_ids', JSON.stringify(next));
      return next;
    });
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const userName = user?.name || 'Kunal';

  const handleNewNote = async () => {
    const id = await saveNote({
      title: 'Untitled Note',
      parentId: null,
      icon: '📄',
      tags: tagParam ? [tagParam] : [],
    });
    navigate(`/notes/${id}`);
  };

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

  // Convert real store notes into display items
  const displayList = useMemo(() => {
    const colors = [
      { bg: 'rgba(224, 84, 56, 0.12)', fg: '#e05438' },
      { bg: 'rgba(59, 130, 246, 0.12)', fg: '#3b82f6' },
      { bg: 'rgba(34, 197, 94, 0.12)', fg: '#22c55e' },
      { bg: 'rgba(234, 179, 8, 0.12)', fg: '#eab308' },
      { bg: 'rgba(168, 85, 247, 0.12)', fg: '#a855f7' },
      { bg: 'rgba(156, 163, 175, 0.14)', fg: '#9ca3af' },
    ];

    return notes.map((n, idx) => {
      const color = colors[idx % colors.length];
      const space = n.tags && n.tags.length > 0 ? `Spaces / ${n.tags[0]}` : 'Personal';
      const isStarred = starredIds.includes(n._id);

      let editedTime = 'Just now';
      try {
        if (n.updatedAt) {
          editedTime = formatDistanceToNow(new Date(n.updatedAt), { addSuffix: true });
        }
      } catch {
        editedTime = 'Recently';
      }

      return {
        id: n._id,
        title: n.title || 'Untitled',
        content: n.content || '',
        tags: n.tags || [],
        iconBg: color.bg,
        iconColor: color.fg,
        editedTime,
        spacePath: space,
        isStarred,
      };
    });
  }, [notes, starredIds]);

  const filteredList = useMemo(() => {
    let list = displayList;

    // Filter by tag if specified in query
    if (tagParam) {
      list = list.filter(n => n.tags.includes(tagParam));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (activeTab === 'Starred') {
      return list.filter(n => n.isStarred);
    }
    return list;
  }, [displayList, activeTab, tagParam, searchQuery]);

  return (
    <div
      style={{
        maxWidth: '920px',
        margin: '0 auto',
        padding: '44px 36px 60px',
      }}
    >
      {/* ── Top Header with Greeting & Action ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.4px',
              margin: '0 0 6px 0',
              color: 'var(--fg)',
            }}
          >
            {greeting}, {userName}.
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Continue from where you left off.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleNewNote}
            style={{
              background: '#e05438',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '13.5px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(224, 84, 56, 0.3)',
              transition: 'background 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#d0492e')}
            onMouseLeave={e => (e.currentTarget.style.background = '#e05438')}
          >
            <Plus size={15} />
            <span>New note</span>
          </button>
        </div>
      </div>

      {/* ── Active Tag Filter Banner ── */}
      {tagParam && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '6px',
            background: 'rgba(224, 84, 56, 0.12)',
            border: '1px solid rgba(224, 84, 56, 0.25)',
            color: '#e05438',
            fontSize: '12.5px',
            fontWeight: 500,
            marginBottom: '16px',
          }}
        >
          <Tag size={13} />
          <span>Filtered by tag: <strong>#{tagParam}</strong></span>
          <button
            onClick={() => {
              searchParams.delete('tag');
              setSearchParams(searchParams);
            }}
            title="Clear tag filter"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#e05438',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '3px',
            }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Tabs & Search Bar Row ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          marginBottom: '20px',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '24px' }}>
          {(['Recent', 'Starred', 'All'] as const).map(tab => {
            const label = tab === 'All' ? 'All Notes' : tab;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '10px 0',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#e05438' : 'var(--muted)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.color = 'var(--fg)';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.color = 'var(--muted)';
                }}
              >
                {label}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-1px',
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: '#e05438',
                      borderRadius: '2px',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Real-time search box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 10px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            width: '200px',
            marginBottom: '6px',
          }}
        >
          <Search size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--fg)',
              fontSize: '12.5px',
              width: '100%',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0 }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Note Rows or Empty State ── */}
      {filteredList.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'var(--surface)',
            border: '1px dashed var(--border)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(224, 84, 56, 0.1)',
              color: '#e05438',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            📚
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px', color: 'var(--fg)' }}>
              {searchQuery
                ? `No notes matching "${searchQuery}"`
                : tagParam
                ? `No notes tagged with #${tagParam}`
                : activeTab === 'Starred'
                ? 'No starred notes yet'
                : 'Your vault is ready'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, maxWidth: '400px' }}>
              {searchQuery
                ? 'Try a different search term or clear the filter.'
                : tagParam
                ? 'Add this tag to a note from the editor.'
                : activeTab === 'Starred'
                ? 'Star any note to find it quickly here.'
                : 'Get started by creating your first page or explore our interactive tutorial.'}
            </p>
          </div>
          {activeTab !== 'Starred' && !searchQuery && !tagParam && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={handleCreateTutorial}
                style={{
                  background: 'var(--surface-2)',
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <BookOpen size={14} color="#e05438" /> Add Tutorial Guide
              </button>
              <button
                onClick={handleNewNote}
                style={{
                  background: '#e05438',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={14} /> Create Blank Page
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredList.map(note => (
            <div
              key={note.id}
              onClick={() => navigate(`/notes/${note.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'transparent',
                transition: 'background 0.12s',
                position: 'relative',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Note Icon Box */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: note.iconBg,
                  color: note.iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '14px',
                  flexShrink: 0,
                }}
              >
                <FileText size={16} />
              </div>

              {/* Note Title */}
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--fg)',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {note.title}
              </div>

              {/* Relative Time */}
              <div
                style={{
                  fontSize: '12.5px',
                  color: 'var(--muted)',
                  marginRight: '36px',
                  minWidth: '100px',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {note.editedTime}
              </div>

              {/* Space / Folder Path */}
              <div
                style={{
                  fontSize: '12.5px',
                  color: 'var(--muted)',
                  minWidth: '160px',
                  maxWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {note.spacePath}
              </div>

              {/* Options Menu Button (⋮) */}
              <div
                style={{ position: 'relative', marginLeft: '12px' }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setMenuOpenId(menuOpenId === note.id ? null : note.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  <MoreVertical size={16} />
                </button>

                {menuOpenId === note.id && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                      zIndex: 100,
                      minWidth: '140px',
                      overflow: 'hidden',
                      padding: '4px',
                    }}
                  >
                    <button
                      onClick={() => {
                        setMenuOpenId(null);
                        navigate(`/notes/${note.id}`);
                      }}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        background: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12.5px',
                        color: 'var(--fg)',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Edit3 size={14} /> Open
                    </button>
                    <button
                      onClick={() => {
                        toggleStar(note.id);
                        setMenuOpenId(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        background: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12.5px',
                        color: note.isStarred ? '#eab308' : 'var(--fg)',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Star size={14} fill={note.isStarred ? '#eab308' : 'none'} />
                      {note.isStarred ? 'Unstar' : 'Star'}
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpenId(null);
                        deleteNote(note.id);
                      }}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        background: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12.5px',
                        color: '#ef4444',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
