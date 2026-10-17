import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { DescriptorNode } from './ExtensionPoints';

interface Props {
  node: DescriptorNode;
}

export function DescriptorRenderer({ node }: Props): React.ReactElement | null {
  if (!node || node.type === 'Empty') return null;
  
  switch (node.type) {
    case 'Column':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          {node.children.map((child, i) => <DescriptorRenderer key={i} node={child} />)}
        </div>
      );
    case 'Row':
      return (
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {node.children.map((child, i) => <DescriptorRenderer key={i} node={child} />)}
        </div>
      );
    case 'Label':
      return <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--fg)', marginTop: '4px' }}>{node.text}</div>;
    case 'Text':
      return <div style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.5 }}>{node.text}</div>;
    case 'Markdown':
      return (
        <div
          className="plugin-markdown-content"
          style={{
            color: 'var(--fg)',
            fontSize: '13px',
            lineHeight: 1.6,
          }}
        >
          <ReactMarkdown
            components={{
              strong: ({ node, ...props }) => (
                <strong style={{ color: 'var(--fg)', fontWeight: 600 }} {...props} />
              ),
              b: ({ node, ...props }) => (
                <b style={{ color: 'var(--fg)', fontWeight: 600 }} {...props} />
              ),
              h1: ({ node, ...props }) => (
                <h1 style={{ color: 'var(--fg)', fontSize: '17px', fontWeight: 700, margin: '12px 0 6px' }} {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 style={{ color: 'var(--fg)', fontSize: '15px', fontWeight: 600, margin: '10px 0 6px' }} {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 style={{ color: 'var(--fg)', fontSize: '14px', fontWeight: 600, margin: '8px 0 4px' }} {...props} />
              ),
              code: ({ node, ...props }: any) => (
                <code
                  style={{
                    color: '#ff8a70',
                    background: 'var(--surface-2, rgba(255, 255, 255, 0.08))',
                    border: '1px solid var(--border)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                  {...props}
                />
              ),
              a: ({ node, ...props }) => (
                <a
                  style={{
                    color: 'var(--accent, #e05438)',
                    textDecoration: 'underline',
                    wordBreak: 'break-all',
                    fontWeight: 500,
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
              li: ({ node, ...props }) => (
                <li style={{ color: 'var(--fg)', marginBottom: '5px' }} {...props} />
              ),
              p: ({ node, ...props }) => (
                <p style={{ color: 'var(--fg)', margin: '0 0 8px 0', lineHeight: 1.55 }} {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul style={{ paddingLeft: '20px', margin: '4px 0 8px 0', color: 'var(--fg)' }} {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol style={{ paddingLeft: '20px', margin: '4px 0 8px 0', color: 'var(--fg)' }} {...props} />
              ),
            }}
          >
            {node.text}
          </ReactMarkdown>
        </div>
      );
    case 'Button':
      return (
        <button
          onClick={node.onClick}
          disabled={node.disabled}
          style={{
            padding: '7px 14px',
            fontSize: '12.5px',
            fontWeight: 500,
            borderRadius: '6px',
            background: 'var(--surface-2, rgba(255, 255, 255, 0.06))',
            border: '1px solid var(--border)',
            color: 'var(--fg)',
            cursor: node.disabled ? 'not-allowed' : 'pointer',
            opacity: node.disabled ? 0.6 : 1,
            transition: 'background 0.12s, border-color 0.12s',
          }}
          onMouseEnter={e => {
            if (!node.disabled) e.currentTarget.style.background = 'var(--border)';
          }}
          onMouseLeave={e => {
            if (!node.disabled) e.currentTarget.style.background = 'var(--surface-2, rgba(255, 255, 255, 0.06))';
          }}
        >
          {node.label}
        </button>
      );
    case 'Input':
      return (
        <input
          type={node.secret ? 'password' : 'text'}
          autoComplete="off"
          spellCheck={false}
          value={node.value || ''}
          onChange={(e) => node.onChange(e.target.value)}
          placeholder={node.placeholder}
          style={{
            width: '100%',
            padding: '9px 12px',
            fontSize: '13px',
            borderRadius: '6px',
            background: 'var(--surface-2, rgba(255, 255, 255, 0.05))',
            border: '1px solid var(--border)',
            color: 'var(--fg)',
            boxSizing: 'border-box',
            outline: 'none',
            fontFamily: node.placeholder && (node.placeholder.includes('Token') || node.placeholder.includes('ID') || node.placeholder.includes('ya29')) ? 'monospace' : 'inherit',
          }}
        />
      );
    case 'Select':
      return (
        <select
          value={node.value}
          onChange={(e) => node.onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 10px',
            fontSize: '13px',
            borderRadius: '6px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--fg)'
          }}
        >
          {node.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case 'RadioGroup':
      return (
        <div style={{ display: 'flex', gap: '12px' }}>
          {node.options.map((opt) => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name={`radio-group-${node.value}`}
                checked={node.value === opt}
                onChange={() => node.onChange(opt)}
                style={{ cursor: 'pointer' }}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    case 'Toggle':
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
          <input type="checkbox" checked={node.checked} onChange={(e) => node.onChange(e.target.checked)} />
          {node.label ?? 'Toggle'}
        </label>
      );
    case 'Divider':
      return <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />;
    case 'Badge':
      return (
        <span
          style={{
            padding: '3px 8px',
            background: 'rgba(224, 84, 56, 0.15)',
            border: '1px solid rgba(224, 84, 56, 0.35)',
            color: '#ff8a70',
            borderRadius: '5px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            letterSpacing: '0.2px',
          }}
        >
          {node.text}
        </span>
      );
    case 'Link':
      return (
        <a
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--accent, #e05438)',
            fontSize: '12.5px',
            textDecoration: 'none',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
          onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
        >
          {node.text}
        </a>
      );
    case 'TabBar':
      return (
        <div style={{
          display: 'flex',
          gap: '4px',
          overflowX: 'auto',
          padding: '6px 16px 0 16px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          alignItems: 'flex-end',
          scrollbarWidth: 'none'
        }}>
          {node.children.map((child, i) => <DescriptorRenderer key={i} node={child} />)}
        </div>
      );
    case 'Tab':
      return (
        <div
          onClick={node.onClick}
          title={node.label}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: node.active ? 600 : 450,
            color: node.active ? 'var(--fg)' : 'var(--muted)',
            background: node.active ? 'var(--bg)' : 'transparent',
            border: '1px solid var(--border)',
            borderBottom: node.active ? '1px solid var(--bg)' : '1px solid var(--border)',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            marginBottom: '-1px',
            transition: 'all 0.15s ease',
            maxWidth: '220px',
            userSelect: 'none',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.label}
          </span>
          {node.onClose && (
            <button
              onClick={(e) => { e.stopPropagation(); node.onClose!(); }}
              title="Close tab"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                padding: '0 2px',
                color: 'inherit',
                opacity: 0.6,
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '13px',
                lineHeight: 1,
                marginLeft: '2px',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--border)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'none'; }}
            >
              ×
            </button>
          )}
        </div>
      );
    default:
      return null;
  }
}
