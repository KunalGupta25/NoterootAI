import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CodeBlock({ node, inline, className, children, ...props }: any) {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div style={{ position: 'relative' }} className="group/code">
        <button
          className="copy-btn"
          onClick={handleCopy}
          title="Copy code"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '4px',
            cursor: 'pointer',
            color: copied ? '#22c55e' : 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            opacity: copied ? 1 : 0,
            transition: 'opacity 0.2s',
            zIndex: 10
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <pre style={{ margin: 0 }}>
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
