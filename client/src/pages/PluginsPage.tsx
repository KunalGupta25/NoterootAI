import { useState, useRef } from 'react';
import { usePluginStore } from '../stores/pluginStore';
import {
  Puzzle, Search, FileText, Globe,
  BookOpen, Video, Upload, CheckCircle2, X
} from 'lucide-react';

interface PluginCardData {
  id: string;
  name: string;
  description: string;
  author: string;
  installs: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
}

const MARKET_PLUGINS: PluginCardData[] = [
  {
    id: 'pdf-reader',
    name: 'PDF Reader',
    description: 'Extract and index text from PDF files.',
    author: 'by community',
    installs: '12.4k installs',
    iconBg: 'rgba(239, 68, 68, 0.12)',
    iconColor: '#ef4444',
    icon: <FileText size={18} />,
  },
  {
    id: 'web-clipper',
    name: 'Web Clipper',
    description: 'Save web content to your notes.',
    author: 'by community',
    installs: '8.1k installs',
    iconBg: 'rgba(59, 130, 246, 0.12)',
    iconColor: '#3b82f6',
    icon: <Globe size={18} />,
  },
  {
    id: 'notion-importer',
    name: 'Notion Importer',
    description: 'Import from Notion workspace.',
    author: 'by community',
    installs: '6.8k installs',
    iconBg: 'rgba(156, 163, 175, 0.14)',
    iconColor: 'var(--fg)',
    icon: <BookOpen size={18} />,
  },
  {
    id: 'youtube-summarizer',
    name: 'YouTube Summarizer',
    description: 'Summarize and save YouTube videos.',
    author: 'by community',
    installs: '15.2k installs',
    iconBg: 'rgba(224, 84, 56, 0.12)',
    iconColor: '#e05438',
    icon: <Video size={18} />,
  },
];

