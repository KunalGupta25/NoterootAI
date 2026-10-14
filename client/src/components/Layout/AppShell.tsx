import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  Home, Search, FileText, Network, Bot,
  Puzzle, Settings, Sun, Moon,
  PanelLeftClose, PanelLeft, HelpCircle, Plus,
  Folder, FolderPlus, ChevronRight, ChevronDown
} from 'lucide-react';
import { useNoteStore } from '../../stores/noteStore';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import CommandPalette from '../CommandPalette/CommandPalette';
import OnboardingModal from '../Onboarding/OnboardingModal';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AppShell() {
  const { initDB, notes, saveNote } = useNoteStore();
  const { user } = useAuthStore();
  const { theme, setTheme } = useSettingsStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Derive unique tags from actual notes
  const dynamicTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(n => (n.tags || []).forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [notes]);

  // Group all notes by space
  const spacesData = useMemo(() => {
    const map = new Map<string, typeof notes>();
    notes.forEach(note => {
      const spaceName = note.space || note.properties?.space || 'Other';
      const list = map.get(spaceName) || [];
      list.push(note);
      map.set(spaceName, list);
    });

    if (!map.has('Other')) {
      map.set('Other', []);
    }

    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });
  }, [notes]);

  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('noteroot_expanded_spaces') || '{"Other":true}');
    } catch {
      return { Other: true };
    }
  });

  const toggleSpaceExpand = (spaceName: string) => {
    setExpandedSpaces(prev => {
      const next = { ...prev, [spaceName]: !prev[spaceName] };
      localStorage.setItem('noteroot_expanded_spaces', JSON.stringify(next));
      return next;
    });
  };

  const [showNewSpaceInput, setShowNewSpaceInput] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');

  const handleCreateSpace = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newSpaceName.trim();
    if (!trimmed) {
      setShowNewSpaceInput(false);
      return;
    }
    const id = await saveNote({
      title: `${trimmed} Home`,
      space: trimmed,
      content: `<p>Welcome to <strong>${trimmed}</strong> space.</p>`,
      icon: '📁',
      parentId: null,
      tags: [],
    });
    setNewSpaceName('');
    setShowNewSpaceInput(false);
    setExpandedSpaces(p => ({ ...p, [trimmed]: true }));
    navigate(`/notes/${id}`);
  };

  const handleCreateNoteInSpace = async (e: React.MouseEvent, spaceName: string) => {
    e.stopPropagation();
    e.preventDefault();
    const id = await saveNote({
      title: 'Untitled Note',
      space: spaceName,
      content: '',
      icon: '📄',
      parentId: null,
      tags: [],
    });
    setExpandedSpaces(p => ({ ...p, [spaceName]: true }));
    navigate(`/notes/${id}`);
  };

  const handleNewNote = async () => {
    const searchParams = new URLSearchParams(location.search);
    const activeSpace = searchParams.get('space') || 'Other';
    const id = await saveNote({ title: 'Untitled', content: '', icon: '📄', parentId: null, space: activeSpace, tags: [] });
    navigate(`/notes/${id}`);
  };

  // Sidebar expanded / collapsed state (rail mode)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('noteroot_sidebar_collapsed') === 'true';
  });

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('noteroot_sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    initDB();
  }, [initDB]);

  // Global Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        const active = document.activeElement;
        if (active?.closest('.ProseMirror')) return;
        e.preventDefault();
        setPaletteOpen(p => !p);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' && !location.search;
    if (path === '/notes') return location.pathname === '/notes' || (location.pathname === '/' && location.search.includes('tag='));
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { label: 'Home', path: '/', icon: <Home size={18} /> },
    { label: 'Search', path: '#search', icon: <Search size={18} />, isAction: () => setPaletteOpen(true) },
    { label: 'All Notes', path: '/notes', icon: <FileText size={18} /> },
    { label: 'Graph View', path: '/graph', icon: <Network size={18} /> },
    { label: 'AI Chat', path: '/chat', icon: <Bot size={18} /> },
    { label: 'Plugins', path: '/plugins', icon: <Puzzle size={18} /> },
  ];



  const displayName = user?.name || user?.email?.split('@')[0] || 'User';

  return (
    <div
      className="app-container"
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* ══════════════════════════════════════
          LEFT SIDEBAR (Expanded or Slim Rail)
         ══════════════════════════════════════ */}
      <aside
        className="sidebar"
        style={{
          width: sidebarCollapsed ? '56px' : '230px',
          minWidth: sidebarCollapsed ? '56px' : '230px',
          maxWidth: sidebarCollapsed ? '56px' : '230px',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.2s, max-width 0.2s',
          overflow: 'hidden',
          zIndex: 40,
          userSelect: 'none',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            height: '52px',
            padding: sidebarCollapsed ? '0 12px' : '0 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: 'inherit',
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'rgba(224, 84, 56, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e05438" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
              </svg>
            </div>
            {!sidebarCollapsed && (
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '15px',
                  letterSpacing: '-0.2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                NoteRoot AI
              </span>
            )}
          </Link>

          {!sidebarCollapsed && (
            <button
              onClick={toggleSidebarCollapse}
              title="Collapse sidebar"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: sidebarCollapsed ? '10px 6px' : '10px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {navItems.map((item) => {
            const active = item.path === '#search' ? false : isActive(item.path);
            const content = (
              <div
                key={item.label}
                onClick={item.isAction ? item.isAction : undefined}
                title={sidebarCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: sidebarCollapsed ? '8px 0' : '7px 10px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  fontWeight: active ? 600 : 400,
                  color: active ? '#e05438' : 'var(--fg)',
                  background: active ? 'rgba(224, 84, 56, 0.1)' : 'transparent',
                  transition: 'background 0.12s, color 0.12s',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.background = 'var(--surface-2)';
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    color: active ? '#e05438' : 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </div>
            );

            if (item.isAction) {
              return <div key={item.label}>{content}</div>;
            }
            return (
              <Link key={item.label} to={item.path} style={{ textDecoration: 'none' }}>
                {content}
              </Link>
            );
          })}

          {/* Spaces Section — Groups notes by space (expanded only) */}
          {!sidebarCollapsed && (
            <div style={{ marginTop: '14px', paddingTop: '4px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 10px',
                  marginBottom: '2px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Spaces
                </span>
                <button
                  onClick={() => setShowNewSpaceInput(prev => !prev)}
                  title="Create new space"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e05438')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  <FolderPlus size={14} />
                </button>
              </div>

              {/* New Space Input Box */}
              {showNewSpaceInput && (
                <form
                  onSubmit={handleCreateSpace}
                  style={{ padding: '4px 8px 8px' }}
                >
                  <input
                    type="text"
                    value={newSpaceName}
                    onChange={e => setNewSpaceName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') setShowNewSpaceInput(false);
                    }}
                    placeholder="New space name..."
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      borderRadius: '5px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--fg)',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </form>
              )}

              {/* Spaces List */}
              {spacesData.map(([spaceName, spaceNotes]) => {
                const isExpanded = !!expandedSpaces[spaceName];
                const isCurrentSpace = location.pathname.startsWith('/notes') && location.search.includes(`space=${encodeURIComponent(spaceName)}`);

                return (
                  <div key={spaceName} style={{ marginBottom: '2px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: isCurrentSpace ? 'rgba(224, 84, 56, 0.1)' : 'transparent',
                        color: isCurrentSpace ? '#e05438' : 'var(--fg)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => {
                        if (!isCurrentSpace) e.currentTarget.style.background = 'var(--surface-2)';
                      }}
                      onMouseLeave={e => {
                        if (!isCurrentSpace) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div
                        onClick={() => toggleSpaceExpand(spaceName)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}
                      >
                        <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                        <Folder size={14} style={{ color: spaceName === 'Other' ? 'var(--muted)' : '#e05438', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {spaceName}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '2px' }}>
                          ({spaceNotes.length})
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Link
                          to={`/notes?space=${encodeURIComponent(spaceName)}`}
                          title={`View all notes in ${spaceName}`}
                          style={{
                            color: 'var(--muted)',
                            display: 'flex',
                            alignItems: 'center',
                            textDecoration: 'none',
                            padding: '2px',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#e05438')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                        >
                          <FileText size={12} />
                        </Link>
                        <button
                          onClick={e => handleCreateNoteInSpace(e, spaceName)}
                          title={`Create note in ${spaceName}`}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--muted)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            borderRadius: '3px',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#e05438')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Nested Notes within this Space */}
                    {isExpanded && (
                      <div style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '1px' }}>
                        {spaceNotes.length === 0 ? (
                          <div style={{ padding: '3px 8px', fontSize: '11.5px', color: 'var(--muted)', fontStyle: 'italic' }}>
                            Empty space
                          </div>
                        ) : (
                          spaceNotes.map(n => {
                            const isNoteActive = location.pathname === `/notes/${n._id}`;
                            return (
                              <Link
                                key={n._id}
                                to={`/notes/${n._id}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 8px',
                                  borderRadius: '5px',
                                  fontSize: '12.5px',
                                  color: isNoteActive ? '#e05438' : 'var(--muted)',
                                  background: isNoteActive ? 'rgba(224, 84, 56, 0.08)' : 'transparent',
                                  textDecoration: 'none',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  transition: 'background 0.12s, color 0.12s',
                                }}
                                onMouseEnter={e => {
                                  if (!isNoteActive) {
                                    e.currentTarget.style.color = 'var(--fg)';
                                    e.currentTarget.style.background = 'var(--surface-2)';
                                  }
                                }}
                                onMouseLeave={e => {
                                  if (!isNoteActive) {
                                    e.currentTarget.style.color = 'var(--muted)';
                                    e.currentTarget.style.background = 'transparent';
                                  }
                                }}
                              >
                                <span style={{ fontSize: '12px', flexShrink: 0 }}>{n.icon || '📄'}</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {n.title || 'Untitled'}
                                </span>
                              </Link>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tags Section — derived from real notes (expanded only) */}
          {!sidebarCollapsed && (
            <div style={{ marginTop: '16px', paddingTop: '8px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '4px 10px',
                  marginBottom: '2px',
                }}
              >
                Tags
              </div>
              {dynamicTags.length === 0 ? (
                <div style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
                  No tags yet — add tags to your notes.
                </div>
              ) : (
                dynamicTags.map(tag => (
                  <Link
                    key={tag}
                    to={`/notes?tag=${encodeURIComponent(tag)}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: 'var(--muted)',
                      textDecoration: 'none',
                      transition: 'color 0.12s, background 0.12s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'var(--fg)';
                      e.currentTarget.style.background = 'var(--surface-2)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--muted)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: '12px' }}>#</span>
                    <span>{tag}</span>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* New Note quick action (expanded only) */}
          {!sidebarCollapsed && (
            <div style={{ marginTop: '12px', padding: '0 10px' }}>
              <button
                onClick={handleNewNote}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: 'var(--muted)',
                  background: 'transparent',
                  border: '1px dashed var(--border)',
                  cursor: 'pointer',
                  transition: 'color 0.12s, background 0.12s, border-color 0.12s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#e05438';
                  e.currentTarget.style.borderColor = '#e05438';
                  e.currentTarget.style.background = 'rgba(224,84,56,0.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--muted)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Plus size={14} /> New Note
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: sidebarCollapsed ? '10px 6px' : '10px 10px',
            display: 'flex',
            flexDirection: sidebarCollapsed ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          {sidebarCollapsed ? (
            <>
              <Link
                to="/settings"
                title="Settings"
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  color: isActive('/settings') ? '#e05438' : 'var(--muted)',
                  background: isActive('/settings') ? 'rgba(224, 84, 56, 0.1)' : 'transparent',
                  textDecoration: 'none',
                }}
              >
                <Settings size={18} />
              </Link>
              <button
                onClick={toggleSidebarCollapse}
                title="Expand sidebar"
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                <PanelLeft size={18} />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/settings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                  flex: 1,
                  minWidth: 0,
                  padding: '4px 6px',
                  borderRadius: '6px',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--fg)',
                    flexShrink: 0,
                  }}
                >
                  {displayName.charAt(0)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                  </div>
                </div>
              </Link>

              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button
                  onClick={() => setOnboardingOpen(true)}
                  title="Tutorial & Feature Tour"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e05438')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  <HelpCircle size={16} />
                </button>
                <Link
                  to="/settings"
                  title="Settings"
                  style={{
                    color: 'var(--muted)',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  <Settings size={16} />
                </Link>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ══════════════════════════════════════
          MAIN CONTENT AREA
         ══════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          minWidth: 0,
          background: 'var(--bg)',
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
          <Outlet />
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <OnboardingModal forceOpen={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </div>
  );
}
