---
name: noteroot-plugin
description: Build, modify, and debug NoteRootAI plugins (single-file plugin.js with a @noteroot-plugin header + README.md YAML frontmatter). Use when asked to create a NoteRoot plugin or add capabilities to one — AI features, themes, slash/bubble editor commands, note toolbar actions, settings panels, modals, overlays, header tabs, or when the user mentions plugin.js, extension points, ctx.ai, DescriptorNode, plugin template, packaging, or publishing.
---

# NoteRoot Plugin Development

A NoteRoot plugin is **one JavaScript file** (`plugin.js`) plus a `README.md` whose YAML frontmatter carries marketplace metadata. The file is evaluated client-side in a locked-down sandbox: `window`, `document`, and `globalThis` are `undefined`, and there is no DOM access. Everything goes through the injected `ctx` object.

Full API reference: [`references/api.md`](references/api.md) — read it before writing any `ctx` call or extension descriptor you have not used before.

## Architecture facts that constrain every plugin

- **Client-only by design.** Plugins run in the browser against the local note cache. The backend deploys on Render's **512 MB free plan** (single gunicorn worker) and the frontend on **Vercel free** — never add server endpoints, background jobs, or memory-heavy work for a plugin. If a plugin needs data outside the browser, it calls external APIs directly from the client via `fetch`.
- **The header is the identity.** The first block comment in `plugin.js` must contain `@noteroot-plugin` with `id:`, `name:`, `version:`, `description:` lines. `parsePluginMeta()` (client/src/plugins/runtime/pluginMeta.ts) treats this id as authoritative over the README `name` and the filename for every install path (upload, zip, GitHub URL). The id keys `pluginSettings[id]` in the user's **server-synced** settings — changing it later orphans stored settings, so pick it once.
- **Execution model** (client/src/plugins/runtime/PluginRuntime.ts): the source is inlined into `new Function('ctx','window','document', '"use strict"; ...')`, then `main(ctx)` is called. Top-level declarations are re-created on every run; extensions are wiped and re-registered on init; `disablePlugin` runs disposers, deletes descriptors, and revokes theme tokens.
- **Descriptor ids are global.** `getExtensions()` dedupes by descriptor `id` across *all* plugins — always namespace with `` `${pluginId}:suffix` ``. Id-less descriptors (slash items) are appended every registration, so register them exactly once per run.
- **Every `ctx.settings.set()` fires a server `PUT`** (`settingsStore.setPluginSetting` → `saveSettings`). Buffer text-input keystrokes in a local draft and commit on Save; commit Toggles/Selects directly (single discrete actions).
- **Settings panels are not reactive by default.** Call `ctx.ui.requestRender()` after state changes so open panels refresh controlled inputs; re-registering a descriptor with the same id pushes fresh data to any extension point.

## Workflow

1. **Copy the boilerplate**: `plugin-template/` → `<your-plugin>/`. It is feature-flagged (`FEATURES`) and encodes all patterns below. `sample-plugin/` is the annotated reference tour.
2. **Rename the id** in the `@noteroot-plugin` header *and* `PLUGIN.id` — identically. Update the README frontmatter (`name`, `author`, `category`, `version`, `tags`, `description`, `main: plugin.js`).
3. **Pick extension points** using the mounted-points table in `references/api.md`. Only use points marked *mounted* — `sidebar.left.items` and `editor.inlineSuggestions` are declared but have no slot component yet, and `theme.tokens` is a stub (use `ctx.theme.setTokens`).
4. **Implement**: register descriptors in `main(ctx)`, gate sections behind `FEATURES` flags, read settings at use-time so toggles apply live.
5. **Wire AI** with `ctx.ai.chat(prompt, contextNoteId?)` — it streams from the user's configured provider; never manage API keys in the plugin. Always catch the "No AI provider configured" error and show a toast.
6. **Dispose** subscriptions/timers via `ctx.runtime.onDispose(fn)`.
7. **Validate** (checklist below), then package.

## Hard rules

- Never touch `window`/`document`/`globalThis`, `localStorage`, or `sessionStorage` — use `ctx` APIs. Popups and DOM needs are host-brokered (`ctx.auth`, `ctx.ui`).
- Never add backend endpoints or heavy client loops for plugin features (free-tier constraints above).
- Namespace every descriptor id via the plugin id.
- Text/HTML: insert user-configured strings as `{ type: 'text', text }` nodes, never as HTML strings. Notes store HTML; strip with a regex before counting/analyzing (`content.replace(/<[^>]+>/g, ' ')`).
- Secrets: only via `secret: true` Input or the app's AI provider settings; never hardcode. Values sync to the user's account — document that.
- `ctx.ui.openUrl` accepts http(s) only, opens a new tab. There is no in-app navigation API — plugin UI cannot change routes.
- Errors: wrap every async `ctx` call; surface with `ctx.ui.showToast(msg, 'error')`. A thrown error inside `main()` is caught by the runtime and shown in Settings → Plugins as a plugin error banner.

## Validation checklist

- [ ] `node --check <plugin>/plugin.js` passes.
- [ ] Header has `@noteroot-plugin` with all four fields; `id` matches `PLUGIN.id` and is unique.
- [ ] README frontmatter parses (`^---\n...\n---`) and `main: plugin.js`.
- [ ] Every descriptor id is namespaced; extension points are all *mounted*.
- [ ] Every subscription/timer has an `onDispose`; no `settings.set` in text-input keystroke handlers.
- [ ] AI paths handle the missing-provider error.
- [ ] Host untouched → no build needed. If you changed `client/src/plugins/**` (adding an extension point, ctx method, or slot component): run `npm --prefix client run lint` and `npm --prefix client run build`.
- [ ] Manual install test: Settings → Plugins → Upload the `plugin.js`, toggle on, exercise each registered UI slot.

## Packaging

| Path | Requirement |
|---|---|
| Upload tab | `plugin.js`, or `.zip` containing `plugin.js` + `README.md` |
| GitHub tab | Public repo, `README.md` + `plugin.js` at the `main` branch root (host fetches raw) |
| Marketplace | `POST /api/plugins/publish` on the backend (`backend/routers/plugins.py`) |

## File map

| Path | Role |
|---|---|
| `plugin-template/` | Boilerplate to copy for every new plugin |
| `sample-plugin/` | Annotated reference for every extension point |
| `client/src/plugins/runtime/PluginRuntime.ts` | Sandbox executor + extension registry + disposers |
| `client/src/plugins/runtime/PluginContext.ts` | The `ctx` API (notes, ui, settings, theme, ai, events, auth) |
| `client/src/plugins/runtime/ExtensionPoints.ts` | Extension point types + `DescriptorNode` UI DSL |
| `client/src/plugins/runtime/DescriptorRenderer.tsx` | Renders DescriptorNodes (see exact node props) |
| `client/src/plugins/runtime/pluginMeta.ts` | `@noteroot-plugin` header parser |
| `client/src/plugins/slots/` | React components mounting each extension point |
| `client/src/stores/pluginStore.ts` | Install/toggle/remove, GitHub URL install, persistence |
| `client/src/pages/PluginsPage.tsx` | Marketplace/Installed/GitHub/Upload UI |
