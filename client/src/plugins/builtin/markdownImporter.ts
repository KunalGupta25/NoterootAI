import { createRestrictedContext } from '../runtime/PluginContext';

export function markdownImporterPlugin() {
  const ctx = createRestrictedContext('core-markdown-importer');
  const { runtime, notes, ui } = ctx;

  // Add settings panel
  runtime.registerExtension('settings.panels', {
    id: 'md-importer-panel',
    pluginName: 'Markdown Importer',
    render: () => ({
      type: 'Column',
      children: [
        { type: 'Text', text: 'Import single .md files directly into your workspace.' },
        {
          type: 'Button',
          label: '📂 Choose .md File',
          onClick: () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.md';
            input.onchange = async (e: any) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const title = file.name.replace('.md', '');
                await notes.createNote(title, text);
                ui.showToast('Note imported successfully!', 'success');
              } catch (err: any) {
                ui.showToast('Failed to import: ' + err.message, 'error');
              }
            };
            input.click();
          }
        }
      ]
    })
  });
}
