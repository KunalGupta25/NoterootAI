import { useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import { BUILTIN_PROVIDERS, BUILTIN_PROVIDER_IDS } from '../lib/providerConfig';
import {
  User, Edit3, Bot, Cloud, Plug, Puzzle, Bell,
  Palette, Shield, Check, Plus, Trash2, ExternalLink, Server
} from 'lucide-react';
import { PluginSettingsPanels } from '../plugins/slots/PluginSettingsPanels';

type SettingsTab =
  | 'general'
  | 'editor'
  | 'ai'
  | 'sync'
  | 'integrations'
  | 'plugins'
  | 'notifications'
  | 'appearance'
  | 'privacy';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const {
    theme, setTheme,
    providerKeys, setProviderKey,
    activeProvider, setActiveProvider,
    providerModels, setProviderModel,
    customProviders, addCustomProvider, removeCustomProvider,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Form states for General tab
  const [name, setName] = useState(user?.name || 'Kunal Gupta');
  const [email, setEmail] = useState(user?.email || 'kunal@example.com');
  const [bio, setBio] = useState('Full Stack Developer. Building NoteRoot AI.');
  const [language, setLanguage] = useState('English (India)');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states for Custom AI Provider
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [customModel, setCustomModel] = useState('');

  const handleAddCustomProvider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customBaseUrl.trim()) return;

    const newId = addCustomProvider({
      name: customName.trim(),
      baseUrl: customBaseUrl.trim(),
      apiKey: customApiKey.trim(),
      models: customModel.trim() ? [customModel.trim()] : ['default'],
      defaultModel: customModel.trim() || 'default',
    });

    setActiveProvider(newId);
    setCustomName('');
    setCustomBaseUrl('');
    setCustomApiKey('');
    setCustomModel('');
    setShowAddCustom(false);
  };

  const handleSaveGeneral = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const menuItems: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: 'general', label: 'General', icon: <User size={15} /> },
    { id: 'editor', label: 'Editor', icon: <Edit3 size={15} /> },
    { id: 'ai', label: 'AI & Models', icon: <Bot size={15} /> },
    { id: 'sync', label: 'Sync & Storage', icon: <Cloud size={15} /> },
    { id: 'integrations', label: 'Integrations', icon: <Plug size={15} /> },
    { id: 'plugins', label: 'Plugins', icon: <Puzzle size={15} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={15} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={15} /> },
    { id: 'privacy', label: 'Privacy & Security', icon: <Shield size={15} /> },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      {/* ── Top Header matching Mockup ── */}
      <div
        style={{
          padding: '24px 36px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 700,
            letterSpacing: '-0.3px',
            margin: '0 0 3px 0',
            color: 'var(--fg)',
          }}
        >
          Settings
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
          Manage your account, preferences, and integrations.
        </p>
      </div>

      {/* ── Two-Column Layout ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* Left Sub-Navigation Menu */}
        <aside
          style={{
            width: '210px',
            minWidth: '210px',
            borderRight: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: '16px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {menuItems.map(item => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: active ? 'rgba(224, 84, 56, 0.1)' : 'transparent',
                  color: active ? '#e05438' : 'var(--muted)',
                  fontWeight: active ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s, color 0.12s',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.color = 'var(--fg)';
                    e.currentTarget.style.background = 'var(--surface-2)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.color = 'var(--muted)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ display: 'flex' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Right Settings Form Pane */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '36px 44px 80px',
            maxWidth: '680px',
            boxSizing: 'border-box',
          }}
        >
          {/* ── GENERAL TAB ── */}
          {activeTab === 'general' && (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 20px 0', color: 'var(--fg)' }}>
                General
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--fg)', marginBottom: '6px' }}>
                    Profile
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Name</span>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Email</span>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                    Bio
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="English (India)">English (India)</option>
                    <option value="English (US)">English (US)</option>
                    <option value="English (UK)">English (UK)</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                  <button
                    onClick={handleSaveGeneral}
                    style={{
                      background: '#e05438',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 18px',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(224, 84, 56, 0.3)',
                    }}
                  >
                    Save changes
                  </button>
                  {savedSuccess && (
                    <span style={{ fontSize: '12.5px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> Saved successfully
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── APPEARANCE TAB ── */}
          {activeTab === 'appearance' && (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 20px 0', color: 'var(--fg)' }}>
                Appearance
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Theme</span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {(['light', 'dark'] as const).map(t => (
                    <div
                      key={t}
                      onClick={() => setTheme(t)}
                      style={{
                        flex: 1,
                        padding: '16px',
                        border: '1.5px solid',
                        borderColor: theme === t ? '#e05438' : 'var(--border)',
                        background: theme === t ? 'rgba(224, 84, 56, 0.05)' : 'var(--surface)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 600, textTransform: 'capitalize', color: 'var(--fg)' }}>
                        {t} Mode
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                        {t === 'light' ? 'Crisp light background' : 'Sleek dark interface'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── AI & MODELS TAB ── */}
          {activeTab === 'ai' && (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--fg)' }}>
                AI & Models
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>
                Configure cloud AI providers, OpenRouter, or custom OpenAI-compatible local/remote endpoints.
              </p>

              {/* ── Built-in Providers Section ── */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Cloud Providers & Gateways
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {BUILTIN_PROVIDER_IDS.map(pId => {
                    const p = BUILTIN_PROVIDERS[pId];
                    const currentKey = providerKeys[pId] || '';
                    const isActive = activeProvider === pId;
                    const selectedModel = providerModels[pId] || p.models[0];

                    return (
                      <div
                        key={pId}
                        style={{
                          border: '1px solid',
                          borderColor: isActive ? '#e05438' : 'var(--border)',
                          borderRadius: '8px',
                          padding: '14px 18px',
                          background: isActive ? 'rgba(224, 84, 56, 0.04)' : 'var(--surface)',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>{p.icon}</span>
                            <div>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>{p.label}</span>
                              {isActive && (
                                <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: 'rgba(224,84,56,0.14)', color: '#e05438' }}>
                                  Active Engine
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveProvider(pId)}
                            style={{
                              padding: '4px 12px',
                              borderRadius: '5px',
                              border: '1px solid',
                              borderColor: isActive ? '#e05438' : 'var(--border)',
                              background: isActive ? '#e05438' : 'transparent',
                              color: isActive ? '#ffffff' : 'var(--muted)',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.12s',
                            }}
                          >
                            {isActive ? 'Active' : 'Set as Active'}
                          </button>
                        </div>

                        {/* Model & API Key Controls */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '12px', alignItems: 'center' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                              Default Model
                            </label>
                            <select
                              value={selectedModel}
                              onChange={e => setProviderModel(pId, e.target.value)}
                              style={{ ...inputStyle, padding: '7px 10px', fontSize: '12.5px' }}
                            >
                              {p.models.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <label style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                API Key
                              </label>
                              <a
                                href={p.keyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '11px', color: '#e05438', display: 'flex', alignItems: 'center', gap: '3px' }}
                              >
                                Get key <ExternalLink size={10} />
                              </a>
                            </div>
                            <input
                              type="password"
                              value={currentKey}
                              onChange={e => setProviderKey(pId, e.target.value)}
                              placeholder={p.keyPlaceholder}
                              style={{ ...inputStyle, padding: '7px 10px', fontSize: '12.5px' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Custom OpenAI-Compatible Endpoints Section ── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Custom OpenAI-Compatible Providers
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                      Connect local Ollama, LM Studio, vLLM, or self-hosted LLM endpoints.
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddCustom(!showAddCustom)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      background: showAddCustom ? 'var(--surface-2)' : '#e05438',
                      color: showAddCustom ? 'var(--fg)' : '#ffffff',
                      border: 'none',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={14} /> Add Custom Endpoint
                  </button>
                </div>

                {/* Add Custom Provider Form Card */}
                {showAddCustom && (
                  <form
                    onSubmit={handleAddCustomProvider}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '18px 20px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--fg)', marginBottom: '10px' }}>
                      New OpenAI-Compatible Endpoint
                    </div>

                    {/* Presets */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomName('Local Ollama');
                          setCustomBaseUrl('http://localhost:11434/v1');
                          setCustomModel('llama3.2');
                        }}
                        style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', cursor: 'pointer' }}
                      >
                        Ollama (11434)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomName('LM Studio');
                          setCustomBaseUrl('http://localhost:1234/v1');
                          setCustomModel('local-model');
                        }}
                        style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', cursor: 'pointer' }}
                      >
                        LM Studio (1234)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomName('vLLM Server');
                          setCustomBaseUrl('http://localhost:8000/v1');
                          setCustomModel('mistral');
                        }}
                        style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', cursor: 'pointer' }}
                      >
                        vLLM (8000)
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', marginBottom: '4px' }}>
                          Provider Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={customName}
                          onChange={e => setCustomName(e.target.value)}
                          placeholder="e.g. My Local Ollama"
                          style={{ ...inputStyle, padding: '7px 10px', fontSize: '12.5px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', marginBottom: '4px' }}>
                          Base URL (with /v1) *
                        </label>
                        <input
                          type="url"
                          required
                          value={customBaseUrl}
                          onChange={e => setCustomBaseUrl(e.target.value)}
                          placeholder="http://localhost:11434/v1"
                          style={{ ...inputStyle, padding: '7px 10px', fontSize: '12.5px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', marginBottom: '4px' }}>
                          Model Identifier *
                        </label>
                        <input
                          type="text"
                          required
                          value={customModel}
                          onChange={e => setCustomModel(e.target.value)}
                          placeholder="e.g. llama3.2, mistral, deepseek-r1"
                          style={{ ...inputStyle, padding: '7px 10px', fontSize: '12.5px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', marginBottom: '4px' }}>
                          API Key (Optional for local)
                        </label>
                        <input
                          type="password"
                          value={customApiKey}
                          onChange={e => setCustomApiKey(e.target.value)}
                          placeholder="Optional token / key"
                          style={{ ...inputStyle, padding: '7px 10px', fontSize: '12.5px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="submit"
                        style={{
                          padding: '7px 18px',
                          borderRadius: '6px',
                          background: '#e05438',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '12.5px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        Save & Connect
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddCustom(false)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '6px',
                          background: 'transparent',
                          color: 'var(--muted)',
                          border: '1px solid var(--border)',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Custom Providers List */}
                {customProviders.length === 0 && !showAddCustom ? (
                  <div
                    style={{
                      padding: '24px',
                      background: 'var(--surface)',
                      border: '1px dashed var(--border)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: 'var(--muted)',
                      fontSize: '13px',
                    }}
                  >
                    No custom endpoints configured yet. Click <strong>Add Custom Endpoint</strong> to connect local Ollama, LM Studio, or private LLM instances.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {customProviders.map(cp => {
                      const isActive = activeProvider === cp.id;
                      return (
                        <div
                          key={cp.id}
                          style={{
                            border: '1px solid',
                            borderColor: isActive ? '#e05438' : 'var(--border)',
                            borderRadius: '8px',
                            padding: '14px 18px',
                            background: isActive ? 'rgba(224, 84, 56, 0.04)' : 'var(--surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'rgba(224,84,56,0.1)',
                                color: '#e05438',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Server size={18} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--fg)' }}>{cp.name}</span>
                                {isActive && (
                                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: 'rgba(224,84,56,0.14)', color: '#e05438' }}>
                                    Active
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                                <span>{cp.baseUrl}</span>
                                <span>•</span>
                                <span>Model: <strong>{cp.defaultModel}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => setActiveProvider(cp.id)}
                              style={{
                                padding: '4px 12px',
                                borderRadius: '5px',
                                border: '1px solid',
                                borderColor: isActive ? '#e05438' : 'var(--border)',
                                background: isActive ? '#e05438' : 'transparent',
                                color: isActive ? '#ffffff' : 'var(--muted)',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              {isActive ? 'Active' : 'Set as Active'}
                            </button>
                            <button
                              onClick={() => removeCustomProvider(cp.id)}
                              title="Delete provider"
                              style={{
                                padding: '6px',
                                borderRadius: '5px',
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: '#ef4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PLUGINS TAB ── */}
          {activeTab === 'plugins' && (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 20px 0', color: 'var(--fg)' }}>
                Plugin Configurations
              </h2>
              <PluginSettingsPanels />
            </div>
          )}

          {/* ── OTHER TABS ── */}
          {['editor', 'sync', 'integrations', 'notifications', 'privacy'].includes(activeTab) && (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: 'var(--fg)', textTransform: 'capitalize' }}>
                {activeTab}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Settings for {activeTab} are actively synced with your workspace profile.
              </p>
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '20px',
                  marginTop: '16px',
                  fontSize: '13px',
                  color: 'var(--fg)',
                }}
              >
                All options in this section are currently configured to default best practices.
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  color: 'var(--fg)',
  fontSize: '13px',
  boxSizing: 'border-box',
  outline: 'none',
};
