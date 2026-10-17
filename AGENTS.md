# Repository Guidelines

## Project Structure & Module Organization

NoteRootAI is a two-service repository. `client/` contains the React, TypeScript, and Vite application; UI code lives in `client/src/components/`, route pages in `pages/`, and state in `stores/`. `backend/` is the unified FastAPI service (auth, notes, graph, plugins marketplace, and AI endpoints) organized into `routers/`, `services/`, `providers/`, `schemas/`, and `core/`. `sample-plugin/` holds a minimal plugin example and `plugin-template/` is the boilerplate for new plugins. Static client assets belong in `client/public/` or `client/src/assets/` as appropriate.

## Build, Test, and Development Commands

- `npm run install:all` installs the root and client Node dependencies.
- `npm run dev` starts the client and backend together (the backend expects its virtual environment at `backend/.venv`; create it with `npm run setup:backend`). Start one service with `npm run dev:client` or `npm run dev:backend`.
- `npm --prefix client run build` type-checks and builds the frontend; `npm --prefix client run lint` runs ESLint.
- For the backend, activate `backend/.venv`, install `requirements.txt` (or `requirements-dev.txt` for tests), then run `uvicorn main:app --reload` from `backend/`. Run tests with `pytest -q` from `backend/`.

Client tests run with `npm --prefix client run test` (vitest); backend tests run with `pytest -q` from `backend/`. Keep test files near the code they cover.

## Coding Style & Naming Conventions

Follow the surrounding code style: TypeScript/TSX uses two-space indentation, semicolons, and existing React patterns; Python uses four-space indentation. Keep components and pages in PascalCase (for example, `NoteEditor.tsx`), hooks in `useCamelCase`, and service/helper modules in lower camel case or snake case according to their language and neighboring files. Keep code within its service boundary and update configuration examples or documentation when environment variables or API behavior change.

## Testing Guidelines

For frontend changes, run the client lint, test, and build commands above. For backend changes, run `pytest -q` from `backend/` and the import check from the CI workflow. Keep test files near the code they cover or in a clearly named `tests/` directory.

## Commit & Pull Request Guidelines

Recent commits generally use Conventional Commit prefixes such as `fix:`, `feat(graph):`, and `chore:`. Use a concise imperative summary and an optional scope. Pull requests should describe the user-visible change, list validation performed, link related issues, and include screenshots for UI changes. Call out new environment variables, data migrations, or deployment changes explicitly.

## Security & Configuration

Keep credentials and local environment files out of Git. Configure database, AI-provider, and service URLs through environment variables; never add real API keys or user data to source, logs, or examples.

## Skills

- **noteroot-plugin** (`skills/noteroot-plugin/SKILL.md`) — build, modify, and package NoteRoot plugins. Load it whenever the task involves `plugin.js`, `plugin-template/`, `sample-plugin/`, extension points, `ctx.*`, or the plugin runtime under `client/src/plugins/`.

The skill follows the open agent-skills format, so any agent can install it:

```sh
npx skills add KunalGupta25/NoterootAI --skill noteroot-plugin        # project-level
npx skills add KunalGupta25/NoterootAI --skill noteroot-plugin -g     # global
```
