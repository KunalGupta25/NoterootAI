import { createRestrictedContext } from '../runtime/PluginContext';

export function noteDownloaderPlugin() {
  const ctx = createRestrictedContext('core-note-downloader');
  const { runtime, notes, ui, settings } = ctx;

  // Settings
  runtime.registerExtension('settings.panels', {
    id: 'note-downloader-settings',
    pluginName: 'Note Downloader',
    render: () => ({
      type: 'Column',
      children: [
        { type: 'Label', text: 'Default Export Format' },
        { 
          type: 'RadioGroup', 
          value: settings.get('format') ?? 'md', 
          options: ['md', 'html'],
          onChange: (v: string) => settings.set('format', v)
        },
        { type: 'Text', text: 'Choose the default format for downloading notes.' }
      ]
    })
  });

  // Modal for manual choice if needed (not strictly required if we just use default, but let's implement it for demo)
  // But wait, DescriptorRenderer needs state management for modals to be interactive inside the modal.
  // Since DescriptorRenderer is pure, we'll keep it simple: just use default format from settings on click.

  runtime.registerExtension('note.pageActions', {
    id: 'download-note',
    icon: '⬇️',
    label: 'Download',
    onClick: async (noteId: string) => {
      try {
        const note = await notes.getNote(noteId);
        if (!note) throw new Error('Note not found');

        const format = settings.get('format') || 'md';
        
        let content = '';
        let mimeType = '';
        let ext = '';

        if (format === 'md') {
          // A very naive HTML to MD conversion, since note content is HTML
          // For a real plugin, use turndown
          content = note.content.replace(/<[^>]+>/g, '\n').trim() || note.title;
          mimeType = 'text/markdown';
          ext = 'md';
        } else {
          content = `
<!DOCTYPE html>
<html>
<head><title>${note.title}</title></head>
<body>
<h1>${note.title}</h1>
${note.content}
</body>
</html>`;
          mimeType = 'text/html';
          ext = 'html';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${note.title}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        
        ui.showToast(`Downloaded as .${ext}`, 'success');
      } catch (err: any) {
        ui.showToast('Download failed: ' + err.message, 'error');
      }
    }
  });
}
