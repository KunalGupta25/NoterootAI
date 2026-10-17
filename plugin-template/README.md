---
name: My Plugin
author: Your Name
category: Developer Tools
version: 1.0.0
tags: [template, starter, boilerplate]
description: >
  Boilerplate NoteRoot plugin. Rename the id, flip the FEATURES flags, and build —
  ships with settings panel, theming, AI actions, editor commands, modals, overlays,
  and lifecycle cleanup already wired up.
main: plugin.js
---

# 🧱 NoteRoot Plugin Template

A production-shaped starting point for every NoteRoot plugin. Copy this folder, rename the id, and keep only the sections you need — everything works out of the box.

> Building with an AI agent? The `noteroot-plugin` skill (`.opencode/skills/noteroot-plugin/`) drives the whole workflow. For a fully annotated tour of every extension point, read [`sample-plugin/`](../sample-plugin/).

---

## 🚀 Quick Start

1. **Copy the folder** — `plugin-template/` → `my-plugin/`.
2. **Rename the id in two places, identically:**
   - `plugin.js` → the `@noteroot-plugin` header (`id: my-plugin`)
   - `plugin.js` → `PLUGIN.id`
   - The id is **permanent once installed** — user settings are stored under `pluginSettings[id]` and synced to their account. Renaming later orphans existing settings.
3. **Flip the `FEATURES` flags** for what you ship; delete the sections you don't.
4. **Update this README's frontmatter** (`name`, `description`, `category`, `version`).
5. **Install** — Settings → Plugins → **Upload** `plugin.js` (or a `.zip` containing `plugin.js` + `README.md`), or paste the GitHub repo URL under the GitHub tab.

Verify syntax before shipping: `node --check plugin.js`

---

## 🏗️ What's Inside

| # | Section | Extension point / API | `FEATURES` flag |
|---|---|---|---|
| 1 | Settings panel (draft + save inputs, AI test, secret token) | `settings.panels` | `settings` |
| 2 | CSS-variable theme, applied live and on boot | `ctx.theme.setTokens` | `theme` |
| 3 | Result modal with markdown body | `layout.modals` | `modal` |
| 4 | Note toolbar button (AI summarize / word count) | `note.pageActions` | `noteActions` + `ai` |
| 5 | Bubble-menu button (polish / uppercase selection) | `editor.bubbleButtons` | `bubble` + `ai` |
| 6 | `/insert-greeting` slash command | `editor.slashItems` | `slash` |
| 7 | Status overlay strip | `layout.overlays` | `overlay` |
| 8 | Header tab (demonstrates re-register to re-render) | `header.tabs` | `headerTab` |
| 9 | Note-opened subscription with cleanup | `ctx.events` + `onDispose` | `events` |
| 10 | Background interval with cleanup | `ctx.runtime.onDispose` | `poller` |

**AI actions** (`noteActions`/`bubble` AI paths, settings test button) are gated by `ai`. The template handles the "no provider configured" error for you.

---

## ⚙️ Patterns This Template Encodes

- **Namespaced descriptor ids** — `uid()` prefixes every id with the plugin id; descriptor ids are deduplicated *across all plugins*.
- **Draft + Save for text inputs** — `ctx.settings.set()` triggers a server `PUT` on every call (see `settingsStore.setPluginSetting`), so keystrokes are buffered in a local draft and committed once by a Save button. Toggles/Selects commit directly — they are single discrete actions.
- **Read settings at use-time** — toggles take effect immediately (no restart) as long as actions re-read `get()` when they run.
- **`ui.requestRender()`** after state changes so an open settings panel refreshes its controlled inputs.
- **Dispose everything** — event subscriptions and timers go through `ctx.runtime.onDispose`, which runs on re-run and disable.
- **Errors become toasts** — `ctx.ai` throws without a configured provider; `askAi()` converts that into guidance instead of a silent console error.
- **Text nodes, not HTML** — slash commands insert `{ type: 'text', text }` so user-configured strings are never parsed as HTML.

---

## 📦 Packaging

| Method | What to upload |
|---|---|
| **Upload tab** | `plugin.js` directly, or a `.zip` with `plugin.js` + `README.md` |
| **GitHub tab** | Repo URL — host fetches `README.md` + `plugin.js` from the `main` branch root |
| **Marketplace** | `POST /api/plugins/publish` on the backend service |

The `@noteroot-plugin` header id is authoritative over the README `name` and the filename in every path.

---

## 🚫 Hard Rules

- `window`, `document`, `globalThis` are `undefined` in the sandbox — all DOM needs (popups, toasts, modals) go through `ctx`.
- **No new backend endpoints.** Plugins run entirely in the browser; the API is deployed on Render's 512 MB free plan and must not absorb plugin work.
- Never hardcode API keys — use the `secret: true` Input (values live in the user's synced settings) or the app's provider config.
- `ctx.ui.openUrl` only opens `http(s)` URLs; there is no in-app navigation API — plugin tabs and buttons cannot change routes.

Full API reference: `.opencode/skills/noteroot-plugin/references/api.md`
