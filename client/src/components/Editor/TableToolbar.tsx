import { Editor } from '@tiptap/react';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Minus, Trash2, ArrowUp, ArrowLeft } from 'lucide-react';

interface TableToolbarProps {
  editor: Editor;
}

export default function TableToolbar({ editor }: TableToolbarProps) {
  const [isInTable, setIsInTable] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tableMetrics, setTableMetrics] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const checkTable = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setIsInTable(false);
      setTableMetrics(null);
      return;
    }

    const { $from } = editor.state.selection;
    let inTable = false;
    let tableDepth = -1;
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === 'table') {
        inTable = true;
        tableDepth = d;
        break;
      }
    }
    setIsInTable(inTable);

    if (!inTable || tableDepth === -1) {
      setTableMetrics(null);
      return;
    }

    try {
      const tablePos = $from.before(tableDepth);
      const domNode = editor.view.nodeDOM(tablePos);
      if (domNode instanceof HTMLElement) {
        const tableWrapper = domNode.classList.contains('tableWrapper')
          ? domNode
          : (domNode.querySelector('.tableWrapper') as HTMLElement || domNode);

        const editorWrapper = tableWrapper.closest('.prose-wrapper');
        if (editorWrapper) {
          const wrapRect = editorWrapper.getBoundingClientRect();
          const tableRect = tableWrapper.getBoundingClientRect();
          setContainerWidth(wrapRect.width);
          setTableMetrics({
            top: tableRect.top - wrapRect.top,
            left: tableRect.left - wrapRect.left,
            width: tableRect.width,
            height: tableRect.height,
          });
          return;
        }
      }
    } catch {}

    setTableMetrics(null);
  }, [editor]);

  useEffect(() => {
    checkTable();
    editor.on('selectionUpdate', checkTable);
    editor.on('transaction', checkTable);
    window.addEventListener('resize', checkTable);

    return () => {
      editor.off('selectionUpdate', checkTable);
      editor.off('transaction', checkTable);
      window.removeEventListener('resize', checkTable);
    };
  }, [editor, checkTable]);

  if (!isInTable || !tableMetrics) return null;

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    background: 'transparent',
    color: 'var(--fg)',
    fontSize: '12px',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.12s ease',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  };

  const primaryBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: 'rgba(224, 84, 56, 0.1)',
    color: '#e05438',
    fontWeight: 600,
    border: '1px solid rgba(224, 84, 56, 0.25)',
  };

  const divider = (
    <div style={{ width: '1px', height: '18px', background: 'var(--border)', margin: '0 2px', flexShrink: 0 }} />
  );

  return (
    <>
      {/* ── Table Action Bar Anchored Directly Above the Active Table ── */}
      <div
        className="table-toolbar"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          position: 'absolute',
          top: `${Math.max(0, tableMetrics.top - 46)}px`,
          left: `${tableMetrics.left}px`,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '4px 8px',
          gap: '3px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
          zIndex: 40,
          width: 'fit-content',
          maxWidth: 'calc(100% - 16px)',
          overflowX: 'auto',
          userSelect: 'none',
          backdropFilter: 'blur(8px)',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
        }}
      >
        {/* Quick Add Row / Col (Prominent) */}
        <button
          style={primaryBtnStyle}
          onClick={() => editor.chain().focus().addRowAfter().run()}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224, 84, 56, 0.18)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(224, 84, 56, 0.1)'; }}
          title="Add a new row below current row"
        >
          <Plus size={13} />
          <span>Row below</span>
        </button>

        <button
          style={primaryBtnStyle}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224, 84, 56, 0.18)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(224, 84, 56, 0.1)'; }}
          title="Add a new column to the right"
        >
          <Plus size={13} />
          <span>Col right</span>
        </button>

        {divider}

        {/* Directional Row/Col Insertions */}
        <button
          style={btnStyle}
          onClick={() => editor.chain().focus().addRowBefore().run()}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          title="Add row above"
        >
          <ArrowUp size={12} />
          <span>Row above</span>
        </button>

        <button
          style={btnStyle}
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          title="Add column to the left"
        >
          <ArrowLeft size={12} />
          <span>Col left</span>
        </button>

        {divider}

        {/* Headers & Cell Utilities */}
        <button
          style={btnStyle}
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          title="Toggle table header row"
        >
          <span>Header row</span>
        </button>

        <button
          style={btnStyle}
          onClick={() => editor.chain().focus().mergeOrSplit().run()}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          title="Merge selected cells or split merged cell"
        >
          <span>Merge / Split</span>
        </button>

        {divider}

        {/* Deletions */}
        <button
          style={{ ...btnStyle, color: '#ef4444' }}
          onClick={() => editor.chain().focus().deleteRow().run()}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          title="Delete current row"
        >
          <Minus size={12} /> Row
        </button>

        <button
          style={{ ...btnStyle, color: '#ef4444' }}
          onClick={() => editor.chain().focus().deleteColumn().run()}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          title="Delete current column"
        >
          <Minus size={12} /> Col
        </button>

        <button
          style={{ ...btnStyle, color: '#ef4444' }}
          onClick={() => editor.chain().focus().deleteTable().run()}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          title="Delete entire table"
        >
          <Trash2 size={12} />
        </button>

        {divider}

        <div
          style={{
            fontSize: '11px',
            color: 'var(--muted)',
            padding: '0 4px',
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Tip: Tab in last cell adds row
        </div>
      </div>

      {/* ── Direct In-Table Controls ── */}
      {/* Quick Add Row Button right at the bottom of the active table */}
      <button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().addRowAfter().run();
        }}
        style={{
          position: 'absolute',
          top: `${tableMetrics.top + tableMetrics.height + 6}px`,
          left: `${tableMetrics.left}px`,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          fontSize: '11.5px',
          fontWeight: 500,
          color: 'var(--muted)',
          background: 'var(--surface)',
          border: '1px dashed var(--border)',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          zIndex: 25,
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = '#e05438';
          e.currentTarget.style.borderColor = '#e05438';
          e.currentTarget.style.background = 'rgba(224, 84, 56, 0.08)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--muted)';
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.background = 'var(--surface)';
        }}
        title="Add a new row at bottom (or press Tab in last cell)"
      >
        <Plus size={13} />
        <span>Add row</span>
      </button>

      {/* Quick Add Column Button at the right edge (only when room is available) */}
      {tableMetrics.left + tableMetrics.width + 44 <= containerWidth && (
        <button
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().addColumnAfter().run();
          }}
          style={{
            position: 'absolute',
            top: `${tableMetrics.top}px`,
            left: `${tableMetrics.left + tableMetrics.width + 6}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '6px 8px',
            fontSize: '11.5px',
            fontWeight: 500,
            color: 'var(--muted)',
            background: 'var(--surface)',
            border: '1px dashed var(--border)',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            zIndex: 25,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#e05438';
            e.currentTarget.style.borderColor = '#e05438';
            e.currentTarget.style.background = 'rgba(224, 84, 56, 0.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--muted)';
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.background = 'var(--surface)';
          }}
          title="Add a new column to the right"
        >
          <Plus size={13} />
          <span>Col</span>
        </button>
      )}
    </>
  );
}


