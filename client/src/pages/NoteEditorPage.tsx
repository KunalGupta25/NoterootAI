import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import NoteEditor from '../components/Editor/NoteEditor';
import { useNoteStore } from '../stores/noteStore';
import {
  Star, Share2, Info, Sparkles, X, Send, Paperclip,
  Bold, Italic, Underline, Strikethrough, Code,
  Quote, Link as LinkIcon, List, ListOrdered, Table, Image,
  Wand2, Check, Scissors, Plus, Palette, Globe,
  Folder, ChevronDown
} from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { isBuiltinProvider } from '../lib/providerConfig';
import { AI_URL } from '../lib/constants';

export default function NoteEditorPage() {
  const { id } = useParams();
  const { saveNote, getNote, notes } = useNoteStore();
  const { activeProvider, providerKeys, customProviders, getProviderModel } = useSettingsStore();

  const [title, setTitle] = useState('Untitled');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [space, setSpace] = useState('Other');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiTab, setAiTab] = useState<'Chat' | 'Edit'>('Edit');
  const [editorInstance, setEditorInstance] = useState<any>(null);
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

  // AI Assistant resizable panel width (persisted in localStorage)
  const [aiPanelWidth, setAiPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('noteroot_ai_panel_width');
      return saved ? Math.max(260, Math.min(700, parseInt(saved, 10))) : 320;
    } catch {
      return 320;
    }
  });

  const isResizingRef = useRef(false);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.min(Math.max(window.innerWidth - moveEvent.clientX, 260), 700);
      setAiPanelWidth(newWidth);
      try {
        localStorage.setItem('noteroot_ai_panel_width', String(newWidth));
      } catch {}
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

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

  // AI Assistant chat state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'I can help you write, refine, or analyze this document. Select text or choose an action below.',
    },
  ]);

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
      });
    } else {
      setTitle('Untitled');
      setContent('');
      setSpace('Other');
      setIsLoaded(true);
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

  // AI Assistant action handlers
  const handleAiAction = async (actionLabel: string, promptInstruction: string) => {
    setAiLoading(true);
    const selectedText = editorInstance?.state.selection
      ? editorInstance.state.doc.textBetween(
          editorInstance.state.selection.from,
          editorInstance.state.selection.to,
          ' '
        )
      : '';
    const textToProcess = selectedText || contentRef.current;

    const userMessage = `${actionLabel}: ${textToProcess.slice(0, 80)}...`;
    setAiChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);

    try {
      const apiKey = providerKeys[activeProvider as keyof typeof providerKeys] || '';
      const custom = customProviders.find(c => c.id === activeProvider);

      const res = await fetch(`${AI_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an AI writing assistant for NoteRoot AI. The user asked: "${promptInstruction}". Output your suggestion cleanly.`,
            },
            { role: 'user', content: textToProcess },
          ],
          provider: isBuiltinProvider(activeProvider) ? activeProvider : 'custom',
          model: getProviderModel(activeProvider),
          api_key: apiKey || custom?.apiKey,
          custom_base_url: custom?.baseUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.reply || data.choices?.[0]?.message?.content || 'Completed.';
        setAiChatMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      } else {
        setAiChatMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            text: `⚠️ Could not reach the AI service. Make sure your API key is configured in Settings and the AI service is running.`,
          },
        ]);
      }
    } catch {
      setAiChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ AI service is not reachable. Add an API key in Settings → AI Provider to enable this feature.`,
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendPrompt = () => {
    if (!aiPrompt.trim() || aiLoading) return;
    const text = aiPrompt;
    setAiPrompt('');
    handleAiAction('Custom prompt', text);
  };

  const aiActionButtons = [
    { label: 'Improve writing', icon: <Wand2 size={13} />, prompt: 'Improve clarity and flow while preserving meaning' },
    { label: 'Fix grammar', icon: <Check size={13} />, prompt: 'Fix any spelling, grammar, or punctuation errors' },
    { label: 'Make shorter', icon: <Scissors size={13} />, prompt: 'Condense and make more concise' },
    { label: 'Expand this section', icon: <Plus size={13} />, prompt: 'Elaborate with deeper explanation and examples' },
    { label: 'Change tone', icon: <Palette size={13} />, prompt: 'Make the tone professional, crisp and engaging' },
    { label: 'Translate', icon: <Globe size={13} />, prompt: 'Translate this section into Spanish or target language' },
  ];

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
            <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
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
            padding: '36px 48px 80px',
            maxWidth: '820px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
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
              gap: '4px',
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
              style={toolbarBtnStyle}
            >
              H1
            </button>
            <button
              title="Bold"
              onClick={() => editorInstance?.chain().focus().toggleBold().run()}
              style={toolbarBtnStyle}
            >
              <Bold size={14} />
            </button>
            <button
              title="Italic"
              onClick={() => editorInstance?.chain().focus().toggleItalic().run()}
              style={toolbarBtnStyle}
            >
              <Italic size={14} />
            </button>
            <button
              title="Underline"
              onClick={() => editorInstance?.chain().focus().toggleUnderline?.().run()}
              style={toolbarBtnStyle}
            >
              <Underline size={14} />
            </button>
            <button
              title="Strikethrough"
              onClick={() => editorInstance?.chain().focus().toggleStrike().run()}
              style={toolbarBtnStyle}
            >
              <Strikethrough size={14} />
            </button>
            <button
              title="Inline Code"
              onClick={() => editorInstance?.chain().focus().toggleCode().run()}
              style={toolbarBtnStyle}
            >
              <Code size={14} />
            </button>
            <button
              title="Quote"
              onClick={() => editorInstance?.chain().focus().toggleBlockquote().run()}
              style={toolbarBtnStyle}
            >
              <Quote size={14} />
            </button>
            <button
              title="Link"
              onClick={() => {
                const url = prompt('Enter URL:');
                if (url) editorInstance?.chain().focus().setLink({ href: url }).run();
              }}
              style={toolbarBtnStyle}
            >
              <LinkIcon size={14} />
            </button>
            <button
              title="Bullet list"
              onClick={() => editorInstance?.chain().focus().toggleBulletList().run()}
              style={toolbarBtnStyle}
            >
              <List size={14} />
            </button>
            <button
              title="Numbered list"
              onClick={() => editorInstance?.chain().focus().toggleOrderedList().run()}
              style={toolbarBtnStyle}
            >
              <ListOrdered size={14} />
            </button>
            <button
              title="Table"
              onClick={() => editorInstance?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              style={toolbarBtnStyle}
            >
              <Table size={14} />
            </button>
            <button
              title="Image"
              onClick={() => {
                const src = prompt('Enter image URL:');
                if (src) editorInstance?.chain().focus().setImage({ src }).run();
              }}
              style={toolbarBtnStyle}
            >
              <Image size={14} />
            </button>
          </div>

          {/* TipTap Rich Editor */}
          <div style={{ minHeight: '350px' }}>
            <NoteEditor
              initialContent={content}
              onChange={handleContentChange}
              onEditorReady={setEditorInstance}
            />
          </div>
        </div>
      </div>

      {/* ── Right AI Assistant Panel (Collapsible & Resizable) ── */}
      {showAiAssistant && (
        <aside
          style={{
            width: `${aiPanelWidth}px`,
            minWidth: `${aiPanelWidth}px`,
            maxWidth: `${aiPanelWidth}px`,
            borderLeft: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {/* Draggable Resize Handle on Left Border */}
          <div
            onMouseDown={handleResizeMouseDown}
            title="Drag to resize AI Assistant panel"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '6px',
              cursor: 'col-resize',
              zIndex: 50,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(224, 84, 56, 0.4)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          />
          {/* AI Panel Header */}
          <div
            style={{
              height: '48px',
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--fg)' }}>
              AI Assistant
            </span>
            <button
              onClick={() => setShowAiAssistant(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Chat / Edit Sub-Tabs */}
          <div
            style={{
              display: 'flex',
              padding: '6px 14px',
              gap: '6px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          >
            {(['Chat', 'Edit'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setAiTab(tab)}
                style={{
                  flex: 1,
                  padding: '5px 0',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  background: aiTab === tab ? 'var(--surface)' : 'transparent',
                  color: aiTab === tab ? '#e05438' : 'var(--muted)',
                  boxShadow: aiTab === tab ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* AI Panel Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {aiTab === 'Edit' ? (
              <>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Quick Actions
                </div>
                {aiActionButtons.map(action => (
                  <button
                    key={action.label}
                    onClick={() => handleAiAction(action.label, action.prompt)}
                    disabled={aiLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--fg)',
                      fontSize: '12.5px',
                      cursor: aiLoading ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.12s, border-color 0.12s',
                    }}
                    onMouseEnter={e => {
                      if (!aiLoading) {
                        e.currentTarget.style.borderColor = '#e05438';
                        e.currentTarget.style.background = 'var(--surface)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!aiLoading) {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.background = 'var(--bg)';
                      }
                    }}
                  >
                    <span style={{ color: '#e05438' }}>{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </>
            ) : null}

            {/* Chat Messages */}
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {aiChatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    lineHeight: 1.5,
                    background: msg.role === 'user' ? '#e05438' : 'var(--bg)',
                    color: msg.role === 'user' ? '#ffffff' : 'var(--fg)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.text}
                </div>
              ))}
              {aiLoading && (
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', padding: '4px' }}>
                  AI is thinking...
                </div>
              )}
            </div>
          </div>

          {/* AI Panel Bottom Input */}
          <div
            style={{
              padding: '10px 14px',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '4px 8px',
              }}
            >
              <Paperclip size={14} style={{ color: 'var(--muted)', cursor: 'pointer', flexShrink: 0 }} />
              <input
                type="text"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSendPrompt();
                }}
                placeholder="Ask or edit this note..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: 'var(--fg)',
                  fontSize: '12px',
                  padding: '4px 0',
                }}
              />
              <button
                onClick={handleSendPrompt}
                disabled={aiLoading}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  background: '#e05438',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: aiLoading ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                }}
              >
                <Send size={12} />
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

const toolbarBtnStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '4px',
  border: 'none',
  background: 'transparent',
  color: 'var(--fg)',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
