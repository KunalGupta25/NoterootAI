/**
 * @noteroot-plugin
 * id: my-plugin
 * name: My Plugin
 * version: 1.0.0
 * description: Boilerplate NoteRoot plugin — rename, flip FEATURES flags, and build.
 *
 * QUICK START
 * -----------
 * 1. Rename `id` above AND `PLUGIN.id` below (keep them identical). The id is
 *    permanent once installed: stored settings are keyed by it under
 *    pluginSettings[id] and synced with the user's account.
 * 2. Flip the FEATURES flags for what you ship, delete the sections you don't.
 * 3. Namespace every descriptor id through uid() — ids are deduplicated across
 *    ALL plugins, a bare id like 'my-button' can silently shadow someone else's.
 * 4. Plugins run 100% client-side in a sandbox (window/document are undefined).
 *    Never add backend endpoints for plugin work: the API runs on Render's
 *    512 MB free plan and must stay idle.
 * 5. Install via Settings → Plugins → Upload (plugin.js, or a zip containing
 *    plugin.js + README.md) or paste the GitHub repository URL.
 */

const PLUGIN = {
  id: 'my-plugin', // keep in sync with the @noteroot-plugin id above
  name: 'My Plugin',
  version: '1.0.0',
};

/** Flip off anything you don't ship, then delete those sections. */
const FEATURES = {
  settings: true,    // Settings → Plugins configuration panel
  theme: true,       // Toggleable CSS-variable theme (applies live)
  noteActions: true, // Button in the note page toolbar
  bubble: true,      // Button in the text-selection bubble menu
  slash: true,       // Commands in the editor's "/" menu
  modal: true,       // Result dialog, opened with ui.openModal
  overlay: false,    // Persistent block appended at the app root
  headerTab: false,  // Tab in the header tab bar
  events: false,     // React to note lifecycle events
  poller: false,     // Background timer (always dispose via onDispose)
  ai: true,          // AI-powered actions (ctx.ai.chat)
};

/** Sample design tokens — override any CSS variable the app ships. */
const THEME = {
  '--bg': '#1a1a2e',
  '--surface': '#16213e',
  '--border': '#0f3460',
  '--fg': '#e0e0e0',
  '--muted': '#a0a4b8',
  '--accent': '#e05438',
};

