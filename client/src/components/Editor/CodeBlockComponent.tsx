import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Copy, Check, ChevronDown } from 'lucide-react';

export interface CodeLanguage {
  id: string;
  name: string;
  grammar: string;
  color: string;
  bgBadge: string;
  aliases?: string[];
}

export const CODE_LANGUAGES: CodeLanguage[] = [
  // Shell & Terminal
  { id: 'bash', name: 'Bash', grammar: 'bash', color: '#22c55e', bgBadge: 'rgba(34, 197, 94, 0.15)', aliases: ['sh', 'shell', 'zsh'] },
  { id: 'terminal', name: 'Terminal', grammar: 'bash', color: '#10b981', bgBadge: 'rgba(16, 185, 129, 0.15)', aliases: ['console', 'cli', 'cmd', 'powershell', 'ps1'] },
  { id: 'curl', name: 'cURL', grammar: 'bash', color: '#0ea5e9', bgBadge: 'rgba(14, 165, 233, 0.15)', aliases: ['curl'] },

  // Web & Frontend
  { id: 'javascript', name: 'JavaScript', grammar: 'javascript', color: '#facc15', bgBadge: 'rgba(250, 204, 21, 0.15)', aliases: ['js'] },
  { id: 'typescript', name: 'TypeScript', grammar: 'typescript', color: '#3178c6', bgBadge: 'rgba(49, 120, 198, 0.15)', aliases: ['ts'] },
  { id: 'react', name: 'React (JSX)', grammar: 'javascript', color: '#61dafb', bgBadge: 'rgba(97, 218, 251, 0.15)', aliases: ['jsx', 'tsx'] },
  { id: 'html', name: 'HTML', grammar: 'xml', color: '#f97316', bgBadge: 'rgba(249, 115, 22, 0.15)', aliases: ['xml', 'xhtml'] },
  { id: 'css', name: 'CSS', grammar: 'css', color: '#ec4899', bgBadge: 'rgba(236, 72, 153, 0.15)', aliases: ['scss', 'less'] },

  // Programming Languages
  { id: 'python', name: 'Python', grammar: 'python', color: '#3b82f6', bgBadge: 'rgba(59, 130, 246, 0.15)', aliases: ['py'] },
  { id: 'sql', name: 'SQL', grammar: 'sql', color: '#a855f7', bgBadge: 'rgba(168, 85, 247, 0.15)', aliases: ['psql', 'mysql', 'sqlite'] },
  { id: 'java', name: 'Java', grammar: 'java', color: '#ea580c', bgBadge: 'rgba(234, 88, 12, 0.15)' },
  { id: 'c', name: 'C', grammar: 'c', color: '#94a3b8', bgBadge: 'rgba(148, 163, 184, 0.15)', aliases: ['h'] },
  { id: 'cpp', name: 'C++', grammar: 'cpp', color: '#0284c7', bgBadge: 'rgba(2, 132, 199, 0.15)', aliases: ['c++', 'cc', 'hpp'] },
  { id: 'go', name: 'Go', grammar: 'go', color: '#00add8', bgBadge: 'rgba(0, 173, 216, 0.15)', aliases: ['golang'] },
  { id: 'rust', name: 'Rust', grammar: 'rust', color: '#f97316', bgBadge: 'rgba(249, 115, 22, 0.15)', aliases: ['rs'] },

  // Data & Formats
  { id: 'json', name: 'JSON', grammar: 'json', color: '#eab308', bgBadge: 'rgba(234, 179, 8, 0.15)', aliases: ['jsonc'] },
  { id: 'yaml', name: 'YAML', grammar: 'yaml', color: '#f43f5e', bgBadge: 'rgba(244, 63, 94, 0.15)', aliases: ['yml'] },
  { id: 'markdown', name: 'Markdown', grammar: 'markdown', color: '#38bdf8', bgBadge: 'rgba(56, 189, 248, 0.15)', aliases: ['md', 'mkd'] },
  { id: 'plaintext', name: 'Text', grammar: 'plaintext', color: '#94a3b8', bgBadge: 'rgba(148, 163, 184, 0.15)', aliases: ['text', 'txt'] },
];

export const CODE_LANGUAGE_GROUPS = [
  {
    group: 'Shell & Terminal',
    ids: ['bash', 'terminal', 'curl'],
  },
  {
    group: 'Web & Frontend',
    ids: ['javascript', 'typescript', 'react', 'html', 'css'],
  },
  {
    group: 'Languages',
    ids: ['python', 'java', 'c', 'cpp', 'go', 'rust'],
  },
  {
    group: 'Data & Formats',
    ids: ['sql', 'json', 'yaml', 'markdown', 'plaintext'],
  },
];

export function findLanguage(rawLang?: string): CodeLanguage {
  if (!rawLang) return CODE_LANGUAGES.find(l => l.id === 'plaintext') || CODE_LANGUAGES[0];
  const normalized = rawLang.toLowerCase().trim();
  const found = CODE_LANGUAGES.find(
    l => l.id === normalized || (l.aliases && l.aliases.includes(normalized)) || l.grammar === normalized
  );
  return found || CODE_LANGUAGES.find(l => l.id === 'plaintext') || CODE_LANGUAGES[0];
}

export function CodeBlockComponent({ node, updateAttributes }: any) {
  const currentLangId = node.attrs.language || 'plaintext';
  const selectedLang = findLanguage(currentLangId);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const code = node.textContent;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chosenLangId = e.target.value;
    updateAttributes({ language: chosenLangId });
  };

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div className="code-block-header">
        {/* Left: macOS dots + Language Selector Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.75 }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }} />
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              position: 'relative',
              background: selectedLang.bgBadge,
              border: `1px solid ${selectedLang.color}35`,
              borderRadius: '6px',
              padding: '2px 8px',
              gap: '6px',
            }}
          >
            {/* Color Dot indicator */}
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: selectedLang.color,
                boxShadow: `0 0 6px ${selectedLang.color}`,
              }}
            />

            {/* Language Select Dropdown */}
            <select
              contentEditable={false}
              value={selectedLang.id}
              onChange={handleLanguageChange}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--fg)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                paddingRight: '14px',
                appearance: 'none',
              }}
            >
              {CODE_LANGUAGE_GROUPS.map(grp => (
                <optgroup key={grp.group} label={grp.group} style={{ background: 'var(--surface)', color: 'var(--fg)', fontWeight: 700 }}>
                  {grp.ids.map(id => {
                    const lang = CODE_LANGUAGES.find(l => l.id === id);
                    if (!lang) return null;
                    return (
                      <option key={lang.id} value={lang.id} style={{ background: 'var(--surface)', color: 'var(--fg)', fontWeight: 400 }}>
                        {lang.name}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>

            <ChevronDown
              size={12}
              style={{
                position: 'absolute',
                right: '6px',
                pointerEvents: 'none',
                opacity: 0.6,
                color: selectedLang.color,
              }}
            />
          </div>
        </div>

        {/* Right: Copy Code Button */}
        <button
          onClick={handleCopy}
          contentEditable={false}
          title="Copy code to clipboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'transparent',
            border: 'none',
            color: copied ? '#22c55e' : 'var(--muted)',
            fontSize: '11.5px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '3px 8px',
            borderRadius: '4px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            if (!copied) e.currentTarget.style.color = 'var(--fg)';
          }}
          onMouseLeave={e => {
            if (!copied) e.currentTarget.style.color = 'var(--muted)';
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Code Text Area */}
      <pre className="code-block-pre">
        <NodeViewContent as={'code' as any} />
      </pre>
    </NodeViewWrapper>
  );
}
