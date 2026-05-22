import { Link, useNavigate } from 'react-router-dom';
import { useNoteStore } from '../stores/noteStore';
import { Network, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { notes, saveNote } = useNoteStore();
  const navigate = useNavigate();

  // Real live stats
  const totalNotes = notes.length;
  const rootPages  = notes.filter(n => n.parentId === null).length;
  const subPages   = notes.filter(n => n.parentId !== null).length;
  const recentNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);

  // Unique tags across all notes
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || []))).slice(0, 12);

  const handleNewNote = async () => {
    const id = await saveNote({ title: 'Untitled', parentId: null, icon: '📄' });
    navigate(`/notes/${id}`);
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Welcome header */}
      <div style={{ marginBottom: '36px' }}>
        <div className="mono kicker">Overview</div>
        <h1 style={{ fontSize: '36px', margin: '4px 0 8px', fontFamily: 'var(--font-display)' }}>
          Your Knowledge Base
        </h1>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>
          Everything you know, connected and searchable.
        </p>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Pages', value: totalNotes, icon: '📄', color: 'var(--accent)' },
          { label: 'Root Pages', value: rootPages, icon: '📂', color: '#60a5fa' },
          { label: 'Sub-pages', value: subPages, icon: '📑', color: '#a78bfa' },
          { label: 'Unique Tags', value: allTags.length, icon: '🏷️', color: '#34d399' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <div style={{ fontSize: '28px', marginBottom: '4px' }}>{stat.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)', color: stat.color }}>
              {stat.value}
            </div>
            <div className="mono" style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
        <div className="mono kicker" style={{ fontSize: '11px' }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={handleNewNote} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <Plus size={14} /> New Page
          </button>
          <button
            onClick={() => navigate('/graph')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Network size={14} /> View Graph
          </button>
          <button
            onClick={() => navigate('/chat')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            ✨ Ask AI
          </button>
        </div>
      </div>

      {/* Recent notes */}
      <div className="card" style={{ marginBottom: '24px', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="mono kicker" style={{ margin: 0, fontSize: '11px' }}>
            <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Recent Activity
          </div>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{totalNotes} pages total</span>
        </div>

        {recentNotes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📄</div>
            <div style={{ fontSize: '14px', marginBottom: '16px' }}>No pages yet. Start writing!</div>
            <button onClick={handleNewNote} style={{ fontSize: '13px' }}>
              <Plus size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Create your first page
            </button>
          </div>
        ) : (
          <div>
            {recentNotes.map((note, i) => (
              <Link
                key={note._id}
                to={`/notes/${note._id}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 20px', textDecoration: 'none', color: 'var(--fg)',
                  borderBottom: i < recentNotes.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>{note.icon || '📄'}</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '14px' }}>{note.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                      {note.parentId ? '↳ Sub-page' : 'Root page'}
                      {note.tags?.length > 0 && ` · ${note.tags.slice(0, 2).map(t => `#${t}`).join(' ')}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                  </span>
                  {!note.synced ? (
                    <span style={{ fontSize: '9px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <AlertCircle size={9} /> Pending sync
                    </span>
                  ) : (
                    <span style={{ fontSize: '9px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <CheckCircle size={9} /> Synced
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Tags cloud */}
      {allTags.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <div className="mono kicker" style={{ fontSize: '11px' }}>Tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {allTags.map(tag => (
              <span key={tag} className="tag" style={{ fontSize: '12px', padding: '4px 10px' }}>#{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
