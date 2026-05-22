import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, Trash2, Check, X, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useSettingsStore } from '../../stores/settingsStore';
import { usePluginStore } from '../../stores/pluginStore';

import { AI_URL } from '../../lib/constants';
import { isBuiltinProvider } from '../../lib/providerConfig';
import { CodeBlock } from '../Markdown/CodeBlock';

interface AgentMessage {
  role: 'user' | 'assistant' | 'tool';
  content?: string;
  tool_call_id?: string;
  tool_name?: string;
  tool_calls?: any[];
}

interface ToolRequest {
  call_id: string;
  tool: string;
  args: any;
}

// ── Renders a single tool request card requiring user approval ──
function ToolApprovalCard({
  req,
  onApprove,
  onReject,
  executing
}: {
  req: ToolRequest;
  onApprove: () => void;
  onReject: () => void;
  executing: boolean;
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '12px', marginTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--fg)', fontWeight: 600, fontSize: '13px' }}>
        <Bot size={14} style={{ color: 'var(--accent)' }} />
        Agent wants to execute: <span className="mono" style={{ color: 'var(--accent)', fontSize: '12px' }}>{req.tool}</span>
      </div>
      <div className="mono" style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--bg)', padding: '8px', borderRadius: '4px', overflowX: 'auto', marginBottom: '12px' }}>
        {JSON.stringify(req.args, null, 2)}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onApprove}
          disabled={executing}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--accent)', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: executing ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 500 }}
        >
          {executing ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Approve
        </button>
        <button
          onClick={onReject}
          disabled={executing}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'transparent', color: 'var(--fg)', border: '1px solid var(--border)', padding: '6px', borderRadius: '4px', cursor: executing ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 500 }}
        >
          <X size={14} /> Reject
        </button>
      </div>
    </div>
  );
}

