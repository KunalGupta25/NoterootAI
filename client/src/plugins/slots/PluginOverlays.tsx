import { usePluginExtensions } from './usePluginExtensions';
import { DescriptorRenderer } from '../runtime/DescriptorRenderer';
import type { LayoutOverlay, LayoutModal } from '../runtime/ExtensionPoints';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export function PluginOverlays() {
  const overlays = usePluginExtensions<LayoutOverlay>('layout.overlays');
  const modals = usePluginExtensions<LayoutModal>('layout.modals');
  
  const [activeModalId, setActiveModalId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenModal = (e: any) => {
      setActiveModalId(e.detail.modalId);
    };
    window.addEventListener('OPEN_PLUGIN_MODAL', handleOpenModal);
    return () => window.removeEventListener('OPEN_PLUGIN_MODAL', handleOpenModal);
  }, []);

  const activeModal = modals.find(m => m.id === activeModalId);

  return (
    <>
      {/* Overlays (e.g. floating widgets) */}
      {overlays.map((overlay) => (
        <DescriptorRenderer key={overlay.id} node={overlay.render()} />
      ))}

      {/* Active Modal */}
      {activeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            width: '400px',
            maxWidth: '90vw',
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{activeModal.title}</h3>
              <button onClick={() => setActiveModalId(null)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <DescriptorRenderer node={activeModal.render()} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
