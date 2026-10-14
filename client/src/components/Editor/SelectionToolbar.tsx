import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  Code, Code2, Link as LinkIcon, Unlink, Check, X,
  ChevronDown, Type, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote
} from 'lucide-react';
import { PluginBubbleButtons } from '../../plugins/slots/PluginBubbleButtons';

interface SelectionToolbarProps {
  editor: Editor;
}

export default function SelectionToolbar({ editor }: SelectionToolbarProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showTurnInto, setShowTurnInto] = useState(false);
  const turnIntoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (turnIntoRef.current && !turnIntoRef.current.contains(e.target as Node)) {
        setShowTurnInto(false);
      }
    };
    if (showTurnInto) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showTurnInto]);

  const handleSetLink = () => {
    if (linkUrl.trim()) {
      editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const handleUnlink = () => {
    editor.chain().focus().unsetLink().run();
  };

  const getBlockLabel = () => {
    if (editor.isActive('heading', { level: 1 })) return 'H1';
    if (editor.isActive('heading', { level: 2 })) return 'H2';
    if (editor.isActive('heading', { level: 3 })) return 'H3';
    if (editor.isActive('codeBlock')) return 'Code Block';
    if (editor.isActive('blockquote')) return 'Quote';
    if (editor.isActive('bulletList')) return 'Bullet';
    if (editor.isActive('orderedList')) return 'Number';
    return 'Text';
  };

  const convertBlock = (type: string, attrs: Record<string, any> = {}) => {
    switch (type) {
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
      case 'blockquote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'codeBlock':
        editor.chain().focus().toggleCodeBlock().run();
        break;
    }
    setShowTurnInto(false);
  };

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '3px',
    padding: '4px 6px',
    borderRadius: '8px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    zIndex: 9999,
  };

  const btnStyle = (isActive = false): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    padding: 0,
    background: isActive ? 'rgba(224, 84, 56, 0.16)' : 'transparent',
    color: isActive ? '#e05438' : 'var(--muted)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  });

  const dividerStyle: React.CSSProperties = {
    width: '1px',
    height: '16px',
    background: 'var(--border)',
    margin: '0 3px',
    flexShrink: 0,
  };

  return (
    <BubbleMenu editor={editor}>
      <div className="selection-toolbar" style={toolbarStyle}>
        {showLinkInput ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 4px' }}>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSetLink();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowLinkInput(false);
                  setLinkUrl('');
                }
              }}
              placeholder="Paste or type URL..."
              autoFocus
              style={{
                fontSize: '12.5px',
                padding: '4px 8px',
                border: '1px solid var(--border)',
                borderRadius: '5px',
                background: 'var(--bg)',
                color: 'var(--fg)',
                outline: 'none',
                width: '180px',
              }}
            />
            <button
              onClick={handleSetLink}
              title="Apply link"
              style={{
                ...btnStyle(true),
                width: '26px',
                height: '26px',
                background: '#e05438',
                color: '#ffffff',
              }}
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => {
                setShowLinkInput(false);
                setLinkUrl('');
              }}
              title="Cancel"
              style={{
                ...btnStyle(false),
                width: '26px',
                height: '26px',
              }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            {/* Convert Block Dropdown */}
            <div style={{ position: 'relative' }} ref={turnIntoRef}>
              <button
                onClick={() => setShowTurnInto(!showTurnInto)}
                className="selection-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0 6px',
                  height: '28px',
                  borderRadius: '6px',
                  background: showTurnInto ? 'var(--surface-2)' : 'transparent',
                  color: 'var(--fg)',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="Convert block"
              >
                <span>{getBlockLabel()}</span>
                <ChevronDown size={12} style={{ color: 'var(--muted)' }} />
              </button>

              {showTurnInto && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    minWidth: '150px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
                    padding: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    zIndex: 10000,
                  }}
                >
                  {[
                    { label: 'Text', type: 'paragraph', icon: Type, active: editor.isActive('paragraph') },
                    { label: 'Heading 1', type: 'heading', attrs: { level: 1 }, icon: Heading1, active: editor.isActive('heading', { level: 1 }) },
                    { label: 'Heading 2', type: 'heading', attrs: { level: 2 }, icon: Heading2, active: editor.isActive('heading', { level: 2 }) },
                    { label: 'Heading 3', type: 'heading', attrs: { level: 3 }, icon: Heading3, active: editor.isActive('heading', { level: 3 }) },
                    { label: 'Bullet List', type: 'bulletList', icon: List, active: editor.isActive('bulletList') },
                    { label: 'Numbered List', type: 'orderedList', icon: ListOrdered, active: editor.isActive('orderedList') },
                    { label: 'Quote', type: 'blockquote', icon: Quote, active: editor.isActive('blockquote') },
                    { label: 'Code Block', type: 'codeBlock', icon: Code2, active: editor.isActive('codeBlock') },
                  ].map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => convertBlock(opt.type, opt.attrs)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: 'none',
                        background: opt.active ? 'rgba(224, 84, 56, 0.12)' : 'transparent',
                        color: opt.active ? '#e05438' : 'var(--fg)',
                        fontSize: '12px',
                        fontWeight: opt.active ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => {
                        if (!opt.active) e.currentTarget.style.background = 'var(--surface-2)';
                      }}
                      onMouseLeave={e => {
                        if (!opt.active) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <opt.icon size={13} style={{ color: opt.active ? '#e05438' : 'var(--muted)' }} />
                        <span>{opt.label}</span>
                      </div>
                      {opt.active && <Check size={12} style={{ color: '#e05438' }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="selection-toolbar-divider" style={dividerStyle} />

            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`selection-btn ${editor.isActive('bold') ? 'active' : ''}`}
              style={btnStyle(editor.isActive('bold'))}
              title="Bold (Ctrl+B)"
            >
              <Bold size={14} />
            </button>

            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`selection-btn ${editor.isActive('italic') ? 'active' : ''}`}
              style={btnStyle(editor.isActive('italic'))}
              title="Italic (Ctrl+I)"
            >
              <Italic size={14} />
            </button>

            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`selection-btn ${editor.isActive('underline') ? 'active' : ''}`}
              style={btnStyle(editor.isActive('underline'))}
              title="Underline (Ctrl+U)"
            >
              <Underline size={14} />
            </button>

            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`selection-btn ${editor.isActive('strike') ? 'active' : ''}`}
              style={btnStyle(editor.isActive('strike'))}
              title="Strikethrough (Ctrl+Shift+S)"
            >
              <Strikethrough size={14} />
            </button>

            <div className="selection-toolbar-divider" style={dividerStyle} />

            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`selection-btn ${editor.isActive('code') ? 'active' : ''}`}
              style={btnStyle(editor.isActive('code'))}
              title="Inline Code (Ctrl+E)"
            >
              <Code size={14} />
            </button>

            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`selection-btn ${editor.isActive('codeBlock') ? 'active' : ''}`}
              style={btnStyle(editor.isActive('codeBlock'))}
              title="Code Block"
            >
              <Code2 size={14} />
            </button>

            <button
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={`selection-btn ${editor.isActive('highlight') ? 'active' : ''}`}
              style={btnStyle(editor.isActive('highlight'))}
              title="Highlight"
            >
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '1px 3px',
                  borderRadius: '3px',
                  background: editor.isActive('highlight') ? '#eab308' : 'rgba(234, 179, 8, 0.25)',
                  color: editor.isActive('highlight') ? '#000000' : 'var(--fg)',
                  lineHeight: 1,
                }}
              >
                H
              </span>
            </button>

            <div className="selection-toolbar-divider" style={dividerStyle} />

            {editor.isActive('link') ? (
              <button
                onClick={handleUnlink}
                className="selection-btn active"
                style={btnStyle(true)}
                title="Remove Link"
              >
                <Unlink size={14} />
              </button>
            ) : (
              <button
                onClick={() => {
                  const currentLink = editor.getAttributes('link').href || '';
                  setLinkUrl(currentLink);
                  setShowLinkInput(true);
                }}
                className="selection-btn"
                style={btnStyle(false)}
                title="Add Link (Ctrl+K)"
              >
                <LinkIcon size={14} />
              </button>
            )}

            <PluginBubbleButtons editor={editor} />
          </>
        )}
      </div>
    </BubbleMenu>
  );
}
