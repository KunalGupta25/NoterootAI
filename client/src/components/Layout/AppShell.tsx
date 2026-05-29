import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Box, Search, CheckCircle, Edit3,
  LayoutDashboard, Network, Bot,
  Puzzle, Settings, Database, Cloud,
  Plus, AlertCircle, PanelRightOpen, LogOut
} from 'lucide-react';
import { useNoteStore } from '../../stores/noteStore';
import { useAuthStore } from '../../stores/authStore';
import VaultTree from './VaultTree';
import AISidebar from '../Sidebar/AISidebar';
import CommandPalette from '../CommandPalette/CommandPalette';
import { useEffect, useState } from 'react';
import { PluginTabBar } from '../../plugins/slots/PluginTabBar';

export default function AppShell() {
  const { initDB, syncStatus, notes, saveNote, retrySync } = useNoteStore();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(true);
  const [aiSidebarWidth, setAiSidebarWidth] = useState(300);

  // Sync CSS variable for grid column width
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--ai-sidebar-width',
      aiOpen ? `${aiSidebarWidth}px` : '0px'
    );
  }, [aiOpen, aiSidebarWidth]);

  useEffect(() => {
    initDB();
  }, [initDB]);

  // Global Ctrl+K shortcut (skip when editor is focused — TipTap handles its own link shortcut)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        // If the user is typing inside the TipTap editor, let TipTap handle Ctrl+K
        const active = document.activeElement;
        if (active?.closest('.ProseMirror')) return;
        e.preventDefault();
        setPaletteOpen(p => !p);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);


  const handleNewNote = async () => {
    const id = await saveNote({ title: 'Untitled', parentId: null, icon: '📄' });
    navigate(`/notes/${id}`);
  };

  const handleLogout = () => {
    logout();
    useNoteStore.getState().resetLocalState();
    navigate('/auth', { replace: true });
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const navStyle = (path: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
    color: isActive(path) ? 'var(--accent)' : 'var(--fg)',
    fontWeight: isActive(path) ? 600 : 400,
    padding: '6px 8px',
    borderRadius: '6px',
    background: isActive(path) ? 'var(--bg)' : 'transparent',
    fontSize: '14px',
    transition: 'all 0.15s',
  });

  const syncLabel = () => {
    switch (syncStatus) {
      case 'saving_locally':  return { icon: <Database size={12} style={{ color: 'var(--muted)' }} />, text: 'Saving...', color: 'var(--muted)' };
      case 'saved_locally':   return { icon: <Database size={12} style={{ color: 'var(--muted)' }} />, text: 'Saved Locally', color: 'var(--muted)' };
      case 'syncing':         return { icon: <Cloud size={12} style={{ color: 'var(--accent)' }} />, text: 'Syncing...', color: 'var(--accent)' };
      case 'synced_to_cloud': return { icon: <CheckCircle size={12} style={{ color: '#4ade80' }} />, text: 'Synced to Cloud', color: '#4ade80' };
      case 'offline':         return { icon: <AlertCircle size={12} style={{ color: '#f87171' }} />, text: 'Offline', color: '#f87171', canRetry: true };
      default:                return { icon: <CheckCircle size={12} style={{ color: 'var(--muted)' }} />, text: 'Ready', color: 'var(--muted)' };
    }
  };

  const sync = syncLabel();

  return (
    <div className="layout">
      {/* ── Header ── */}
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Box style={{ color: 'var(--accent)' }} size={22} />
          <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>NoteRootAI</span>
        </div>

        {/* Search — opens command palette */}
        <button
          onClick={() => setPaletteOpen(true)}
          style={{
            flex: 1, maxWidth: '420px', display: 'flex', alignItems: 'center',
            gap: '10px', padding: '8px 14px',
            background: 'var(--bg)', border: '1.5px solid var(--border)',
            borderRadius: '6px', cursor: 'text', textAlign: 'left',
            color: 'var(--muted)', fontSize: '14px', fontFamily: 'var(--font-body)',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <Search size={15} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Search pages...</span>
          <kbd style={{ fontSize: '11px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 6px', fontFamily: 'var(--font-mono)' }}>Ctrl K</kbd>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleNewNote}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 14px' }}
          >
            <Plus size={14} /> New Page
          </button>
          <span style={{ color: 'var(--muted)', fontSize: '12px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </span>
          <button onClick={handleLogout} title="Log out" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ── Plugin Tab Bar ── */}
      <div style={{ gridColumn: '1 / -1', zIndex: 10 }}>
        <PluginTabBar />
      </div>

      {/* ── Left Sidebar ── */}
      <aside className="left-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '16px 12px', overflowY: 'auto' }}>
        {/* Nav */}
        <div style={{ marginBottom: '8px' }}>
          <div className="mono kicker" style={{ fontSize: '10px', padding: '0 8px', marginBottom: '8px' }}>Navigation</div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <Link to="/" style={navStyle('/__dashboard__')} className="__force_exact__">
              {/* exact match for dashboard */}
            </Link>
            <a
              href="/"
              onClick={e => { e.preventDefault(); navigate('/'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                textDecoration: 'none',
                color: location.pathname === '/' ? 'var(--accent)' : 'var(--fg)',
                fontWeight: location.pathname === '/' ? 600 : 400,
                padding: '6px 8px', borderRadius: '6px',
                background: location.pathname === '/' ? 'var(--bg)' : 'transparent',
                fontSize: '14px', transition: 'all 0.15s',
              }}
            >
              <LayoutDashboard size={16} /> Dashboard
            </a>
            <Link to="/graph" style={navStyle('/graph')}>
              <Network size={16} /> Graph View
            </Link>
            <Link to="/chat" style={navStyle('/chat')}>
              <Bot size={16} /> AI Chat
            </Link>
            <Link to="/plugins" style={navStyle('/plugins')}>
              <Puzzle size={16} /> Plugins
            </Link>
            <Link to="/settings" style={navStyle('/settings')}>
              <Settings size={16} /> Settings
            </Link>
          </nav>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border)', margin: '12px 0' }} />

        {/* Vault tree (takes remaining space) */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <VaultTree />
        </div>
      </aside>

      {/* ── Main ── */}
      <main>
        <Outlet />
      </main>

      {/* ── Right AI Sidebar ── */}
      <aside
        className={`right-sidebar${aiOpen ? '' : ' collapsed'}`}
        style={{ padding: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            cursor: 'col-resize',
            zIndex: 100,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = aiSidebarWidth;

            const onMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = startX - moveEvent.clientX;
              // Limit the width between 200px and 600px
              const newWidth = Math.max(200, Math.min(600, startWidth + deltaX));
              setAiSidebarWidth(newWidth);
            };

            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
              document.body.style.cursor = '';
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'col-resize';
          }}
        />
        <AISidebar setAiOpen={setAiOpen} />
      </aside>

      {/* ── Floating re-open tab when collapsed ── */}
      {!aiOpen && (
        <button
          onClick={() => setAiOpen(true)}
          title="Open AI Assistant"
          style={{
            position: 'fixed',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 200,
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRight: 'none',
            borderRadius: '8px 0 0 8px',
            padding: '12px 6px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--muted)',
            boxShadow: '-2px 0 12px rgba(0,0,0,0.08)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--accent)';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--muted)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <PanelRightOpen size={16} />
          <span style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
          }}>AI</span>
        </button>
      )}

      {/* ── Footer ── */}
      <footer>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Edit3 size={11} style={{ verticalAlign: 'middle' }} />
            NoteRootAI v1.0
          </span>
          <span style={{ color: 'var(--muted)' }}>
            {notes.length} pages · {notes.filter(n => !n.synced).length} pending sync
          </span>
        </div>
        <span
          className="mono flex items-center gap-2"
          style={{ color: sync.color, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {sync.icon} {sync.text}
          {(sync as any).canRetry && (
            <button
              onClick={() => retrySync()}
              style={{
                fontSize: '10px',
                padding: '1px 8px',
                border: '1px solid #f87171',
                borderRadius: '4px',
                background: 'transparent',
                color: '#f87171',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Retry
            </button>
          )}
        </span>
      </footer>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
