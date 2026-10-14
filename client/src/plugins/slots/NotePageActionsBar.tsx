import { usePluginExtensions } from './usePluginExtensions';
import type { NotePageAction } from '../runtime/ExtensionPoints';

interface Props {
  noteId: string;
}

export function NotePageActionsBar({ noteId }: Props) {
  const actions = usePluginExtensions<NotePageAction>('note.pageActions');

  if (actions.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => action.onClick(noteId)}
          title={action.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 500,
            padding: '5px 10px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--muted)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--fg)';
            e.currentTarget.style.borderColor = 'var(--fg-2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--muted)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <span style={{ fontSize: '13px' }}>{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
