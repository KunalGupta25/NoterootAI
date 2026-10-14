import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { findLanguage } from '../Editor/CodeBlockComponent';

export function CodeBlock({ node, inline, className, children, ...props }: any) {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, '');
  const langObj = findLanguage(match ? match[1] : undefined);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="code-block-wrapper">
        <div className="code-block-header">
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
                background: langObj.bgBadge,
                border: `1px solid ${langObj.color}35`,
                borderRadius: '6px',
                padding: '2px 8px',
                gap: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--fg)',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: langObj.color,
                  boxShadow: `0 0 6px ${langObj.color}`,
                }}
              />
              <span>{langObj.name}</span>
            </div>
          </div>

          <button
            onClick={handleCopy}
            title="Copy code"
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
            onMouseEnter={e => !copied && (e.currentTarget.style.color = 'var(--fg)')}
            onMouseLeave={e => !copied && (e.currentTarget.style.color = 'var(--muted)')}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        <pre className="code-block-pre">
          <code className={className} spellCheck={false} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  }

  return (
    <code className={className} spellCheck={false} {...props}>
      {children}
    </code>
  );
}

