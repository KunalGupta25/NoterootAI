import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import NoteEditor from '../components/Editor/NoteEditor';
import { useNoteStore } from '../stores/noteStore';
import {
  Star, Share2, Info, Sparkles, X, Send, Paperclip,
  Bold, Italic, Underline, Strikethrough, Code,
  Quote, Link as LinkIcon, List, ListOrdered, Table, Image,
  Wand2, Check, Scissors, Plus, Palette, Globe
} from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { isBuiltinProvider } from '../lib/providerConfig';
import { AI_URL } from '../lib/constants';

export default function NoteEditorPage() {
  const { id } = useParams();
  const { saveNote, getNote } = useNoteStore();
  const { activeProvider, providerKeys, customProviders, getProviderModel } = useSettingsStore();

  const [title, setTitle] = useState('Untitled');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiTab, setAiTab] = useState<'Chat' | 'Edit'>('Edit');
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

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

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);

  useEffect(() => {
    let active = true;
    if (id && id !== 'new') {
      getNote(id).then(note => {
        if (!active) return;
        if (note) {
          setTitle(note.title || 'Untitled');
          setContent(note.content || '');
          setTags(note.tags || []);
        } else {
          setTitle('Untitled');
          setContent('');
          setTags([]);
        }
        setIsLoaded(true);
      });
    } else {
      setTitle('Untitled');
      setContent('');
      setIsLoaded(true);
    }
    return () => {
      active = false;
    };
  }, [id, getNote]);

  const triggerSave = useCallback(async (newTitle?: string, newContent?: string, newTags?: string[]) => {
    if (!id || id === 'new') return;
    await saveNote({
      _id: id,
      title: newTitle ?? titleRef.current,
      content: newContent ?? contentRef.current,
      icon: '📄',
      parentId: null,
      tags: newTags ?? tags,
    });
  }, [id, saveNote, tags]);

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
          {/* Breadcrumb path */}
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
            <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{title}</span>
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
              marginBottom: '16px',
              letterSpacing: '-0.4px',
              padding: 0,
            }}
          />

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

      {/* ── Right AI Assistant Panel (Collapsible) ── */}
      {showAiAssistant && (
        <aside
          style={{
            width: '290px',
            minWidth: '290px',
            borderLeft: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}
        >
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
