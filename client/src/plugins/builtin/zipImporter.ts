import { createRestrictedContext } from '../runtime/PluginContext';

export function zipImporterPlugin() {
  const ctx = createRestrictedContext('core-zip-importer');
  const { runtime, notes, ui } = ctx;

  // Add settings panel
  runtime.registerExtension('settings.panels', {
    id: 'zip-importer-panel',
    pluginName: 'Bulk ZIP Importer',
    render: () => ({
      type: 'Column',
      children: [
        { type: 'Text', text: 'Import entire folders of markdown files packaged in a .zip archive.' },
        {
          type: 'Button',
          label: '📦 Upload .zip Archive',
          onClick: () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.zip';
            input.onchange = async (e: any) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const arrayBuffer = await file.arrayBuffer();
                const JSZip = (await import('jszip')).default;
                const zip = await JSZip.loadAsync(arrayBuffer);
                let count = 0;
                
                for (const [filename, fileData] of Object.entries(zip.files)) {
                  if (fileData.dir || filename.includes('__MACOSX')) continue;
                  if (filename.endsWith('.md')) {
                    const text = await fileData.async('string');
                    const title = filename.split('/').pop()?.replace('.md', '') || 'Untitled';
                    await notes.createNote(title, text);
                    count++;
                  }
                }
                
                ui.showToast(`Successfully imported ${count} notes!`, 'success');
              } catch (err: any) {
                ui.showToast('Failed to extract ZIP: ' + err.message, 'error');
              }
            };
            input.click();
          }
        }
      ]
    })
  });
}
