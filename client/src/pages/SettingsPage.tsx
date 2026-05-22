import { useSettingsStore } from '../stores/settingsStore';
import { BUILTIN_PROVIDERS, BUILTIN_PROVIDER_IDS, type BuiltinProvider, type CustomProviderConfig } from '../lib/providerConfig';
import { Eye, EyeOff, Check, Plus, Trash2, ExternalLink, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { useState } from 'react';

const STATUS_COLORS = { active: '#22c55e', configured: '#f59e0b', empty: '#6b7280' };

function ProviderCard({ providerId }: { providerId: BuiltinProvider }) {
  const info = BUILTIN_PROVIDERS[providerId];
  const {
    providerKeys, setProviderKey,
    providerModels, setProviderModel,
    activeProvider, setActiveProvider,
    getProviderModel,
  } = useSettingsStore();
  const key = providerKeys[providerId] ?? '';
  const isActive = activeProvider === providerId;
  const isConfigured = key.trim().length > 0;
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [customModelInput, setCustomModelInput] = useState('');
  const [addingModel, setAddingModel] = useState(false);
  const selectedModel = getProviderModel(providerId);

  // Per-provider custom model list stored in Zustand
  const extraModels: string[] = (providerModels[`${providerId}_extra`] as any) ?? [];

  const allModels = [...info.models, ...extraModels];

  const handleKeyChange = (v: string) => {
    setProviderKey(providerId, v);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddModel = () => {
    const m = customModelInput.trim();
    if (!m) return;
    const existing = allModels.includes(m);
    if (!existing) {
      setProviderModel(`${providerId}_extra`, [...extraModels, m].join('|||'));
    }
    setProviderModel(providerId, m);
    setCustomModelInput('');
    setAddingModel(false);
  };

  const status = isActive ? 'active' : isConfigured ? 'configured' : 'empty';

  return (
    <div style={{
      border: `1.5px solid ${isActive ? info.color + '60' : 'var(--border)'}`,
      borderRadius: '10px',
      background: isActive ? info.color + '08' : 'var(--bg)',
      transition: 'border-color 0.2s, background 0.2s',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}>
        <span style={{ fontSize: '22px' }}>{info.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--fg)' }}>{info.label}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
            {isConfigured ? (isActive ? 'Active provider' : 'Configured') : 'No key set'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status], display: 'inline-block' }} />
          {isConfigured && !isActive && (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveProvider(providerId); }}
              style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '4px', border: `1px solid ${info.color}`, background: 'transparent', color: info.color, cursor: 'pointer' }}
            >Set Active</button>
          )}
          {isActive && (
            <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '4px', background: info.color + '20', color: info.color, fontWeight: 600 }}>● Active</span>
          )}
          {expanded ? <ChevronUp size={14} color="var(--muted)" /> : <ChevronDown size={14} color="var(--muted)" />}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '14px' }}>
          {/* API Key */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500 }}>API Key</label>
              <a href={info.keyUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '11px', color: info.color, display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}>
                Get key <ExternalLink size={10} />
              </a>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={show ? 'text' : 'password'}
                  placeholder={info.keyPlaceholder}
                  value={key}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)', borderRadius: '6px', padding: '7px 36px 7px 10px', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '12px', boxSizing: 'border-box' }}
                />
                <button onClick={() => setShow(!show)} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', padding: '2px' }}>
                  {show ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {saved && <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', whiteSpace: 'nowrap' }}><Check size={12} /> Saved</span>}
            </div>
          </div>

          {/* Model selector */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Default Model</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={selectedModel}
                onChange={(e) => setProviderModel(providerId, e.target.value)}
                style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)', borderRadius: '6px', padding: '7px 10px', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
              >
                {allModels.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {addingModel ? (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    autoFocus
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddModel(); if (e.key === 'Escape') setAddingModel(false); }}
                    placeholder="model-name..."
                    style={{ width: '140px', background: 'var(--surface)', border: `1px solid ${info.color}`, color: 'var(--fg)', borderRadius: '6px', padding: '7px 10px', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                  />
                  <button onClick={handleAddModel} style={{ padding: '7px 10px', borderRadius: '6px', border: `1px solid ${info.color}`, background: info.color + '20', color: info.color, cursor: 'pointer', fontSize: '12px' }}>Add</button>
                </div>
              ) : (
                <button onClick={() => setAddingModel(true)} title="Add custom model" style={{ padding: '7px 10px', borderRadius: '6px', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                  <Plus size={11} /> Custom
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomProviderCard({ provider }: { provider: CustomProviderConfig }) {
  const { updateCustomProvider, removeCustomProvider, activeProvider, setActiveProvider, setProviderModel, getProviderModel } = useSettingsStore();
  const [expanded, setExpanded] = useState(false);
  const [addingModel, setAddingModel] = useState(false);
  const [newModel, setNewModel] = useState('');
  const isActive = activeProvider === provider.id;
  const selectedModel = getProviderModel(provider.id) || provider.defaultModel;

  const handleAddModel = () => {
    const m = newModel.trim();
    if (!m || provider.models.includes(m)) return;
    updateCustomProvider(provider.id, { models: [...provider.models, m], defaultModel: m });
    setProviderModel(provider.id, m);
    setNewModel('');
    setAddingModel(false);
  };

  return (
    <div style={{ border: `1.5px solid ${isActive ? '#8b5cf6aa' : 'var(--border)'}`, borderRadius: '10px', background: isActive ? '#8b5cf608' : 'var(--bg)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <span style={{ fontSize: '22px' }}>🔌</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>{provider.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{provider.baseUrl}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!isActive && <button onClick={(e) => { e.stopPropagation(); setActiveProvider(provider.id); }} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '4px', border: '1px solid #8b5cf6', background: 'transparent', color: '#8b5cf6', cursor: 'pointer' }}>Set Active</button>}
          {isActive && <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '4px', background: '#8b5cf620', color: '#8b5cf6', fontWeight: 600 }}>● Active</span>}
          <button onClick={(e) => { e.stopPropagation(); removeCustomProvider(provider.id); }} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '2px', display: 'flex' }}><Trash2 size={13} /></button>
          {expanded ? <ChevronUp size={14} color="var(--muted)" /> : <ChevronDown size={14} color="var(--muted)" />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Provider Name</label>
              <input value={provider.name} onChange={(e) => updateCustomProvider(provider.id, { name: e.target.value })}
                style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)', borderRadius: '6px', padding: '7px 10px', outline: 'none', fontSize: '12px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>API Key (optional)</label>
              <input value={provider.apiKey} onChange={(e) => updateCustomProvider(provider.id, { apiKey: e.target.value })}
                type="password"
                placeholder="leave empty for local models"
                style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)', borderRadius: '6px', padding: '7px 10px', outline: 'none', fontSize: '12px', fontFamily: 'var(--font-mono)', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Base URL</label>
            <input value={provider.baseUrl} onChange={(e) => updateCustomProvider(provider.id, { baseUrl: e.target.value })}
              placeholder="http://localhost:11434/v1"
              style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)', borderRadius: '6px', padding: '7px 10px', outline: 'none', fontSize: '12px', fontFamily: 'var(--font-mono)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Models</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
              {provider.models.map((m) => (
                <span key={m} onClick={() => { updateCustomProvider(provider.id, { defaultModel: m }); setProviderModel(provider.id, m); }}
                  style={{ padding: '3px 10px', borderRadius: '4px', border: `1px solid ${selectedModel === m ? '#8b5cf6' : 'var(--border)'}`, background: selectedModel === m ? '#8b5cf620' : 'transparent', color: selectedModel === m ? '#8b5cf6' : 'var(--muted)', fontSize: '11px', fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                  {m}
                </span>
              ))}
            </div>
            {addingModel ? (
              <div style={{ display: 'flex', gap: '6px' }}>
                <input autoFocus value={newModel} onChange={(e) => setNewModel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddModel(); if (e.key === 'Escape') setAddingModel(false); }}
                  placeholder="model-name..."
                  style={{ flex: 1, background: 'var(--surface)', border: '1px solid #8b5cf6', color: 'var(--fg)', borderRadius: '6px', padding: '5px 10px', outline: 'none', fontSize: '12px', fontFamily: 'var(--font-mono)' }} />
                <button onClick={handleAddModel} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #8b5cf6', background: '#8b5cf620', color: '#8b5cf6', cursor: 'pointer', fontSize: '12px' }}>Add</button>
              </div>
            ) : (
              <button onClick={() => setAddingModel(true)} style={{ fontSize: '12px', padding: '4px 10px', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--muted)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={11} /> Add Model
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddCustomProviderForm({ onAdd }: { onAdd: () => void }) {
  const { addCustomProvider, setActiveProvider, setProviderModel } = useSettingsStore();
  const [form, setForm] = useState({ name: '', baseUrl: '', apiKey: '', defaultModel: '' });

  const handleSubmit = () => {
    if (!form.name || !form.baseUrl || !form.defaultModel) return;
    const id = addCustomProvider({
      name: form.name,
      baseUrl: form.baseUrl,
      apiKey: form.apiKey,
      models: [form.defaultModel],
      defaultModel: form.defaultModel,
    });
    setProviderModel(id, form.defaultModel);
    setActiveProvider(id);
    onAdd();
  };

  const field = (label: string, key: keyof typeof form, placeholder: string, mono = false) => (
    <div>
      <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>{label}</label>
      <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)', borderRadius: '6px', padding: '7px 10px', outline: 'none', fontSize: '12px', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)', boxSizing: 'border-box' }} />
    </div>
  );

  return (
    <div style={{ border: '1.5px dashed #8b5cf680', borderRadius: '10px', padding: '16px', background: '#8b5cf605' }}>
      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🔌 Add Custom Provider
        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>OpenAI-compatible API (Ollama, OpenRouter, Grok…)</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {field('Provider Name', 'name', 'My Ollama')}
          {field('Default Model', 'defaultModel', 'llama3.2', true)}
        </div>
        {field('Base URL', 'baseUrl', 'http://localhost:11434/v1', true)}
        {field('API Key (optional)', 'apiKey', 'leave empty for local models', true)}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onAdd} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!form.name || !form.baseUrl || !form.defaultModel}
            style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', background: '#8b5cf6', color: 'white', cursor: form.name && form.baseUrl && form.defaultModel ? 'pointer' : 'default', fontSize: '13px', opacity: form.name && form.baseUrl && form.defaultModel ? 1 : 0.5 }}>
            Add Provider
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme, customProviders } = useSettingsStore();
  const [showAddCustom, setShowAddCustom] = useState(false);

  return (
    <div style={{ padding: '32px', maxWidth: '720px', margin: '0 auto' }}>
      <div className="mono kicker">Configuration</div>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '32px', fontFamily: 'var(--font-display)', margin: '4px 0 32px' }}>Settings</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Appearance */}
        <section style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', margin: '0 0 16px' }}>Appearance</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px' }}>Theme</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['light', 'dark'] as const).map((t) => (
                <button key={t} onClick={() => setTheme(t)} style={{
                  padding: '6px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
                  border: `1px solid ${theme === t ? 'var(--accent)' : 'var(--border)'}`,
                  background: theme === t ? 'var(--accent)' : 'transparent',
                  color: theme === t ? 'white' : 'var(--muted)',
                  transition: 'all 0.15s',
                }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
          </div>
        </section>

        {/* AI Providers */}
        <section style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={16} /> AI Providers (BYOK)
            </h2>
            <button onClick={() => setShowAddCustom(!showAddCustom)} style={{ fontSize: '12px', padding: '5px 12px', border: '1px solid #8b5cf680', borderRadius: '6px', background: '#8b5cf610', color: '#8b5cf6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={11} /> Custom Provider
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px' }}>
            Add API keys for multiple providers. Keys are stored locally in your browser and never sent anywhere except directly to the AI provider. You can switch providers per conversation.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {BUILTIN_PROVIDER_IDS.map((id) => <ProviderCard key={id} providerId={id} />)}
            {customProviders.map((p) => <CustomProviderCard key={p.id} provider={p} />)}
            {showAddCustom && <AddCustomProviderForm onAdd={() => setShowAddCustom(false)} />}
          </div>
        </section>

      </div>
    </div>
  );
}
