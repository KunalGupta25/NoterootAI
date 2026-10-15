import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Database,
  ArrowLeft,
  Sparkles,
  Sun,
  Moon,
  Info,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';

export default function CookiePolicyPage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const isDark = theme === 'dark';

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        scrollBehavior: 'smooth',
      }}
    >
      {/* ── Top Header ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: isDark ? 'rgba(20, 20, 20, 0.85)' : 'rgba(247, 247, 245, 0.85)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            padding: '0 24px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '6px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <div style={{ height: '16px', width: '1px', background: 'var(--border)' }} />
            <Link
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                color: 'inherit',
                fontWeight: 700,
                fontSize: '15px',
              }}
            >
              <span style={{ color: 'var(--accent)' }}>NoteRoot</span> AI
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle theme"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {token ? (
              <Link
                to="/app"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: 'var(--accent)',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                }}
              >
                Go to Workspace
              </Link>
            ) : (
              <Link
                to="/auth"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                }}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Document Container ── */}
      <main
        style={{
          maxWidth: '820px',
          margin: '40px auto 80px',
          padding: '0 24px',
          lineHeight: 1.65,
        }}
      >
        {/* Title Header */}
        <div style={{ marginBottom: '40px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            <ShieldCheck size={14} />
            <span>Transparency & Privacy Standard</span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 800,
              letterSpacing: '-1px',
              margin: '0 0 12px',
            }}
          >
            Cookie & Local Storage Policy
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>
            Last updated: October 15, 2026 • Effective immediately
          </p>
        </div>

        {/* Highlight Callout Box */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '36px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Info size={18} style={{ color: 'var(--accent)' }} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>The Short, Plain-English Summary</h3>
          </div>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.6 }}>
            NoteRoot AI is built with a <strong>local-first architecture</strong>. We do not use third-party advertising cookies,
            trackers, or cross-site fingerprinting scripts. We store strictly necessary session tokens and your local note database
            (IndexedDB) directly in your browser so you have zero-latency note-taking and full offline functionality.
          </p>
        </div>

        {/* Section 1 */}
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px' }}>1. What Technologies We Use</h2>
          <p style={{ color: 'var(--fg)', fontSize: '14px', marginBottom: '16px' }}>
            Instead of traditional intrusive cookies, NoteRoot AI relies primarily on modern browser client storage:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Database size={16} style={{ color: 'var(--accent)' }} />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>IndexedDB (Client-Side Database)</h4>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                Stores your notes, wikilinks, tags, spaces, and workspace preferences locally on your device.
                This ensures instant loading times and uninterrupted offline operation.
              </p>
            </div>

            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Lock size={16} style={{ color: 'var(--accent)' }} />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Authentication Storage (Session Token)</h4>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                Stored in <code>localStorage</code> under <code>noteroot-auth</code> to keep you signed in securely to your
                cloud vault. When you click <strong>Log Out</strong>, this session token is completely erased from your browser.
              </p>
            </div>

            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Sparkles size={16} style={{ color: 'var(--accent)' }} />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>UI Preferences & Theme Settings</h4>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                Remembers your choice of Light vs. Dark mode, sidebar expand/collapse state, and local editor settings.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px' }}>2. Storage Categorization Table</h2>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Item Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Purpose</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>noteroot-auth</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>LocalStorage</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>Cloud Vault Authentication</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>Until Logout</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>NoteRoot (vault)</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>IndexedDB</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>Offline Notes & Wikilinks</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>Persistent / User-Managed</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>noteroot-settings</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>LocalStorage</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>Theme, Provider Configuration</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>Persistent</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>noteroot_cookie_consent</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>LocalStorage</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>Stores your consent choice</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>1 Year</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3 */}
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px' }}>3. Artificial Intelligence & Third-Party Keys</h2>
          <p style={{ color: 'var(--fg)', fontSize: '14px', lineHeight: 1.6 }}>
            When you configure an AI provider in NoteRoot (such as OpenAI, Anthropic Claude, Google Gemini, Groq, or Ollama),
            your API keys remain strictly under your control. We do not sell your personal data, and your note content is
            never shared with third parties or used to train artificial intelligence models.
          </p>
        </section>

        {/* Section 4 */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px' }}>4. How to Manage or Clear Your Data</h2>
          <p style={{ color: 'var(--fg)', fontSize: '14px', lineHeight: 1.6, marginBottom: '14px' }}>
            You can clear your local storage at any time by:
          </p>
          <ul style={{ color: 'var(--muted)', fontSize: '13.5px', paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Clicking <strong>Log Out</strong> in the sidebar or account settings.</li>
            <li>Exporting a JSON backup of your notes via Settings &gt; Vault &gt; Export.</li>
            <li>Using your browser developer tools or settings to clear site data for NoteRoot AI.</li>
          </ul>
        </section>

        {/* Contact info footer */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '13px',
            color: 'var(--muted)',
          }}
        >
          <div>Questions about your privacy? Reach out via GitHub repository.</div>
          <a
            href="https://github.com/KunalGupta25/NoterootAI"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span>GitHub Repository</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </main>
    </div>
  );
}
