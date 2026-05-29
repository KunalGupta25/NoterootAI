/**
 * NoteRootAI Sample Plugin v2
 * ============================================================
 * This is the official reference plugin for the NoteRoot Plugin API.
 *
 * STRUCTURE
 * ---------
 * Every plugin must define a `main(ctx)` function. NoteRoot's plugin
 * runtime will call it automatically on load, passing in the full
 * context object (`ctx`) that exposes every safe API.
 *
 * AVAILABLE APIs (all under `ctx`)
 * ---------------------------------
 *   ctx.runtime   – register extensions into UI slots
 *   ctx.notes     – CRUD operations on the user's note vault
 *   ctx.ui        – show toasts, open modals
 *   ctx.settings  – per-plugin persistent key-value store
 *   ctx.theme     – apply CSS variable overrides
 *   ctx.ai        – send a prompt to the user's configured LLM
 *   ctx.events    – subscribe to NoteRoot lifecycle events
 */

function main(ctx) {
  const { runtime, ui, notes, editor, theme, settings } = ctx;

  // ══════════════════════════════════════════════════════════
  // 1. SETTINGS PANEL
  //    Extension Point: 'settings.panels'
  //
  //    Adds a section under Settings → Plugins with your plugin's
  //    name. The `render()` function returns a declarative UI tree
  //    (DescriptorNode) — you don't write React, just plain objects.
  // ══════════════════════════════════════════════════════════
  runtime.registerExtension('settings.panels', {
    id: 'sample-plugin-settings',
    pluginName: 'Sample Plugin v2',
    render: () => ({
      type: 'Column',
      children: [
        {
          type: 'Text',
          text: 'This sample plugin demonstrates all core NoteRoot extension points.'
        },
        { type: 'Divider' },

        // A toggle that persists its state and triggers a side-effect
        { type: 'Label', text: 'Enable Monokai Theme' },
        {
          type: 'Toggle',
          checked: settings.get('useCustomTheme') || false,
          onChange: (enabled) => {
            settings.set('useCustomTheme', enabled);
            if (enabled) {
              // Apply Monokai-inspired CSS variable overrides
              theme.setTokens({
                '--bg':      '#272822',
                '--surface': '#3e3d32',
                '--border':  '#75715e',
                '--fg':      '#f8f8f2',
                '--muted':   '#a59f85',
                '--accent':  '#f92672'
              });
              ui.showToast('Monokai theme applied!');
            } else {
              theme.setTokens({}); // Pass an empty object to revert to base theme
              ui.showToast('Theme reverted.');
            }
          }
        },

        { type: 'Divider' },

        // A link descriptor – opens an external URL
        {
          type: 'Link',
          text: 'View Plugin Documentation on GitHub',
          url: 'https://github.com/your-org/your-plugin'
        }
      ]
    })
  });

  // ── Apply theme on startup if setting was previously enabled ──
  if (settings.get('useCustomTheme')) {
    theme.setTokens({
      '--bg':      '#272822',
      '--surface': '#3e3d32',
      '--border':  '#75715e',
      '--fg':      '#f8f8f2',
      '--muted':   '#a59f85',
      '--accent':  '#f92672'
    });
  }


  // ══════════════════════════════════════════════════════════
  // 2. MODAL DEFINITION
  //    Extension Point: 'layout.modals'
  //
  //    Modals are registered globally and triggered by id via
  //    `ui.openModal('your-modal-id')`.
  //    The `render()` function is called every time the modal opens,
  //    so returning fresh data from `settings` or closures works great.
  // ══════════════════════════════════════════════════════════
  runtime.registerExtension('layout.modals', {
    id: 'word-count-modal',
    title: '📊 Note Statistics',
    render: () => ({
      type: 'Column',
      children: [
        {
          type: 'Text',
          text: `Word count: ${settings.get('lastWordCount') || 0}`
        },
        {
          type: 'Text',
          text: `Analysed at: ${settings.get('lastAnalysedAt') || 'Never'}`
        },
        { type: 'Divider' },
        {
          type: 'Button',
          label: 'Close',
          onClick: () => ui.openModal(null) // Pass null to close the active modal
        }
      ]
    })
  });


  // ══════════════════════════════════════════════════════════
  // 3. NOTE PAGE ACTION
  //    Extension Point: 'note.pageActions'
  //
  //    Adds an icon button to the top-right toolbar of the note editor.
  //    `onClick` receives the ID of the currently open note.
  //    Use `ctx.notes.getNote(noteId)` to fetch its content.
  // ══════════════════════════════════════════════════════════
  runtime.registerExtension('note.pageActions', {
    id: 'word-count-action',
    icon: '📊',
    label: 'Stats',
    onClick: async (noteId) => {
      const note = await notes.getNote(noteId);
      if (!note) {
        ui.showToast('Could not load note.', 'error');
        return;
      }

      // Strip HTML tags to get plain text, then count words
      const plainText = note.content.replace(/<[^>]+>/g, ' ');
      const wordCount = plainText.split(/\s+/).filter(w => w.length > 0).length;

      // Persist result so the modal can read it
      settings.set('lastWordCount', wordCount);
      settings.set('lastAnalysedAt', new Date().toLocaleTimeString());

      // Open the modal we registered above
      ui.openModal('word-count-modal');
    }
  });


  // ══════════════════════════════════════════════════════════
  // 4. EDITOR BUBBLE BUTTON
  //    Extension Point: 'editor.bubbleButtons'
  //
  //    Adds a button to the floating bubble menu that appears when
  //    the user selects text. `onClick` receives the live Tiptap
  //    editor instance so you can chain Tiptap commands.
  // ══════════════════════════════════════════════════════════
  runtime.registerExtension('editor.bubbleButtons', {
    id: 'uppercase-btn',
    icon: 'A↑',
    label: 'Uppercase',
    // `isActive` lets the runtime highlight the button when active
    isActive: () => false,
    onClick: (tiptapEditor) => {
      const { from, to } = tiptapEditor.state.selection;
      if (from === to) {
        ui.showToast('Select some text first!', 'error');
        return;
      }
      const selectedText = tiptapEditor.state.doc.textBetween(from, to, ' ');
      tiptapEditor.chain().focus().insertContent(selectedText.toUpperCase()).run();
      ui.showToast('Text uppercased!');
    }
  });


  // ══════════════════════════════════════════════════════════
  // 5. EDITOR SLASH COMMAND
  //    Extension Point: 'editor.slashItems'
  //
  //    Adds a new command to the `/` menu inside the editor.
  //    `command` receives the editor and the range to replace
  //    (the typed "/" + query text).
  // ══════════════════════════════════════════════════════════
  runtime.registerExtension('editor.slashItems', {
    title: 'Insert Current Time',
    description: 'Inserts the current timestamp in bold',
    icon: '⏰',
    category: 'Plugins', // groups commands in the slash menu UI
    command: ({ editor, range }) => {
      const timeString = new Date().toLocaleTimeString();
      editor
        .chain()
        .focus()
        .deleteRange(range)           // remove the "/" + query text
        .insertContent(`<strong>${timeString}</strong>`)
        .run();
    }
  });


  // ══════════════════════════════════════════════════════════
  // 6. LIFECYCLE EVENT: onNoteOpened
  //    Extension: ctx.events
  //
  //    Subscribe to NoteRoot events to react to user actions.
  //    The returned function can be stored and called later to
  //    unsubscribe (useful in long-running plugins).
  // ══════════════════════════════════════════════════════════
  const unsubscribe = ctx.events.onNoteOpened((noteId) => {
    console.log('[Sample Plugin] Note opened:', noteId);
    // Example: auto-show a toast whenever a note is opened
    // ui.showToast(`Note ${noteId} opened`);
  });

  // Note: NoteRoot will handle cleanup when the plugin is disabled,
  // but you can call `unsubscribe()` manually if needed.
}
