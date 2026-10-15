import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Share2,
  Brain,
  ShieldCheck,
  Code,
  CheckCircle2,
  ArrowRight,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Command,
  Boxes,
  FileText,
  ExternalLink,
  Check,
  FolderTree,
  Sparkle,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { performLogout } from '../lib/sessionManager';

export default function LandingPage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);

  // Interactive Demo State
  const [activeDemoTab, setActiveDemoTab] = useState<'graph' | 'editor' | 'ai' | 'plugins'>('graph');
  const [selectedGraphNode, setSelectedGraphNode] = useState<string>('Transformers');
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeFAQ, setActiveFAQ] = useState<number | null>(0);
  const [aiQueryIndex, setAiQueryIndex] = useState(0);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';

  // Demo AI Queries and responses
  const aiQueries = [
    {
      q: 'Synthesize my notes on Transformers and Graph Memory Systems',
      answer:
        'Across 4 connected notes ([[Attention Mechanisms]], [[Graph RAG Architecture]], [[Memory Networks]], and [[Vector Embeddings]]), your research establishes that graph-augmented memory mitigates token context loss by retrieving topological subgraphs before feeding prompt context to the Transformer attention heads.',
      citations: ['Attention Mechanisms.md', 'Graph RAG Architecture.md', 'Memory Networks.md'],
    },
    {
      q: 'What open questions are listed in my Q3 Systems Design docs?',
      answer:
        'In [[Q3 Architecture Spec]], you tagged 2 unresolved bottlenecks: 1) Client-side IndexedDB compaction latency during high-frequency sync, and 2) Real-time WebRTC multi-peer conflict resolution for collaborative canvas editing.',
      citations: ['Q3 Architecture Spec.md', 'Sync Protocols.md'],
    },
    {
      q: 'Draft an executive briefing comparing Local-First vs Cloud-Only',
      answer:
        'Based on your note [[Local-First Manifesto]]: Local-first delivers sub-10ms instantaneous read/writes, guarantees full data sovereignty, and prevents downtime during connectivity disruptions, while cloud sync acts strictly as a persistent replication layer.',
      citations: ['Local-First Manifesto.md', 'Privacy Benchmarks.md'],
    },
  ];

  // Graph Demo Nodes
  const graphNodes = [
    { id: 'Transformers', label: 'Transformers', category: 'Architecture', connections: 4, x: 50, y: 35 },
    { id: 'Attention', label: 'Attention Mechanism', category: 'Deep Learning', connections: 3, x: 28, y: 20 },
    { id: 'GraphRAG', label: 'Graph RAG', category: 'Knowledge', connections: 4, x: 75, y: 25 },
    { id: 'VectorDB', label: 'Vector Indexing', category: 'Storage', connections: 3, x: 80, y: 65 },
    { id: 'LocalFirst', label: 'Local-First Sync', category: 'Privacy', connections: 3, x: 25, y: 70 },
    { id: 'Plugins', label: 'Plugin Runtime', category: 'Extensibility', connections: 2, x: 50, y: 80 },
  ];

  const graphLinks = [
    { from: 'Transformers', to: 'Attention' },
    { from: 'Transformers', to: 'GraphRAG' },
    { from: 'GraphRAG', to: 'VectorDB' },
    { from: 'Transformers', to: 'LocalFirst' },
    { from: 'LocalFirst', to: 'Plugins' },
    { from: 'Attention', to: 'LocalFirst' },
  ];

  const faqs = [
    {
      q: 'How does NoteRoot AI protect my privacy and note data?',
      a: 'NoteRoot AI follows a strict local-first paradigm. All your notes, knowledge graphs, and workspace configurations are stored directly in your browser’s IndexedDB storage. Syncing to our cloud backend is encrypted, and your private notes are never used to train artificial intelligence models.',
    },
    {
      q: 'Can I bring my own AI model API keys (BYOK)?',
      a: 'Yes, absolutely! NoteRoot AI supports direct, multi-provider BYOK (Bring Your Own Key) for OpenAI, Anthropic Claude, Google Gemini, Groq, DeepSeek, and locally hosted Ollama instances. You pay provider wholesale rates with zero middleman markup.',
    },
    {
      q: 'Can I import notes from Obsidian or Notion?',
      a: 'Yes. NoteRoot AI includes built-in Markdown and ZIP vault importers. You can drop in an entire folder of markdown files with standard frontmatter, Wikilinks [[Note]], and attachments, and they will immediately populate your interactive graph.',
    },
    {
      q: 'Does NoteRoot AI work without an internet connection?',
      a: 'Yes! Because the core database lives locally in your client environment, you can draft, edit, navigate links, and explore your knowledge graph fully offline. When you reconnect, updates sync automatically.',
    },
    {
      q: 'How does the Bi-Directional Knowledge Graph work?',
      a: 'Whenever you reference another note using [[Note Title]] syntax, NoteRoot automatically builds two-way hyperlinks and recalculates relationship weights. The interactive Cytoscape graph visually clusters related concepts so you can see patterns you never noticed before.',
    },
    {
      q: 'What kind of plugins can I use or create?',
      a: 'NoteRoot AI features an open plugin runtime with UI slots, event hooks, and lifecycle management. It ships with built-in plugins (Markdown Importer, ZIP Importer, Tab Manager, Note Downloader) and allows you to install community scripts or author your own.',
    },
  ];

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
      {/* ── Background Glow Effects ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '-200px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1000px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(224, 84, 56, 0.15) 0%, rgba(224, 112, 64, 0.05) 50%, transparent 80%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ═══════════════════════════════════════════════════
          TOP NAVIGATION BAR
      ═══════════════════════════════════════════════════ */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: isDark ? 'rgba(20, 20, 20, 0.82)' : 'rgba(247, 247, 245, 0.85)',
          borderBottom: '1px solid var(--border)',
          transition: 'all 0.2s var(--ease)',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '0 24px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo & Brand */}
          <Link
            to={token ? '/' : '/landing'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(224, 84, 56, 0.2), rgba(240, 112, 64, 0.35))',
                border: '1px solid rgba(224, 84, 56, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(224, 84, 56, 0.2)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e05438" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, fontSize: '17px', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                NoteRoot <span style={{ color: 'var(--accent)' }}>AI</span>
              </span>
              <span style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Second Brain Engine
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '28px',
            }}
            className="hidden md:flex"
          >
            <a
              href="#features"
              style={{
                fontSize: '14px',
                color: 'var(--muted)',
                fontWeight: 500,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--fg)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--muted)')}
            >
              Features
            </a>
            <a
              href="#demo"
              style={{
                fontSize: '14px',
                color: 'var(--muted)',
                fontWeight: 500,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--fg)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--muted)')}
            >
              Interactive Demo
            </a>
            <a
              href="#comparison"
              style={{
                fontSize: '14px',
                color: 'var(--muted)',
                fontWeight: 500,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--fg)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--muted)')}
            >
              Comparison
            </a>
            <a
              href="#faq"
              style={{
                fontSize: '14px',
                color: 'var(--muted)',
                fontWeight: 500,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--fg)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--muted)')}
            >
              FAQ
            </a>
          </nav>

          {/* Right Controls: Theme + Auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark/light theme"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--fg)';
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {token ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => navigate('/app')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'var(--accent)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(224, 84, 56, 0.25)',
                    transition: 'transform 0.15s ease, background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <span>Open Vault ({user?.name?.split(' ')[0] || 'App'})</span>
                  <ArrowRight size={15} />
                </button>

                <button
                  onClick={() => performLogout('/')}
                  title="Log out"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--muted)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--muted)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <LogOut size={14} />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/auth"
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--fg)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  Sign In
                </Link>

                <Link
                  to="/auth?mode=signup"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'var(--accent)',
                    textDecoration: 'none',
                    boxShadow: '0 2px 10px rgba(224, 84, 56, 0.25)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(224, 84, 56, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(224, 84, 56, 0.25)';
                  }}
                >
                  <span>Get Started</span>
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          padding: '80px 24px 60px',
          maxWidth: '1240px',
          margin: '0 auto',
          textAlign: 'center',
          zIndex: 1,
        }}
      >
        {/* Top Feature Pill */}
        <div style={{ display: 'inline-flex', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--fg)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Sparkles size={14} style={{ color: 'var(--accent)' }} />
            <span>NoteRoot AI 2.0 • Local-First Intelligence & Live Graph Synthesis</span>
            <ChevronRight size={14} style={{ color: 'var(--muted)' }} />
          </div>
        </div>

        {/* Main Headline */}
        <h1
          style={{
            fontSize: 'clamp(36px, 6vw, 68px)',
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-1.8px',
            margin: '0 auto 20px',
            maxWidth: '920px',
            color: 'var(--fg)',
          }}
        >
          Where your thoughts take root.{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #e05438 0%, #f09060 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
            }}
          >
            Connected by graphs.
          </span>{' '}
          Amplified by AI.
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 'clamp(16px, 2vw, 19px)',
            lineHeight: 1.6,
            color: 'var(--muted)',
            maxWidth: '720px',
            margin: '0 auto 36px',
            fontWeight: 400,
          }}
        >
          The private, local-first workspace for interconnected notes, bi-directional knowledge graphs,
          and context-aware AI copilots. Your thoughts, your data, limitless connections.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            flexWrap: 'wrap',
            marginBottom: '48px',
          }}
        >
          <button
            onClick={() => navigate(token ? '/app' : '/auth?mode=signup')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 28px',
              borderRadius: '10px',
              background: 'var(--accent)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '15px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(224, 84, 56, 0.35)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(224, 84, 56, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(224, 84, 56, 0.35)';
            }}
          >
            <span>{token ? 'Open Your Vault' : 'Start Building Free'}</span>
            <ArrowRight size={17} />
          </button>

          <a
            href="#demo"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 24px',
              borderRadius: '10px',
              background: 'var(--surface)',
              color: 'var(--fg)',
              fontWeight: 600,
              fontSize: '15px',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <Sparkle size={16} style={{ color: 'var(--accent)' }} />
            <span>Interactive Demo</span>
          </a>
        </div>

        {/* Feature Highlights Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
            color: 'var(--muted)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <ShieldCheck size={16} style={{ color: 'var(--accent)' }} />
            <span>100% Local-First & Private</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Share2 size={16} style={{ color: 'var(--accent)' }} />
            <span>Bi-Directional Graph Visualizer</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Brain size={16} style={{ color: 'var(--accent)' }} />
            <span>Multi-Model AI (BYOK - Claude, GPT, Ollama)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Boxes size={16} style={{ color: 'var(--accent)' }} />
            <span>Extensible Plugin Architecture</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          INTERACTIVE DEMO / WORKSPACE SIMULATOR
      ═══════════════════════════════════════════════════ */}
      <section
        id="demo"
        style={{
          maxWidth: '1240px',
          margin: '0 auto 100px',
          padding: '0 24px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: isDark
              ? '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)'
              : '0 25px 80px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Simulated App Window Header */}
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--border)',
              background: isDark ? 'rgba(25, 25, 25, 0.9)' : 'rgba(240, 240, 237, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {/* Window Controls & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '12px' }}>
                <FolderTree size={14} />
                <span style={{ fontWeight: 600, color: 'var(--fg)' }}>Research Vault</span>
                <span>/</span>
                <span>Interactive Preview</span>
              </div>
            </div>

            {/* Interactive Feature Tabs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--bg)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}
            >
              {[
                { id: 'graph', label: 'Graph View', icon: Share2 },
                { id: 'editor', label: 'Block Editor', icon: FileText },
                { id: 'ai', label: 'Vault AI Copilot', icon: Brain },
                { id: 'plugins', label: 'Plugins & Runtime', icon: Boxes },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeDemoTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDemoTab(tab.id as 'graph' | 'editor' | 'ai' | 'plugins')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: isActive ? 'var(--surface)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--muted)',
                      boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Window Body */}
          <div style={{ minHeight: '440px', display: 'flex', flexDirection: 'column' }}>
            {/* ── TAB 1: KNOWLEDGE GRAPH PREVIEW ── */}
            {activeDemoTab === 'graph' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', height: '460px' }}>
                <div
                  style={{
                    position: 'relative',
                    background: isDark ? '#111111' : '#f4f4f2',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Subtle Grid Pattern */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `radial-gradient(${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} 1px, transparent 1px)`,
                      backgroundSize: '24px 24px',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* SVG Connecting Links */}
                  <svg
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                    }}
                  >
                    {graphLinks.map((link, idx) => {
                      const fromNode = graphNodes.find((n) => n.id === link.from)!;
                      const toNode = graphNodes.find((n) => n.id === link.to)!;
                      const isConnectedToSelected =
                        link.from === selectedGraphNode || link.to === selectedGraphNode;
                      return (
                        <line
                          key={idx}
                          x1={`${fromNode.x}%`}
                          y1={`${fromNode.y}%`}
                          x2={`${toNode.x}%`}
                          y2={`${toNode.y}%`}
                          stroke={isConnectedToSelected ? 'var(--accent)' : isDark ? '#333' : '#d5d5d0'}
                          strokeWidth={isConnectedToSelected ? 2.2 : 1.2}
                          strokeDasharray={isConnectedToSelected ? 'none' : '4 4'}
                          style={{ transition: 'all 0.25s ease' }}
                        />
                      );
                    })}
                  </svg>

                  {/* Interactive Nodes */}
                  {graphNodes.map((node) => {
                    const isSelected = selectedGraphNode === node.id;
                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedGraphNode(node.id)}
                        style={{
                          position: 'absolute',
                          left: `${node.x}%`,
                          top: `${node.y}%`,
                          transform: 'translate(-50%, -50%)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          zIndex: isSelected ? 10 : 5,
                        }}
                      >
                        <div
                          style={{
                            width: isSelected ? '42px' : '32px',
                            height: isSelected ? '42px' : '32px',
                            borderRadius: '50%',
                            background: isSelected
                              ? 'var(--accent)'
                              : isDark
                              ? '#262626'
                              : '#ffffff',
                            border: `2px solid ${isSelected ? '#ffffff' : 'var(--border)'}`,
                            boxShadow: isSelected
                              ? '0 0 20px rgba(224, 84, 56, 0.6)'
                              : '0 2px 8px rgba(0,0,0,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSelected ? '#ffffff' : 'var(--fg)',
                            transition: 'all 0.2s var(--ease)',
                          }}
                        >
                          <Share2 size={isSelected ? 18 : 14} />
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? 'var(--accent)' : 'var(--fg)',
                            background: 'var(--surface)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            whiteSpace: 'nowrap',
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        >
                          {node.label}
                        </span>
                      </div>
                    );
                  })}

                  <div
                    style={{
                      position: 'absolute',
                      bottom: '16px',
                      left: '16px',
                      fontSize: '11px',
                      color: 'var(--muted)',
                      background: 'var(--surface)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    💡 Click any node to inspect connections and metadata
                  </div>
                </div>

                {/* Node Inspector Panel */}
                <div
                  style={{
                    borderLeft: '1px solid var(--border)',
                    background: 'var(--surface)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: 'var(--accent-bg)',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Share2 size={15} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>
                        {selectedGraphNode}
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {graphNodes.find((n) => n.id === selectedGraphNode)?.category} Node
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'var(--bg)',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ color: 'var(--muted)', marginBottom: '4px' }}>Connected Notes</div>
                    <div style={{ fontWeight: 600 }}>
                      {graphLinks
                        .filter((l) => l.from === selectedGraphNode || l.to === selectedGraphNode)
                        .map((l) => (l.from === selectedGraphNode ? l.to : l.from))
                        .join(', ')}
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                    Bi-directional links are detected in real-time from your <code>[[wikilinks]]</code>.
                    NoteRoot automatically weighs topical affinity and clusters related knowledge concepts.
                  </div>

                  <button
                    onClick={() => navigate(token ? '/app' : '/auth')}
                    style={{
                      marginTop: 'auto',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--accent-bg)',
                      color: 'var(--accent)',
                      border: '1px solid rgba(224, 84, 56, 0.25)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Open in Graph View</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB 2: RICH BLOCK EDITOR PREVIEW ── */}
            {activeDemoTab === 'editor' && (
              <div
                style={{
                  padding: '32px 48px',
                  maxWidth: '820px',
                  margin: '0 auto',
                  width: '100%',
                  lineHeight: 1.6,
                }}
              >
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'var(--accent-bg)',
                      color: 'var(--accent)',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    #deep-learning
                  </span>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'var(--surface-2)',
                      color: 'var(--muted)',
                      fontSize: '11px',
                      fontWeight: 500,
                    }}
                  >
                    #transformers
                  </span>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'var(--surface-2)',
                      color: 'var(--muted)',
                      fontSize: '11px',
                      fontWeight: 500,
                    }}
                  >
                    Updated 2h ago
                  </span>
                </div>

                <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px' }}>
                  Scaled Dot-Product Attention & Multi-Head Projections
                </h2>

                <p style={{ color: 'var(--fg)', fontSize: '14px', marginBottom: '16px' }}>
                  In modern Transformer models, the attention function maps queries and key-value pairs
                  to a weighted output vector. We compute the dot products of the query with all keys,
                  divide each by $\sqrt&#123;d_k&#125;$, and apply softmax:
                </p>

                {/* Mathematical Equation Callout */}
                <div
                  style={{
                    background: 'var(--bg)',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontSize: '15px',
                    color: 'var(--accent)',
                    marginBottom: '20px',
                  }}
                >
                  Attention(Q, K, V) = softmax((Q · Kᵀ) / √dₖ) · V
                </div>

                {/* Interactive Task List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        background: 'var(--accent)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={12} />
                    </div>
                    <span>Formalize cross-attention layer equations for literature review</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        background: 'var(--accent)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={12} />
                    </div>
                    <span>
                      Connect backlink to <span style={{ color: 'var(--accent)', fontWeight: 600 }}>[[Memory Networks]]</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--muted)' }}>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                      }}
                    />
                    <span>Run local AI summarizer across connected citations</span>
                  </div>
                </div>

                {/* Code Snippet Box */}
                <div
                  style={{
                    background: isDark ? '#111' : '#f9f9f8',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: 'var(--fg)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <code>
                    scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(d_k)
                    <br />
                    weights = F.softmax(scores, dim=-1)
                  </code>
                  <button
                    onClick={() => {
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 1500);
                    }}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedCode ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB 3: VAULT AI COPILOT PREVIEW ── */}
            {activeDemoTab === 'ai' && (
              <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', height: '460px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Brain size={18} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>Context-Aware Vault Copilot</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      background: 'rgba(39, 201, 63, 0.15)',
                      color: '#27c93f',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    Ready • 48 Notes Indexed
                  </span>
                </div>

                {/* Prompt selector */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {aiQueries.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setAiQueryIndex(idx)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: aiQueryIndex === idx ? 'var(--accent-bg)' : 'var(--bg)',
                        color: aiQueryIndex === idx ? 'var(--accent)' : 'var(--fg)',
                        borderColor: aiQueryIndex === idx ? 'var(--accent)' : 'var(--border)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      "{item.q.length > 35 ? item.q.substring(0, 35) + '...' : item.q}"
                    </button>
                  ))}
                </div>

                {/* Simulated Conversation */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    overflowY: 'auto',
                    paddingRight: '6px',
                  }}
                >
                  {/* User query */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div
                      style={{
                        background: 'var(--accent)',
                        color: '#ffffff',
                        padding: '10px 16px',
                        borderRadius: '12px 12px 2px 12px',
                        fontSize: '13px',
                        maxWidth: '80%',
                        fontWeight: 500,
                      }}
                    >
                      {aiQueries[aiQueryIndex].q}
                    </div>
                  </div>

                  {/* AI Response */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: 'var(--accent-bg)',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Sparkles size={15} />
                    </div>
                    <div
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        padding: '14px 18px',
                        borderRadius: '2px 12px 12px 12px',
                        fontSize: '13px',
                        lineHeight: 1.6,
                        maxWidth: '85%',
                      }}
                    >
                      <p style={{ margin: '0 0 12px' }}>{aiQueries[aiQueryIndex].answer}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Citations:</span>
                        {aiQueries[aiQueryIndex].citations.map((cite, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '11px',
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              color: 'var(--accent)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <FileText size={10} />
                            {cite}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: EXTENSIBLE PLUGINS PREVIEW ── */}
            {activeDemoTab === 'plugins' && (
              <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {[
                  {
                    name: 'Markdown Importer',
                    desc: 'Drag & drop single markdown files or batches with frontmatter and wikilinks parsing.',
                    tag: 'Built-in',
                    active: true,
                  },
                  {
                    name: 'ZIP Vault Importer',
                    desc: 'Full Obsidian or Notion vault zip unpacker with directory hierarchy preservation.',
                    tag: 'Built-in',
                    active: true,
                  },
                  {
                    name: 'Workspace Tab Manager',
                    desc: 'Browser-style multi-tab workspace with hotkeys and pinned documents.',
                    tag: 'Built-in',
                    active: true,
                  },
                  {
                    name: 'Cytoscape 3D Cluster Engine',
                    desc: 'Force-directed knowledge physics and semantic cluster color coding.',
                    tag: 'Community',
                    active: true,
                  },
                  {
                    name: 'LaTeX & KaTeX Formatter',
                    desc: 'Inline and block mathematical notation rendering with equation labeling.',
                    tag: 'Built-in',
                    active: true,
                  },
                  {
                    name: 'Local Ollama Bridge',
                    desc: 'Zero-latency neural inference powered by local hardware without network calls.',
                    tag: 'Integration',
                    active: true,
                  },
                ].map((plugin, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{plugin.name}</span>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--surface-2)',
                            color: 'var(--muted)',
                            fontWeight: 600,
                          }}
                        >
                          {plugin.tag}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4 }}>
                        {plugin.desc}
                      </p>
                    </div>
                    <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: '#27c93f', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} /> Active
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--accent)', cursor: 'pointer' }}>Config</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FEATURE GRID / BENTO SECTION
      ═══════════════════════════════════════════════════ */}
      <section
        id="features"
        style={{
          maxWidth: '1240px',
          margin: '0 auto 100px',
          padding: '0 24px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 800,
              letterSpacing: '-1px',
              margin: '0 0 16px',
            }}
          >
            Engineered for Deep Thinkers & Knowledge Architects
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--muted)', maxWidth: '640px', margin: '0 auto' }}>
            NoteRoot AI merges the speed of local-first editors with the analytical power of interconnected graphs and language models.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '28px',
              transition: 'transform 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'var(--accent-bg)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
              }}
            >
              <Share2 size={22} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px' }}>
              Bi-Directional Graph Mind Map
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              Connect concepts organically with <code>[[Note Title]]</code> Wikilinks. The Cytoscape-powered
              graph visualizes relationships, clusters, and backlink topology as your knowledge expands.
            </p>
          </div>

          {/* Card 2 */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '28px',
              transition: 'transform 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'var(--accent-bg)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
              }}
            >
              <Brain size={22} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px' }}>
              Bring-Your-Own-AI (BYOK)
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              Plug in OpenAI, Claude 3.5, Gemini 1.5/2.0, Groq, or local Ollama servers. Ask questions
              across your entire notes collection with exact source citations and zero markups.
            </p>
          </div>

          {/* Card 3 */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '28px',
              transition: 'transform 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'var(--accent-bg)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px' }}>
              Local-First & Offline Resilient
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              Never wait for a server spinner. Notes persist in browser IndexedDB with zero-latency
              instantaneous writes. When you go online, changes sync seamlessly to your private cloud vault.
            </p>
          </div>

          {/* Card 4 */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '28px',
              transition: 'transform 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'var(--accent-bg)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
              }}
            >
              <Command size={22} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px' }}>
              Sub-Millisecond Command Palette
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              Press <code>Ctrl + K</code> or <code>Cmd + K</code> from anywhere in the app to search titles,
              tags, full-text content, or execute quick system commands without taking your hands off the keyboard.
            </p>
          </div>

          {/* Card 5 */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '28px',
              transition: 'transform 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'var(--accent-bg)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
              }}
            >
              <Boxes size={22} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px' }}>
              Modular Plugin Architecture
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              Extend your workspace with plug-in importers, export filters, theme engines, and custom script
              hooks. Build your custom workflows without modifying core code.
            </p>
          </div>

          {/* Card 6 */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '28px',
              transition: 'transform 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'var(--accent-bg)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
              }}
            >
              <Code size={22} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px' }}>
              Markdown, KaTeX & Mermaid
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              Enjoy full Markdown compliance, syntax-highlighted code blocks, interactive math formulas,
              Mermaid architecture diagrams, tables, and task checklists inside a rich Tiptap engine.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          COMPARISON MATRIX TABLE
      ═══════════════════════════════════════════════════ */}
      <section
        id="comparison"
        style={{
          maxWidth: '1040px',
          margin: '0 auto 100px',
          padding: '0 24px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.5vw, 38px)',
              fontWeight: 800,
              letterSpacing: '-1px',
              margin: '0 0 12px',
            }}
          >
            Why NoteRoot AI Stands Out
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--muted)', margin: 0 }}>
            Compare how NoteRoot AI solves the limits of legacy note-taking apps.
          </p>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Capability</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--accent)' }}>NoteRoot AI</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--muted)' }}>Traditional Cloud Notes</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--muted)' }}>Pure Markdown Folders</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature: 'Local-First Offline Performance',
                    noteroot: 'Instantaneous IndexedDB writes with auto sync',
                    traditional: 'Slow spinners; fails without connection',
                    markdown: 'Fast local files, but lacks sync engine',
                  },
                  {
                    feature: 'Bi-Directional Knowledge Graph',
                    noteroot: 'Interactive Cytoscape 2D/3D visualizer',
                    traditional: 'None (Rigid hierarchical folders only)',
                    markdown: 'Static backlinks or external tools',
                  },
                  {
                    feature: 'Context-Aware AI Copilot',
                    noteroot: 'Vault-wide semantic synthesis with citations',
                    traditional: 'Generic isolated chat bot; no vault context',
                    markdown: 'Requires third-party terminal scripts',
                  },
                  {
                    feature: 'AI Pricing & Provider Flexibility',
                    noteroot: 'BYOK (OpenAI, Claude, Gemini, Ollama) wholesale',
                    traditional: 'Expensive monthly subscriptions ($10–20/mo)',
                    markdown: 'Varies',
                  },
                  {
                    feature: 'Data Ownership & Sovereignty',
                    noteroot: '100% user-owned, zero model training',
                    traditional: 'Vendor-locked in proprietary database',
                    markdown: '100% user-owned local files',
                  },
                  {
                    feature: 'Extensible Plugin Runtime',
                    noteroot: 'Built-in slot hooks, community engine',
                    traditional: 'Closed proprietary features',
                    markdown: 'Community plugins varying quality',
                  },
                ].map((row, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: index === 5 ? 'none' : '1px solid var(--border)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>{row.feature}</td>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--accent)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} />
                        <span>{row.noteroot}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--muted)' }}>{row.traditional}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--muted)' }}>{row.markdown}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          HOW IT WORKS JOURNEY
      ═══════════════════════════════════════════════════ */}
      <section
        style={{
          maxWidth: '1240px',
          margin: '0 auto 100px',
          padding: '0 24px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.5vw, 38px)',
              fontWeight: 800,
              letterSpacing: '-1px',
              margin: '0 0 12px',
            }}
          >
            How NoteRoot AI Powers Your Second Brain
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--muted)', margin: 0 }}>
            Three intuitive steps from raw thoughts to synthesized breakthroughs.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {[
            {
              step: '01',
              title: 'Capture Instantly',
              desc: 'Jot ideas, code snippets, or literature quotes. Drop existing markdown vaults or zip archives right in with zero setup.',
              icon: FileText,
            },
            {
              step: '02',
              title: 'Connect Bi-Directionally',
              desc: 'Link related notes using [[Wikilinks]]. NoteRoot builds an evolving visual graph uncovering connections you never planned.',
              icon: Share2,
            },
            {
              step: '03',
              title: 'Synthesize with AI',
              desc: 'Ask your copilot to brainstorm, summarize themes across hundreds of pages, or draft reports with precise source citations.',
              icon: Brain,
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '32px 24px',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: 800,
                    color: 'var(--accent)',
                    opacity: 0.25,
                    marginBottom: '12px',
                    fontFamily: 'monospace',
                  }}
                >
                  {item.step}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Icon size={18} style={{ color: 'var(--accent)' }} />
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>{item.title}</h3>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FAQ ACCORDION
      ═══════════════════════════════════════════════════ */}
      <section
        id="faq"
        style={{
          maxWidth: '860px',
          margin: '0 auto 100px',
          padding: '0 24px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.5vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-1px',
              margin: '0 0 12px',
            }}
          >
            Frequently Asked Questions
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--muted)', margin: 0 }}>
            Everything you need to know about NoteRoot AI, privacy, and architecture.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqs.map((faq, index) => {
            const isOpen = activeFAQ === index;
            return (
              <div
                key={index}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: '10px',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <button
                  onClick={() => setActiveFAQ(isOpen ? null : index)}
                  style={{
                    width: '100%',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--fg)',
                    fontWeight: 600,
                    fontSize: '15px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      color: isOpen ? 'var(--accent)' : 'var(--muted)',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0,
                      marginLeft: '12px',
                    }}
                  />
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: '0 20px 20px',
                      color: 'var(--muted)',
                      fontSize: '14px',
                      lineHeight: 1.6,
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          BOTTOM CALL TO ACTION BANNER
      ═══════════════════════════════════════════════════ */}
      <section
        style={{
          maxWidth: '1240px',
          margin: '0 auto 100px',
          padding: '0 24px',
        }}
      >
        <div
          style={{
            position: 'relative',
            background: isDark
              ? 'linear-gradient(135deg, rgba(224, 84, 56, 0.15) 0%, rgba(30, 30, 30, 0.9) 100%)'
              : 'linear-gradient(135deg, rgba(224, 84, 56, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)',
            border: '1px solid rgba(224, 84, 56, 0.25)',
            borderRadius: '16px',
            padding: '60px 32px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(224, 84, 56, 0.12)',
            overflow: 'hidden',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 800,
              letterSpacing: '-1px',
              margin: '0 0 16px',
            }}
          >
            Ready to Build Your Connected Second Brain?
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: 'var(--muted)',
              maxWidth: '600px',
              margin: '0 auto 32px',
              lineHeight: 1.6,
            }}
          >
            Start organizing your thoughts with local-first speed, deep bi-directional graphs,
            and privacy-respecting artificial intelligence.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(token ? '/app' : '/auth?mode=signup')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 28px',
                borderRadius: '10px',
                background: 'var(--accent)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(224, 84, 56, 0.4)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(224, 84, 56, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(224, 84, 56, 0.4)';
              }}
            >
              <span>{token ? 'Enter Your Workspace' : 'Get Started Free — No Credit Card'}</span>
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════ */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '48px 24px 36px',
          color: 'var(--muted)',
          fontSize: '13px',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: 'rgba(224, 84, 56, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e05438" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                </svg>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--fg)', fontSize: '15px' }}>NoteRoot AI</span>
              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>— Private Connected Knowledge</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <a
                href="https://github.com/KunalGupta25/NoterootAI"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
              >
                <ExternalLink size={14} />
                <span>GitHub</span>
              </a>
              <Link
                to="/cookie-policy"
                style={{ color: 'var(--muted)', textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
              >
                Cookie Policy
              </Link>
              <Link
                to="/auth"
                style={{ color: 'var(--muted)', textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
              >
                Sign In
              </Link>
              <Link
                to="/app"
                style={{ color: 'var(--muted)', textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
              >
                Workspace
              </Link>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border)',
              paddingTop: '20px',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '12px',
            }}
          >
            <div>© {new Date().getFullYear()} NoteRoot AI. All rights reserved. Local-first & open architecture.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }} />
              <span>All Systems Operational • Offline Ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
