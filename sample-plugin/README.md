---
name: Sample Plugin v2
author: NoteRoot Team
category: Developer Tools
version: 2.0.0
tags: [sample, demo, developer]
description: >
  The official reference plugin for the NoteRoot Plugin API. Demonstrates every
  major extension point: Settings Panels, Modals, Note Page Actions, Editor Bubble
  Buttons, Slash Commands, Theme Overrides, and Lifecycle Events.
main: plugin.js
---

# 🧩 Sample Plugin v2 — Official Developer Reference

This is the **official reference plugin** for building NoteRootAI plugins. It demonstrates every extension point the platform offers with heavily-commented, production-quality code.

> If you're building your first plugin, start here. Fork this repo, gut what you don't need, and you have a working plugin skeleton in minutes.

---

## ✨ What This Plugin Does

| Feature | Extension Point | Description |
|---|---|---|
| **Monokai Theme** | `settings.panels` | Toggleable CSS variable override via Settings → Plugins |
| **Note Stats Modal** | `layout.modals` + `note.pageActions` | Shows word count for the current note |
| **Uppercase Button** | `editor.bubbleButtons` | Converts selected text to uppercase from the bubble menu |
| **Insert Time** | `editor.slashItems` | Adds a `/Insert Current Time` command to the editor |
| **Event Listener** | `ctx.events` | Logs whenever a note is opened (demonstrating the events API) |

---

## 🚀 Installation

1. In NoteRootAI, go to **Settings → Plugins**.
2. Switch to the **Marketplace** tab.
3. Paste the URL to this GitHub repository.
4. Click **Fetch Plugin**, verify the metadata, and click **Install**.
5. Toggle the plugin **ON** — your new buttons and settings appear immediately.

---

## 🛠️ Plugin File Structure

A NoteRoot plugin is a **single JavaScript file** with an accompanying `README.md` that carries YAML frontmatter metadata.

```
my-plugin/
├── plugin.js      ← All your plugin code lives here
└── README.md      ← Metadata frontmatter + user-facing docs
```

The `README.md` frontmatter tells the Marketplace how to display your plugin:

```yaml
---
name: My Plugin          # Display name in Settings
author: Your Name
category: Productivity   # Groups plugins in the Marketplace
version: 1.0.0
description: One-line summary shown in the plugin card.
main: plugin.js          # Entry file (must be plugin.js)
---
```

---

## 📖 The Plugin API (`ctx`)

NoteRoot injects a **restricted context object** (`ctx`) into your `main()` function. This is the **only** way to interact with the app — plugins cannot access `window`, `document`, or the DOM directly.

### `ctx.runtime` — Register Extensions

```javascript
ctx.runtime.registerExtension(extensionPoint, descriptor);
```

| Extension Point | What It Does |
|---|---|
| `'settings.panels'` | Adds a section to Settings → Plugins |
| `'note.pageActions'` | Adds an icon button to the note editor toolbar |
| `'editor.bubbleButtons'` | Adds a button to the text-selection bubble menu |
| `'editor.slashItems'` | Adds a command to the `/` slash menu |
| `'layout.modals'` | Registers a modal dialog (open with `ui.openModal`) |
| `'layout.overlays'` | Renders a persistent overlay on top of the app |
| `'theme.tokens'` | Registers CSS variable overrides |

---

### `ctx.notes` — Vault Operations

Read and write to the user's note vault. All methods return Promises.

```javascript
// List all notes (metadata only, no content)
const allNotes = await ctx.notes.listAllNotes();
// → [{ id, title, tags, parentId, createdAt, updatedAt }, ...]

// Get a single note (with full HTML content)
const note = await ctx.notes.getNote(noteId);
// → { _id, title, content (HTML), tags, parentId, ... }

// Create a new note (accepts Markdown, converts to HTML)
const newNote = await ctx.notes.createNote('My Title', '# Hello\nworld');

// Append Markdown content to the end of a note
await ctx.notes.appendContent(noteId, '\n## New Section\nAdded by plugin.');

// Replace note content entirely
await ctx.notes.replaceContent(noteId, '# Replaced!');

// Update note metadata (title, tags, etc.)
await ctx.notes.updateNote(noteId, { title: 'New Title', tags: ['ai'] });

// Delete a note
await ctx.notes.deleteNote(noteId);
```

---

### `ctx.ui` — User Interface

```javascript
// Show a toast notification (default type is 'success')
ctx.ui.showToast('Hello from my plugin!');
ctx.ui.showToast('Something went wrong', 'error');

// Open a registered modal by its id
ctx.ui.openModal('my-modal-id');

// Close the active modal
ctx.ui.openModal(null);
```

---

### `ctx.settings` — Persistent Plugin Storage