function main(ctx) {
  const { runtime, notes, ui, settings, theme, ai, events } = ctx;

  // ── Helpers ──────────────────────────────────────────────────────────

  const uid = (key) => `${PLUGIN.id}:${key}`;

  const get = (key, fallback) => {
    const value = settings.get(key);
    return value === undefined || value === null ? fallback : value;
  };

  // Persist + refresh an open settings panel so controlled inputs
  // (Toggle/Select/RadioGroup/Input) show the new value immediately.
  const update = (key, value) => {
    settings.set(key, value);
    ui.requestRender();
  };

  // ctx.ai throws when no provider is configured — turn that into
  // actionable feedback instead of a raw error string.
  const askAi = async (prompt, contextNoteId) => {
    try {
      return await ai.chat(prompt, contextNoteId);
    } catch (err) {
      const message = String((err && err.message) || err);
      ui.showToast(
        message.includes('No AI provider')
          ? 'Set up an AI provider in Settings → AI Providers first.'
          : `AI request failed: ${message}`,
        'error'
      );
      return null;
    }
  };

  const stripHtml = (html) =>
    String(html || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const showResult = (markdown) => {
    settings.set('lastResult', markdown);
    settings.set('lastResultAt', new Date().toLocaleString());
    if (FEATURES.modal) {
      ui.openModal(uid('result-modal'));
    } else {
      ui.showToast(stripHtml(markdown).slice(0, 120));
    }
  };

  // ── 1. Settings panel (Settings → Plugins) ──────────────────────────

  if (FEATURES.settings) {
    // Text fields buffer keystrokes in a draft and commit on Save: every
    // settings.set() fires a server sync PUT, so never call it per keystroke.
    const draft = {
      greeting: String(get('greeting', 'Hello from NoteRoot')),
      token: String(get('apiToken', '')),
    };

    const renderPanel = () => {
      const children = [
        {
          type: 'Text',
          text: `${PLUGIN.name} v${PLUGIN.version}. Settings persist locally and sync with your account.`,
        },
        { type: 'Divider' },
        { type: 'Label', text: 'Greeting used by /insert-greeting' },
        {
          type: 'Input',
          value: draft.greeting,
          placeholder: 'Type a greeting…',
          onChange: (v) => {
            draft.greeting = v;
            ui.requestRender();
          },
        },
        {
          type: 'Row',
          children: [
            {
              type: 'Button',
              label: 'Save greeting',
              onClick: () => {
                update('greeting', draft.greeting);
                ui.showToast('Greeting saved.');
              },
            },
          ],
        },
      ];

      if (FEATURES.theme) {
        children.push(
          { type: 'Divider' },
          { type: 'Label', text: 'Appearance' },
          {
            type: 'Toggle',
            label: 'Apply the custom theme',
            checked: get('themeOn', false),
            onChange: (v) => {
              update('themeOn', v);
              theme.setTokens(v ? THEME : {});
            },
          }
        );
      }

      if (FEATURES.ai) {
        children.push(
          { type: 'Divider' },
          { type: 'Label', text: 'AI' },
          { type: 'Text', text: 'Uses the provider configured in Settings → AI Providers.' },
          {
            type: 'Button',
            label: 'Test connection',
            onClick: async () => {
              const reply = await askAi('Reply with the single word: ok');
              if (reply) ui.showToast(`AI replied: ${reply.trim().slice(0, 60)}`);
            },
          }
        );
      }

      children.push(
        { type: 'Divider' },
        { type: 'Label', text: 'Optional API token (stored in your synced settings)' },
        {
          type: 'Input',
          value: draft.token,
          secret: true,
          placeholder: 'Token…',
          onChange: (v) => {
            draft.token = v;
            ui.requestRender();
          },
        },
        {
          type: 'Button',
          label: 'Save token',
          onClick: () => {
            update('apiToken', draft.token);
            ui.showToast('Token saved.');
          },
        },
        { type: 'Divider' },
        { type: 'Badge', text: `v${PLUGIN.version}` }
      );

      return { type: 'Column', children };
    };

    runtime.registerExtension('settings.panels', {
      id: uid('settings'),
      pluginName: PLUGIN.name,
      render: renderPanel,
    });
  }

  // ── 2. Theme (applies on boot when enabled) ─────────────────────────

  if (FEATURES.theme && get('themeOn', false)) {
    theme.setTokens(THEME);
  }

  // ── 3. Result modal ─────────────────────────────────────────────────

  if (FEATURES.modal) {
    runtime.registerExtension('layout.modals', {
      id: uid('result-modal'),
      title: `${PLUGIN.name} — Result`,
      // render() runs every time the modal opens and reads fresh settings.
      render: () => ({
        type: 'Column',
        children: [
          { type: 'Markdown', text: String(get('lastResult', '_No result yet._')) },
          { type: 'Divider' },
          {
            type: 'Row',
            children: [
              { type: 'Badge', text: String(get('lastResultAt', 'never')) },
              { type: 'Button', label: 'Close', onClick: () => ui.openModal(null) },
            ],
          },
        ],
      }),
    });
  }

  // ── 4. Note page action (toolbar button) ────────────────────────────

  if (FEATURES.noteActions) {
    runtime.registerExtension('note.pageActions', {
      id: uid('summarize'),
      icon: '✨',
      label: 'Summarize',
      onClick: async (noteId) => {
        const note = await notes.getNote(noteId);
        if (!note) {
          ui.showToast('Could not load note.', 'error');
          return;
        }
        const text = stripHtml(note.content);
        if (!text) {
          ui.showToast('This note is empty.', 'error');
          return;
        }

        if (FEATURES.ai) {
          const result = await askAi(
            `Summarize the text in 3 concise bullet points using markdown:\n\n${text.slice(0, 6000)}`,
            noteId
          );
          if (result) showResult(result.trim());
          return;
        }

        const words = text.split(/\s+/).filter(Boolean).length;
        showResult(`**${words} words** in *${note.title}*.`);
      },
    });
  }

  // ── 5. Editor bubble button (selection menu) ────────────────────────

  if (FEATURES.bubble) {
    runtime.registerExtension('editor.bubbleButtons', {
      id: uid('polish'),
      icon: 'AI',
      label: FEATURES.ai ? 'Polish selection' : 'Uppercase selection',
      isActive: () => false,
      onClick: (editor) => {
        const { from, to } = editor.state.selection;
        if (from === to) {
          ui.showToast('Select some text first.', 'error');
          return;
        }
        const selected = editor.state.doc.textBetween(from, to, ' ');

        if (!FEATURES.ai) {
          editor.chain().focus().insertContent(selected.toUpperCase()).run();
          return;
        }

        askAi(
          `Improve the clarity of this text. Keep the same language and roughly the same length. Reply with only the improved text:\n\n${selected}`
        ).then((improved) => {
          if (improved == null) return;
          // Assumes the document did not change while the request was in flight.
          const pos = Math.min(from, editor.state.doc.content.size);
          editor.chain().focus().deleteRange({ from: pos, to: Math.min(to, editor.state.doc.content.size) }).insertContent(improved.trim()).run();
          ui.showToast('Selection polished.');
        });
      },
    });
  }

  // ── 6. Slash command ("/" menu in the editor) ───────────────────────

  if (FEATURES.slash) {
    runtime.registerExtension('editor.slashItems', {
      title: 'Insert greeting',
      description: 'Insert the greeting configured in plugin settings',
      icon: '👋',
      category: 'Plugins',
      command: ({ editor, range }) => {
        const greeting = String(get('greeting', 'Hello from NoteRoot'));
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({ type: 'text', text: greeting }) // text node: never parses the string as HTML
          .run();
      },
    });
  }

  // ── 7. Overlay (persistent block at the app root) ───────────────────
  // No positioning props exist in the DSL — overlays render inline at the
  // app root, which suits status strips, not floating popovers.

  if (FEATURES.overlay) {
    runtime.registerExtension('layout.overlays', {
      id: uid('status'),
      render: () => ({
        type: 'Row',
        children: [
          { type: 'Badge', text: PLUGIN.name },
          { type: 'Text', text: 'Overlay active.' },
          { type: 'Button', label: 'Ping', onClick: () => ui.showToast('Pong!') },
        ],
      }),
    });
  }

  // ── 8. Header tab ───────────────────────────────────────────────────
  // Re-registering the same id replaces the descriptor — that is how you
  // push fresh data into any extension point. Plugins cannot navigate
  // in-app (no window access), so tab clicks are display/notify only.

  if (FEATURES.headerTab) {
    let clicks = 0;
    const registerTab = () => {
      runtime.registerExtension('header.tabs', {
        id: uid('tab'),
        render: () => ({
          type: 'TabBar',
          children: [
            {
              type: 'Tab',
              active: false,
              label: `${PLUGIN.name} · ${clicks}`,
              onClick: () => {
                clicks += 1;
                registerTab();
              },
            },
          ],
        }),
      });
    };
    registerTab();
  }

  // ── 9. Lifecycle events ─────────────────────────────────────────────
  // Always dispose subscriptions so a re-run or disable doesn't leak them.

  if (FEATURES.events) {
    const off = events.onNoteOpened((noteId) => {
      if (get('toastOnOpen', false)) ui.showToast(`Opened ${noteId}`);
    });
    runtime.onDispose(off);
  }

  // ── 10. Background poller ───────────────────────────────────────────

  if (FEATURES.poller) {
    const timer = setInterval(() => {
      // Your background work here — keep it light and client-side.
    }, 60000);
    runtime.onDispose(() => clearInterval(timer));
  }

  console.log(`${PLUGIN.name} v${PLUGIN.version} ready.`);
}
