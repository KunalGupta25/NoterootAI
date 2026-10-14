import { createRestrictedContext } from '../runtime/PluginContext';

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function htmlToMarkdown(html: string): string {
  if (!html) return '';
  let md = html;
  
  // Code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, code) => {
    return '\n\n```\n' + decodeHtmlEntities(code).trim() + '\n```\n\n';
  });
  
  // Inline code
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, (_, code) => '`' + decodeHtmlEntities(code) + '`');
  
  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n\n#### $1\n\n');
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n\n##### $1\n\n');
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n\n###### $1\n\n');
  
  // Bold & Italic
  md = md.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**');
  md = md.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*');
  md = md.replace(/<(del|s|strike)[^>]*>(.*?)<\/\1>/gi, '~~$2~~');
  
  // Links
  md = md.replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, text) => {
    return '\n' + text.trim().split('\n').map((l: string) => `> ${l}`).join('\n') + '\n\n';
  });
  
  // Lists
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?(ul|ol)[^>]*>/gi, '\n');
  
  // Paragraphs and breaks
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n');
  
  // Strip any remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');
  
  return decodeHtmlEntities(md).replace(/\n{3,}/g, '\n\n').trim();
}

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
        { 
          type: 'Text', 
          text: 'Choose whether notes download as Markdown (.md) with YAML frontmatter or standalone HTML (.html).' 
        }
      ]
    })
  });

  runtime.registerExtension('note.pageActions', {
    id: 'download-note',
    icon: '⬇️',
    label: 'Download',
    onClick: async (noteId: string) => {
      try {
        const note = await notes.getNote(noteId);
        if (!note) throw new Error('Note not found');

        const format = settings.get('format') || 'md';
        const noteSpace = note.space || 'Other';
        const noteTags = note.tags || [];
        const noteTitle = note.title || 'Untitled';
        
        let content = '';
        let mimeType = '';
        let ext = '';

        if (format === 'md') {
          const bodyMarkdown = htmlToMarkdown(note.content || '');
          const tagsFormatted = noteTags.length > 0 
            ? `[${noteTags.map((t: string) => `"${t}"`).join(', ')}]` 
            : '[]';
          
          content = [
            '---',
            `title: "${noteTitle.replace(/"/g, '\\"')}"`,
            `space: "${noteSpace.replace(/"/g, '\\"')}"`,
            `tags: ${tagsFormatted}`,
            `date: "${new Date().toISOString().split('T')[0]}"`,
            '---',
            '',
            `# ${noteTitle}`,
            '',
            bodyMarkdown
          ].join('\n');
          
          mimeType = 'text/markdown;charset=utf-8';
          ext = 'md';
        } else {
          const tagsHtml = noteTags.map((t: string) => 
            `<span style="background:#f3f4f6;color:#374151;padding:2px 8px;border-radius:12px;font-size:12px;margin-right:6px;">#${t}</span>`
          ).join('');

          content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${noteTitle}</title>
  <meta name="space" content="${noteSpace}">
  <meta name="tags" content="${noteTags.join(', ')}">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 24px;
      line-height: 1.65;
      color: #1f2937;
      background: #fafafa;
    }
    .article-card {
      background: #ffffff;
      padding: 40px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 4px 12px rgba(0,0,0,0.04);
    }
    h1 { margin-top: 0; font-size: 28px; color: #111827; }
    .meta-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
      color: #6b7280;
    }
    .space-badge {
      background: rgba(224, 84, 56, 0.1);
      color: #e05438;
      padding: 3px 10px;
      border-radius: 12px;
      font-weight: 500;
    }
    pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 14px;
      border-radius: 8px;
      overflow-x: auto;
    }
    code {
      font-family: monospace;
      font-size: 13px;
      background: #f3f4f6;
      padding: 2px 4px;
      border-radius: 4px;
    }
    pre code { background: none; padding: 0; }
  </style>
</head>
<body>
  <div class="article-card">
    <h1>${noteTitle}</h1>
    <div class="meta-bar">
      <span class="space-badge">📁 ${noteSpace}</span>
      ${noteTags.length > 0 ? `<div>${tagsHtml}</div>` : ''}
    </div>
    <div class="content">
      ${note.content || ''}
    </div>
  </div>
</body>
</html>`;
          mimeType = 'text/html;charset=utf-8';
          ext = 'html';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedTitle = noteTitle.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'Untitled';
        a.download = `${sanitizedTitle}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        
        ui.showToast(`Exported "${noteTitle}" as .${ext}`, 'success');
      } catch (err: any) {
        ui.showToast('Download failed: ' + err.message, 'error');
      }
    }
  });
}

