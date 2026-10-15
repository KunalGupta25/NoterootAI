import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('noteroot_cookie_consent');
      if (!consent) {
        // Small delay to prevent layout pop
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore if localStorage unavailable
    }
  }, []);

  const handleConsent = (level: 'all' | 'essential') => {
    try {
      localStorage.setItem('noteroot_cookie_consent', JSON.stringify({ level, date: Date.now() }));
    } catch {
      // Ignore
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie and Privacy Notice"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 40px)',
        maxWidth: '720px',
        zIndex: 9999,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: '1 1 360px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--accent-bg)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          <ShieldCheck size={18} />
        </div>
        <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--fg)' }}>
          <strong style={{ display: 'block', marginBottom: '2px', fontSize: '13.5px' }}>
            Privacy & Local Storage Notice
          </strong>
          <span>
            NoteRoot AI uses strictly necessary local browser storage (IndexedDB & tokens) to keep your notes private,
            secure, and offline-ready. We do not use advertising or tracking cookies.{' '}
            <Link
              to="/cookie-policy"
              style={{
                color: 'var(--accent)',
                textDecoration: 'underline',
                fontWeight: 500,
              }}
            >
              Read our Cookie Policy
            </Link>
            .
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={() => handleConsent('essential')}
          style={{
            padding: '7px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--muted)',
            fontSize: '12.5px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
        >
          Essential Only
        </button>

        <button
          onClick={() => handleConsent('all')}
          style={{
            padding: '7px 16px',
            borderRadius: '6px',
            border: 'none',
            background: 'var(--accent)',
            color: '#ffffff',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(224, 84, 56, 0.25)',
          }}
        >
          Accept
        </button>

        <button
          onClick={() => handleConsent('essential')}
          aria-label="Close"
          style={{
            padding: '6px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            color: 'var(--muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
