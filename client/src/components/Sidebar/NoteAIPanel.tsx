import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles, X, Send, Wand2, Check, Scissors, Plus, Palette, Globe,
  Copy, AlertCircle, StopCircle, ChevronDown, Layers
} from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { BUILTIN_PROVIDERS, isBuiltinProvider, type BuiltinProvider } from '../../lib/providerConfig';
import { AI_URL } from '../../lib/constants';
import { ChatMarkdown } from '../Markdown/ChatMarkdown';
import {
  htmlToCompactMarkdown,
  estimateTokens,
  chunkNote,
  rankChunks,
  routeIntent,
  buildMessages,
  CONTEXT_BUDGETS,
  type NoteContextMode,
} from '../../lib/aiContext';

export interface NoteAIPanelProps {
  noteId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editorInstance: any;
  getNoteHtml: () => string;
  title: string;
  onClose?: () => void;
}

export interface PanelMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  displayHeader?: string;
  isError?: boolean;
  timestamp?: number;
  metaText?: string;
}

export const NoteAIPanel: React.FC<NoteAIPanelProps> = ({
  noteId,
  editorInstance,
  getNoteHtml,
  title,
  onClose,
}) => {
  void noteId;
  const { activeProvider, providerKeys, customProviders, getProviderModel } = useSettingsStore();

  const [aiTab, setAiTab] = useState<'Chat' | 'Edit'>('Edit');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [messages, setMessages] = useState<PanelMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'I can help you write, refine, or analyze this document. Select text or choose an action below.',
    },
  ]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Context router & chip override state
  const [noteOverride, setNoteOverride] = useState<'auto' | NoteContextMode>('auto');
  const [vaultOverride, setVaultOverride] = useState<'auto' | 'off' | 'on'>('auto');
  const [webOverride, setWebOverride] = useState<'off' | 'auto' | 'on'>('off');
  const [webAvailable, setWebAvailable] = useState<boolean>(false);
  const [showNoteMenu, setShowNoteMenu] = useState(false);
  const noteMenuRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ref & near-bottom tracking
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // AbortController for cancel
  const abortControllerRef = useRef<AbortController | null>(null);

  // Resizable panel width state
  const [width, setWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('noteroot_ai_panel_width');
      return saved ? Math.max(280, Math.min(700, parseInt(saved, 10))) : 340;
    } catch {
      return 340;
    }
  });
  const isDraggingRef = useRef(false);

  // Check capabilities from backend
  useEffect(() => {
    fetch(`${AI_URL}/assist/capabilities`)
      .then(r => (r.ok ? r.json() : null))
      .then(cap => {
        if (cap && typeof cap.web_available === 'boolean') {
          setWebAvailable(cap.web_available);
        }
      })
      .catch(() => {
        setWebAvailable(false);
      });
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (noteMenuRef.current && !noteMenuRef.current.contains(e.target as Node)) {
        setShowNoteMenu(false);
      }
    };
    if (showNoteMenu) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [showNoteMenu]);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.max(280, Math.min(700, startWidth + deltaX));
      setWidth(newWidth);
      try {
        localStorage.setItem('noteroot_ai_panel_width', newWidth.toString());
      } catch {
        // ignore
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const checkScrollNearBottom = () => {
    if (!scrollRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
    shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 120;
  };

  useEffect(() => {
    if (shouldAutoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, aiLoading]);

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSelectionInfo = useCallback(() => {
    if (!editorInstance?.state?.selection) return null;
    const { from, to } = editorInstance.state.selection;
    if (from === to) return null;
    const text = editorInstance.state.doc.textBetween(from, to, ' ');
    if (!text || !text.trim()) return null;
    const words = text.trim().split(/\s+/).length;
    return { text, words, from, to };
  }, [editorInstance]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAiLoading(false);
  }, []);

  // Compute live routing and token estimate
  const selection = getSelectionInfo();
  const rawHtml = getNoteHtml();
  const compactMd = useMemo(() => htmlToCompactMarkdown(rawHtml), [rawHtml]);
  const noteTotalTokens = useMemo(() => estimateTokens(compactMd), [compactMd]);

  const effectiveRoute = useMemo(() => {
    const base = routeIntent(aiPrompt, {
      hasSelection: Boolean(selection),
      mode: aiTab === 'Edit' ? 'edit' : 'chat',
      webAvailable,
      noteTokens: noteTotalTokens,
    });

    const resolvedNote: NoteContextMode = noteOverride === 'auto' ? base.note : noteOverride;
    const resolvedVault = vaultOverride === 'auto' ? base.vault : vaultOverride === 'on';
    const resolvedWeb = webOverride === 'auto' ? (base.web && webAvailable) : (webOverride === 'on' && webAvailable);

    return {
      note: resolvedNote,
      vault: resolvedVault,
      web: resolvedWeb,
      reason: base.reason,
    };
  }, [aiPrompt, selection, aiTab, webAvailable, noteTotalTokens, noteOverride, vaultOverride, webOverride]);

  const liveContextTokens = useMemo(() => {
    let tokens = 0;
    if (effectiveRoute.note === 'selection' && selection) {
      tokens += estimateTokens(selection.text);
    } else if (effectiveRoute.note === 'full') {
      tokens += noteTotalTokens;
    } else if (effectiveRoute.note === 'relevant') {
      const chunks = chunkNote(compactMd);
      const ranked = rankChunks(aiPrompt, chunks, CONTEXT_BUDGETS.NOTE_CONTEXT);
      tokens += ranked.reduce((acc, c) => acc + c.tokens, 0);
    }
    if (effectiveRoute.vault) tokens += CONTEXT_BUDGETS.VAULT;
    if (effectiveRoute.web) tokens += CONTEXT_BUDGETS.WEB;
    return tokens;
  }, [effectiveRoute, selection, noteTotalTokens, compactMd, aiPrompt]);

  const executeAction = useCallback(async (actionLabel: string, promptInstruction: string) => {
    if (aiLoading) return;

    const currentSelection = getSelectionInfo();
    const targetDescriptor = currentSelection
      ? `selection (${currentSelection.words} words)`
      : effectiveRoute.note === 'none'
      ? 'general'
      : effectiveRoute.note === 'relevant'
      ? 'relevant parts'
      : `entire note (~${noteTotalTokens} tokens)`;

    const now = Date.now();
    const userMessageId = `user_${now}`;
    const userMsg: PanelMessage = {
      id: userMessageId,
      role: 'user',
      content: promptInstruction,
      displayHeader: `${actionLabel} · ${targetDescriptor}`,
      timestamp: now,
    };

    setMessages(prev => [...prev, userMsg]);
    setAiLoading(true);

    const assistantMsgId = `assistant_${now + 1}`;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const apiKey = providerKeys[activeProvider as keyof typeof providerKeys] || '';
      const custom = customProviders.find(c => c.id === activeProvider);
      let providerToUse = activeProvider;
      let effectiveKey = apiKey || custom?.apiKey || '';

      if (!effectiveKey && !custom?.baseUrl) {
        const altBuiltin = (Object.keys(BUILTIN_PROVIDERS) as BuiltinProvider[])
          .find((p: BuiltinProvider) => (providerKeys[p] ?? '').trim().length > 0);
        if (altBuiltin) {
          providerToUse = altBuiltin;
          effectiveKey = providerKeys[altBuiltin]!;
        } else {
          setMessages(prev => [
            ...prev,
            {
              id: assistantMsgId,
              role: 'assistant',
              content: `⚠️ No API key set for "${activeProvider}". Please configure it in Settings → AI & Models.`,
              isError: true,
              timestamp: Date.now(),
            },
          ]);
          setAiLoading(false);
          return;
        }
      }

      // Build context payload
      const noteContentPayload: { title: string; heading?: string; text: string }[] = [];
      if (effectiveRoute.note === 'selection' && currentSelection) {
        noteContentPayload.push({
          title,
          heading: 'Selected text',
          text: currentSelection.text,
        });
      } else if (effectiveRoute.note === 'full') {
        noteContentPayload.push({
          title,
          heading: 'Full note',
          text: compactMd,
        });
      } else if (effectiveRoute.note === 'relevant') {
        const chunks = chunkNote(compactMd);
        const ranked = rankChunks(promptInstruction, chunks, CONTEXT_BUDGETS.NOTE_CONTEXT);
        for (const c of ranked) {
          noteContentPayload.push({
            title,
            heading: c.headingPath || 'Section',
            text: c.text,
          });
        }
      }

      // History for multi-turn (only raw text, never context)
      const cleanHistory = messages
        .filter(m => !m.isError && m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const builtMessages = buildMessages({
        mode: aiTab === 'Edit' ? 'edit' : 'chat',
        question: promptInstruction,
        history: cleanHistory,
        context: {
          noteContent: noteContentPayload,
        },
        selectedText: currentSelection?.text,
      });

      // Calculate input tokens for reporting
      const estimatedInputTokens = builtMessages.reduce(
        (acc, m) => acc + estimateTokens(m.content),
        0
      );

      const usedParts: string[] = [];
      if (noteContentPayload.length > 0) {
        usedParts.push(
          effectiveRoute.note === 'selection'
            ? 'note (selection)'
            : effectiveRoute.note === 'full'
            ? 'note (full)'
            : `note (${noteContentPayload.length} sections)`
        );
      }
      if (effectiveRoute.vault) usedParts.push('vault');
      if (effectiveRoute.web) usedParts.push('web');

      const metaText = `Used: ${
        usedParts.length > 0 ? usedParts.join(' · ') : 'direct model'
      } · ~${(estimatedInputTokens / 1000).toFixed(1)}k tokens in`;

      // Call /chat endpoint (Phase 2 uses /chat with use_vault: false)
      const res = await fetch(`${AI_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: builtMessages,
          provider: isBuiltinProvider(providerToUse) ? providerToUse : 'custom',
          model: getProviderModel(providerToUse),
          api_key: effectiveKey,
          custom_base_url: custom?.baseUrl,
          use_vault: false,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `Server returned HTTP ${res.status}`);
      }

      // Initialize empty assistant bubble
      setMessages(prev => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          metaText,
          timestamp: Date.now(),
        },
      ]);

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const chunks: string[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          chunks.push(chunk);
          const fullText = chunks.join('');
          setMessages(prev =>
            prev.map(m => (m.id === assistantMsgId ? { ...m, content: fullText } : m))
          );
        }

        const finalStreamText = chunks.join('');
        if (finalStreamText.startsWith('\n\n[Error from')) {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, content: finalStreamText.trim(), isError: true }
                : m
            )
          );
        }
      } else {
        const text = await res.text();
        setMessages(prev =>
          prev.map(m => (m.id === assistantMsgId ? { ...m, content: text.trim(), metaText } : m))
        );
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      if (errorObj?.name === 'AbortError') {
        // User stopped generation
        return;
      }
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `AI service error: ${errorObj?.message || 'Make sure the backend is running.'}`,
          isError: true,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setAiLoading(false);
      abortControllerRef.current = null;
    }
  }, [
    aiLoading,
    getSelectionInfo,
    effectiveRoute,
    noteTotalTokens,
    title,
    compactMd,
    messages,
    aiTab,
    providerKeys,
    activeProvider,
    customProviders,
    getProviderModel,
  ]);

  const handleSendPrompt = () => {
    if (!aiPrompt.trim() || aiLoading) return;
    const text = aiPrompt.trim();
    setAiPrompt('');
    executeAction('Custom prompt', text);
  };

  const aiActionButtons = [
    { label: 'Improve writing', icon: <Wand2 size={13} />, prompt: 'Improve clarity and flow while preserving meaning' },
    { label: 'Fix grammar', icon: <Check size={13} />, prompt: 'Fix any spelling, grammar, or punctuation errors' },
    { label: 'Make shorter', icon: <Scissors size={13} />, prompt: 'Condense and make more concise' },
    { label: 'Expand this section', icon: <Plus size={13} />, prompt: 'Elaborate with deeper explanation and examples' },
    { label: 'Change tone', icon: <Palette size={13} />, prompt: 'Make the tone professional, crisp and engaging' },
    { label: 'Translate', icon: <Globe size={13} />, prompt: 'Translate this section into Spanish or target language' },
  ];

  return (
    <aside
      style={{
        width: `${width}px`,
        borderLeft: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
        height: '100%',
      }}
    >
      {/* Left resize handle */}
      <div
        onMouseDown={handleMouseDownResize}
        title="Drag to resize panel"
        style={{
          position: 'absolute',
          top: 0,
          left: '-3px',
          width: '6px',
          height: '100%',
          cursor: 'col-resize',
          zIndex: 100,
          background: 'transparent',
          transition: 'background 0.2s',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--fg)' }}>
            AI Assistant
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            title="Close Assistant"
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
        )}
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
        ref={scrollRef}
        onScroll={checkScrollNearBottom}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {aiTab === 'Edit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '4px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
              Quick Actions
            </div>
            {aiActionButtons.map(action => (
              <button
                key={action.label}
                onClick={() => executeAction(action.label, action.prompt)}
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
          </div>
        )}

        {/* Message Thread */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.map(msg => {
            if (msg.role === 'user') {
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: '92%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {msg.displayHeader && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--muted)',
                        textAlign: 'right',
                        fontWeight: 500,
                      }}
                    >
                      {msg.displayHeader}
                    </div>
                  )}
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px 8px 2px 8px',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      background: '#e05438',
                      color: '#ffffff',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      boxShadow: '0 1px 3px rgba(224, 84, 56, 0.25)',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            }

            // Assistant or System/Error message
            if (msg.isError) {
              return (
                <div
                  key={msg.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: '12.5px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: 'flex-start',
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px 8px 8px 2px',
                  padding: '10px 12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>
                    AI Response
                  </span>
                  {msg.content && (
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      title="Copy response"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: copiedId === msg.id ? '#22c55e' : 'var(--muted)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '11px',
                      }}
                    >
                      {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                <ChatMarkdown content={msg.content || (aiLoading ? 'Thinking...' : '')} />

                {msg.metaText && (
                  <div
                    style={{
                      fontSize: '10.5px',
                      color: 'var(--muted)',
                      marginTop: '6px',
                      paddingTop: '6px',
                      borderTop: '1px solid var(--border)',
                      opacity: 0.85,
                    }}
                  >
                    {msg.metaText}
                  </div>
                )}
              </div>
            );
          })}

          {aiLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
                AI is generating response...
              </div>
              <button
                onClick={handleStop}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                <StopCircle size={12} style={{ color: '#ef4444' }} />
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Panel Bottom Controls & Input */}
      <div
        style={{
          padding: '8px 12px 12px 12px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Context Router Chips */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
            fontSize: '11px',
          }}
        >
          {/* Note Context Chip with Dropdown */}
          <div style={{ position: 'relative' }} ref={noteMenuRef}>
            <button
              onClick={() => setShowNoteMenu(!showNoteMenu)}
              title="Note context mode"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: noteOverride !== 'auto' ? 'rgba(224, 84, 56, 0.12)' : 'var(--surface-2)',
                color: noteOverride !== 'auto' ? '#e05438' : 'var(--fg)',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <span>📄 Note:</span>
              <span>{noteOverride === 'auto' ? `Auto (${effectiveRoute.note})` : noteOverride}</span>
              <ChevronDown size={11} style={{ opacity: 0.7 }} />
            </button>

            {showNoteMenu && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: '6px',
                  width: '180px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.16)',
                  zIndex: 200,
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {(
                  [
                    { id: 'auto', label: 'Auto (smart route)' },
                    { id: 'none', label: 'Off (0 tokens)' },
                    { id: 'selection', label: 'Selection only' },
                    { id: 'relevant', label: 'Relevant sections' },
                    { id: 'full', label: 'Full note' },
                  ] as const
                ).map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setNoteOverride(opt.id);
                      setShowNoteMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      background: noteOverride === opt.id ? 'rgba(224, 84, 56, 0.12)' : 'transparent',
                      color: noteOverride === opt.id ? '#e05438' : 'var(--fg)',
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>{opt.label}</span>
                    {noteOverride === opt.id && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vault Toggle Chip */}
          <button
            onClick={() => {
              setVaultOverride(prev => (prev === 'auto' ? 'on' : prev === 'on' ? 'off' : 'auto'));
            }}
            title="Toggle vault retrieval"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: vaultOverride !== 'auto' ? 'rgba(224, 84, 56, 0.12)' : 'var(--surface-2)',
              color: vaultOverride !== 'auto' ? '#e05438' : 'var(--fg)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <span>🗂 Vault:</span>
            <span>{vaultOverride === 'auto' ? (effectiveRoute.vault ? 'Auto (on)' : 'Auto') : vaultOverride}</span>
          </button>

          {/* Web Search Chip */}
          <button
            onClick={() => {
              if (!webAvailable) return;
              setWebOverride(prev => (prev === 'off' ? 'auto' : prev === 'auto' ? 'on' : 'off'));
            }}
            disabled={!webAvailable}
            title={webAvailable ? 'Toggle web search' : 'Web search not configured on backend'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: webOverride !== 'off' ? 'rgba(224, 84, 56, 0.12)' : 'var(--surface-2)',
              color: !webAvailable ? 'var(--muted)' : webOverride !== 'off' ? '#e05438' : 'var(--fg)',
              cursor: webAvailable ? 'pointer' : 'not-allowed',
              opacity: webAvailable ? 1 : 0.6,
              fontWeight: 500,
            }}
          >
            <span>🌐 Web:</span>
            <span>{!webAvailable ? 'Off' : webOverride}</span>
          </button>

          {/* Live Token Estimate */}
          <div
            title="Estimated context tokens that will be attached"
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              color: 'var(--muted)',
              fontSize: '10.5px',
            }}
          >
            <Layers size={11} />
            <span>~{liveContextTokens} ctx tokens</span>
          </div>
        </div>

        {/* Selected-text Pill if active */}
        {selection && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(224, 84, 56, 0.08)',
              border: '1px solid rgba(224, 84, 56, 0.25)',
              fontSize: '11px',
              color: '#e05438',
            }}
          >
            <span>Selection · {selection.words} words</span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>Target for edit actions</span>
          </div>
        )}

        {/* Input Bar */}
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
          <input
            type="text"
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSendPrompt();
            }}
            placeholder="Ask or edit this note..."
            disabled={aiLoading}
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
          {aiLoading ? (
            <button
              onClick={handleStop}
              title="Stop generation"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                background: 'var(--surface-2)',
                color: '#ef4444',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <StopCircle size={13} />
            </button>
          ) : (
            <button
              onClick={handleSendPrompt}
              disabled={!aiPrompt.trim()}
              title="Send prompt"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                background: aiPrompt.trim() ? '#e05438' : 'var(--surface-2)',
                color: aiPrompt.trim() ? '#ffffff' : 'var(--muted)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: aiPrompt.trim() ? 'pointer' : 'not-allowed',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <Send size={12} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
