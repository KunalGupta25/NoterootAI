import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Bot, PanelRightClose, Send, User, Copy, Check, Trash2, ChevronDown, Plus } from 'lucide-react';
import { useNoteStore } from '../../stores/noteStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { BUILTIN_PROVIDERS, isBuiltinProvider } from '../../lib/providerConfig';
import { AI_URL } from '../../lib/constants';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from '../Markdown/CodeBlock';
import AgentPanel from './AgentPanel';

interface SuggestResult { note_id: string; title: string; reason: string; score: number; }
interface Message { role: 'user' | 'assistant'; content: string; }

function CompactProviderBar({
  provider, model,
  onProviderChange, onModelChange,
}: { provider: string; model: string; onProviderChange: (p: string) => void; onModelChange: (m: string) => void }) {
  const { providerKeys, customProviders } = useSettingsStore();
  const [showProvider, setShowProvider] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);

  const configured = (Object.keys(BUILTIN_PROVIDERS) as Array<keyof typeof BUILTIN_PROVIDERS>)
    .filter((p) => (providerKeys[p] ?? '').length > 0);
  const allProviders = [...configured, ...customProviders.map((c) => c.id)];

  const label = (p: string) => isBuiltinProvider(p) ? BUILTIN_PROVIDERS[p].label : (customProviders.find((c) => c.id === p)?.name ?? p);
  const icon = (p: string) => isBuiltinProvider(p) ? BUILTIN_PROVIDERS[p].icon : '🔌';
  const models = (p: string): string[] => isBuiltinProvider(p) ? BUILTIN_PROVIDERS[p].models : (customProviders.find((c) => c.id === p)?.models ?? []);

  return (
    <div style={{ display: 'flex', gap: '6px', padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, alignItems: 'center' }}>
      {/* Provider pill */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => { setShowProvider(!showProvider); setShowModel(false); }}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)', cursor: 'pointer', fontSize: '11px', color: 'var(--fg)' }}>
          <span style={{ fontSize: '12px' }}>{icon(provider)}</span> {label(provider)} <ChevronDown size={9} />
        </button>
        {showProvider && (
          <div style={{ position: 'absolute', top: '110%', left: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', minWidth: '150px', zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            {allProviders.map((p) => (
              <button key={p} onClick={() => { onProviderChange(p); setShowProvider(false); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: p === provider ? 'var(--bg)' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--fg)', textAlign: 'left' }}>
                <span>{icon(p)}</span> {label(p)}
                {p === provider && <Check size={10} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Model pill */}
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <button onClick={() => { setShowModel(!showModel); setShowProvider(false); }}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)', cursor: 'pointer', fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', width: '100%', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>{model}</span>
          <ChevronDown size={9} style={{ flexShrink: 0 }} />
        </button>
        {showModel && (
          <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxHeight: '200px', overflowY: 'auto' }}>
            {models(provider).map((m) => (
              <button key={m} onClick={() => { onModelChange(m); setShowModel(false); }}
                style={{ width: '100%', padding: '7px 10px', background: m === model ? 'var(--bg)' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--fg)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {m} {m === model && <Check size={9} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
              </button>
            ))}
            {addingCustom ? (
              <div style={{ padding: '6px 8px', borderTop: '1px solid var(--border)' }}>
                <input autoFocus value={customInput} onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { onModelChange(customInput.trim()); setCustomInput(''); setAddingCustom(false); setShowModel(false); } if (e.key === 'Escape') setAddingCustom(false); }}
                  placeholder="model-name…"
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--fg)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ) : (
              <button onClick={() => setAddingCustom(true)}
                style={{ width: '100%', padding: '7px 10px', border: 'none', borderTop: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Plus size={10} /> Custom model…
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AISidebar({ setAiOpen }: { setAiOpen: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = useState<'Suggest' | 'Chat' | 'Agent'>('Suggest');
  const { getNote, notes } = useNoteStore();
  const settings = useSettingsStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);

  // Provider/model for chat (local — doesn't affect global active)
  const [chatProvider, setChatProvider] = useState(settings.activeProvider);
  const [chatModel, setChatModel] = useState(settings.getProviderModel(settings.activeProvider));

  // Sync with global active provider if it changes (e.g. user just configured it in settings)
  useEffect(() => {
    setChatProvider(settings.activeProvider);
    setChatModel(settings.getProviderModel(settings.activeProvider));
  }, [settings.activeProvider, settings.getProviderModel]);

  // Suggest state + cache (per note_id so switching tabs doesn't re-fetch)
  const suggestCache = useRef<Record<string, { related: SuggestResult[]; links: string[] }>>({});
  const [suggestions, setSuggestions] = useState<SuggestResult[]>([]);
  const [suggestedLinks, setSuggestedLinks] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Parse note id from URL
  useEffect(() => {
    const match = location.pathname.match(/\/notes\/([a-zA-Z0-9-]+)/);
    const id = match?.[1] && match[1] !== 'new' ? match[1] : null;
    setCurrentNoteId(id);
  }, [location]);

  // Helpers to get API credentials
  const getApiInfo = useCallback((provider: string) => {
    const s = useSettingsStore.getState();
    if (isBuiltinProvider(provider)) return { apiKey: s.providerKeys[provider] ?? '', customBaseUrl: undefined };
    const custom = s.customProviders.find((c) => c.id === provider);
    return { apiKey: custom?.apiKey ?? '', customBaseUrl: custom?.baseUrl };
  }, []);

  // Load suggestions when note changes (with caching)
  useEffect(() => {
    if (activeTab !== 'Suggest' || !currentNoteId) return;
    const { apiKey, customBaseUrl } = getApiInfo(chatProvider);
    if (!apiKey && !customBaseUrl) return;

    // Serve from cache if available
    if (suggestCache.current[currentNoteId]) {
      const cached = suggestCache.current[currentNoteId];
      setSuggestions(cached.related);
      setSuggestedLinks(cached.links);
      return;
    }

    let cancelled = false;
    const run = async () => {
      const note = await getNote(currentNoteId);
      if (cancelled || !note || !note.content.trim()) return;
      setLoadingSuggestions(true);
      try {
        const res = await fetch(`${AI_URL}/suggest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            note_id: note._id, title: note.title, content: note.content,
            provider: isBuiltinProvider(chatProvider) ? chatProvider : 'custom',
            api_key: apiKey, custom_base_url: customBaseUrl, top_k: 5,
          }),
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          const related = data.related || [];
          const links = data.suggested_links || [];
          suggestCache.current[currentNoteId] = { related, links };
          setSuggestions(related);
          setSuggestedLinks(links);
        }
      } catch (err) { console.error('Failed to load suggestions', err); }
      finally { if (!cancelled) setLoadingSuggestions(false); }
    };
    run();
    return () => { cancelled = true; };
  }, [currentNoteId, activeTab, chatProvider, getNote, getApiInfo]);

  // Invalidate suggest cache when note changes
  useEffect(() => {
    if (currentNoteId) {
      delete suggestCache.current[currentNoteId];
    }
  }, [currentNoteId]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const { apiKey, customBaseUrl } = getApiInfo(chatProvider);
    if (!apiKey && !customBaseUrl) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    const newMsgs: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMsgs);
    setChatLoading(true);

    try {
      const currentNote = currentNoteId ? await getNote(currentNoteId) : null;
      const res = await fetch(`${AI_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs,
          provider: isBuiltinProvider(chatProvider) ? chatProvider : 'custom',
          model: chatModel,
          api_key: apiKey,
          custom_base_url: customBaseUrl,
          context_note_id: currentNoteId,
          context_note_title: currentNote?.title,
          context_note_content: currentNote?.content,
          use_vault: true,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      let fullContent = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        setMessages((prev) => {
          const next = [...prev];
          const last = { ...next[next.length - 1], content: fullContent };
          next[next.length - 1] = last;
          return next;
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠ Could not reach AI service. Check your API key.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const isConfigured = (() => {
    const { apiKey, customBaseUrl } = getApiInfo(chatProvider);
    return (apiKey?.length ?? 0) > 0 || !!customBaseUrl;
  })();

  return (
    <>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <Bot style={{ color: 'var(--accent)', flexShrink: 0 }} size={18} />
        <span className="mono" style={{ fontWeight: 600, fontSize: '13px', flex: 1, whiteSpace: 'nowrap' }}>AI Assistant</span>
        <button onClick={() => setAiOpen(false)} title="Collapse" style={{ background: 'none', border: 'none', padding: '4px', color: 'var(--muted)', cursor: 'pointer', display: 'flex', borderRadius: '4px', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
          <PanelRightClose size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {(['Suggest', 'Chat', 'Agent'] as const).map((tab) => (
          <div key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '10px 4px', textAlign: 'center', fontSize: '12px', cursor: 'pointer', fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? 'var(--accent)' : 'var(--fg)', borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent', transition: 'all 0.15s' }}>
            {tab}
          </div>
        ))}
      </div>

      {/* Provider bar (Chat tab only) */}
      {activeTab === 'Chat' && isConfigured && (
        <CompactProviderBar
          provider={chatProvider} model={chatModel}
          onProviderChange={(p) => { setChatProvider(p); setChatModel(useSettingsStore.getState().getProviderModel(p)); }}
          onModelChange={setChatModel}
        />
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* === SUGGEST === */}
        {activeTab === 'Suggest' && (
          <div style={{ padding: '16px' }}>
            {!isConfigured ? (
              <div style={{ padding: '16px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
                Set an API key in Settings to enable suggestions.
              </div>
            ) : !currentNoteId ? (
              <div style={{ color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic', padding: '8px 0' }}>
                Open a note to see related pages and suggestions.
              </div>
            ) : (
              <>
                <div className="mono kicker" style={{ fontSize: '10px', marginBottom: '12px' }}>Related Notes</div>
                {loadingSuggestions ? (
                  <div style={{ color: 'var(--muted)', fontSize: '12px' }}>Analyzing connections…</div>
                ) : (() => {
                  const validSuggestions = suggestions.filter(s => s.note_id !== currentNoteId && notes.some(n => n._id === s.note_id));
                  if (validSuggestions.length === 0) {
                    return <div style={{ color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic' }}>No related notes found yet.</div>;
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {validSuggestions.map((s, idx) => (
                        <div key={`${s.note_id}-${idx}`} onClick={() => navigate(`/notes/${s.note_id}`)}
                          style={{ padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--fg)', marginBottom: '4px' }}>📄 {s.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Semantic match</span>
                            <span style={{ color: 'var(--accent)' }}>{Math.round(s.score * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="mono kicker" style={{ fontSize: '10px', marginTop: '24px', marginBottom: '12px' }}>Suggested Links</div>
                {suggestedLinks.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic' }}>No new links suggested.</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {suggestedLinks.map((link) => {
                      const [pageTitle, ...hashParts] = link.split('#');
                      const hashText = hashParts.join('#');
                      const existingNote = notes.find(n => n.title.toLowerCase() === pageTitle.toLowerCase());
                      const linkId = link.replace(/[\s\W]+/g, '-');
                      return (
                        <button 
                          key={link} 
                          onClick={() => {
                            if (existingNote) {
                              navigate(`/notes/${existingNote._id}${hashText ? '#' + encodeURIComponent(hashText) : ''}`);
                            } else {
                              navigator.clipboard.writeText(`[[${link}]]`);
                              const el = document.getElementById(`sugg-link-${linkId}`);
                              if (el) {
                                el.style.color = '#22c55e';
                                el.innerText = 'Copied!';
                                setTimeout(() => {
                                  el.style.color = 'var(--accent)';
                                  el.innerText = `[[${link}]]`;
                                }, 1500);
                              }
                            }
                          }}
                          style={{ 
                            fontSize: '11px', padding: '4px 8px', background: 'var(--bg)', 
                            border: '1px solid var(--border)', borderRadius: '4px', 
                            color: 'var(--accent)', fontFamily: 'var(--font-mono)',
                            cursor: 'pointer', textAlign: 'left',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}
                          title={existingNote ? "Open Note" : "Copy Link"}
                        >
                          <span id={`sugg-link-${linkId}`}>[[{link}]]</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* === CHAT === */}
        {activeTab === 'Chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {!isConfigured ? (
              <div style={{ padding: '32px 16px', fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
                Configure an AI Provider in Settings to start chatting.
              </div>
            ) : (
              <>
                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: '32px' }}>
                      <Sparkles size={22} style={{ margin: '0 auto 10px', color: 'var(--border)' }} />
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--fg)', marginBottom: '4px' }}>How can I help?</div>
                      <div style={{ fontSize: '12px' }}>I can answer questions about your notes.</div>
                    </div>
                  ) : messages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', position: 'relative' }} className="group">
                      <div style={{ width: '22px', height: '22px', borderRadius: '4px', flexShrink: 0, background: m.role === 'user' ? 'var(--surface)' : 'var(--accent)', border: m.role === 'user' ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.role === 'user' ? 'var(--muted)' : 'white' }}>
                        {m.role === 'user' ? <User size={12} /> : <Sparkles size={12} />}
                      </div>
                      <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.6, color: 'var(--fg)', paddingRight: '28px' }} className="prose">
                        {m.role === 'user' ? m.content : <ReactMarkdown components={{ code: CodeBlock }}>{m.content}</ReactMarkdown>}
                      </div>
                      <div style={{ position: 'absolute', top: 0, right: 0 }}>
                        <CopyButton text={m.content} />
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Sparkles size={12} />
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--muted)', paddingTop: '2px' }}>Thinking…</div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input + Clear */}
                <div style={{ padding: '10px', borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
                  <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', padding: '5px 5px 5px 10px', borderRadius: '6px' }}>
                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                      placeholder={currentNoteId ? 'Ask about this note…' : 'Ask your vault…'}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', flex: 1, color: 'var(--fg)' }}
                      disabled={chatLoading} />
                    {messages.length > 0 && (
                      <button type="button" onClick={() => setMessages([])} title="Clear chat"
                        style={{ background: 'none', border: 'none', padding: '5px', color: 'var(--muted)', cursor: 'pointer', display: 'flex', borderRadius: '4px' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                    <button type="submit" disabled={!chatInput.trim() || chatLoading} style={{ background: chatInput.trim() ? 'var(--accent)' : 'var(--surface)', border: 'none', padding: '5px', borderRadius: '4px', color: chatInput.trim() ? 'white' : 'var(--muted)', cursor: chatInput.trim() ? 'pointer' : 'default', display: 'flex' }}>
                      <Send size={13} />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        )}

        {/* === AGENT === */}
        {activeTab === 'Agent' && (
          <AgentPanel />
        )}
      </div>
    </>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      title="Copy" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '3px', cursor: 'pointer', color: copied ? '#22c55e' : 'var(--muted)', flexShrink: 0, display: 'flex', alignItems: 'center', opacity: copied ? 1 : 0, transition: 'opacity 0.2s' }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}
