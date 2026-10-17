# NoteRoot Plugin API Reference

Source of truth: `client/src/plugins/runtime/PluginContext.ts`, `ExtensionPoints.ts`, `DescriptorRenderer.tsx`, and the slot components in `client/src/plugins/slots/`. Verify against those files if behavior ever seems off.

---

## 1. `ctx` — the restricted context

Injected into `main(ctx)`. The returned object is a read-only Proxy that reports `undefined` for `window`, `document`, `globalThis`.

### `ctx.runtime`

| Method | Signature | Notes |
|---|---|---|
| `registerExtension` | `(point: ExtensionPoint, descriptor: object) => void` | Registers into the named slot. Re-registering with the same `descriptor.id` **replaces** it (this is the update mechanism). Descriptors without `id` are appended — register once per run. |
| `onDispose` | `(fn: () => void) => void` | Cleanup runs when the plugin is re-run or disabled (timers, subscriptions). Wrapped in try/catch by the host. |

### `ctx.notes` — all async, all Promises

| Method | Signature | Notes |
|---|---|---|
| `createNote` | `(title, markdown, space?, tags?) => Promise<string>` | Returns new note id. Markdown is converted to HTML via `marked`. Default space `'Other'`. |
| `updateNote` | `(id, updates) => Promise<string>` | Throws if the note doesn't exist. Shallow-merges over the existing note. |
| `getNote` | `(id) => Promise<Note \| undefined>` | Full note: `_id`, `title`, `content` (**HTML**), `tags`, `parentId`, `space`, `icon`, `properties`, `createdAt`, `updatedAt`. |
| `appendContent` | `(id, markdown) => Promise<void>` | Converts markdown → HTML, appends to existing content. |
| `replaceContent` | `(id, markdown) => Promise<void>` | Replaces content entirely. |
| `listAllNotes` | `() => Promise<Array>` | Metadata only (`id`, `title`, `space`, `tags`, `parentId`, `createdAt`, `updatedAt`). |
| `listSpaces` | `() => Promise<string[]>` | Always includes `'Other'`, sorted. |
| `moveNoteToSpace` | `(id, space) => Promise<void>` | |
| `deleteNote` | `(id) => Promise<boolean>` | |
| `importNote` | `(note) => Promise<string>` | Verbatim restore: accepts `_id`-style `id`, HTML `content`, `parentId`, `icon`, `properties`, `createdAt`/`updatedAt`. Creates the note if the id is unknown, overwrites if known, **preserves timestamps** (`saveNote(..., { preserveTimestamps: true })`). Use for sync/restore plugins. |

### `ctx.ui`

| Method | Signature | Notes |
|---|---|---|
| `showToast` | `(message, type?: 'success' \| 'error') => void` | Dispatches the host toast. Use `'error'` for failures. |
| `openModal` | `(modalId: string \| null) => void` | Opens a modal registered at `layout.modals`; `null` closes. |
| `openUrl` | `(url: string) => void` | http(s) only (regex-guarded), opens `noopener,noreferrer` new tab. Silent no-op otherwise. |
| `requestRender` | `() => void` | Re-renders open plugin settings panels. Call after state changes so controlled inputs reflect new values. |

### `ctx.settings` — per-plugin KV

| Method | Signature | Notes |
|---|---|---|
| `get` | `(key) => any` | `undefined` when unset. Scoped to the installed plugin id. |
| `set` | `(key, value) => void` | **Triggers a server `PUT` of all settings on every call** — never call per keystroke; buffer text inputs in a local draft and commit on Save. Values sync to the user's account (and are readable via `pluginSettings[id]`), so they are not a secret vault. |

### `ctx.theme`

| Method | Signature | Notes |
|---|---|---|
| `setTokens` | `(tokens: Record<string, string>) => void` | Merges CSS variables onto `:root` for this plugin (`{}` reverts). Multi-plugin merge handled by `ThemeEngine`; tokens are revoked on disable. Common vars: `--bg`, `--surface`, `--border`, `--fg`, `--muted`, `--accent`. |

### `ctx.ai`

| Method | Signature | Notes |
|---|---|---|
| `chat` | `(prompt: string, contextNoteId?: string) => Promise<string>` | Posts to `AI_URL/chat` with the user's active provider/key from settings (plugin never sees the key). `contextNoteId` enables RAG over that note. Returns the **full concatenated text** (not a stream). Throws `'No AI provider configured in settings.'` when unconfigured, `'AI generation failed'` on non-2xx — always catch and toast. |

### `ctx.auth` — host-brokered OAuth (popups need `window`)

| Method | Signature | Notes |
|---|---|---|
| `preloadGoogle` | `() => Promise<void>` | Loads Google Identity Services early so a later popup isn't blocked. Failure is silent until real sign-in. |
| `requestGoogleToken` | `(opts: { clientId, scopes, prompt?, hint?, timeoutMs? }) => Promise<{ accessToken, expiresIn, scope }>` | Short-lived access token (no refresh token). `clientId` required. Scopes must all be from the allow-list: `https://www.googleapis.com/auth/drive.file`, `.../userinfo.email`, `.../userinfo.profile` — anything else throws. `prompt`: `'' \| 'none' \| 'consent' \| 'select_account'` (`'none'` silently renews). Default timeout 120 s. **Never store the token via `settings.set`** — keep it in a closure variable (memory-only). |

### `ctx.user` / `ctx.events`

| Method | Signature | Notes |
|---|---|---|
| `user.getCurrentUser` | `() => { id, email, name } \| null` | |
| `events.onNoteOpened` | `(cb: (noteId) => void) => () => void` | Subscribes to the host's `NOTEROOT_NOTE_OPENED` event; returns unsubscribe — pass it to `runtime.onDispose`. The only lifecycle event today. |

