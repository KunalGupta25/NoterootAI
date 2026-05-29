import { useState, useEffect, useRef } from 'react';
import { usePluginStore } from '../stores/pluginStore';
import PluginRuntime from '../plugins/runtime/PluginRuntime';
import { useAuthStore } from '../stores/authStore';
import { SYNC_URL } from '../lib/constants';
import { Puzzle, Check, Download, Box, X, Lock, Settings, Upload, Globe, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return { metadata: {}, content: markdown };
  
  const yaml = match[1];
  const metadata: Record<string, string> = {};
  yaml.split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) metadata[key.trim()] = rest.join(':').trim().replace(/^['"]|['"]$/g, '');
  });
  
  const content = markdown.slice(match[0].length).trim();
  return { metadata, content };
}

// Built-in metadata fallback since built-ins don't fetch READMEs
const BUILTIN_META: Record<string, any> = {
  'core-markdown-importer': { name: 'Markdown Importer', desc: 'Import single .md files directly into your workspace.', icon: '📄' },
  'core-zip-importer': { name: 'Bulk ZIP Importer', desc: 'Import entire folders of markdown files packaged in a .zip archive.', icon: '📦' },
  'core-tab-manager': { name: 'Tab Manager', desc: 'Open multiple files simultaneously in tabs.', icon: '📑' },
  'core-note-downloader': { name: 'Note Downloader', desc: 'Export notes to MD or HTML format.', icon: '⬇️' }
};

