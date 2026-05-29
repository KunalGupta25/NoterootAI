import { useEffect } from 'react';
import BlockMenu from './BlockMenu';
import SelectionToolbar from './SelectionToolbar';
import TableToolbar from './TableToolbar';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import SlashCommand from './extensions/slash-command';
import { SlashCommandList } from './extensions/SlashCommandList';
import { PageMention } from './extensions/PageMentionExtension';
import type { MentionItem } from './extensions/MentionList';
import tippy from 'tippy.js';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import MathExtension from '@tiptap/extension-mathematics';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import 'katex/dist/katex.min.css';
import { useNoteStore } from '../../stores/noteStore';
import PluginRuntime from '../../plugins/runtime/PluginRuntime';

// ─── Slash command items (grouped by category) ───
function getSlashItems(query: string) {
  const all = [
    // ── Text ──
    { title: 'Text', description: 'Plain text block', icon: '📝', category: 'Text',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).setParagraph().run() } },
    { title: 'Heading 1', description: 'Large section heading', icon: 'H1', category: 'Text',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run() } },
    { title: 'Heading 2', description: 'Medium section heading', icon: 'H2', category: 'Text',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run() } },
    { title: 'Heading 3', description: 'Small section heading', icon: 'H3', category: 'Text',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run() } },
    { title: 'Heading 4', description: 'Subsection heading', icon: 'H4', category: 'Text',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).setNode('heading', { level: 4 }).run() } },
    { title: 'Heading 5', description: 'Minor heading', icon: 'H5', category: 'Text',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).setNode('heading', { level: 5 }).run() } },
    { title: 'Heading 6', description: 'Smallest heading', icon: 'H6', category: 'Text',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).setNode('heading', { level: 6 }).run() } },

    // ── Lists ──
    { title: 'Bullet List', description: 'Unordered list with bullets', icon: '•', category: 'Lists',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).toggleBulletList().run() } },
    { title: 'Numbered List', description: 'Ordered list with numbers', icon: '1.', category: 'Lists',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).toggleOrderedList().run() } },
    { title: 'To-do List', description: 'Checklist with checkboxes', icon: '☑', category: 'Lists',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).toggleTaskList().run() } },

    // ── Blocks ──
    { title: 'Quote', description: 'Capture a quotation', icon: '❝', category: 'Blocks',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).toggleBlockquote().run() } },
    { title: 'Callout', description: 'Highlight important info', icon: '💡', category: 'Blocks',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range)
          .insertContent('<blockquote><p>💡 <strong>Callout:</strong> Write something important here...</p></blockquote>')
          .run();
      } },
    { title: 'Info Callout', description: 'Informational note', icon: 'ℹ️', category: 'Blocks',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range)
          .insertContent('<blockquote><p>ℹ️ <strong>Info:</strong> Add your information here...</p></blockquote>')
          .run();
      } },
    { title: 'Warning Callout', description: 'Warning message', icon: '⚠️', category: 'Blocks',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range)
          .insertContent('<blockquote><p>⚠️ <strong>Warning:</strong> Be careful about...</p></blockquote>')
          .run();
      } },
    { title: 'Divider', description: 'Visual separator line', icon: '—', category: 'Blocks',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).setHorizontalRule().run() } },

    // ── Code & Technical ──
    { title: 'Code Block', description: 'Write a code snippet', icon: '</>', category: 'Code & Technical',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).toggleCodeBlock().run() } },
    { title: 'Inline Code', description: 'Mark text as code', icon: '`c`', category: 'Code & Technical',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).toggleCode().run() } },
    { title: 'Math Equation', description: 'LaTeX math formula', icon: '∑', category: 'Code & Technical',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).insertContent('$$ E = mc^2 $$').run();
      } },
    { title: 'Mermaid Diagram', description: 'Flowcharts, sequence diagrams', icon: '📊', category: 'Code & Technical',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range)
          .insertContent('<pre><code class="language-mermaid">graph TD;\n  A[Start] -->|Step 1| B[Process];\n  B --> C{Decision};\n  C -->|Yes| D[Result];\n  C -->|No| E[Retry];</code></pre>')
          .run();
      } },

    // ── Table ──
    { title: 'Table (2×2)', description: 'Small 2-column table', icon: '▦', category: 'Table',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run() } },
    { title: 'Table (3×3)', description: 'Standard 3-column table', icon: '▦', category: 'Table',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() } },
    { title: 'Table (4×4)', description: 'Large 4-column table', icon: '▦', category: 'Table',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run() } },
    { title: 'Table (5×3)', description: 'Wide table with 5 columns', icon: '▦', category: 'Table',
      command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 5, withHeaderRow: true }).run() } },

    // ── Media & Embed ──
    { title: 'Image URL', description: 'Embed an image from URL', icon: '🖼️', category: 'Media',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        const url = prompt('Enter image URL:');
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      } },
    { title: 'Upload Image', description: 'Upload from your computer', icon: '📤', category: 'Media',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                editor.chain().focus().setImage({ src: event.target.result as string }).run();
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } },
    { title: 'Video Embed', description: 'Embed a YouTube or video URL', icon: '🎬', category: 'Media',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        const url = prompt('Enter video URL (YouTube, etc.):');
        if (url) {
          const embedUrl = url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
          editor.chain().focus().insertContent(
            `<div data-type="video-embed" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;margin:16px 0;"><iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe></div>`
          ).run();
        }
      } },
    { title: 'Link', description: 'Insert a hyperlink', icon: '🔗', category: 'Media',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        const url = prompt('Enter link URL:');
        if (url) {
          const text = prompt('Link text:', url) || url;
          editor.chain().focus().insertContent(`<a href="${url}" target="_blank">${text}</a>`).run();
        }
      } },
    { title: 'Bookmark', description: 'Save a web bookmark', icon: '🔖', category: 'Media',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        const url = prompt('Enter bookmark URL:');
        if (url) {
          editor.chain().focus().insertContent(
            `<blockquote><p>🔖 <a href="${url}" target="_blank">${url}</a></p></blockquote>`
          ).run();
        }
      } },

    // ── Embeds ──
    { title: 'Embed', description: 'Embed any website via iframe', icon: '🌐', category: 'Embeds',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        const url = prompt('Enter URL to embed:');
        if (url) {
          editor.chain().focus().insertContent(
            `<div data-type="embed" style="border:1.5px solid var(--border);border-radius:8px;overflow:hidden;margin:16px 0;"><iframe src="${url}" style="width:100%;height:400px;border:none;" allowfullscreen></iframe></div>`
          ).run();
        }
      } },
    { title: 'Google Maps', description: 'Embed a Google Maps location', icon: '🗺️', category: 'Embeds',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        const query = prompt('Enter location or Google Maps embed URL:');
        if (query) {
          const src = query.startsWith('http') ? query : `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
          editor.chain().focus().insertContent(
            `<div data-type="map-embed" style="border:1.5px solid var(--border);border-radius:8px;overflow:hidden;margin:16px 0;"><iframe src="${src}" style="width:100%;height:350px;border:none;" allowfullscreen loading="lazy"></iframe></div>`
          ).run();
        }
      } },
    { title: 'Tweet / X Post', description: 'Embed a tweet or X post', icon: '🐦', category: 'Embeds',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        const url = prompt('Enter tweet URL:');
        if (url) {
          editor.chain().focus().insertContent(
            `<blockquote style="border-left:3px solid var(--accent);padding:12px 16px;margin:16px 0;background:var(--bg);border-radius:4px;"><p>🐦 <strong>Tweet:</strong> <a href="${url}" target="_blank">${url}</a></p></blockquote>`
          ).run();
        }
      } },
    { title: 'PDF Embed', description: 'Embed a PDF document', icon: '📄', category: 'Embeds',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        const url = prompt('Enter PDF URL:');
        if (url) {
          editor.chain().focus().insertContent(
            `<div data-type="pdf-embed" style="border:1.5px solid var(--border);border-radius:8px;overflow:hidden;margin:16px 0;"><iframe src="${url}" style="width:100%;height:600px;border:none;"></iframe></div>`
          ).run();
        }
      } },
    { title: 'Audio', description: 'Embed audio from a URL', icon: '🎵', category: 'Embeds',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        const url = prompt('Enter audio URL (.mp3, .wav, etc.):');
        if (url) {
          editor.chain().focus().insertContent(
            `<div data-type="audio" style="margin:16px 0;padding:16px;background:var(--bg);border:1.5px solid var(--border);border-radius:8px;"><p style="margin:0 0 8px;font-size:12px;color:var(--muted);">🎵 Audio</p><audio controls src="${url}" style="width:100%;"></audio></div>`
          ).run();
        }
      } },
    { title: 'Spotify', description: 'Embed a Spotify track or playlist', icon: '🎧', category: 'Embeds',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        const url = prompt('Enter Spotify URL:');
        if (url) {
          const embedUrl = url.replace('open.spotify.com/', 'open.spotify.com/embed/');
          editor.chain().focus().insertContent(
            `<div data-type="spotify-embed" style="border-radius:12px;overflow:hidden;margin:16px 0;"><iframe src="${embedUrl}" style="width:100%;height:152px;border:none;" allow="encrypted-media"></iframe></div>`
          ).run();
        }
      } },
    { title: 'Figma', description: 'Embed a Figma design file', icon: '🎨', category: 'Embeds',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        const url = prompt('Enter Figma file URL:');
        if (url) {
          editor.chain().focus().insertContent(
            `<div data-type="figma-embed" style="border:1.5px solid var(--border);border-radius:8px;overflow:hidden;margin:16px 0;"><iframe src="https://www.figma.com/embed?embed_host=noteroot&url=${encodeURIComponent(url)}" style="width:100%;height:450px;border:none;" allowfullscreen></iframe></div>`
          ).run();
        }
      } },
    { title: 'CodePen', description: 'Embed a CodePen', icon: '⌨️', category: 'Embeds',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        const url = prompt('Enter CodePen URL:');
        if (url) {
          const embedUrl = url.replace('/pen/', '/embed/');
          editor.chain().focus().insertContent(
            `<div data-type="codepen-embed" style="border:1.5px solid var(--border);border-radius:8px;overflow:hidden;margin:16px 0;"><iframe src="${embedUrl}" style="width:100%;height:400px;border:none;" allowfullscreen></iframe></div>`
          ).run();
        }
      } },

    // ── Formatting & Utility ──
    { title: 'Toggle List', description: 'Collapsible content section', icon: '▸', category: 'Advanced',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).insertContent(
          '<details><summary>Click to expand...</summary><p>Hidden content goes here.</p></details>'
        ).run();
      } },
    { title: 'Table of Contents', description: 'Auto-generated TOC', icon: '📑', category: 'Advanced',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).insertContent(
          '<blockquote><p>📑 <strong>Table of Contents</strong></p><p><em>Auto-generated from headings (coming soon)</em></p></blockquote>'
        ).run();
      } },
    { title: 'Date / Timestamp', description: 'Insert current date and time', icon: '📅', category: 'Advanced',
      command: ({ editor, range }: any) => {
        const now = new Date();
        const formatted = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        editor.chain().focus().deleteRange(range).insertContent(
          `<p>📅 <code>${formatted} — ${time}</code></p>`
        ).run();
      } },
    { title: 'Emoji', description: 'Insert an emoji', icon: '😀', category: 'Advanced',
      command: ({ editor, range }: any) => {
        const emoji = prompt('Type an emoji or paste one:');
        if (emoji) {
          editor.chain().focus().deleteRange(range).insertContent(emoji).run();
        }
      } },
    { title: 'Highlight', description: 'Highlighted text block', icon: '🟡', category: 'Advanced',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).insertContent(
          '<p style="background: oklch(95% 0.05 90); padding: 12px 16px; border-radius: 6px; margin: 12px 0;">Highlighted text...</p>'
        ).run();
      } },
    { title: 'Success Block', description: 'Green success callout', icon: '✅', category: 'Blocks',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).insertContent(
          '<blockquote><p>✅ <strong>Success:</strong> Everything went as expected!</p></blockquote>'
        ).run();
      } },
    { title: 'Danger Block', description: 'Red danger callout', icon: '🚨', category: 'Blocks',
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).insertContent(
          '<blockquote><p>🚨 <strong>Danger:</strong> This action cannot be undone!</p></blockquote>'
        ).run();
      } },
  ];

  // Merge plugin slash items
  const pluginItems = PluginRuntime.getSlashItems(query);
  all.push(...pluginItems);

  if (!query) return all;
  
  return all.filter(item =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );
}

// ─── Tippy render helper ───
function createSuggestionRenderer() {
  return () => {
    let component: ReactRenderer;
    let popup: any;
    return {
      onStart: (props: any) => {
        component = new ReactRenderer(SlashCommandList, { props, editor: props.editor });
        if (!props.clientRect) return;
        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },
      onUpdate(props: any) {
        component.updateProps(props);
        if (!props.clientRect || !popup) return;
        popup[0].setProps({ getReferenceClientRect: props.clientRect });
      },
      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide();
          return true;
        }
        return (component.ref as any)?.onKeyDown(props);
      },
      onExit() {
        popup?.[0]?.destroy();
        component.destroy();
      },
    };
  };
}

// ─── Main Editor Component ───
export default function NoteEditor({ initialContent, onChange }: { initialContent?: string; onChange?: (c: string) => void }) {
  const { notes } = useNoteStore();
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: false,
        codeBlock: {
          HTMLAttributes: {
            spellcheck: 'false',
          },
        },
      } as any),
      Placeholder.configure({ placeholder: 'Type / for commands, @ to mention a page...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      MathExtension,
      Image,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Highlight.configure({ multicolor: false }),
      SlashCommand.configure({
        suggestion: {
          items: ({ query }: { query: string }) => getSlashItems(query),
          render: createSuggestionRenderer(),
        },
      }),
      // @ mention — live vault page references
      PageMention.configure({
        suggestion: {
          items: ({ query }: { query: string }): MentionItem[] => {
            const q = query.toLowerCase();
            const allItems: any[] = [];
            
            for (const n of notes) {
              const matchesPage = !q || n.title.toLowerCase().includes(q) || (n.tags || []).some((t: string) => t.includes(q));
              if (matchesPage) {
                allItems.push({
                  id: n._id,
                  label: n.title || 'Untitled',
                  icon: n.icon || '📄',
                  parentLabel: n.parentId ? notes.find(p => p._id === n.parentId)?.title : undefined,
                  updatedAt: n.updatedAt,
                });
              }
              
              // Extract headings
              if (n.content) {
                const headingRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi;
                let match;
                while ((match = headingRegex.exec(n.content)) !== null) {
                  const headingText = match[1].replace(/<[^>]+>/g, '').trim();
                  if (headingText && (!q || headingText.toLowerCase().includes(q) || matchesPage)) {
                    // Create an ID that includes the note ID and the hash fragment
                    allItems.push({
                      id: `${n._id}#${headingText}`,
                      label: headingText,
                      icon: '🔗',
                      parentLabel: n.title || 'Untitled',
                      updatedAt: n.updatedAt,
                    });
                  }
                }
              }
            }
            
            return allItems
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .slice(0, 15)
              .map(({ updatedAt, ...item }) => item as MentionItem);
          },
        },
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      handleDrop: function(view, event, _slice, moved) {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              const { schema } = view.state;
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              const node = schema.nodes.image.create({ src });
              const transaction = view.state.tr.insert(coordinates?.pos || view.state.selection.from, node);
              view.dispatch(transaction);
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: function(view, event, _slice) {
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files[0]) {
          const file = event.clipboardData.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              const { schema } = view.state;
              const node = schema.nodes.image.create({ src });
              const transaction = view.state.tr.replaceSelectionWith(node);
              view.dispatch(transaction);
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      }
    },
  });

  // Ctrl+S — prevent browser save dialog (autosave is implicit)
  useEffect(() => {
    const handleSave = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleSave);
    return () => document.removeEventListener('keydown', handleSave);
  }, []);

  if (!editor) return null;

  return (
    <div className="prose prose-sm max-w-none prose-wrapper">
      <BlockMenu editor={editor} />
      <SelectionToolbar editor={editor} />
      <TableToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