---

## 2. Extension points

Mount status matters — unmounted points silently render nothing.

| Point | Descriptor shape | Mounted in | Status |
|---|---|---|---|
| `note.pageActions` | `{ id, icon, label, onClick(noteId) }` | `slots/NotePageActionsBar.tsx` | ✅ |
| `editor.bubbleButtons` | `{ id, icon, label, isActive?(editor), onClick(editor) }` — `editor` is the live Tiptap instance | `slots/PluginBubbleButtons.tsx` | ✅ |
| `editor.slashItems` | `{ title, description, icon, category, command({ editor, range }) }` — **no `id`**; `range` is the typed `/query` to delete | `NoteEditor.tsx` via `PluginRuntime.getSlashItems` | ✅ |
| `settings.panels` | `{ id, pluginName, render(): DescriptorNode }` | `slots/PluginSettingsPanels.tsx` (Settings page) | ✅ |
| `layout.modals` | `{ id, title, render(): DescriptorNode }` | `slots/PluginOverlays.tsx` (App root) | ✅ — open with `ui.openModal(id)` |
| `layout.overlays` | `{ id, render(): DescriptorNode }` | `slots/PluginOverlays.tsx` | ✅ — renders inline at app root; DSL has **no positioning props**, so it suits status strips, not floating popovers |
| `header.tabs` | `{ id, render(): DescriptorNode }` returning `TabBar`/`Tab` tree | `slots/PluginTabBar.tsx` (AppShell) | ✅ — clicks cannot navigate in-app (no `window`), so tabs are display/notify only |
| `theme.tokens` | `{ [cssVar]: value }` | none | ⚠️ declared but unused — call `ctx.theme.setTokens()` instead |
| `sidebar.left.items` | — | none | ❌ declared, no slot component yet |
| `editor.inlineSuggestions` | — | none | ❌ declared, no slot component yet |

Notes:

- Multiple descriptors per point per plugin are supported; `getExtensions` dedupes by `id` across plugins (first registration wins — hence namespacing).
- Tiptap `editor` in bubble/slash handlers: read `editor.state.selection`, chain commands with `editor.chain().focus().…​.run()`. Insert untrusted/user-configured strings as `{ type: 'text', text }`, never HTML strings.
- Slash commands run `command` synchronously from the menu; async work inside is fine, but the `range` delete must happen in the chain.

---

## 3. `DescriptorNode` — declarative UI DSL

No JSX, no styles: plain objects rendered by `DescriptorRenderer.tsx` using app CSS variables. Rebuild trees on every `render()` call — closures over `settings.get()` give fresh data.

| Type | Props | Behavior |
|---|---|---|
| `Column` | `children[]` | Vertical stack, full width, 10 px gap |
| `Row` | `children[]` | Horizontal wrap, centered, 8 px gap |
| `Label` | `text` | Bold 13.5 px field label |
| `Text` | `text` | Muted 12.5 px paragraph |
| `Markdown` | `text` | Rendered via `react-markdown` (headings, code, links `target=_blank`, lists) |
| `Button` | `label`, `onClick()`, `disabled?` | Surface button with hover state |
| `Input` | `value`, `onChange(v)`, `placeholder?`, `secret?` | Controlled text input; `secret: true` → `type="password"`, no autocomplete/spellcheck |
| `Select` | `value`, `options: string[]`, `onChange(v)` | Full-width dropdown; options are display=value |
| `RadioGroup` | `value`, `options: string[]`, `onChange(v)` | Horizontal radios |
| `Toggle` | `checked`, `onChange(v)`, `label?` | Checkbox + label (label defaults to `'Toggle'`) |
| `Divider` | — | 1 px hairline |
| `Badge` | `text` | Accent-colored chip |
| `Link` | `text`, `url` | External anchor (`target=_blank`) |
| `TabBar` | `children[]` | Header tab strip container |
| `Tab` | `active`, `label`, `onClick()`, `onClose?` | Single tab; `onClose` renders the × |
| `Empty` | — | Renders nothing |

**Reactivity model:** `render()` is invoked when the host re-renders the slot — on extension changes, `ui.requestRender()`, or `ui.showToast()` (both dispatch events the settings panel listens to). Control handlers should therefore: mutate `settings` or local state → `ui.requestRender()`.

---

## 4. Lifecycle

1. **Install** → code stored in localforage (`installed_plugins`); GitHub URL installs also record into server-synced `installedCommunityPlugins`.
2. **Boot** → `initPlugins()` (dedupe/repair/migrate) → `PluginRuntime.init()` runs `main(ctx)` for each enabled plugin; builtins register after.
3. **Re-run / toggle** → disposers run, extensions cleared, theme tokens revoked, then re-registered; UI toggles trigger a full page reload to keep every slot in sync.
4. **Disable** → `disablePlugin(id)`: disposers → descriptor removal → token revocation.
5. **Errors** → caught per plugin into `PluginRuntime.pluginErrors`, surfaced as banners in Settings → Plugins.

## 5. Deployment constraints (why plugins must stay client-side)

- **Backend:** Render free plan — Docker, **1 gunicorn worker**, `/dev/shm` tmp dir, 512 MB ceiling, sleeps when idle (`render.yaml`, `backend/Dockerfile`). Server work = auth, persistence, Neo4j indexing, provider streaming only.
- **Frontend:** Vercel free — SPA rewrites only (`client/vercel.json`).
- Consequence: plugin compute runs in the user's browser; plugin features must not require server changes, server memory, or long-lived connections. Heavy work belongs behind the existing AI service (`ctx.ai`) or external APIs called from the client.
