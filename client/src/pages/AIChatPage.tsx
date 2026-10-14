import { useState, useRef, useEffect, useCallback } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useChatStore } from '../stores/chatStore';
import { isBuiltinProvider } from '../lib/providerConfig';
import { AI_URL } from '../lib/constants';
import {
  Sparkles, Send, Search,
  Paperclip, Copy, Check, Bot, AlertTriangle, Settings as SettingsIcon, Trash2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from '../components/Markdown/CodeBlock';
import { useNoteStore } from '../stores/noteStore';
import { Link } from 'react-router-dom';

interface LocalMessage {
  role: 'user' | 'assistant';
  content: string;
}

const STARTER_PROMPTS = [
  'What are the key learnings from my RAG notes?',
  'Summarize the meeting notes from last week.',
  'Compare these two documents.',
  'Find notes related to image processing.',
];

export default function AIChatPage() {
  const settingsStore = useSettingsStore();
  const chatStore = useChatStore();
  const { notes } = useNoteStore();

  const [scope, setScope] = useState<'global' | 'selected'>('global');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showAttachPicker, setShowAttachPicker] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const activeProvider = settingsStore.activeProvider;
  const activeModel = settingsStore.getProviderModel(activeProvider);
  const hasApiKey = settingsStore.isActiveProviderConfigured();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const getApiInfo = useCallback(() => {
    const { providerKeys, customProviders } = useSettingsStore.getState();
    if (isBuiltinProvider(activeProvider)) {
      return { apiKey: providerKeys[activeProvider] ?? '', customBaseUrl: undefined };
    }
    const custom = customProviders.find(c => c.id === activeProvider);
    return { apiKey: custom?.apiKey ?? '', customBaseUrl: custom?.baseUrl };
  }, [activeProvider]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg = text.trim();
    setInput('');
    const newMsgs: LocalMessage[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMsgs);
    setLoading(true);

    let chatId = activeChatId;
    if (!chatId) {
      chatId = chatStore.createConversation(activeProvider, activeModel);
      setActiveChatId(chatId);
    }
    chatStore.addMessage(chatId, { role: 'user', content: userMsg, timestamp: Date.now() });

    const chosenNote = (scope === 'selected' && selectedNoteId)
      ? notes.find(n => n._id === selectedNoteId)
      : null;

    let payloadMsgs = newMsgs;
    if (chosenNote) {
      const noteClean = (chosenNote.content || '').replace(/<[^>]+>/g, ' ').slice(0, 3000);
      payloadMsgs = [
        ...newMsgs.slice(0, -1),
        {
          role: 'user',
          content: `Document Reference ("${chosenNote.title}"):\n"""\n${noteClean}\n"""\n\nQuestion: ${userMsg}`,
        },
      ];
    }

    try {
      const { apiKey, customBaseUrl } = getApiInfo();
      const res = await fetch(`${AI_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMsgs,
          provider: isBuiltinProvider(activeProvider) ? activeProvider : 'custom',
          model: activeModel,
          api_key: apiKey,
          custom_base_url: customBaseUrl,
          use_vault: true,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      const assistantText = data.reply || data.choices?.[0]?.message?.content || 'No response generated.';
      setMessages([...newMsgs, { role: 'assistant', content: assistantText }]);
      chatStore.addMessage(chatId, { role: 'assistant', content: assistantText, timestamp: Date.now() });
    } catch {
      // Real vault fallback synthesis
      let fallback = '';
      if (chosenNote) {
        const cleanSnippet = (chosenNote.content || '').replace(/<[^>]+>/g, ' ').slice(0, 300);
        fallback = `Referenced your note **${chosenNote.title}**:\n\n> "${cleanSnippet.trim() || 'No text content found in note'}..."\n\n*Configure an AI API key in Settings for open generative answers.*`;
      } else {
        const matchingNotes = notes.filter(n =>
          n.title.toLowerCase().includes(userMsg.toLowerCase()) ||
          (n.content && n.content.toLowerCase().includes(userMsg.toLowerCase()))
        );

        if (matchingNotes.length > 0) {
          const topNote = matchingNotes[0];
          const cleanSnippet = topNote.content.replace(/<[^>]+>/g, ' ').slice(0, 260);
          fallback = `Found relevant content in your note **${topNote.title}**:\n\n> "${cleanSnippet.trim()}..."\n\n*Configure an AI API key in Settings for full generative answers.*`;
        } else if (notes.length > 0) {
          fallback = `I searched your vault across ${notes.length} note(s). No direct match was found for "${userMsg}". Configure an AI API key in Settings to enable open-ended generation.`;
        } else {
          fallback = `Your vault currently has no notes to reference. Create a note or add the Tutorial Guide from the Dashboard!`;
        }
      }

      setMessages([...newMsgs, { role: 'assistant', content: fallback }]);
      chatStore.addMessage(chatId, { role: 'assistant', content: fallback, timestamp: Date.now() });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxWidth: '900px',
        margin: '0 auto',
        padding: '32px 32px 24px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* ── Top Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: hasApiKey ? 'rgba(224, 84, 56, 0.1)' : 'rgba(120,120,120,0.1)',
              border: `1px solid ${hasApiKey ? 'rgba(224, 84, 56, 0.2)' : 'var(--border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: hasApiKey ? '#e05438' : 'var(--muted)',
              flexShrink: 0,
            }}
          >
            <Bot size={22} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '-0.3px',
                margin: '0 0 3px 0',
                color: 'var(--fg)',
              }}
            >
              Chat with Your Knowledge
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
              {hasApiKey
                ? 'Get answers from your notes, documents, and connected sources.'
                : 'AI is disabled — no active provider or key configured.'}
            </p>
          </div>
        </div>

        {/* Top Header Actions (Active Model & Clear Chat) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <Link
            to="/settings"
            title="Configure active provider & model in Settings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '6px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--fg)',
              fontSize: '12.5px',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'border-color 0.12s',
            }}
          >
            <span style={{ color: hasApiKey ? '#22c55e' : '#eab308' }}>●</span>
            <span style={{ textTransform: 'capitalize' }}>{activeProvider}</span>
            <span style={{ color: 'var(--muted)', fontSize: '11.5px' }}>({activeModel})</span>
          </Link>

          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([]);
                setActiveChatId(null);
              }}
              title="Clear current conversation"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                borderRadius: '6px',
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.borderColor = '#ef4444';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--muted)';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* ── AI Disabled Banner ── */}
      {!hasApiKey && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            background: 'rgba(234,179,8,0.08)',
            border: '1px solid rgba(234,179,8,0.25)',
            borderRadius: '8px',
            marginBottom: '20px',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={18} style={{ color: '#eab308', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--fg)', marginBottom: '2px' }}>
              AI Disabled — No Provider Configured
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
              Configure OpenRouter, OpenAI, Gemini, or a local endpoint (Ollama/LM Studio) in Settings. Vault search still works.
            </div>
          </div>
          <Link
            to="/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: '#eab308',
              color: '#000',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <SettingsIcon size={14} /> Go to Settings
          </Link>
        </div>
      )}

      {/* ── Knowledge Scope Tabs ── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setScope('global')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            border: '1px solid',
            borderColor: scope === 'global' ? '#e05438' : 'var(--border)',
            background: scope === 'global' ? 'rgba(224, 84, 56, 0.1)' : 'var(--surface)',
            color: scope === 'global' ? '#e05438' : 'var(--muted)',
            transition: 'all 0.15s',
          }}
        >
          Global Knowledge
        </button>
        <button
          onClick={() => setScope('selected')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            border: '1px solid',
            borderColor: scope === 'selected' ? '#e05438' : 'var(--border)',
            background: scope === 'selected' ? 'rgba(224, 84, 56, 0.1)' : 'var(--surface)',
            color: scope === 'selected' ? '#e05438' : 'var(--muted)',
            transition: 'all 0.15s',
          }}
        >
          Selected Document
        </button>
      </div>

      {/* ── Document Picker when Selected Document scope is active ── */}
      {scope === 'selected' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            marginBottom: '16px',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 500 }}>
            Chatting with note:
          </span>
          <select
            value={selectedNoteId || ''}
            onChange={e => setSelectedNoteId(e.target.value || null)}
            style={{
              flex: 1,
              maxWidth: '300px',
              padding: '5px 10px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--fg)',
              fontSize: '12.5px',
              outline: 'none',
            }}
          >
            <option value="">Select a document...</option>
            {notes.map(n => (
              <option key={n._id} value={n._id}>
                {n.icon || '📄'} {n.title || 'Untitled'}
              </option>
            ))}
          </select>
          {selectedNoteId && (
            <span style={{ fontSize: '11.5px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Check size={12} /> Active context
            </span>
          )}
        </div>
      )}

      {/* ── Chat Messages Scroll Area ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          paddingRight: '6px',
          marginBottom: '16px',
        }}
      >
        {messages.length === 0 ? (
          /* Starter Prompt Cards */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginTop: '12px',
            }}
          >
            {STARTER_PROMPTS.map((promptText, i) => (
              <div
                key={i}
                onClick={() => sendMessage(promptText)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--fg)',
                  fontSize: '13.5px',
                  transition: 'background 0.12s, border-color 0.12s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#e05438';
                  e.currentTarget.style.background = 'var(--surface-2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = 'var(--surface)';
                }}
              >
                <Search size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span>{promptText}</span>
              </div>
            ))}
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                maxWidth: msg.role === 'user' ? '80%' : '100%',
                marginLeft: msg.role === 'user' ? 'auto' : 0,
              }}
            >
              {msg.role === 'assistant' && (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(224, 84, 56, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#e05438',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <Sparkles size={16} />
                </div>
              )}
              <div
                style={{
                  flex: 1,
                  position: 'relative',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '10px',
                  background: msg.role === 'user' ? '#e05438' : 'var(--surface)',
                  color: msg.role === 'user' ? '#ffffff' : 'var(--fg)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                  fontSize: '14px',
                  lineHeight: 1.6,
                }}
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <>
                    <ReactMarkdown components={{ code: CodeBlock }}>
                      {msg.content}
                    </ReactMarkdown>
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      title="Copy response"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: copiedIndex === idx ? '#22c55e' : 'var(--muted)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      {copiedIndex === idx ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 0' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(224, 84, 56, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e05438',
              }}
            >
              <Sparkles size={16} />
            </div>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Synthesizing knowledge...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* ── Bottom Input Bar matching Mockup ── */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '8px 12px',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setShowAttachPicker(!showAttachPicker)}
            title="Attach note from vault"
            style={{
              background: showAttachPicker ? 'rgba(224,84,56,0.1)' : 'transparent',
              border: 'none',
              color: showAttachPicker ? '#e05438' : 'var(--muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Paperclip size={18} />
          </button>

          {showAttachPicker && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                marginBottom: '10px',
                width: '260px',
                maxHeight: '220px',
                overflowY: 'auto',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                zIndex: 100,
                padding: '6px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', padding: '6px 8px', textTransform: 'uppercase' }}>
                Attach Note Context
              </div>
              {notes.length === 0 ? (
                <div style={{ padding: '8px', fontSize: '12.5px', color: 'var(--muted)', fontStyle: 'italic' }}>
                  No notes in vault
                </div>
              ) : (
                notes.map(n => (
                  <button
                    key={n._id}
                    type="button"
                    onClick={() => {
                      setInput(prev => prev ? `${prev} [[${n.title}]]` : `Summarize [[${n.title}]]`);
                      setShowAttachPicker(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '7px 8px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '13px',
                      color: 'var(--fg)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span>{n.icon || '📄'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title || 'Untitled'}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question about your knowledge..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--fg)',
            fontSize: '13.5px',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: '#e05438',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !input.trim() ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
