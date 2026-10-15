import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { usePluginStore } from '../stores/pluginStore';
import {
  Puzzle, Search, FileText, Globe,
  BookOpen, Video, Upload, CheckCircle2, X, Cloud,
  Settings as SettingsIcon, Trash2
} from 'lucide-react';
import { DRIVE_CONNECTOR_CODE } from '../plugins/custom/driveConnectorCode';

interface PluginCardData {
  id: string;
  name: string;
  description: string;
  author: string;
  installs: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  code?: string;
}

const MARKET_PLUGINS: PluginCardData[] = [
  {
    id: 'drive-connector',
    name: 'Drive Connector',
    description: 'Connect Google Drive to auto-backup notes, restore data in new accounts, and show exact Drive location.',
    author: 'by NoteRoot Team',
    installs: 'Featured • Official',
    iconBg: 'rgba(59, 130, 246, 0.12)',
    iconColor: '#2563eb',
    icon: <Cloud size={18} />,
    code: DRIVE_CONNECTOR_CODE,
  },
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
  const { plugins, togglePlugin, installPlugin, removePlugin, installFromUrl } = usePluginStore();

  const [activeTab, setActiveTab] = useState<'marketplace' | 'installed' | 'github' | 'upload'>('marketplace');
  const [searchQuery, setSearchQuery] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleInstall = async (plugin: PluginCardData) => {
    if (plugins.some(p => p.id === plugin.id)) {
      await removePlugin(plugin.id);
    } else {
      await installPlugin({
        id: plugin.id,
        source: 'community',
        enabled: true,
        code: plugin.code,
        readme: plugin.description,
      });
      window.location.reload();
    }
  };

  const handleFileDrop = (file: File) => {
    const valid = file.name.endsWith('.js') || file.name.endsWith('.zip') || file.name.endsWith('.json');
    if (!valid) {
      setUploadStatus('error');
      setUploadedFile(null);
      return;
    }
    setUploadedFile(file);
    setUploadStatus('idle');
  };

  const handleInstallUpload = async () => {
    if (!uploadedFile) return;
    try {
      let pluginId = uploadedFile.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      let code = '';
      let readme = `Installed from local file: ${uploadedFile.name}`;

      if (uploadedFile.name.endsWith('.js')) {
        code = await uploadedFile.text();
      } else if (uploadedFile.name.endsWith('.zip')) {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(uploadedFile);

        // Find JavaScript entry (e.g. drive-connector/plugin.js or plugin.js)
        const jsFile = Object.values(zip.files).find(f => !f.dir && f.name.endsWith('plugin.js')) ||
                       Object.values(zip.files).find(f => !f.dir && f.name.endsWith('.js'));
        if (jsFile) {
          code = await jsFile.async('text');
        }

        // Find README.md and parse plugin title
        const readmeFile = Object.values(zip.files).find(f => !f.dir && f.name.toLowerCase().endsWith('readme.md'));
        if (readmeFile) {
          readme = await readmeFile.async('text');
          const match = readme.match(/^---\n([\s\S]+?)\n---/);
          if (match) {
            match[1].split('\n').forEach(line => {
              const [key, ...rest] = line.split(':');
              if (key.trim() === 'name') {
                const nameVal = rest.join(':').trim().replace(/^['"]|['"]$/g, '');
                pluginId = nameVal.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
              }
            });
          }
        }
      } else if (uploadedFile.name.endsWith('.json')) {
        const text = await uploadedFile.text();
        readme = `Local configuration/manifest:\n\`\`\`json\n${text}\n\`\`\``;
      }

      // If code was not found or if it's drive connector, fallback to bundled DRIVE_CONNECTOR_CODE
      if ((!code || code.trim() === '') && (pluginId.includes('drive') || uploadedFile.name.includes('drive'))) {
        code = DRIVE_CONNECTOR_CODE;
        pluginId = 'drive-connector';
      }

      if (!code || code.trim() === '') {
        alert('Could not find executable plugin.js in the uploaded file.');
        setUploadStatus('error');
        return;
      }

      await installPlugin({
        id: pluginId,
        source: 'community',
        enabled: true,
        code,
        readme,
      });

      setUploadStatus('success');
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err) {
      console.error('Failed to install uploaded plugin:', err);
      setUploadStatus('error');
    }
  };

  const [githubStatus, setGithubStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');

  const handleGithubInstall = async () => {
    if (!githubUrl.trim() || !githubUrl.includes('github.com')) {
      setGithubStatus('error');
      return;
    }
    setGithubStatus('installing');
    try {
      await installFromUrl(githubUrl.trim());
      setGithubStatus('success');
      setTimeout(() => {
        setGithubUrl('');
        setGithubStatus('idle');
      }, 2500);
    } catch {
      setGithubStatus('error');
    }
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
              {tab === 'upload' ? '↑ Upload' : tab === 'installed' ? `Installed (${plugins.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
            const isInstalled = plugins.some(p => p.id === plugin.id);
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
                {isInstalled ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px', flexShrink: 0 }}>
                    <Link
                      to="/settings?tab=plugins"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                        color: 'var(--fg)',
                        fontSize: '12.5px',
                        fontWeight: 500,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <SettingsIcon size={13} /> Settings
                    </Link>
                    <button
                      onClick={() => handleToggleInstall(plugin)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--muted)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Uninstall
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleToggleInstall(plugin)}
                    style={{
                      marginLeft: '16px',
                      padding: '6px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#e05438',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(224, 84, 56, 0.3)',
                      transition: 'all 0.12s',
                      flexShrink: 0,
                    }}
                  >
                    Install
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Installed Tab ── */}
      {activeTab === 'installed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {plugins.map(p => {
            const builtinInfo = {
              'core-markdown-importer': {
                name: 'Markdown Importer',
                description: 'Import single .md files directly into workspace Spaces with YAML frontmatter detection.',
                category: 'Import',
                icon: '📝',
              },
              'core-zip-importer': {
                name: 'Bulk ZIP Importer',
                description: 'Extract and import nested folders of markdown files into designated Spaces from .zip archives.',
                category: 'Import',
                icon: '📦',
              },
              'core-tab-manager': {
                name: 'Multi-Tab Workspace Manager',
                description: 'Keep multiple notes open across Spaces with active header tabs and session persistence.',
                category: 'Workspace',
                icon: '📑',
              },
              'core-note-downloader': {
                name: 'Note Downloader & Exporter',
                description: 'Export notes as Markdown with frontmatter or standalone formatted HTML with Space & tag badges.',
                category: 'Export',
                icon: '⬇️',
              },
            }[p.id];

            const displayName = builtinInfo?.name || (p.id === 'drive-connector' ? 'Drive Connector' : p.id.replace('core-', '').replace(/-/g, ' '));
            const description = builtinInfo?.description || (p.readme ? p.readme.slice(0, 100) : 'Custom plugin');

            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px 20px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: 'rgba(224, 84, 56, 0.1)',
                    color: '#e05438',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                  }}
                >
                  {builtinInfo ? builtinInfo.icon : (p.id === 'drive-connector' ? <Cloud size={20} color="#2563eb" /> : <Puzzle size={20} />)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', textTransform: builtinInfo ? 'none' : 'capitalize' }}>
                      {displayName}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 7px',
                        borderRadius: '10px',
                        background: p.source === 'builtin' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(168, 85, 247, 0.12)',
                        color: p.source === 'builtin' ? '#3b82f6' : '#a855f7',
                        fontWeight: 500,
                      }}
                    >
                      {p.source === 'builtin' ? (builtinInfo?.category ? `Built-in • ${builtinInfo.category}` : 'Built-in') : 'Community'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--fg-2)', marginTop: '3px', lineHeight: 1.4 }}>
                    {description}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <Link
                    to="/settings?tab=plugins"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-2)',
                      color: 'var(--fg)',
                      fontSize: '12px',
                      fontWeight: 500,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <SettingsIcon size={12} /> Settings
                  </Link>

                  <button
                    onClick={() => togglePlugin(p.id, !p.enabled)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: p.enabled ? '#22c55e' : 'var(--surface-2)',
                      color: p.enabled ? '#ffffff' : 'var(--muted)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {p.enabled ? 'Enabled' : 'Disabled'}
                  </button>

                  {p.source === 'community' && (
                    <button
                      onClick={() => removePlugin(p.id)}
                      title="Uninstall plugin"
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--muted)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
