import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

interface SlashItem {
  title: string;
  description: string;
  icon: string;
  category: string;
  command: (props: any) => void;
}

export const SlashCommandList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const items: SlashItem[] = props.items || [];

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + items.length - 1) % items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  // Group items by category
  const grouped: Record<string, { items: SlashItem[]; startIdx: number }> = {};
  let idx = 0;
  for (const item of items) {
    if (!grouped[item.category]) {
      grouped[item.category] = { items: [], startIdx: idx };
    }
    grouped[item.category].items.push(item);
    idx++;
  }

  if (!items.length) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        width: '320px',
        zIndex: 50,
      }}>
        <div style={{ color: 'var(--muted)', fontSize: '13px' }}>No results</div>
      </div>
    );
  }

  let globalIdx = 0;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1.5px solid var(--border)',
      borderRadius: '8px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
      width: '320px',
      maxHeight: '400px',
      overflowY: 'auto',
      zIndex: 50,
      padding: '8px 0',
    }}>
      {Object.entries(grouped).map(([category, group]) => (
        <div key={category}>
          <div style={{
            padding: '6px 16px 4px',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--muted)',
            fontWeight: 600,
          }}>
            {category}
          </div>
          {group.items.map((item) => {
            const thisIdx = globalIdx++;
            return (
              <button
                key={thisIdx}
                onClick={() => selectItem(thisIdx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '0',
                  background: thisIdx === selectedIndex ? 'var(--bg)' : 'transparent',
                  color: thisIdx === selectedIndex ? 'var(--accent)' : 'var(--fg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  fontSize: '16px',
                  flexShrink: 0,
                }}>
                  {item.icon}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.title}</span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{item.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
});

SlashCommandList.displayName = 'SlashCommandList';