export default function PluginsPage() {
  const { plugins, togglePlugin, removePlugin, installPlugin } = usePluginStore();
  const token = useAuthStore(s => s.token);
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');
  
  const [githubUrl, setGithubUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [previewPlugin, setPreviewPlugin] = useState<{ url: string, metadata: any, content: string, code: string } | null>(null);
  const [readmeHtml, setReadmeHtml] = useState<string>('');
  
  const [marketPlugins, setMarketPlugins] = useState<any[]>([]);

  const navigate = useNavigate();

  const builtins = plugins.filter(p => p.source === 'builtin');
  const community = plugins.filter(p => p.source === 'community');

  // Fetch market
  useEffect(() => {
    if (activeTab === 'marketplace' && token) {
      fetch(`${SYNC_URL}/api/plugins/market`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => setMarketPlugins(Array.isArray(data) ? data : []))
        .catch(e => console.error(e));
    }
  }, [activeTab, token]);

  const fetchPluginFromGithub = async (url: string) => {
    setFetching(true);
    setError('');
    setPreviewPlugin(null);
    setReadmeHtml('');

    try {
      let owner = '';
      let repo = '';
      let branch = 'main';

      if (url.includes('github.com')) {
        const parts = url.replace('https://github.com/', '').split('/');
        owner = parts[0];
        repo = parts[1];
      } else {
        throw new Error('Please enter a valid github.com URL');
      }

      const readmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
      const codeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/plugin.js`;

      const [readmeRes, codeRes] = await Promise.all([
        fetch(readmeUrl),
        fetch(codeUrl)
      ]);

      if (!readmeRes.ok) throw new Error('Could not find README.md in repository.');
      if (!codeRes.ok) throw new Error('Could not find plugin.js in repository.');

      const readmeText = await readmeRes.text();
      const codeText = await codeRes.text();

      const { metadata, content } = parseFrontmatter(readmeText);
      
      if (!metadata.name || !metadata.version) {
        throw new Error('README.md is missing required YAML frontmatter (name, version).');
      }

      const { marked } = await import('marked');
      const html = await marked.parse(content);

      setReadmeHtml(html);
      setPreviewPlugin({ url, metadata, content: readmeText, code: codeText });
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleFolderUpload = async (e: any) => {
    setFetching(true);
    setError('');
    setPreviewPlugin(null);
    try {
      const files = Array.from(e.target.files) as File[];
      const readmeFile = files.find(f => f.name.toLowerCase() === 'readme.md');
      const pluginFile = files.find(f => f.name === 'plugin.js');

      if (!readmeFile) throw new Error('Missing README.md in folder');
      if (!pluginFile) throw new Error('Missing plugin.js in folder');

      const readmeText = await readmeFile.text();
      const codeText = await pluginFile.text();

      const { metadata, content } = parseFrontmatter(readmeText);
      if (!metadata.name || !metadata.version) {
        throw new Error('README.md is missing required YAML frontmatter (name, version).');
      }

      const { marked } = await import('marked');
      const html = await marked.parse(content);

      setReadmeHtml(html);
      setPreviewPlugin({ url: '', metadata, content: readmeText, code: codeText });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInstall = async () => {
    if (!previewPlugin) return;
    
    // Generate a safe ID based on the plugin name from metadata
    const id = `plugin-${previewPlugin.metadata.name.replace(/\s+/g, '-').toLowerCase()}`;
    
    await installPlugin({
      id,
      source: 'community',
      enabled: true,
      code: previewPlugin.code,
      url: previewPlugin.url,
      readme: previewPlugin.content // storing the full raw text
    });
    
    setPreviewPlugin(null);
    setActiveTab('installed');
  };

  const handlePublish = async (pluginId: string) => {
    const p = plugins.find(x => x.id === pluginId);
    if (!p || !p.code || !p.readme || !token) return;

    try {
      const { metadata } = parseFrontmatter(p.readme);
      const res = await fetch(`${SYNC_URL}/api/plugins/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pluginId: p.id,
          name: metadata.name,
          author: metadata.author || 'Unknown',
          description: metadata.description || '',
          version: metadata.version,
          githubUrl: p.url || '',
          readme: p.readme,
          code: p.code
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish');
      alert('Plugin successfully published to the Marketplace!');
    } catch (e: any) {
      alert('Publish Error: ' + e.message);
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <div className="mono kicker" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Puzzle size={16} /> Plugins
      </div>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '24px', fontFamily: 'var(--font-display)' }}>Extensions</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border)', marginBottom: '32px' }}>
        <button 
          onClick={() => setActiveTab('installed')}
          style={{ 
            background: 'none', border: 'none', padding: '0 0 12px 0', fontSize: '14px', fontWeight: activeTab === 'installed' ? 600 : 400,
            color: activeTab === 'installed' ? 'var(--accent)' : 'var(--muted)',
            borderBottom: activeTab === 'installed' ? '2px solid var(--accent)' : '2px solid transparent',
            borderRadius: 0
          }}
        >
          Installed
        </button>
        <button 
          onClick={() => setActiveTab('marketplace')}
          style={{ 
            background: 'none', border: 'none', padding: '0 0 12px 0', fontSize: '14px', fontWeight: activeTab === 'marketplace' ? 600 : 400,
            color: activeTab === 'marketplace' ? 'var(--accent)' : 'var(--muted)',
            borderBottom: activeTab === 'marketplace' ? '2px solid var(--accent)' : '2px solid transparent',
            borderRadius: 0
          }}
        >
          Marketplace
        </button>
      </div>

      {activeTab === 'installed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Built-in Plugins <Lock size={14} color="var(--muted)" />
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {builtins.map(p => {
                const meta = BUILTIN_META[p.id] || { name: p.id, desc: '', icon: '🧩' };
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '24px' }}>{meta.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{meta.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>{meta.desc}</div>
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                      <input type="checkbox" checked={p.enabled} onChange={(e) => togglePlugin(p.id, e.target.checked)} />
                      {p.enabled ? <span style={{ color: 'var(--accent)' }}>Enabled</span> : <span style={{ color: 'var(--muted)' }}>Disabled</span>}
                    </label>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Community Plugins</h2>
            {community.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--muted)', fontSize: '14px' }}>
                No community plugins installed.<br/><br/>
                <button onClick={() => setActiveTab('marketplace')} className="primary" style={{ padding: '6px 12px', fontSize: '13px' }}>Browse Marketplace</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {community.map(p => {
                  const meta = p.readme ? parseFrontmatter(p.readme).metadata : {} as any;
                  const displayName = meta.name || p.id.replace('plugin-', '');
                  const displayIcon = meta.icon || '🧩';
                  
                  return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '24px' }}>{displayIcon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {displayName}
                          {PluginRuntime.pluginErrors.has(p.id) && (
                            <span style={{ fontSize: '10px', background: '#fef2f2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle size={10} /> Runtime Error
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>{meta.description || 'No description.'}</div>
                        {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><Box size={11} /> GitHub Source</a>}
                        {PluginRuntime.pluginErrors.has(p.id) && (
                          <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                            {PluginRuntime.pluginErrors.get(p.id)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <button onClick={() => handlePublish(p.id)} title="Publish to Market" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', padding: '4px', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                        <Upload size={16} /> Publish
                      </button>
                      {PluginRuntime.hasExtension(p.id, 'settings.panels') && (
                        <button onClick={() => navigate('/settings')} title="Plugin Settings" style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: '4px', color: 'var(--muted)', cursor: 'pointer' }}>
                          <Settings size={16} />
                        </button>
                      )}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                        <input type="checkbox" checked={p.enabled} onChange={(e) => togglePlugin(p.id, e.target.checked)} />
                        {p.enabled ? <span style={{ color: 'var(--accent)' }}>Enabled</span> : <span style={{ color: 'var(--muted)' }}>Disabled</span>}
                      </label>
                      <button onClick={() => removePlugin(p.id)} style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent' }}>
                        Uninstall
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </section>

        </div>
      )}

      {activeTab === 'marketplace' && (
        <div>
          <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Box size={18} /> Install Plugin
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--muted)' }}>
              Fetch a plugin from a GitHub URL or upload a local folder directly.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input 
                type="url" 
                placeholder="https://github.com/username/plugin-repo"
                value={githubUrl}
                onChange={e => setGithubUrl(e.target.value)}
                style={{ flex: 1, minWidth: '300px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: '14px' }}
                onKeyDown={e => e.key === 'Enter' && fetchPluginFromGithub(githubUrl)}
              />
              <button 
                className="primary" 
                onClick={() => fetchPluginFromGithub(githubUrl)}
                disabled={!githubUrl || fetching}
              >
                {fetching ? '...' : 'Fetch GitHub'}
              </button>
              <div style={{ width: '1px', background: 'var(--border)' }}></div>
              <input 
                type="file" 
                // @ts-ignore - webkitdirectory is a non-standard attribute but works in modern browsers
                webkitdirectory="true" 
                directory="true"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFolderUpload}
              />
              <button onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)', borderRadius: '6px' }}>
                Load from Folder
              </button>
            </div>
            {error && <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>{error}</div>}
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={18} /> Open Marketplace
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {marketPlugins.length === 0 ? (
               <div style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>No plugins available in the market. Be the first to publish one!</div>
            ) : marketPlugins.map(m => (
              <div key={m._id} style={{ display: 'flex', flexDirection: 'column', padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                      🧩
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{m.name}</h3>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>v{m.version} • by {m.author}</div>
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px 0', flex: 1, lineHeight: 1.5 }}>
                  {m.description || 'No description provided.'}
                </p>
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: 'auto' }}>
                  <button onClick={() => fetchPluginFromGithub(m.githubUrl)} className="primary" style={{ flex: 1, padding: '6px 0', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} disabled={!m.githubUrl}>
                    <Download size={14} /> Install
                  </button>
                  {m.githubUrl && <a href={m.githubUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', borderRadius: '6px', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                    <Box size={14} />
                  </a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewPlugin && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px',
            width: '800px', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 700 }}>{previewPlugin.metadata.name}</h2>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  <span>v{previewPlugin.metadata.version}</span>
                  <span>by {previewPlugin.metadata.author || 'Unknown'}</span>
                  {previewPlugin.metadata.category && <span>{previewPlugin.metadata.category}</span>}
                </div>
              </div>
              <button onClick={() => setPreviewPlugin(null)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }} className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: readmeHtml }} />
            </div>

            <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                <Check size={14} color="#22c55e" /> Verified Manifest
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setPreviewPlugin(null)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--fg)', borderRadius: '6px' }}>Cancel</button>
                <button className="primary" onClick={handleInstall} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px', borderRadius: '6px' }}>
                  <Download size={14} /> Install Plugin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
