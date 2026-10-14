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
  { id: 'plaintext', name: 'Text', grammar: 'plaintext', color: '#94a3b8', bgBadge: 'rgba(148, 163, 184, 0.15)', aliases: ['text', 'txt'] },
  { id: 'markdown', name: 'Markdown', grammar: 'markdown', color: '#38bdf8', bgBadge: 'rgba(56, 189, 248, 0.15)', aliases: ['md'] },
  { id: 'python', name: 'Python', grammar: 'python', color: '#3b82f6', bgBadge: 'rgba(59, 130, 246, 0.15)', aliases: ['py'] },
  { id: 'javascript', name: 'JavaScript', grammar: 'javascript', color: '#facc15', bgBadge: 'rgba(250, 204, 21, 0.15)', aliases: ['js'] },
  { id: 'typescript', name: 'TypeScript', grammar: 'typescript', color: '#3178c6', bgBadge: 'rgba(49, 120, 198, 0.15)', aliases: ['ts'] },
  { id: 'react', name: 'React (JSX)', grammar: 'javascript', color: '#61dafb', bgBadge: 'rgba(97, 218, 251, 0.15)', aliases: ['jsx', 'tsx'] },
  { id: 'html', name: 'HTML', grammar: 'xml', color: '#f97316', bgBadge: 'rgba(249, 115, 22, 0.15)', aliases: ['xml'] },
  { id: 'css', name: 'CSS', grammar: 'css', color: '#ec4899', bgBadge: 'rgba(236, 72, 153, 0.15)' },
  { id: 'java', name: 'Java', grammar: 'java', color: '#ea580c', bgBadge: 'rgba(234, 88, 12, 0.15)' },
  { id: 'c', name: 'C', grammar: 'c', color: '#94a3b8', bgBadge: 'rgba(148, 163, 184, 0.15)' },
  { id: 'cpp', name: 'C++', grammar: 'cpp', color: '#0284c7', bgBadge: 'rgba(2, 132, 199, 0.15)', aliases: ['c++'] },
  { id: 'go', name: 'Go', grammar: 'go', color: '#00add8', bgBadge: 'rgba(0, 173, 216, 0.15)', aliases: ['golang'] },
  { id: 'sql', name: 'SQL', grammar: 'sql', color: '#a855f7', bgBadge: 'rgba(168, 85, 247, 0.15)' },
];

export function findLanguage(rawLang?: string): CodeLanguage {
  if (!rawLang) return CODE_LANGUAGES[0];
  const normalized = rawLang.toLowerCase().trim();
  const found = CODE_LANGUAGES.find(
    l => l.id === normalized || l.grammar === normalized || (l.aliases && l.aliases.includes(normalized))
  );
  return found || CODE_LANGUAGES[0];
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
    const langObj = findLanguage(chosenLangId);
    // Use the grammar for lowlight syntax highlighting
    updateAttributes({ language: langObj.grammar || chosenLangId });
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
              {CODE_LANGUAGES.map(lang => (
                <option key={lang.id} value={lang.id} style={{ background: 'var(--surface)', color: 'var(--fg)' }}>
                  {lang.name}
                </option>
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
