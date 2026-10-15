import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import NoteEditor from '../components/Editor/NoteEditor';
import { useNoteStore } from '../stores/noteStore';
import {
  Star, Share2, Info, Sparkles, X,
  Bold, Italic, Underline, Strikethrough, Code, Code2,
  Quote, Link as LinkIcon, List, ListOrdered, Table, Image,
  Check, Plus,
  Folder, ChevronDown, CheckSquare, Maximize2, Minimize2
} from 'lucide-react';
import { NotePageActionsBar } from '../plugins/slots/NotePageActionsBar';
import { NoteAIPanel } from '../components/Sidebar/NoteAIPanel';

export default function NoteEditorPage() {
  const { id } = useParams();
  const { saveNote, getNote, notes } = useNoteStore();

  const [title, setTitle] = useState('Untitled');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [space, setSpace] = useState('Other');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [, setEditorTick] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditorReady = useCallback((inst: any) => {
    setEditorInstance(inst);
    inst.on('selectionUpdate', () => setEditorTick(t => t + 1));
    inst.on('transaction', () => setEditorTick(t => t + 1));
  }, []);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const infoModalRef = useRef<HTMLDivElement>(null);

  // Space manager state
  const [showSpaceMenu, setShowSpaceMenu] = useState(false);
  const [newSpaceInput, setNewSpaceInput] = useState('');
  const spaceMenuRef = useRef<HTMLDivElement>(null);

  // Tag manager state
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Full-width editor layout toggle (persisted in localStorage, defaults to true for wide space utilization)
  const [isFullWidth, setIsFullWidth] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('noteroot_editor_full_width');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleFullWidth = () => {
    setIsFullWidth(prev => {
      const next = !prev;
      try {
        localStorage.setItem('noteroot_editor_full_width', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const availableSpaces = useMemo(() => {
    const set = new Set<string>(['Other']);
    notes.forEach(n => {
      if (n.space) set.add(n.space);
    });
    return Array.from(set).sort();
  }, [notes]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (infoModalRef.current && !infoModalRef.current.contains(e.target as Node)) {
        setShowInfoModal(false);
      }
      if (spaceMenuRef.current && !spaceMenuRef.current.contains(e.target as Node)) {
        setShowSpaceMenu(false);
      }
    };
    if (showInfoModal || showSpaceMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showInfoModal, showSpaceMenu]);



  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const spaceRef = useRef(space);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { spaceRef.current = space; }, [space]);

  useEffect(() => {
    let active = true;
    if (id && id !== 'new') {
      getNote(id).then(note => {
        if (!active) return;
        if (note) {
          setTitle(note.title || 'Untitled');
          setContent(note.content || '');
          setTags(note.tags || []);
          setSpace(note.space || 'Other');
        } else {
          setTitle('Untitled');
          setContent('');
          setTags([]);
          setSpace('Other');
        }
        setIsLoaded(true);
        window.dispatchEvent(new CustomEvent('NOTEROOT_NOTE_OPENED', { detail: { noteId: id } }));
      });
    } else {
      setTimeout(() => {
        if (!active) return;
        setTitle('Untitled');
        setContent('');
        setSpace('Other');
        setIsLoaded(true);
      }, 0);
    }
    return () => {
      active = false;
    };
  }, [id, getNote]);

  const triggerSave = useCallback(async (newTitle?: string, newContent?: string, newTags?: string[], newSpace?: string) => {
    if (!id || id === 'new') return;
    await saveNote({
      _id: id,
      title: newTitle ?? titleRef.current,
      content: newContent ?? contentRef.current,
      icon: '📄',
      parentId: null,
      tags: newTags ?? tags,
      space: newSpace ?? spaceRef.current,
    });
  }, [id, saveNote, tags]);

  const handleMigrateSpace = (targetSpace: string) => {
    const clean = targetSpace.trim();
    if (!clean) return;
    setSpace(clean);
    spaceRef.current = clean;
    setShowSpaceMenu(false);
    setNewSpaceInput('');
    triggerSave(undefined, undefined, undefined, clean);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTitle(v);
    titleRef.current = v;
    triggerSave(v, undefined);
  };

  const handleContentChange = useCallback((html: string) => {
    setContent(html);
    contentRef.current = html;
    triggerSave(undefined, html);
  }, [triggerSave]);

  const handleAddTag = (rawTag: string) => {
    const clean = rawTag.trim().replace(/^#/, '');
    if (!clean || tags.includes(clean)) {
      setNewTagInput('');
      setIsAddingTag(false);
      return;
    }
    const nextTags = [...tags, clean];
    setTags(nextTags);
    setNewTagInput('');
    setIsAddingTag(false);
    triggerSave(undefined, undefined, nextTags);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter(t => t !== tagToRemove);
    setTags(nextTags);
    triggerSave(undefined, undefined, nextTags);
  };



  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
        Loading note...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      {/* ── Main Editor Column ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* Top Breadcrumb Bar */}
        <div
          style={{
            height: '48px',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
            flexShrink: 0,
          }}
        >
          {/* Breadcrumb path & Space Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              color: 'var(--muted)',
            }}
          >
            <Link to="/app" style={{ color: 'inherit', textDecoration: 'none' }}>
              NoteRoot AI
            </Link>
            <span>/</span>
            <Link to="/notes" style={{ color: 'inherit', textDecoration: 'none' }}>All Notes</Link>
            <span>/</span>

            {/* Space Migration Dropdown */}
            <div style={{ position: 'relative' }} ref={spaceMenuRef}>
              <button
                onClick={() => setShowSpaceMenu(!showSpaceMenu)}
                title="Migrate or change space"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: showSpaceMenu ? 'rgba(224, 84, 56, 0.12)' : 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: '#e05438',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
              >
                <Folder size={12} />
                <span>{space}</span>
                <ChevronDown size={11} style={{ opacity: 0.7 }} />
              </button>

              {showSpaceMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '6px',
                    width: '210px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    zIndex: 300,
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', padding: '4px 6px', textTransform: 'uppercase' }}>
                    Move to Space
                  </div>
                  <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {availableSpaces.map(sp => (
                      <button
                        key={sp}
                        onClick={() => handleMigrateSpace(sp)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: 'none',
                          background: sp === space ? 'rgba(224, 84, 56, 0.12)' : 'transparent',
                          color: sp === space ? '#e05438' : 'var(--fg)',
                          fontSize: '12px',
                          fontWeight: sp === space ? 600 : 400,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => {
                          if (sp !== space) e.currentTarget.style.background = 'var(--surface-2)';
                        }}
                        onMouseLeave={e => {
                          if (sp !== space) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Folder size={13} style={{ color: sp === space ? '#e05438' : 'var(--muted)' }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp}</span>
                        </div>
                        {sp === space && <Check size={13} style={{ color: '#e05438' }} />}
                      </button>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '2px', display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      placeholder="New space..."
                      value={newSpaceInput}
                      onChange={e => setNewSpaceInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newSpaceInput.trim()) {
                          handleMigrateSpace(newSpaceInput);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        color: 'var(--fg)',
                        fontSize: '11.5px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleMigrateSpace(newSpaceInput)}
                      disabled={!newSpaceInput.trim()}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        background: newSpaceInput.trim() ? '#e05438' : 'var(--surface-2)',
                        color: newSpaceInput.trim() ? '#ffffff' : 'var(--muted)',
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: newSpaceInput.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            <span>/</span>
            <span style={{ color: 'var(--fg)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
              {title}
            </span>
          </div>

          {/* Right Action Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsStarred(!isStarred)}
              title="Bookmark note"
              style={{
                background: 'transparent',
                border: 'none',
                color: isStarred ? '#eab308' : 'var(--muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Star size={16} fill={isStarred ? '#eab308' : 'none'} />
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopiedShare(true);
                setTimeout(() => setCopiedShare(false), 2000);
              }}
              title={copiedShare ? "Link copied!" : "Share note link"}
              style={{
                background: copiedShare ? 'rgba(34,197,94,0.12)' : 'transparent',
                border: 'none',
                color: copiedShare ? '#22c55e' : 'var(--muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                transition: 'all 0.15s',
              }}
            >
              {copiedShare ? <Check size={16} /> : <Share2 size={16} />}
              {copiedShare && <span style={{ fontWeight: 500 }}>Copied</span>}
            </button>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowInfoModal(!showInfoModal)}
                title="Note details & statistics"
                style={{
                  background: showInfoModal ? 'rgba(224,84,56,0.12)' : 'transparent',
                  border: 'none',
                  color: showInfoModal ? '#e05438' : 'var(--muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <Info size={16} />
              </button>

              {showInfoModal && (
                <div
                  ref={infoModalRef}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '260px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    zIndex: 200,
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>Note Information</span>
                    <button
                      onClick={() => setShowInfoModal(false)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '2px' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>Words</span>
                      <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{(content.replace(/<[^>]+>/g, ' ').match(/\b\S+\b/g) || []).length}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>Characters</span>
                      <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{content.replace(/<[^>]+>/g, '').length}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>Reading time</span>
                      <span style={{ fontWeight: 600, color: 'var(--fg)' }}>
                        ~{Math.max(1, Math.ceil(((content.replace(/<[^>]+>/g, ' ').match(/\b\S+\b/g) || []).length) / 200))} min
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)' }}>Space</span>
                      <span style={{ fontWeight: 500, color: '#e05438' }}>{space}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)' }}>Tags</span>
                      <span style={{ fontWeight: 500, color: 'var(--fg)' }}>
                        {tags.length > 0 ? tags.join(', ') : 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {id && id !== 'new' && <NotePageActionsBar noteId={id} />}
            <button
              onClick={toggleFullWidth}
              title={isFullWidth ? "Standard width" : "Full width"}
              style={{
                background: isFullWidth ? 'rgba(224, 84, 56, 0.12)' : 'transparent',
                border: 'none',
                color: isFullWidth ? '#e05438' : 'var(--muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => !isFullWidth && (e.currentTarget.style.color = 'var(--fg)')}
              onMouseLeave={e => !isFullWidth && (e.currentTarget.style.color = 'var(--muted)')}
            >
              {isFullWidth ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={() => setShowAiAssistant(!showAiAssistant)}
              title="Toggle AI Assistant"
              style={{
                background: showAiAssistant ? 'rgba(224, 84, 56, 0.12)' : 'transparent',
                color: showAiAssistant ? '#e05438' : 'var(--muted)',
                border: '1px solid',
                borderColor: showAiAssistant ? '#e05438' : 'var(--border)',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                marginLeft: '6px',
              }}
            >
              <Sparkles size={13} />
              <span>AI Assistant</span>
            </button>
          </div>
        </div>

        {/* Scrollable Note Body Container */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isFullWidth ? '32px 56px 80px' : '36px 48px 80px',
            maxWidth: isFullWidth ? '100%' : '1100px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
            transition: 'max-width 0.15s ease, padding 0.15s ease',
          }}
        >
          {/* Note Title Input */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            style={{
              fontSize: '28px',
              fontWeight: 700,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--fg)',
              width: '100%',
              marginBottom: '10px',
              letterSpacing: '-0.4px',
              padding: 0,
            }}
          />

          {/* Tags Chips Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
              marginBottom: '20px',
            }}
          >
            {tags.map(t => (
              <span
                key={t}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: 'rgba(224, 84, 56, 0.1)',
                  color: '#e05438',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                <span>#{t}</span>
                <button
                  onClick={() => handleRemoveTag(t)}
                  title={`Remove #${t}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#e05438',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}

            {isAddingTag ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="text"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddTag(newTagInput);
                    }
                    if (e.key === 'Escape') {
                      setIsAddingTag(false);
                      setNewTagInput('');
                    }
                  }}
                  onBlur={() => {
                    if (newTagInput.trim()) {
                      handleAddTag(newTagInput);
                    } else {
                      setIsAddingTag(false);
                    }
                  }}
                  placeholder="tag name..."
                  autoFocus
                  style={{
                    padding: '2px 8px',
                    fontSize: '12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--fg)',
                    outline: 'none',
                    width: '100px',
                  }}
                />
              </div>
            ) : (
              <button
                onClick={() => setIsAddingTag(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: 'transparent',
                  border: '1px dashed var(--border)',
                  color: 'var(--muted)',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  transition: 'color 0.12s, border-color 0.12s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#e05438';
                  e.currentTarget.style.borderColor = '#e05438';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--muted)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <Plus size={11} />
                <span>Add tag</span>
              </button>
            )}
          </div>

          {/* Formatting Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '6px 8px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}
          >
            <button
              title="Heading 1"
              onClick={() => editorInstance?.chain().focus().toggleHeading({ level: 1 }).run()}
              style={getToolbarBtnStyle(editorInstance?.isActive('heading', { level: 1 }))}
            >
              H1
            </button>
            <button
              title="Heading 2"
              onClick={() => editorInstance?.chain().focus().toggleHeading({ level: 2 }).run()}
              style={getToolbarBtnStyle(editorInstance?.isActive('heading', { level: 2 }))}
            >
              H2
            </button>
            <button
              title="Bold"
              onClick={() => editorInstance?.chain().focus().toggleBold().run()}
              style={getToolbarBtnStyle(editorInstance?.isActive('bold'))}
            >
              <Bold size={14} />
            </button>
            <button
              title="Italic"
              onClick={() => editorInstance?.chain().focus().toggleItalic().run()}
              style={getToolbarBtnStyle(editorInstance?.isActive('italic'))}
            >
              <Italic size={14} />
            </button>
            <button
              title="Underline"
              onClick={() => editorInstance?.chain().focus().toggleUnderline?.().run()}
              style={getToolbarBtnStyle(editorInstance?.isActive('underline'))}
            >
              <Underline size={14} />
            </button>
            <button
              title="Strikethrough"
              onClick={() => editorInstance?.chain().focus().toggleStrike().run()}
              style={getToolbarBtnStyle(editorInstance?.isActive('strike'))}
            >
              <Strikethrough size={14} />
            </button>

            <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />

            <button
              title="Inline Code"
              onClick={() => editorInstance?.chain().focus().toggleCode().run()}
              style={getToolbarBtnStyle(editorInstance?.isActive('code'))}
            >
              <Code size={14} />
            </button>
            <button
              title="Code Block"
              onClick={() => editorInstance?.chain().focus().toggleCodeBlock().run()}
              style={getToolbarBtnStyle(editorInstance?.isActive('codeBlock'))}
            >
              <Code2 size={14} />
            </button>
            <button
              title="Quote"
              onClick={() => editorInstance?.chain().focus().toggleBlockquote().run()}
              style={getToolbarBtnStyle(editorInstance?.isActive('blockquote'))}
            >
              <Quote size={14} />
            </button>

            <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />

            <button
              title="Bullet list"
              onClick={() => editorInstance?.chain().focus().toggleBulletList().run()}
              style={getToolbarBtnStyle(editorInstance?.isActive('bulletList'))}
            >
              <List size={14} />
            </button>
            <button
              title="Numbered list"
              onClick={() => editorInstance?.chain().focus().toggleOrderedList().run()}
              style={getToolbarBtnStyle(editorInstance?.isActive('orderedList'))}
            >
              <ListOrdered size={14} />
            </button>
            <button
              title="Checklist"
              onClick={() => editorInstance?.chain().focus().toggleTaskList().run()}
              style={getToolbarBtnStyle(editorInstance?.isActive('taskList'))}
            >
              <CheckSquare size={14} />
            </button>
            <button
              title="Link"
              onClick={() => {
                const url = prompt('Enter URL:');
                if (url) editorInstance?.chain().focus().setLink({ href: url }).run();
              }}
              style={getToolbarBtnStyle(editorInstance?.isActive('link'))}
            >
              <LinkIcon size={14} />
            </button>
            <button
              title="Table"
              onClick={() => editorInstance?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              style={getToolbarBtnStyle(false)}
            >
              <Table size={14} />
            </button>
            <button
              title="Image"
              onClick={() => {
                const src = prompt('Enter image URL:');
                if (src) editorInstance?.chain().focus().setImage({ src }).run();
              }}
              style={getToolbarBtnStyle(false)}
            >
              <Image size={14} />
            </button>
          </div>

          {/* TipTap Rich Editor */}
          <div style={{ minHeight: '350px' }}>
            <NoteEditor
              initialContent={content}
              onChange={handleContentChange}
              onEditorReady={handleEditorReady}
            />
          </div>
        </div>
      </div>

      {/* ── Right AI Assistant Panel (Collapsible & Resizable) ── */}
      {showAiAssistant && (
        <NoteAIPanel
          noteId={id}
          editorInstance={editorInstance}
          getNoteHtml={() => contentRef.current}
          title={title}
          onClose={() => setShowAiAssistant(false)}
        />
      )}
    </div>
  );
}

const getToolbarBtnStyle = (isActive: boolean = false): React.CSSProperties => ({
  width: '28px',
  height: '28px',
  borderRadius: '6px',
  border: 'none',
  background: isActive ? 'rgba(224, 84, 56, 0.16)' : 'transparent',
  color: isActive ? '#e05438' : 'var(--muted)',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.12s ease',
});
