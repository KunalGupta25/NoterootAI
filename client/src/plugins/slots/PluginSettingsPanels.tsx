import { usePluginExtensions } from './usePluginExtensions';
import type { SettingsPanel } from '../runtime/ExtensionPoints';
import { DescriptorRenderer } from '../runtime/DescriptorRenderer';
import { Puzzle } from 'lucide-react';

export function PluginSettingsPanels() {
  const panels = usePluginExtensions<SettingsPanel>('settings.panels');

  if (panels.length === 0) return null;

  return (
    <section style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Puzzle size={16} /> Plugin Settings
        </h2>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px' }}>
        Settings for installed plugins.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {panels.map((panel) => (
          <div key={panel.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg)', padding: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginTop: 0, marginBottom: '12px', color: 'var(--accent)' }}>
              {panel.pluginName}
            </h3>
            <DescriptorRenderer node={panel.render()} />
          </div>
        ))}
      </div>
    </section>
  );
}
