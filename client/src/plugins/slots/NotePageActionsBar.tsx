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
            gap: '6px',
            fontSize: '12px',
            padding: '6px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--muted)'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--fg)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
        >
          <span>{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
