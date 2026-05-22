import { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { GripVertical, Trash2, ArrowUpDown, Copy, ChevronRight } from 'lucide-react';

interface BlockMenuProps {
  editor: Editor;
}

const CONVERT_OPTIONS = [
  { label: 'Text', nodeType: 'paragraph', attrs: {} },
  { label: 'Heading 1', nodeType: 'heading', attrs: { level: 1 } },
  { label: 'Heading 2', nodeType: 'heading', attrs: { level: 2 } },
  { label: 'Heading 3', nodeType: 'heading', attrs: { level: 3 } },
  { label: 'Heading 4', nodeType: 'heading', attrs: { level: 4 } },
  { label: 'Bullet List', nodeType: 'bulletList', attrs: {} },
  { label: 'Numbered List', nodeType: 'orderedList', attrs: {} },
  { label: 'To-do List', nodeType: 'taskList', attrs: {} },
  { label: 'Quote', nodeType: 'blockquote', attrs: {} },
  { label: 'Code Block', nodeType: 'codeBlock', attrs: {} },
];

export default function BlockMenu({ editor }: BlockMenuProps) {
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [showConvert, setShowConvert] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuPos(null);
        setShowConvert(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Show handle near the focused block
  useEffect(() => {
    if (!editor) return;

    const updateHandle = () => {
      const { state } = editor;
      const { $from } = state.selection;

      // Get the top-level node position
      const resolvedPos = state.doc.resolve($from.pos);
      const depth = resolvedPos.depth;
      if (depth === 0) return;

      const blockStart = resolvedPos.start(1);
      const dom = editor.view.nodeDOM(blockStart - 1);

      if (dom && dom instanceof HTMLElement) {
        const editorRect = editor.view.dom.getBoundingClientRect();
        const blockRect = dom.getBoundingClientRect();

        if (handleRef.current) {
          handleRef.current.style.top = `${blockRect.top - editorRect.top}px`;
          handleRef.current.style.opacity = '1';
        }
      }
    };

    editor.on('selectionUpdate', updateHandle);
    editor.on('focus', updateHandle);

    return () => {
      editor.off('selectionUpdate', updateHandle);
      editor.off('focus', updateHandle);
    };
  }, [editor]);

  const handleOpenMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const editorRect = editor.view.dom.parentElement?.getBoundingClientRect();
    if (editorRect) {
      setMenuPos({
        top: rect.top - editorRect.top + rect.height + 4,
        left: rect.left - editorRect.left,
      });
    }
    setShowConvert(false);
  };

  const handleDelete = () => {
    const { state } = editor;
    const { $from } = state.selection;
    const depth = $from.depth;

    if (depth >= 1) {
      const start = $from.start(1) - 1;
      const end = $from.end(1) + 1;
      editor.chain().focus().deleteRange({ from: start, to: end }).run();
    }
    setMenuPos(null);
  };

  const handleDuplicate = () => {
    const { state } = editor;
    const { $from } = state.selection;

    if ($from.depth >= 1) {
      const start = $from.start(1) - 1;
      const end = $from.end(1) + 1;
      const slice = state.doc.slice(start, end);
      editor.chain().focus().insertContentAt(end, slice.content.toJSON()).run();
    }
    setMenuPos(null);
  };

  const handleConvert = (nodeType: string, attrs: Record<string, any>) => {
    switch (nodeType) {
      case 'paragraph':
        editor.chain().focus().setParagraph().run();
        break;
      case 'heading':
        editor.chain().focus().setNode('heading', attrs).run();
        break;
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'orderedList':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'taskList':
        editor.chain().focus().toggleTaskList().run();
        break;
      case 'blockquote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'codeBlock':
        editor.chain().focus().toggleCodeBlock().run();
        break;
    }
    setMenuPos(null);
    setShowConvert(false);
  };

  const handleMoveUp = () => {
    const { state } = editor;
    const { $from } = state.selection;
    if ($from.depth < 1) return;

    const blockStart = $from.start(1) - 1;
    if (blockStart <= 0) return;

    const prevResolved = state.doc.resolve(blockStart - 1);
    if (prevResolved.depth < 1) return;

    const prevBlockStart = prevResolved.start(1) - 1;
    const blockEnd = $from.end(1) + 1;

    const blockContent = state.doc.slice(blockStart, blockEnd);
    const prevBlockContent = state.doc.slice(prevBlockStart, blockStart);

    const tr = state.tr;
    tr.replaceWith(prevBlockStart, blockEnd, blockContent.content.append(prevBlockContent.content));
    editor.view.dispatch(tr);
    setMenuPos(null);
  };

  return (
    <>
      {/* Drag handle */}
      <div
        ref={handleRef}
        className="block-handle"
        onClick={handleOpenMenu}
        title="Drag to move • Click for options"
      >
        <GripVertical size={16} />
      </div>

      {/* Context menu */}
      {menuPos && (
        <div
          ref={menuRef}
          className="block-menu"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <button className="block-menu-item" onClick={handleDelete}>
            <Trash2 size={14} />
            <span>Delete</span>
            <span className="block-menu-shortcut">Del</span>
          </button>
          <button className="block-menu-item" onClick={handleDuplicate}>
            <Copy size={14} />
            <span>Duplicate</span>
            <span className="block-menu-shortcut">⌘D</span>
          </button>
          <button className="block-menu-item" onClick={handleMoveUp}>
            <ArrowUpDown size={14} />
            <span>Move up</span>
            <span className="block-menu-shortcut">⌥↑</span>
          </button>

          <div className="block-menu-divider" />

          <div style={{ position: 'relative' }}>
            <button
              className="block-menu-item"
              onClick={() => setShowConvert(!showConvert)}
            >
              <ChevronRight size={14} style={{ transform: showConvert ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
              <span>Turn into...</span>
            </button>

            {showConvert && (
              <div className="block-menu-sub">
                {CONVERT_OPTIONS.map(opt => (
                  <button
                    key={opt.label}
                    className="block-menu-item"
                    onClick={() => handleConvert(opt.nodeType, opt.attrs)}
                  >
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
