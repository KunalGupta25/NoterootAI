import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  Code, Link as LinkIcon, Unlink, Check, X
} from 'lucide-react';
import { PluginBubbleButtons } from '../../plugins/slots/PluginBubbleButtons';

interface SelectionToolbarProps {
  editor: Editor;
}

export default function SelectionToolbar({ editor }: SelectionToolbarProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

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
    background: isActive ? 'rgba(224, 84, 56, 0.14)' : 'transparent',
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
