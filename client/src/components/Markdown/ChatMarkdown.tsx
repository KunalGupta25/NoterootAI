import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

interface ChatMarkdownProps {
  content: string;
  className?: string;
}

export const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ content, className = '' }) => {
  return (
    <div
      className={`chat-markdown ${className}`}
      style={{
        fontSize: '13px',
        lineHeight: 1.55,
        color: 'var(--fg)',
        wordBreak: 'break-word',
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Pre & Code
          pre: ({ children }) => <>{children}</>,
          code: (props) => <CodeBlock {...props} />,

          // Headings
          h1: ({ children }) => (
            <h1 style={{ fontSize: '15px', fontWeight: 700, margin: '10px 0 6px', color: 'var(--fg)' }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ fontSize: '14px', fontWeight: 600, margin: '8px 0 4px', color: 'var(--fg)' }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontSize: '13.5px', fontWeight: 600, margin: '6px 0 3px', color: 'var(--fg)' }}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '4px 0 2px', color: 'var(--fg)' }}>
              {children}
            </h4>
          ),

          // Paragraphs & Blockquotes
          p: ({ children }) => (
            <p style={{ margin: '0 0 6px 0', lineHeight: 1.55 }}>{children}</p>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                margin: '6px 0',
                padding: '4px 10px',
                borderLeft: '3px solid var(--accent)',
                background: 'var(--surface-2)',
                borderRadius: '0 4px 4px 0',
                color: 'var(--muted)',
                fontSize: '12.5px',
                fontStyle: 'italic',
              }}
            >
              {children}
            </blockquote>
          ),

          // Lists
          ul: ({ children }) => (
            <ul style={{ margin: '4px 0 6px', paddingLeft: '18px', listStyleType: 'disc' }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{ margin: '4px 0 6px', paddingLeft: '18px', listStyleType: 'decimal' }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{ margin: '2px 0', lineHeight: 1.5 }}>{children}</li>
          ),

          // Divider
          hr: () => (
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '10px 0' }} />
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--accent)',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
              }}
            >
              {children}
            </a>
          ),

          // Tables
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '8px 0', maxWidth: '100%' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                }}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th
              style={{
                padding: '6px 10px',
                textAlign: 'left',
                fontWeight: 600,
                color: 'var(--fg)',
                borderRight: '1px solid var(--border)',
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              style={{
                padding: '5px 10px',
                borderTop: '1px solid var(--border)',
                borderRight: '1px solid var(--border)',
                color: 'var(--fg)',
              }}
            >
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
