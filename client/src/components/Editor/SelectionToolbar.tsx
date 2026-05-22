import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useState } from 'react';

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

  // Handlers

  return (
    <BubbleMenu editor={editor}>
      <div className="selection-toolbar">
        {showLinkInput ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px' }}>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSetLink();
                if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl(''); }
              }}
              placeholder="https://..."
              autoFocus
              style={{
                fontSize: '13px',
                padding: '4px 8px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                background: 'var(--bg)',
                color: 'var(--fg)',
                outline: 'none',
                width: '200px',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <button
              onClick={handleSetLink}
              className="selection-btn"
              style={{ width: 'auto', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}
            >
              Apply
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`selection-btn ${editor.isActive('bold') ? 'active' : ''}`}
              title="Bold (Ctrl+B)"
            >
              B
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`selection-btn ${editor.isActive('italic') ? 'active' : ''}`}
              title="Italic (Ctrl+I)"
            >
              I
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`selection-btn ${editor.isActive('underline') ? 'active' : ''}`}
              title="Underline (Ctrl+U)"
            >
              U
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`selection-btn ${editor.isActive('strike') ? 'active' : ''}`}
              title="Strikethrough (Ctrl+Shift+S)"
            >
              S
            </button>

            <div className="selection-toolbar-divider" />

            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`selection-btn ${editor.isActive('code') ? 'active' : ''}`}
              title="Inline Code (Ctrl+E)"
            >
              &lt;&gt;
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={`selection-btn ${editor.isActive('highlight') ? 'active' : ''}`}
              title="Highlight"
            >
              H
            </button>

            <div className="selection-toolbar-divider" />

            {editor.isActive('link') ? (
              <button
                onClick={handleUnlink}
                className="selection-btn active"
                title="Remove Link"
              >
                UN
              </button>
            ) : (
              <button
                onClick={() => setShowLinkInput(true)}
                className="selection-btn"
                title="Add Link (Ctrl+K)"
              >
                L
              </button>
            )}
          </>
        )}
      </div>
    </BubbleMenu>
  );
}
