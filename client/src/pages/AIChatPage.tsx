import { useState, useRef, useEffect, useCallback } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useChatStore } from '../stores/chatStore';
import { BUILTIN_PROVIDERS, isBuiltinProvider } from '../lib/providerConfig';
import { AI_URL } from '../lib/constants';
import {
  Sparkles, Send, User, Bot, AlertCircle, Database,
  Trash2, Copy, Check, Plus, ChevronDown, MessageSquare, X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from '../components/Markdown/CodeBlock';
import { useNoteStore } from '../stores/noteStore';

interface LocalMessage { role: 'user' | 'assistant'; content: string; }

function ProviderModelBar({
  provider, model, onProviderChange, onModelChange,
}: {
  provider: string; model: string;
  onProviderChange: (p: string) => void; onModelChange: (m: string) => void;
}) {
  const { providerKeys, customProviders } = useSettingsStore();
  const [showPicker, setShowPicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [customModelInput, setCustomModelInput] = useState('');
  const [addingModel, setAddingModel] = useState(false);

  const configuredBuiltins = Object.keys(BUILTIN_PROVIDERS).filter(
    (p) => (providerKeys[p as keyof typeof providerKeys] ?? '').length > 0
  );
  const allProviders = [...configuredBuiltins, ...customProviders.map((c) => c.id)];

  const getProviderLabel = (p: string) => {
    if (isBuiltinProvider(p)) return BUILTIN_PROVIDERS[p].label;
    return customProviders.find((c) => c.id === p)?.name ?? p;
  };
  const getProviderIcon = (p: string) => {
    if (isBuiltinProvider(p)) return BUILTIN_PROVIDERS[p].icon;
    return '🔌';
  };
  const getModels = (p: string): string[] => {
    if (isBuiltinProvider(p)) return BUILTIN_PROVIDERS[p].models;
    return customProviders.find((c) => c.id === p)?.models ?? [];
  };

  const models = getModels(provider);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {/* Provider Pill */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => { setShowPicker(!showPicker); setShowModelPicker(false); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', border: '1px solid var(--border)', borderRadius: '20px', background: 'var(--surface)', cursor: 'pointer', fontSize: '12px', color: 'var(--fg)', fontWeight: 500 }}>
          <span>{getProviderIcon(provider)}</span>
          {getProviderLabel(provider)}
          <ChevronDown size={11} />
        </button>
        {showPicker && (
          <div style={{ position: 'absolute', top: '110%', left: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', minWidth: '160px', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            {allProviders.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '12px', color: 'var(--muted)' }}>No providers configured. Go to Settings.</div>
            ) : allProviders.map((p) => (
              <button key={p} onClick={() => { onProviderChange(p); setShowPicker(false); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', background: p === provider ? 'var(--bg)' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--fg)', textAlign: 'left' }}>
                <span>{getProviderIcon(p)}</span> {getProviderLabel(p)}
                {p === provider && <Check size={11} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Model Pill */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => { setShowModelPicker(!showModelPicker); setShowPicker(false); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', border: '1px solid var(--border)', borderRadius: '20px', background: 'var(--surface)', cursor: 'pointer', fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          {model || 'select model'}
          <ChevronDown size={11} />
        </button>
        {showModelPicker && (
          <div style={{ position: 'absolute', top: '110%', left: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', minWidth: '200px', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            {models.map((m) => (
              <button key={m} onClick={() => { onModelChange(m); setShowModelPicker(false); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '8px 12px', background: m === model ? 'var(--bg)' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--fg)', textAlign: 'left', gap: '8px' }}>
                {m} {m === model && <Check size={11} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
              </button>
            ))}
            {/* Add custom model */}
            {addingModel ? (
              <div style={{ padding: '8px', borderTop: '1px solid var(--border)', display: 'flex', gap: '4px' }}>
                <input autoFocus value={customModelInput} onChange={(e) => setCustomModelInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { onModelChange(customModelInput.trim()); setCustomModelInput(''); setAddingModel(false); setShowModelPicker(false); } if (e.key === 'Escape') setAddingModel(false); }}
                  placeholder="custom-model-name"
                  style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: '4px', padding: '5px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--fg)', outline: 'none' }} />
              </div>
            ) : (
              <button onClick={() => setAddingModel(true)}
                style={{ width: '100%', padding: '8px 12px', border: 'none', borderTop: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={11} /> Add custom model…
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: LocalMessage }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', maxWidth: msg.role === 'user' ? '70%' : '100%', marginLeft: msg.role === 'user' ? 'auto' : 0, width: msg.role === 'assistant' ? '100%' : 'auto' }}>
      {msg.role === 'assistant' && (
        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, marginTop: '2px' }}>
          <Sparkles size={14} />
        </div>
      )}
      <div style={{ flex: 1, position: 'relative' }} className="group">
        <div style={{ padding: '12px 48px 12px 16px', background: msg.role === 'user' ? 'var(--surface)' : 'transparent', border: msg.role === 'user' ? '1px solid var(--border)' : 'none', borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '0', fontSize: '14px', lineHeight: 1.7, color: 'var(--fg)' }} className="prose">
          {msg.role === 'user' ? msg.content : <ReactMarkdown components={{ code: CodeBlock }}>{msg.content}</ReactMarkdown>}
        </div>
        <button className="copy-btn" onClick={handleCopy} title="Copy" style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '5px', padding: '4px', cursor: 'pointer', color: copied ? '#22c55e' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', opacity: copied ? 1 : 0, transition: 'opacity 0.2s' }}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      {msg.role === 'user' && (
        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', flexShrink: 0, marginTop: '2px' }}>
          <User size={14} />
        </div>
      )}
    </div>
  );
}

export default function AIChatPage() {
  const settingsStore = useSettingsStore();
  const chatStore = useChatStore();
  const { notes } = useNoteStore();

  const [activeProvider, setActiveProvider] = useState(settingsStore.activeProvider);
  const [activeModel, setActiveModel] = useState(settingsStore.getProviderModel(settingsStore.activeProvider));
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const getApiInfo = useCallback(() => {
    const { providerKeys, customProviders } = useSettingsStore.getState();
    if (isBuiltinProvider(activeProvider)) {
      return { apiKey: providerKeys[activeProvider] ?? '', customBaseUrl: undefined };
    }
    const custom = customProviders.find((c) => c.id === activeProvider);
    return { apiKey: custom?.apiKey ?? '', customBaseUrl: custom?.baseUrl };
  }, [activeProvider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const { apiKey, customBaseUrl } = getApiInfo();
    if (!apiKey && !customBaseUrl) return;

    const userMsg = input.trim();
    setInput('');
    const newMsgs: LocalMessage[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMsgs);
    setLoading(true);

    // Create conversation if needed
    let chatId = activeChatId;
    if (!chatId) {
      chatId = chatStore.createConversation(activeProvider, activeModel);
      setActiveChatId(chatId);
    }
    chatStore.addMessage(chatId, { role: 'user', content: userMsg, timestamp: Date.now() });

    try {
      const res = await fetch(`${AI_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs,
          provider: isBuiltinProvider(activeProvider) ? activeProvider : 'custom',
          model: activeModel,
          api_key: apiKey,
          custom_base_url: customBaseUrl,
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
          const last = { ...next[next.length - 1] };
          last.content = fullContent;
          next[next.length - 1] = last;
          return next;
        });
      }

      chatStore.addMessage(chatId, { role: 'assistant', content: fullContent, timestamp: Date.now() });
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠ Could not reach AI service. Check your API key and connection.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveChatId(null);
    setShowHistory(false);
  };

  const loadConversation = (id: string) => {
    const convo = chatStore.conversations.find((c) => c.id === id);
    if (!convo) return;
    setMessages(convo.messages.map((m) => ({ role: m.role, content: m.content })));
    setActiveChatId(id);
    setActiveProvider(convo.provider);
    setActiveModel(convo.model);
    setShowHistory(false);
  };

  const isConfigured = (() => {
    const { apiKey, customBaseUrl } = getApiInfo();
    return (apiKey?.trim().length ?? 0) > 0 || !!customBaseUrl;
  })();

  if (!isConfigured) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '100px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--muted)' }}>
          <AlertCircle size={32} />
        </div>
        <h1 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', marginBottom: '12px' }}>AI Configuration Required</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '360px', margin: '0 auto' }}>
          Go to Settings → AI Providers and add at least one API key.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', height: 'calc(100vh - var(--topbar-height) - 32px)' }}>
      {/* History sidebar */}
      {showHistory && (
        <div style={{ width: '240px', flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingTop: '40px' }}>
          <div style={{ padding: '0 12px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>HISTORY</span>
            <button onClick={() => chatStore.clearAll()} title="Clear all" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '2px', display: 'flex' }}><Trash2 size={12} /></button>
          </div>
          <button onClick={handleNewChat} style={{ margin: '0 8px 8px', padding: '8px 10px', border: '1px dashed var(--border)', borderRadius: '6px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={12} /> New Chat
          </button>
          {chatStore.conversations.map((c) => (
            <button key={c.id} onClick={() => loadConversation(c.id)}
              style={{ padding: '8px 12px', background: c.id === activeChatId ? 'var(--bg)' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', margin: '0 6px', textAlign: 'left', fontSize: '12px', color: c.id === activeChatId ? 'var(--fg)' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={11} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.title}</span>
              <button onClick={(e) => { e.stopPropagation(); chatStore.deleteConversation(c.id); if (c.id === activeChatId) handleNewChat(); }}
                style={{ background: 'none', border: 'none', padding: '1px', cursor: 'pointer', color: 'var(--muted)', display: 'flex', opacity: 0.5, flexShrink: 0 }}><X size={10} /></button>
            </button>
          ))}
        </div>
      )}

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '32px 48px 16px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '10px' }}>
            <div>
              <div className="mono kicker" style={{ marginBottom: '4px' }}>Ask your Vault</div>
              <h1 style={{ fontSize: '26px', fontFamily: 'var(--font-display)', margin: '0' }}>Knowledge Chat</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--muted)' }}>
              <Database size={13} /> {notes.length} pages indexed
              <button onClick={() => setShowHistory(!showHistory)} title="History" style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: '6px', background: showHistory ? 'var(--bg)' : 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <MessageSquare size={12} /> History
              </button>
              {messages.length > 0 && (
                <button onClick={handleNewChat} title="New chat" style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                  <Plus size={12} /> New
                </button>
              )}
            </div>
          </div>
          <ProviderModelBar provider={activeProvider} model={activeModel} onProviderChange={(p) => { setActiveProvider(p); setActiveModel(useSettingsStore.getState().getProviderModel(p)); }} onModelChange={setActiveModel} />
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 48px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '36px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--accent)' }}>
                <Bot size={36} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--fg)', marginBottom: '10px' }}>How can I help you today?</div>
              <div style={{ fontSize: '13px', maxWidth: '380px', margin: '0 auto', lineHeight: 1.7 }}>Ask me anything about your vault — I'll search your notes and answer with context.</div>
            </div>
          ) : messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
          {loading && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <Sparkles size={14} />
              </div>
              <div style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--muted)' }}>Thinking…</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 48px 32px', flexShrink: 0 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', padding: '8px 8px 8px 16px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your knowledge base…"
              disabled={loading}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', flex: 1, color: 'var(--fg)', fontFamily: 'var(--font-body)' }} />
            <button type="submit" disabled={!input.trim() || loading} style={{ background: input.trim() ? 'var(--accent)' : 'var(--bg)', border: 'none', padding: '10px', borderRadius: '8px', color: input.trim() ? 'white' : 'var(--muted)', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', transition: 'all 0.2s' }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
