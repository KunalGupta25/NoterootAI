import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles, X, Send, Wand2, Check, Scissors, Plus, Palette, Globe,
  Copy, AlertCircle, StopCircle, ChevronDown, Layers, CornerDownRight, RefreshCw
} from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChatStore } from '../../stores/chatStore';
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
  getModeParameters,
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
  isEditResult?: boolean;
  capturedSelection?: { text: string; from: number; to: number } | null;
}

export const NoteAIPanel: React.FC<NoteAIPanelProps> = ({
  noteId,
  editorInstance,
  getNoteHtml,
  title,
  onClose,
}) => {
  const { activeProvider, providerKeys, customProviders, getProviderModel } = useSettingsStore();
  const { getNoteConversation, saveNoteMessages } = useChatStore();

  const [aiTab, setAiTab] = useState<'Chat' | 'Edit'>('Edit');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [messages, setMessages] = useState<PanelMessage[]>(() => {
    if (noteId && noteId !== 'new') {
      const existing = useChatStore.getState().getNoteConversation(noteId);
      if (existing && existing.messages.length > 0) {
        return existing.messages.map((m, idx) => ({
          id: `restored_${idx}_${m.timestamp}`,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));
      }
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'I can help you write, refine, or analyze this document. Select text or choose an action below.',
      },
    ];
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedActionMsg, setAppliedActionMsg] = useState<{ id: string; action: string } | null>(null);

  // Restore persisted per-note thread when noteId changes
  useEffect(() => {
    if (!noteId || noteId === 'new') return;
    const timer = setTimeout(() => {
      const existing = getNoteConversation(noteId);
      if (existing && existing.messages.length > 0) {
        const restored: PanelMessage[] = existing.messages.map((m, idx) => ({
          id: `restored_${idx}_${m.timestamp}`,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));
        setMessages(restored);
      } else {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: 'I can help you write, refine, or analyze this document. Select text or choose an action below.',
          },
        ]);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [noteId, getNoteConversation]);

  // Persist per-note thread updates (capped at 40 messages)
  useEffect(() => {
    if (!noteId || noteId === 'new' || aiLoading) return;
    const valid = messages.filter(m => !m.isError && m.id !== 'welcome');
    if (valid.length > 0) {
      saveNoteMessages(
        noteId,
        valid.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp || Date.now(),
        })),
        activeProvider,
        getProviderModel(activeProvider)
      );
    }
  }, [messages, aiLoading, noteId, saveNoteMessages, activeProvider, getProviderModel]);

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

  const [wakingServer, setWakingServer] = useState(false);

  // Check capabilities from backend with backoff
  useEffect(() => {
    let cancelled = false;
    let delay = 1000;
    const fetchCapabilities = async () => {
      try {
        const r = await fetch(`${AI_URL}/assist/capabilities`);
        if (r.ok) {
          const cap = await r.json();
          if (!cancelled && typeof cap.web_available === 'boolean') {
            setWebAvailable(cap.web_available);
            return;
          }
        }
      } catch {
        // Backoff retry
      }
      if (!cancelled && delay <= 8000) {
        setTimeout(fetchCapabilities, delay);
        delay *= 2;
      }
    };
    fetchCapabilities();
    return () => {
      cancelled = true;
    };
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

interface MessageRowProps {
  msg: PanelMessage;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  onReplaceSelection: (msg: PanelMessage) => void;
  onInsertBelow: (msg: PanelMessage) => void;
  appliedActionMsg: { id: string; action: string } | null;
  aiLoading: boolean;
}

const MessageRow: React.FC<MessageRowProps> = React.memo(({
  msg,
  copiedId,
  onCopy,
  onReplaceSelection,
  onInsertBelow,
  appliedActionMsg,
  aiLoading,
}) => {
  if (msg.role === 'user') {
    return (
      <div
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

  if (msg.isError) {
    return (
      <div
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => onCopy(msg.id, msg.content)}
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
          </div>
        )}
      </div>

      <ChatMarkdown content={msg.content || (aiLoading ? 'Thinking...' : '')} />

      {msg.isEditResult && msg.content && !aiLoading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid var(--border)',
          }}
        >
          {msg.capturedSelection && (
            <button
              onClick={() => onReplaceSelection(msg)}
              title="Replace original selection in note"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #e05438',
                background: 'rgba(224, 84, 56, 0.08)',
                color: '#e05438',
                fontSize: '11.5px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={11} />
              <span>
                {appliedActionMsg?.id === msg.id && appliedActionMsg.action === 'Replaced'
                  ? 'Replaced!'
                  : 'Replace selection'}
              </span>
            </button>
          )}
          <button
            onClick={() => onInsertBelow(msg)}
            title="Insert text below current cursor or selection"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              fontSize: '11.5px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <CornerDownRight size={11} />
            <span>
              {appliedActionMsg?.id === msg.id && appliedActionMsg.action === 'Inserted'
                ? 'Inserted!'
                : 'Insert below'}
            </span>
          </button>
        </div>
      )}

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
});
MessageRow.displayName = 'MessageRow';

  const handleCopyMessage = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const getSelectionInfo = useCallback(() => {
    if (!editorInstance?.state?.selection) return null;
    const { from, to, $from } = editorInstance.state.selection;
    if (from !== to) {
      const text = editorInstance.state.doc.textBetween(from, to, ' ');
      if (text && text.trim()) {
        const words = text.trim().split(/\s+/).length;
        return { text, words, from, to, isBlock: false };
      }
    }
    // No active selection: target block at cursor ($from.parent.textContent)
    if ($from?.parent?.textContent) {
      const blockText = $from.parent.textContent;
      if (blockText.trim()) {
        const words = blockText.trim().split(/\s+/).length;
        return {
          text: blockText,
          words,
          from: $from.start(),
          to: $from.end(),
          isBlock: true,
        };
      }
    }
    return null;
  }, [editorInstance]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAiLoading(false);
  }, []);

  // Debounce the prompt text used for routing/token estimates (250 ms)
  const [debouncedPrompt, setDebouncedPrompt] = useState(aiPrompt);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPrompt(aiPrompt), 250);
    return () => clearTimeout(timer);
  }, [aiPrompt]);

  // Compute htmlToCompactMarkdown debounced (500 ms) and only while panel is open
  const [compactMd, setCompactMd] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setCompactMd(htmlToCompactMarkdown(getNoteHtml()));
    }, 500);
    return () => clearTimeout(timer);
  }, [getNoteHtml]);

  useEffect(() => {
    setCompactMd(htmlToCompactMarkdown(getNoteHtml()));
  }, []);

  // Memoize chunkNote(compactMd) separately from rankChunks
  const noteChunks = useMemo(() => chunkNote(compactMd), [compactMd]);
  const noteTotalTokens = useMemo(() => estimateTokens(compactMd), [compactMd]);

  const selection = getSelectionInfo();

  const effectiveRoute = useMemo(() => {
    const base = routeIntent(debouncedPrompt, {
      hasSelection: Boolean(selection),
      mode: aiTab === 'Edit' ? 'edit' : 'chat',
      webAvailable,
      noteTokens: noteTotalTokens,
    });

    let resolvedNote: NoteContextMode;
    if (aiTab === 'Edit') {
      if (noteOverride === 'full') {
        resolvedNote = 'full';
      } else if (selection) {
        resolvedNote = 'selection';
      } else {
        resolvedNote = 'none';
      }
    } else {
      resolvedNote = noteOverride === 'auto' ? base.note : noteOverride;
    }

    const resolvedVault = vaultOverride === 'auto' ? base.vault : vaultOverride === 'on';
    const resolvedWeb = webOverride === 'auto' ? (base.web && webAvailable) : (webOverride === 'on' && webAvailable);

    return {
      note: resolvedNote,
      vault: resolvedVault,
      web: resolvedWeb,
      reason: base.reason,
    };
  }, [debouncedPrompt, selection, aiTab, webAvailable, noteTotalTokens, noteOverride, vaultOverride, webOverride]);

  const liveContextTokens = useMemo(() => {
    let tokens = 0;
    if (effectiveRoute.note === 'selection' && selection) {
      tokens += estimateTokens(selection.text);
    } else if (effectiveRoute.note === 'full') {
      tokens += noteTotalTokens;
    } else if (effectiveRoute.note === 'relevant') {
      const ranked = rankChunks(debouncedPrompt, noteChunks, CONTEXT_BUDGETS.NOTE_CONTEXT);
      tokens += ranked.reduce((acc, c) => acc + c.tokens, 0);
    }
    if (effectiveRoute.vault) tokens += CONTEXT_BUDGETS.VAULT;
    if (effectiveRoute.web) tokens += CONTEXT_BUDGETS.WEB;
    return tokens;
  }, [effectiveRoute, selection, noteTotalTokens, noteChunks, debouncedPrompt]);

  // Edit action handlers: Replace Selection & Insert Below
  const handleReplaceSelection = useCallback(async (msg: PanelMessage) => {
    if (!editorInstance || !msg.capturedSelection) return;
    const currentDocText = editorInstance.state.doc.textBetween(
      msg.capturedSelection.from,
      msg.capturedSelection.to,
      ' '
    );

    // Verify selection still matches
    if (currentDocText !== msg.capturedSelection.text) {
      alert('The selection in your note changed since this edit was generated. Please re-select or use "Insert below".');
      return;
    }

    try {
      const { marked } = await import('marked');
      const html = await marked.parse(msg.content);
      editorInstance
        .chain()
        .focus()
        .setTextSelection({ from: msg.capturedSelection.from, to: msg.capturedSelection.to })
        .deleteRange({ from: msg.capturedSelection.from, to: msg.capturedSelection.to })
        .insertContent(html)
        .run();
      setAppliedActionMsg({ id: msg.id, action: 'Replaced' });
      setTimeout(() => setAppliedActionMsg(null), 2500);
    } catch {
      // ignore
    }
  }, [editorInstance]);

  const handleInsertBelow = useCallback(async (msg: PanelMessage) => {
    if (!editorInstance) return;
    try {
      const { marked } = await import('marked');
      const html = await marked.parse(msg.content);
      const targetPos = msg.capturedSelection?.to ?? editorInstance.state.selection.to;
      editorInstance
        .chain()
        .focus()
        .setTextSelection(targetPos)
        .insertContent('<p></p>' + html)
        .run();
      setAppliedActionMsg({ id: msg.id, action: 'Inserted' });
      setTimeout(() => setAppliedActionMsg(null), 2500);
    } catch {
      // ignore
    }
  }, [editorInstance]);

  const executeAction = useCallback(async (actionLabel: string, promptInstruction: string) => {
    if (aiLoading) return;

    const currentSelection = getSelectionInfo();
    const isEditMode = aiTab === 'Edit';
    const targetDescriptor = currentSelection
      ? currentSelection.isBlock
        ? 'cursor block'
        : `selection (${currentSelection.words} words)`
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
          heading: currentSelection.isBlock ? 'Cursor block' : 'Selected text',
          text: currentSelection.text,
        });
      } else if (effectiveRoute.note === 'full') {
        noteContentPayload.push({
          title,
          heading: 'Full note',
          text: compactMd,
        });
      } else if (effectiveRoute.note === 'relevant') {
        const ranked = rankChunks(promptInstruction, noteChunks, CONTEXT_BUDGETS.NOTE_CONTEXT);
        for (const c of ranked) {
          noteContentPayload.push({
            title,
            heading: c.headingPath || 'Section',
            text: c.text,
          });
        }
      }

      // History for multi-turn (only raw text, never context; strictly stateless in edit mode)
      const cleanHistory = isEditMode
        ? []
        : messages
            .filter(m => !m.isError && m.id !== 'welcome')
            .map(m => ({ role: m.role, content: m.content }));

      const builtMessages = buildMessages({
        mode: isEditMode ? 'edit' : 'chat',
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
            ? currentSelection?.isBlock
              ? 'note (block)'
              : 'note (selection)'
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

      const modeParams = getModeParameters(
        isEditMode ? 'edit' : 'chat',
        estimatedInputTokens
      );

      const wakeTimer = setTimeout(() => {
        setWakingServer(true);
      }, 3000);

      const requestPayload = {
        messages: builtMessages,
        mode: isEditMode ? 'edit' : 'chat',
        provider: isBuiltinProvider(providerToUse) ? providerToUse : 'custom',
        model: getProviderModel(providerToUse),
        api_key: effectiveKey,
        custom_base_url: custom?.baseUrl,
        vault: {
          enabled: effectiveRoute.vault,
          top_k: 3,
          exclude_note_id: noteId,
        },
        web: {
          enabled: effectiveRoute.web,
          max_results: 3,
        },
        temperature: modeParams.temperature,
        max_tokens: modeParams.max_tokens,
      };

      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(requestPayload),
      };

      // Call /assist SSE endpoint with cold start single-retry
      let res: Response;
      try {
        res = await fetch(`${AI_URL}/assist`, fetchOptions);
      } catch (firstErr: any) {
        if (firstErr?.name !== 'AbortError') {
          await new Promise(r => setTimeout(r, 1000));
          res = await fetch(`${AI_URL}/assist`, fetchOptions);
        } else {
          throw firstErr;
        }
      } finally {
        clearTimeout(wakeTimer);
        setWakingServer(false);
      }

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
          isEditResult: isEditMode,
          capturedSelection: currentSelection,
        },
      ]);

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated = '';
        let currentMeta = metaText;
        let rafId: number | null = null;
        let lastRafTime = 0;

        const scheduleFlush = () => {
          const currentTime = performance.now();
          if (currentTime - lastRafTime >= 50) {
            lastRafTime = currentTime;
            const text = accumulated;
            setMessages(prev =>
              prev.map(m => (m.id === assistantMsgId ? { ...m, content: text } : m))
            );
          } else if (!rafId) {
            rafId = requestAnimationFrame(() => {
              rafId = null;
              lastRafTime = performance.now();
              const text = accumulated;
              setMessages(prev =>
                prev.map(m => (m.id === assistantMsgId ? { ...m, content: text } : m))
              );
            });
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') break;

            try {
              const event = JSON.parse(dataStr);
              if (event.type === 'meta') {
                const s = event.sources || {};
                const parts: string[] = [];
                if (noteContentPayload.length > 0) {
                  parts.push(
                    effectiveRoute.note === 'selection'
                      ? currentSelection?.isBlock
                        ? 'note (block)'
                        : 'note (selection)'
                      : effectiveRoute.note === 'full'
                      ? 'note (full)'
                      : `note (${noteContentPayload.length} sections)`
                  );
                }
                if (s.vault?.length) parts.push(`vault (${s.vault.length})`);
                if (s.web?.length) parts.push(`web (${s.web.length})`);
                const tokenK = ((event.estimated_input_tokens || estimatedInputTokens) / 1000).toFixed(1);
                currentMeta = `Used: ${parts.length > 0 ? parts.join(' · ') : 'direct model'} · ~${tokenK}k tokens in`;
                setMessages(prev =>
                  prev.map(m => (m.id === assistantMsgId ? { ...m, metaText: currentMeta } : m))
                );
              } else if (event.type === 'text') {
                accumulated += event.content || '';
                scheduleFlush();
              } else if (event.type === 'usage' && event.usage) {
                const promptTokens = event.usage.prompt_tokens;
                const tokenK = (promptTokens / 1000).toFixed(1);
                currentMeta = currentMeta.replace(/~[0-9.]+k tokens in/, `${tokenK}k tokens in (${promptTokens} tokens)`);
                setMessages(prev =>
                  prev.map(m => (m.id === assistantMsgId ? { ...m, metaText: currentMeta } : m))
                );
              } else if (event.type === 'done') {
                if (event.finish_reason === 'length') {
                  accumulated += '\n\n*(⚠️ Response was cut off)*';
                  scheduleFlush();
                }
              } else if (event.type === 'error') {
                const errMsg = event.error || 'AI generation error';
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsgId ? { ...m, content: errMsg, isError: true } : m
                  )
                );
              }
            } catch {
              // Ignore incomplete json fragments
            }
          }
        }

        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        setMessages(prev =>
          prev.map(m => (m.id === assistantMsgId ? { ...m, content: accumulated } : m))
        );
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
    noteId,
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
          {messages.map(msg => (
            <MessageRow
              key={msg.id}
              msg={msg}
              copiedId={copiedId}
              onCopy={handleCopyMessage}
              onReplaceSelection={handleReplaceSelection}
              onInsertBelow={handleInsertBelow}
              appliedActionMsg={appliedActionMsg}
              aiLoading={aiLoading}
            />
          ))}

          {wakingServer && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '6px',
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                color: '#b45309',
                fontSize: '11.5px',
              }}
            >
              <span>⏳ Waking the server (free tier, up to ~1 min)…</span>
            </div>
          )}

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

        {/* Full note warning in edit mode or when full note selected */}
        {effectiveRoute.note === 'full' && (
          <div
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              background: noteTotalTokens > 6000 ? 'rgba(234, 179, 8, 0.12)' : 'rgba(224, 84, 56, 0.08)',
              border: `1px solid ${noteTotalTokens > 6000 ? 'rgba(234, 179, 8, 0.35)' : 'rgba(224, 84, 56, 0.25)'}`,
              fontSize: '11px',
              color: noteTotalTokens > 6000 ? '#b45309' : '#e05438',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Full note: ~{noteTotalTokens} tokens</span>
            {noteTotalTokens > 6000 && (
              <span style={{ fontWeight: 500 }}>
                ⚠️ Output is capped by max_tokens.
              </span>
            )}
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