A simple key-value store scoped to your plugin. Survives page reloads.

```javascript
// Save a value
ctx.settings.set('myKey', true);
ctx.settings.set('lastRunAt', new Date().toISOString());

// Read a value (returns undefined if not set)
const enabled = ctx.settings.get('myKey');
```

---

### `ctx.theme` — CSS Variable Overrides

Override any CSS variable in the NoteRoot design token system. Pass an empty object to revert.

```javascript
// Apply a custom color scheme
ctx.theme.setTokens({
  '--bg':      '#1a1a2e',
  '--surface': '#16213e',
  '--accent':  '#0f3460',
  '--fg':      '#e0e0e0',
});

// Revert all overrides
ctx.theme.setTokens({});
```

**Common CSS variables you can override:**

| Variable | Role |
|---|---|
| `--bg` | Main background color |
| `--surface` | Card/panel background |
| `--border` | Border color |
| `--fg` | Primary text color |
| `--muted` | Secondary/muted text |
| `--accent` | Primary accent / brand color |

---

### `ctx.ai` — AI Integration

Call the user's configured LLM provider (using their API key from Settings — no key management needed in your plugin!).

```javascript
// Simple prompt → response (returns full text, not a stream)
const summary = await ctx.ai.chat('Summarize this in 3 bullet points: ' + text);

// With optional note context for RAG
const answer = await ctx.ai.chat('What are my key ideas?', noteId);
```

> **Note:** The AI call uses whatever provider + model the user has configured in Settings → AI Providers. If no provider is configured, this will throw an error — handle it with try/catch.

---

### `ctx.events` — Lifecycle Events

Subscribe to NoteRoot events. Returns an unsubscribe function.

```javascript
// React when the user opens a note
const off = ctx.events.onNoteOpened((noteId) => {
  console.log('Note opened:', noteId);
});

// Call off() to stop listening
```

---

## 🎨 Declarative UI (DescriptorNodes)

Plugin UIs (settings panels, modals, overlays) are described using a **plain JS object tree** — no JSX required. NoteRoot renders these into real React components.

```javascript
// A full example of a settings panel render() output:
{
  type: 'Column',
  children: [
    { type: 'Label', text: 'API Endpoint' },
    { type: 'Input', value: settings.get('url') || '', onChange: (v) => settings.set('url', v), placeholder: 'https://...' },
    { type: 'Divider' },
    { type: 'Label', text: 'Model Quality' },
    { type: 'Select', value: settings.get('model') || 'fast', options: ['fast', 'balanced', 'best'], onChange: (v) => settings.set('model', v) },
    { type: 'Divider' },
    { type: 'Toggle', checked: settings.get('enabled') || false, onChange: (v) => settings.set('enabled', v) },
    { type: 'Button', label: 'Test Connection', onClick: () => { /* ... */ } },
    { type: 'Badge', text: 'v1.2.0' },
    { type: 'Link', text: 'Documentation', url: 'https://example.com' },
  ]
}
```

**All available node types:**

| Type | Props | Notes |
|---|---|---|
| `Column` | `children[]` | Vertical stack |
| `Row` | `children[]` | Horizontal stack |
| `Label` | `text` | Bold label |
| `Text` | `text` | Regular paragraph |
| `Markdown` | `text` | Rendered markdown |
| `Button` | `label`, `onClick`, `disabled?` | Clickable button |
| `Input` | `value`, `onChange`, `placeholder?` | Text input field |
| `Select` | `value`, `options[]`, `onChange` | Dropdown select |
| `RadioGroup` | `value`, `options[]`, `onChange` | Radio button group |
| `Toggle` | `checked`, `onChange` | On/off toggle switch |
| `Divider` | — | Horizontal rule |
| `Badge` | `text` | Colored badge label |
| `Link` | `text`, `url` | External hyperlink |
| `Empty` | — | Empty placeholder |

---

## 💡 Tips & Best Practices

- **Re-register to re-render**: UI is not reactive by default. If you need to update a modal's content, call `runtime.registerExtension` again with the same `id` — NoteRoot will replace the old descriptor.
- **Always handle errors**: Wrap `await ctx.ai.chat()` and `await ctx.notes.*` calls in `try/catch` — provide user feedback with `ui.showToast(..., 'error')`.
- **Use `settings` for state**: Plugin memory is lost on reload unless you persist it with `ctx.settings.set()`.
- **Test in the sandbox**: NoteRoot evaluates your code in a locked-down `Function` scope — `window` and `document` are `undefined`. This is intentional for security.

---

## 🔗 More Examples

- **[summarizer-plugin](../summarizer-plugin/)** — A real-world plugin that uses `ctx.ai.chat()` to summarize selected text and insert results back into the editor.

---

Happy extending NoteRoot! 🎉
