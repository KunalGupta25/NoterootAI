# Repository Guidelines

## Project Structure & Module Organization

NoteRootAI is a three-service repository. `client/` contains the React, TypeScript, and Vite application; UI code lives in `client/src/components/`, route pages in `pages/`, and state in `stores/`. `server/src/` contains the Express API, organized into `controllers/`, `models/`, `routes/`, `middleware/`, and `utils/`. `ai-service/` is the FastAPI service, with provider integrations in `providers/` and application logic in `services/`. `sample-plugin/` holds a minimal plugin example and `plugin-template/` is the boilerplate for new plugins. Static client assets belong in `client/public/` or `client/src/assets/` as appropriate.

## Build, Test, and Development Commands

- `npm run install:all` installs the root, client, and server Node dependencies.
- `npm run dev` starts client, server, and AI service together (the AI service expects its Windows virtual environment at `ai-service/venv`). Start one service with `npm run dev:client`, `npm run dev:server`, or `npm run dev:ai`.
- `npm --prefix client run build` type-checks and builds the frontend; `npm --prefix client run lint` runs ESLint.
- `npm --prefix server run build` compiles the TypeScript API to `server/dist/`.
- For a standalone AI setup, create and activate a Python virtual environment in `ai-service/`, install `requirements.txt`, then run `uvicorn main:app --reload` from that directory.

There is no configured automated test suite yet; the server's `test` script is a placeholder. Do not treat it as a passing test run.

## Coding Style & Naming Conventions

Follow the surrounding code style: TypeScript/TSX uses two-space indentation, semicolons, and existing React patterns; Python uses four-space indentation. Keep components and pages in PascalCase (for example, `NoteEditor.tsx`), hooks in `useCamelCase`, and service/helper modules in lower camel case or snake case according to their language and neighboring files. Keep code within its service boundary and update configuration examples or documentation when environment variables or API behavior change.

## Testing Guidelines

No test framework or coverage threshold is configured. For frontend changes, run the client lint and build commands above. For backend changes, run the server build. For AI-service changes, verify imports and exercise the affected endpoint or provider locally; add focused automated tests when introducing test infrastructure. Keep test files near the code they cover or in a clearly named `tests/` directory.

## Commit & Pull Request Guidelines

Recent commits generally use Conventional Commit prefixes such as `fix:`, `feat(graph):`, and `chore:`. Use a concise imperative summary and an optional scope. Pull requests should describe the user-visible change, list validation performed, link related issues, and include screenshots for UI changes. Call out new environment variables, data migrations, or deployment changes explicitly.

## Security & Configuration

Keep credentials and local environment files out of Git. Configure database, AI-provider, and service URLs through environment variables; never add real API keys or user data to source, logs, or examples.

## Skills

- **noteroot-plugin** (`.opencode/skills/noteroot-plugin/SKILL.md`) — build, modify, and package NoteRoot plugins. Load it whenever the task involves `plugin.js`, `plugin-template/`, `sample-plugin/`, extension points, `ctx.*`, or the plugin runtime under `client/src/plugins/`.
