import { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import {
  Minus, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight
} from 'lucide-react';

interface TableToolbarProps {
  editor: Editor;
}

export default function TableToolbar({ editor }: TableToolbarProps) {
  const [isInTable, setIsInTable] = useState(false);

  useEffect(() => {
    const checkTable = () => {
      // Check if cursor is currently inside a table node
      const { $from } = editor.state.selection;
      let inTable = false;
      for (let d = $from.depth; d > 0; d--) {
        if ($from.node(d).type.name === 'table') {
          inTable = true;
          break;
        }
      }
      setIsInTable(inTable);
    };

    editor.on('selectionUpdate', checkTable);
    editor.on('transaction', checkTable);
    return () => {
      editor.off('selectionUpdate', checkTable);
      editor.off('transaction', checkTable);
    };
  }, [editor]);

  if (!isInTable) return null;

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 10px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    background: 'transparent',
    color: 'var(--fg)',
    fontSize: '12px',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  };

  const divider = (
    <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 2px', flexShrink: 0 }} />
  );

  return (
    <div className="table-toolbar">
      <button
        style={btnStyle}
        onClick={() => editor.chain().focus().addRowBefore().run()}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        title="Add row above"
      >
        <ArrowUp size={13} /> Row above
      </button>
      <button
        style={btnStyle}
        onClick={() => editor.chain().focus().addRowAfter().run()}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        title="Add row below"
      >
        <ArrowDown size={13} /> Row below
      </button>
      {divider}
      <button
        style={btnStyle}
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        title="Add column left"
      >
        <ArrowLeft size={13} /> Col left
      </button>
      <button
        style={btnStyle}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        title="Add column right"
      >
        <ArrowRight size={13} /> Col right
      </button>
      {divider}
      <button
        style={{ ...btnStyle, color: '#ef4444' }}
        onClick={() => editor.chain().focus().deleteRow().run()}
        onMouseEnter={e => { e.currentTarget.style.background = 'oklch(95% 0.05 25)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        title="Delete row"
      >
        <Minus size={13} /> Row
      </button>
      <button
        style={{ ...btnStyle, color: '#ef4444' }}
        onClick={() => editor.chain().focus().deleteColumn().run()}
        onMouseEnter={e => { e.currentTarget.style.background = 'oklch(95% 0.05 25)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        title="Delete column"
      >
        <Minus size={13} /> Col
      </button>
      {divider}
      <button
        style={{ ...btnStyle, color: '#ef4444' }}
        onClick={() => editor.chain().focus().deleteTable().run()}
        onMouseEnter={e => { e.currentTarget.style.background = 'oklch(95% 0.05 25)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        title="Delete entire table"
      >
        <Trash2 size={13} /> Table
      </button>
    </div>
  );
}
