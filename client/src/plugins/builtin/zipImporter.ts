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
        { 
          type: 'Text', 
          text: 'Import folder structures of Markdown notes from a .zip archive. Folder hierarchies are automatically organized into Spaces!' 
        },
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
                ui.showToast('Extracting and importing archive...');
                const arrayBuffer = await file.arrayBuffer();
                const JSZip = (await import('jszip')).default;
                const zip = await JSZip.loadAsync(arrayBuffer);
                let count = 0;
                const spacesCreated = new Set<string>();
                
                for (const [filename, fileData] of Object.entries(zip.files)) {
                  if (fileData.dir || filename.includes('__MACOSX') || filename.startsWith('.')) continue;
                  
                  if (filename.endsWith('.md') || filename.endsWith('.markdown')) {
                    const text = await fileData.async('string');
                    const parts = filename.split('/').filter(Boolean);
                    const rawTitle = parts.pop()?.replace(/\.(md|markdown)$/i, '') || 'Untitled';
                    
                    // Folder hierarchy becomes Space
                    const folderSpace = parts.length > 0 ? parts.join('/') : 'Other';
                    
                    let cleanText = text;
                    let space = folderSpace;
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
                    spacesCreated.add(space);
                    count++;
                  }
                }
                
                ui.showToast(
                  `Successfully imported ${count} note${count === 1 ? '' : 's'} across ${spacesCreated.size} space${spacesCreated.size === 1 ? '' : 's'}!`,
                  'success'
                );
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

