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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {node.children.map((child, i) => <DescriptorRenderer key={i} node={child} />)}
        </div>
      );
    case 'Row':
      return (
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
          {node.children.map((child, i) => <DescriptorRenderer key={i} node={child} />)}
        </div>
      );
    case 'Label':
      return <label style={{ fontSize: '13px', fontWeight: 500 }}>{node.text}</label>;
    case 'Text':
      return <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{node.text}</span>;
    case 'Markdown':
      return (
        <div className="prose prose-sm" style={{ color: 'var(--fg)', fontSize: '13px' }}>
          <ReactMarkdown>{node.text}</ReactMarkdown>
        </div>
      );
    case 'Button':
      return (
        <button
          onClick={node.onClick}
          disabled={node.disabled}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            borderRadius: '6px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--fg)',
            cursor: node.disabled ? 'not-allowed' : 'pointer',
            opacity: node.disabled ? 0.6 : 1
          }}
        >
          {node.label}
        </button>
      );
    case 'Input':
      return (
        <input
          value={node.value}
          onChange={(e) => node.onChange(e.target.value)}
          placeholder={node.placeholder}
          style={{
            width: '100%',
            padding: '6px 10px',
            fontSize: '13px',
            borderRadius: '6px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--fg)'
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
          Toggle
        </label>
      );
    case 'Divider':
      return <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />;
    case 'Badge':
      return (
        <span style={{ padding: '2px 6px', background: 'var(--accent)', color: 'white', borderRadius: '4px', fontSize: '10px' }}>
          {node.text}
        </span>
      );
    case 'Link':
      return (
        <a href={node.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: '12px', textDecoration: 'underline' }}>
          {node.text}
        </a>
      );
    case 'TabBar':
      return (
        <div style={{
          display: 'flex', gap: '4px', overflowX: 'auto', padding: '8px 8px 0 8px',
          background: 'var(--surface)', borderBottom: '1px solid var(--border)'
        }}>
          {node.children.map((child, i) => <DescriptorRenderer key={i} node={child} />)}
        </div>
      );
    case 'Tab':
      return (
        <div
          onClick={node.onClick}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', fontSize: '13px', fontWeight: node.active ? 600 : 500,
            color: node.active ? 'var(--fg)' : 'var(--muted)',
            background: node.active ? 'var(--bg)' : 'transparent',
            border: '1px solid var(--border)',
            borderBottom: node.active ? '1px solid var(--bg)' : '1px solid var(--border)',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            marginBottom: '-1px',
            transition: 'background 0.15s, color 0.15s'
          }}
        >
          {node.label}
          {node.onClose && (
            <button
              onClick={(e) => { e.stopPropagation(); node.onClose!(); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', padding: '0 2px',
                color: 'inherit', opacity: 0.6, cursor: 'pointer',
                borderRadius: '50%', fontSize: '14px', lineHeight: 1
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
