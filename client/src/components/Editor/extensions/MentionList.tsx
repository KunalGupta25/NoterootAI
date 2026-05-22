import {
  forwardRef, useEffect, useImperativeHandle,
  useState, useRef,
} from 'react';

export type MentionItem = {
  id: string;
  label: string;
  icon: string;
  parentLabel?: string;
};

interface MentionListProps {
  items: MentionItem[];
  command: (item: MentionItem) => void;
}

export const MentionList = forwardRef<{ onKeyDown: (p: { event: KeyboardEvent }) => boolean }, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const activeRef = useRef<HTMLButtonElement>(null);

    // Reset selection when items change
    useEffect(() => setSelectedIndex(0), [items]);

    // Scroll active item into view
    useEffect(() => {
      activeRef.current?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    useImperativeHandle(ref, () => ({
      onKeyDown({ event }: { event: KeyboardEvent }) {
        if (event.key === 'ArrowUp') {
          setSelectedIndex(i => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex(i => (i + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          const item = items[selectedIndex];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    if (!items.length) {
      return (
        <div style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '13px',
          color: 'var(--muted)',
          fontStyle: 'italic',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          minWidth: '220px',
        }}>
          No pages found
        </div>
      );
    }

    return (
      <div style={{
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        minWidth: '240px',
        maxHeight: '280px',
        overflowY: 'auto',
        animation: 'slideDown 0.12s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '7px 12px 5px',
          fontSize: '10px',
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
        }}>
          📄 Link a page
        </div>

        {items.map((item, index) => (
          <button
            key={item.id}
            ref={index === selectedIndex ? activeRef : null}
            onClick={() => command(item)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '8px 12px',
              background: index === selectedIndex ? 'var(--bg)' : 'transparent',
              borderLeft: index === selectedIndex ? '2px solid var(--accent)' : '2px solid transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.1s',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px',
                fontWeight: index === selectedIndex ? 500 : 400,
                color: 'var(--fg)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {item.label}
              </div>
              {item.parentLabel && (
                <div style={{
                  fontSize: '11px',
                  color: 'var(--muted)',
                  marginTop: '1px',
                }}>
                  ↳ {item.parentLabel}
                </div>
              )}
            </div>
            {index === selectedIndex && (
              <span style={{ fontSize: '11px', color: 'var(--muted)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>↵</span>
            )}
          </button>
        ))}

        {/* Footer hint */}
        <div style={{
          padding: '5px 12px',
          fontSize: '10px',
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono)',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg)',
          display: 'flex',
          gap: '12px',
        }}>
          <span>↑↓ navigate</span>
          <span>↵ insert</span>
          <span>esc cancel</span>
        </div>
      </div>
    );
  }
);

MentionList.displayName = 'MentionList';