export default function AgentPanel() {
  const settings = useSettingsStore();
  const { handlePluginApiRequest } = usePluginStore();
  const navigate = useNavigate();


  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingTool, setPendingTool] = useState<ToolRequest | null>(null);
  const [executingTool, setExecutingTool] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingTool]);

  const getApiInfo = useCallback((provider: string) => {
    const s = useSettingsStore.getState();
    if (isBuiltinProvider(provider)) return { apiKey: s.providerKeys[provider] ?? '', customBaseUrl: undefined };
    const custom = s.customProviders.find((c) => c.id === provider);
    return { apiKey: custom?.apiKey ?? '', customBaseUrl: custom?.baseUrl };
  }, []);

  const runAgentRequest = async (currentMessages: AgentMessage[], toolResultPayload?: any) => {
    const provider = settings.activeProvider;
    const model = settings.getProviderModel(provider);
    const { apiKey, customBaseUrl } = getApiInfo(provider);

    if (!apiKey && !customBaseUrl) return;

    setLoading(true);
    setPendingTool(null);

    try {
      const res = await fetch(`${AI_URL}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages,
          provider: isBuiltinProvider(provider) ? provider : 'custom',
          model,
          api_key: apiKey,
          custom_base_url: customBaseUrl,
          tool_result: toolResultPayload
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      // Add a placeholder for the assistant's new response
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      let currentContent = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const dataStr = part.slice(6).trim();
            if (dataStr === '[DONE]') break;
            
            try {
              const event = JSON.parse(dataStr);
              if (event.type === 'text') {
                currentContent += event.content;
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1].content = currentContent;
                  return next;
                });
              } else if (event.type === 'tool_request') {
                setPendingTool({
                  call_id: event.call_id,
                  tool: event.tool,
                  args: event.args
                });
                setMessages((prev) => {
                  const next = [...prev];
                  if (next.length > 0) {
                    next[next.length - 1].tool_calls = [{
                      id: event.call_id,
                      type: 'function',
                      function: { name: event.tool, arguments: JSON.stringify(event.args) }
                    }];
                  }
                  return next;
                });
              } else if (event.type === 'tool_silent') {
                 // The server ran a read-only tool (e.g. search_notes). Just show a small log.
                 currentContent += `\n*🔎 Executed ${event.tool}...*\n`;
                 setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1].content = currentContent;
                  return next;
                });
              } else if (event.type === 'error') {
                 currentContent += `\n**Error:** ${event.content}`;
                 setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1].content = currentContent;
                  return next;
                });
              }
            } catch (e) {
              console.error('Failed to parse SSE event', e, dataStr);
            }
          }
        }
      }
    } catch (err) {
      console.error('Agent error:', err);
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠ Failed to reach AI service.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || pendingTool) return;

    const newMessages: AgentMessage[] = [...messages, { role: 'user', content: input.trim() }];
    setMessages(newMessages);
    setInput('');
    runAgentRequest(newMessages);
  };

  const handleToolApprove = async () => {
    if (!pendingTool) return;
    setExecutingTool(true);
    let resultPayload: any;

    try {
      // Map Agent Tools to PluginAPI methods
      let toolRes: any;
      if (pendingTool.tool === 'create_note') {
        toolRes = await handlePluginApiRequest('notes', 'createNote', [pendingTool.args.title, pendingTool.args.content]);
        if (toolRes) setTimeout(() => navigate(`/notes/${toolRes}`), 100);
      } else if (pendingTool.tool === 'append_to_note') {
        toolRes = await handlePluginApiRequest('notes', 'appendContent', [pendingTool.args.note_id, pendingTool.args.content]);
      } else if (pendingTool.tool === 'update_note_title') {
        toolRes = await handlePluginApiRequest('notes', 'updateNote', [pendingTool.args.note_id, { title: pendingTool.args.new_title }]);
      } else if (pendingTool.tool === 'create_sub_note') {
        toolRes = await handlePluginApiRequest('notes', 'createSubNote', [pendingTool.args.parent_id, pendingTool.args.title, pendingTool.args.content]);
        if (toolRes) setTimeout(() => navigate(`/notes/${toolRes}`), 100);
      } else if (pendingTool.tool === 'replace_note_content') {
        toolRes = await handlePluginApiRequest('notes', 'replaceContent', [pendingTool.args.note_id, pendingTool.args.content]);
      } else if (pendingTool.tool === 'delete_note') {
        toolRes = await handlePluginApiRequest('notes', 'deleteNote', [pendingTool.args.note_id]);
        setTimeout(() => navigate('/'), 100);
      } else if (pendingTool.tool === 'read_note') {
        toolRes = await handlePluginApiRequest('notes', 'getNote', [pendingTool.args.note_id]);
      } else if (pendingTool.tool === 'list_all_notes') {
        toolRes = await handlePluginApiRequest('notes', 'listAllNotes', []);
      } else {
        throw new Error(`Unsupported client tool: ${pendingTool.tool}`);
      }

      resultPayload = {
        tool_call_id: pendingTool.call_id,
        tool_name: pendingTool.tool,
        result: toolRes || { success: true }
      };

    } catch (error: any) {
      resultPayload = {
        tool_call_id: pendingTool.call_id,
        tool_name: pendingTool.tool,
        result: null,
        error: error.message
      };
    }

    setExecutingTool(false);
    
    // Add the tool result to the local messages so the user sees it happened
    const updatedMessages: AgentMessage[] = [
      ...messages,
      { role: 'tool', tool_call_id: pendingTool.call_id, tool_name: pendingTool.tool, content: JSON.stringify(resultPayload.result || resultPayload.error) }
    ];
    setMessages(updatedMessages);
    setPendingTool(null);
    
    // Resume agent with the tool result
    runAgentRequest(updatedMessages, resultPayload);
  };

  const handleToolReject = () => {
    if (!pendingTool) return;
    const resultPayload = {
      tool_call_id: pendingTool.call_id,
      tool_name: pendingTool.tool,
      result: null,
      error: "User rejected the action."
    };
    
    const updatedMessages: AgentMessage[] = [
      ...messages,
      { role: 'tool', tool_call_id: pendingTool.call_id, tool_name: pendingTool.tool, content: "Action rejected by user." }
    ];
    setMessages(updatedMessages);
    setPendingTool(null);
    runAgentRequest(updatedMessages, resultPayload);
  };

  const isConfigured = (() => {
    const { apiKey, customBaseUrl } = getApiInfo(settings.activeProvider);
    return (apiKey?.length ?? 0) > 0 || !!customBaseUrl;
  })();

  if (!isConfigured) {
    return (
      <div style={{ padding: '32px 16px', fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
        Configure an AI Provider in Settings to start the Agent.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: '32px' }}>
            <Bot size={28} style={{ margin: '0 auto 12px', color: 'var(--accent)' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', marginBottom: '4px' }}>Autonomous Agent</div>
            <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
              I can manage your notes autonomously. Ask me to draft a new project spec or append research to an existing note!
            </div>
          </div>
        ) : (
          messages.map((m, i) => {
            if (m.role === 'tool') {
              const isError = m.content?.includes('"error"') || m.content?.includes('rejected');
              return (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingLeft: '32px', color: isError ? '#ef4444' : 'var(--muted)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  {isError ? <X size={12} /> : <Check size={12} style={{ color: 'var(--accent)' }} />} 
                  {isError ? `Failed to execute ${m.tool_name}` : `Executed ${m.tool_name} successfully`}
                </div>
              );
            }
            if (m.role === 'assistant' && !m.content && m.tool_calls) {
              return null; // hide the empty assistant message that only has tool calls
            }
            return (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '4px', flexShrink: 0, background: m.role === 'user' ? 'var(--surface)' : 'var(--accent)', border: m.role === 'user' ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.role === 'user' ? 'var(--muted)' : 'white' }}>
                  {m.role === 'user' ? 'U' : <Bot size={14} />}
                </div>
                <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.6, color: 'var(--fg)' }} className="prose">
                  <ReactMarkdown components={{ code: CodeBlock }}>{m.content || ''}</ReactMarkdown>
                </div>
              </div>
            );
          })
        )}

        {pendingTool && (
          <ToolApprovalCard 
            req={pendingTool} 
            onApprove={handleToolApprove} 
            onReject={handleToolReject} 
            executing={executingTool} 
          />
        )}
        
        {loading && !pendingTool && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--muted)', fontSize: '12px' }}>
            <Loader2 size={14} className="spin" /> Agent is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '10px', borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', padding: '5px 5px 5px 10px', borderRadius: '6px' }}>
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            placeholder="Instruct the agent..."
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', flex: 1, color: 'var(--fg)' }}
            disabled={loading || !!pendingTool} 
          />
          {messages.length > 0 && (
            <button type="button" onClick={() => { setMessages([]); setPendingTool(null); }} title="Clear history"
              style={{ background: 'none', border: 'none', padding: '5px', color: 'var(--muted)', cursor: 'pointer', display: 'flex', borderRadius: '4px' }}>
              <Trash2 size={13} />
            </button>
          )}
          <button type="submit" disabled={!input.trim() || loading || !!pendingTool} style={{ background: input.trim() ? 'var(--accent)' : 'var(--surface)', border: 'none', padding: '5px', borderRadius: '4px', color: input.trim() ? 'white' : 'var(--muted)', cursor: input.trim() ? 'pointer' : 'default', display: 'flex' }}>
            <Send size={13} />
          </button>
        </form>
      </div>
    </div>
  );
}