export default function PluginsPage() {
  const { plugins, togglePlugin } = usePluginStore();

  const [activeTab, setActiveTab] = useState<'marketplace' | 'installed' | 'github' | 'upload'>('marketplace');
  const [searchQuery, setSearchQuery] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [installedMap, setInstalledMap] = useState<Record<string, boolean>>({
    'pdf-reader': false,
    'web-clipper': false,
    'notion-importer': false,
    'youtube-summarizer': false,
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleInstall = (id: string) => {
    setInstalledMap(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleFileDrop = (file: File) => {
    const valid = file.name.endsWith('.js') || file.name.endsWith('.zip');
    if (!valid) {
      setUploadStatus('error');
      setUploadedFile(null);
      return;
    }
    setUploadedFile(file);
    setUploadStatus('idle');
  };

  const handleInstallUpload = () => {
    if (!uploadedFile) return;
    setUploadStatus('success');
    setTimeout(() => { setUploadedFile(null); setUploadStatus('idle'); }, 3000);
  };

  const [githubStatus, setGithubStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');

  const handleGithubInstall = () => {
    if (!githubUrl.trim() || !githubUrl.includes('github.com')) {
      setGithubStatus('error');
      return;
    }
    setGithubStatus('installing');
    setTimeout(() => {
      setGithubStatus('success');
      setTimeout(() => {
        setGithubUrl('');
        setGithubStatus('idle');
      }, 3000);
    }, 1200);
  };


  const filteredMarket = MARKET_PLUGINS.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxWidth: '900px',
        margin: '0 auto',
        padding: '32px 32px 60px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      {/* ── Top Header matching Mockup ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(224, 84, 56, 0.1)',
              border: '1px solid rgba(224, 84, 56, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e05438',
              flexShrink: 0,
            }}
          >
            <Puzzle size={22} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '-0.3px',
                margin: '0 0 3px 0',
                color: 'var(--fg)',
              }}
            >
              Plugins & Extensions
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
              Extend NoteRoot AI with community plugins or build your own.
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs & Search Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['marketplace', 'installed', 'github', 'upload'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: activeTab === tab ? '#e05438' : 'var(--border)',
                background: activeTab === tab ? 'rgba(224, 84, 56, 0.1)' : 'var(--surface)',
                color: activeTab === tab ? '#e05438' : 'var(--muted)',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'upload' ? '↑ Upload' : tab === 'installed' ? `Installed (${Object.values(installedMap).filter(Boolean).length || 0})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '5px 12px',
            width: '220px',
          }}
        >
          <Search size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search plugins..."
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--fg)',
              fontSize: '12.5px',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* ── Plugin Cards List matching Mockup ── */}
      {activeTab === 'marketplace' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredMarket.map(plugin => {
            const isInstalled = installedMap[plugin.id];
            return (
              <div
                key={plugin.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 18px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  transition: 'background 0.12s',
                }}
              >
                {/* Plugin Icon Box */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: plugin.iconBg,
                    color: plugin.iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '14px',
                    flexShrink: 0,
                  }}
                >
                  {plugin.icon}
                </div>

                {/* Plugin Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>
                    {plugin.name}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--fg-2)', marginTop: '2px' }}>
                    {plugin.description}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                    {plugin.author} • {plugin.installs}
                  </div>
                </div>

                {/* Action Install Button matching Mockup */}
                <button
                  onClick={() => handleToggleInstall(plugin.id)}
                  style={{
                    marginLeft: '16px',
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: isInstalled ? '1px solid var(--border)' : 'none',
                    background: isInstalled ? 'var(--surface-2)' : '#e05438',
                    color: isInstalled ? 'var(--fg)' : '#ffffff',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: isInstalled ? 'none' : '0 1px 3px rgba(224, 84, 56, 0.3)',
                    transition: 'all 0.12s',
                    flexShrink: 0,
                  }}
                >
                  {isInstalled ? 'Installed' : 'Install'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Installed Tab ── */}
      {activeTab === 'installed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {plugins.map(p => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '14px 18px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(224, 84, 56, 0.1)',
                  color: '#e05438',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '14px',
                  flexShrink: 0,
                }}
              >
                <Puzzle size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', textTransform: 'capitalize' }}>
                  {p.id.replace('core-', '').replace(/-/g, ' ')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Source: {p.source}
                </div>
              </div>
              <button
                onClick={() => togglePlugin(p.id, !p.enabled)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  background: p.enabled ? '#22c55e' : 'var(--surface-2)',
                  color: p.enabled ? '#ffffff' : 'var(--muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {p.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── GitHub Direct Install Tab ── */}
      {activeTab === 'github' && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--fg)' }}>
            Install from GitHub Repository
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px 0' }}>
            Enter a public repository URL containing a valid NoteRoot AI manifest (e.g. <code>https://github.com/user/plugin-repo</code>).
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              value={githubUrl}
              onChange={e => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--fg)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleGithubInstall}
              disabled={githubStatus === 'installing'}
              style={{
                padding: '8px 18px',
                background: '#e05438',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: githubStatus === 'installing' ? 'wait' : 'pointer',
                opacity: githubStatus === 'installing' ? 0.7 : 1,
              }}
            >
              {githubStatus === 'installing' ? 'Installing...' : 'Install'}
            </button>
          </div>

          {githubStatus === 'error' && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', fontSize: '13px', color: '#ef4444' }}>
              Please enter a valid GitHub repository URL (e.g. <code>https://github.com/owner/repo</code>).
            </div>
          )}
          {githubStatus === 'success' && (
            <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '6px', fontSize: '13px', color: '#22c55e' }}>
              ✓ Repository plugin cloned and installed successfully!
            </div>
          )}
        </div>
      )}
      {/* ── Upload Plugin Tab ── */}
      {activeTab === 'upload' && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--fg)' }}>
            Upload Local Plugin
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 20px 0' }}>
            Upload a <code>.js</code> plugin file or a <code>.zip</code> bundle containing a valid NoteRoot AI plugin.
          </p>

          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFileDrop(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragOver ? '#e05438' : uploadedFile ? '#22c55e' : 'var(--border)'}`,
              borderRadius: '8px',
              padding: '36px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragOver ? 'rgba(224,84,56,0.05)' : uploadedFile ? 'rgba(34,197,94,0.05)' : 'var(--bg)',
              transition: 'all 0.15s',
              marginBottom: '16px',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".js,.zip"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileDrop(file);
              }}
            />
            {uploadedFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={32} color="#22c55e" />
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>{uploadedFile.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{(uploadedFile.size / 1024).toFixed(1)} KB — ready to install</div>
                <button
                  onClick={e => { e.stopPropagation(); setUploadedFile(null); setUploadStatus('idle'); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                >
                  <X size={13} /> Remove
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Upload size={28} style={{ color: isDragOver ? '#e05438' : 'var(--muted)' }} />
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--fg)' }}>Drop file here or click to browse</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Supports <strong>.js</strong> and <strong>.zip</strong> files</div>
              </div>
            )}
          </div>

          {uploadStatus === 'error' && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', fontSize: '13px', color: '#ef4444', marginBottom: '12px' }}>
              Invalid file type. Please upload a <code>.js</code> or <code>.zip</code> plugin file.
            </div>
          )}
          {uploadStatus === 'success' && (
            <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '6px', fontSize: '13px', color: '#22c55e', marginBottom: '12px' }}>
              ✓ Plugin installed successfully! It will appear in your Installed tab.
            </div>
          )}

          <button
            onClick={handleInstallUpload}
            disabled={!uploadedFile || uploadStatus === 'success'}
            style={{
              padding: '8px 20px',
              background: uploadedFile ? '#e05438' : 'var(--surface-2)',
              color: uploadedFile ? '#ffffff' : 'var(--muted)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: uploadedFile ? 'pointer' : 'not-allowed',
              opacity: uploadStatus === 'success' ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Upload size={14} /> Install Plugin
          </button>
        </div>
      )}
    </div>
  );
}
