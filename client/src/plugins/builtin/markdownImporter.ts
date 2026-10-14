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
        { 
          type: 'Text', 
          text: 'Import individual .md or .markdown files directly into your workspace. Detects YAML frontmatter (title, space, tags) automatically.' 
        },
        {
          type: 'Button',
          label: '📂 Choose .md File',
          onClick: () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.md,.markdown';
            input.onchange = async (e: any) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const rawTitle = file.name.replace(/\.(md|markdown)$/i, '');
                
                let cleanText = text;
                let space = 'Other';
                let tags: string[] = [];
                let noteTitle = rawTitle;

                // Parse YAML frontmatter if present
                const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
                if (fmMatch) {
                  cleanText = fmMatch[2].trim();
                  const fmLines = fmMatch[1].split('\n');
                  for (const line of fmLines) {
                    const colonIdx = line.indexOf(':');
                    if (colonIdx > 0) {
                      const key = line.slice(0, colonIdx).trim().toLowerCase();
                      const val = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
                      if (key === 'title' && val) noteTitle = val;
                      if (key === 'space' && val) space = val;
                      if (key === 'tags') {
                        const cleaned = val.replace(/^\[|\]$/g, '');
                        tags = cleaned.split(',').map((t: string) => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
                      }
                    }
                  }
                }

                await notes.createNote(noteTitle, cleanText, space, tags);
                ui.showToast(`Imported "${noteTitle}" into Space "${space}"!`, 'success');
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

