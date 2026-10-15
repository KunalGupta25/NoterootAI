import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePluginExtensions } from './usePluginExtensions';
import type { SettingsPanel } from '../runtime/ExtensionPoints';
import { DescriptorRenderer } from '../runtime/DescriptorRenderer';
import { useSettingsStore } from '../../stores/settingsStore';
import PluginRuntime from '../runtime/PluginRuntime';
import { Puzzle, ArrowRight, AlertTriangle } from 'lucide-react';

export function PluginSettingsPanels() {
  const panels = usePluginExtensions<SettingsPanel>('settings.panels');
  const [, setTick] = useState(0);

  // Subscribe to settings changes so descriptor trees update when plugin settings change
  useEffect(() => {
    const unsub = useSettingsStore.subscribe(() => {
      setTick(t => t + 1);
    });
    const handleToast = () => setTick(t => t + 1);
    window.addEventListener('PLUGIN_TOAST', handleToast);
    return () => {
      unsub();
      window.removeEventListener('PLUGIN_TOAST', handleToast);
    };
  }, []);

  // Deduplicate panels by ID so each panel renders only once
  const uniquePanels = Array.from(new Map(panels.map(p => [p.id, p])).values());
  const errors: [string, string][] = Array.from(PluginRuntime.pluginErrors.entries());

  if (uniquePanels.length === 0) {
    return (
      <section style={{ padding: '28px', borderRadius: '12px', border: '1px dashed var(--border)', background: 'var(--surface)', textAlign: 'center' }}>
        {errors.length > 0 && (
          <div style={{ marginBottom: '16px', textAlign: 'left' }}>
            {errors.map(([pId, err]) => (
              <div key={pId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '13px' }}>
                <AlertTriangle size={16} /> <span><strong>Plugin Error ({pId}):</strong> {err}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(224, 84, 56, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#e05438' }}>
          <Puzzle size={20} />
        </div>
        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 6px', color: 'var(--fg)' }}>No Active Plugin Settings</h3>
        <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: '0 0 16px', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
          Plugins with settings panels (such as Drive Connector) will appear here once installed and enabled.
        </p>
        <Link
          to="/plugins"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '6px',
            background: '#e05438',
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: '12.5px',
            fontWeight: 500,
          }}
        >
          Open Plugins Marketplace <ArrowRight size={13} />
        </Link>
      </section>
    );
  }

  return (
    <section style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
      {errors.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {errors.map(([pId, err]) => (
            <div key={pId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '13px', marginBottom: '8px' }}>
              <AlertTriangle size={16} /> <span><strong>Plugin Error ({pId}):</strong> {err}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {uniquePanels.map((panel) => (
          <div key={panel.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg)', padding: '18px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginTop: 0, marginBottom: '14px', color: '#e05438' }}>
              {panel.pluginName}
            </h3>
            <DescriptorRenderer node={panel.render()} />
          </div>
        ))}
      </div>
    </section>
  );
}
