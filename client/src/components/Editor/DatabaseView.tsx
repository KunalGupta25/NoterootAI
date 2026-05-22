import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useNoteStore } from '../../stores/noteStore';

interface DatabaseViewProps {
  parentId: string;
  parentTitle: string;
}

export default function DatabaseView({ parentId, parentTitle }: DatabaseViewProps) {
  const { getChildren, saveNote } = useNoteStore();
  const navigate = useNavigate();
  const children = getChildren(parentId);

  const handleAddEntry = async () => {
    const id = await saveNote({
      title: 'Untitled',
      parentId,
      icon: '📄',
    });
    navigate(`/notes/${id}`);
  };

  // Collect all unique property keys across children
  const allPropertyKeys = new Set<string>();
  children.forEach(c => {
    if (c.properties) {
      Object.keys(c.properties).forEach(k => allPropertyKeys.add(k));
    }
  });
  const propertyColumns = Array.from(allPropertyKeys);

  return (
    <div style={{
      margin: '24px 0',
      border: '1.5px solid var(--border)',
      borderRadius: '8px',
      overflow: 'hidden',
      background: 'var(--surface)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontSize: '16px' }}>📋</span>
        <span style={{ fontWeight: 600, fontSize: '14px' }}>{parentTitle} — Sub-pages</span>
      </div>

      {/* Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
      }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
            <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📝 Title
            </th>
            {propertyColumns.map(col => (
              <th key={col} style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {col}
              </th>
            ))}
            <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📅 Last Modified
            </th>
          </tr>
        </thead>
        <tbody>
          {children.length === 0 ? (
            <tr>
              <td colSpan={propertyColumns.length + 2} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic' }}>
                No sub-pages yet.
              </td>
            </tr>
          ) : (
            children
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map(child => (
                <tr
                  key={child._id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 16px' }}>
                    <Link
                      to={`/notes/${child._id}`}
                      style={{
                        textDecoration: 'none',
                        color: 'var(--fg)',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span>{child.icon || '📄'}</span>
                      {child.title}
                    </Link>
                  </td>
                  {propertyColumns.map(col => (
                    <td key={col} style={{ padding: '10px 16px', color: 'var(--fg)' }}>
                      {child.properties?.[col] ? (
                        <span style={{
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '12px',
                        }}>
                          {child.properties[col]}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      )}
                    </td>
                  ))}
                  <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: '12px' }}>
                    {new Date(child.updatedAt).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                </tr>
              ))
          )}
        </tbody>
      </table>

      {/* Add entry row */}
      <div
        onClick={handleAddEntry}
        style={{
          padding: '10px 16px',
          color: 'var(--muted)',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
      >
        <Plus size={14} /> Add entry
      </div>
    </div>
  );
}
