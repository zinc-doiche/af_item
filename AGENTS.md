# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js TypeScript app for the AF item admin interface. App routes and API handlers live in `app/`, including `app/api/*/route.ts`. UI components are grouped under `components/item-admin/`. Shared and environment-specific logic is split across `lib/client/`, `lib/server/`, and `lib/shared/`; keep browser-only code out of `lib/server/`. Static assets are in `public/`, with app data assets under `public/data-assets/`. Runtime configuration is in `config/af-item-admin.config.json`. Tests live in `tests/` and use the `*.test.ts` suffix.

## Build, Test, and Development Commands

- `npm run dev`: start the local Next.js development server.
- `npm run build`: create a production build with Next.js.
- `npm run start`: run the built production app.
- `npm run lint`: run ESLint against the repository.
- `npm run typecheck`: run TypeScript with `tsc --noEmit`.
- `npm test`: run the Vitest suite once.
- `npm run test:watch`: run Vitest in watch mode.

Run `npm install` after dependency changes to keep `package-lock.json` current.

## Coding Style & Naming Conventions

Use TypeScript with strict types and ES modules. Prefer the `@/` path alias for repository imports, as configured in `tsconfig.json` and `vitest.config.ts`. Follow the existing two-space indentation and double-quote style. Name React components and exported types with `PascalCase`; name functions, variables, and files with `camelCase` or existing kebab-case file patterns such as `code-editor.tsx`. Keep server utilities in `lib/server/` and client utilities in `lib/client/`.

## Testing Guidelines

Vitest is configured for Node tests with globals enabled and includes `tests/**/*.test.ts`. Add focused tests near the behavior being changed, using descriptive `describe` and `it` names. Tests may create temporary directories such as `.test-tmp-*`; clean them up in setup hooks. Before submitting, run `npm test`, `npm run typecheck`, and `npm run lint`.

## Commit & Pull Request Guidelines

The current Git history is minimal (`init`), so use concise, imperative commit messages such as `add item parsing tests` or `fix static asset lookup`. Pull requests should include a short summary, the commands run for verification, linked issues when applicable, and screenshots for visible UI changes. Call out configuration or data-path changes, especially anything involving `config/` or `public/data-assets/`.

## Security & Configuration Tips

Do not commit local secrets or environment-specific paths. Use `.env.example` as the public template for environment variables, and document any new required setting there. Validate file-system inputs in API routes and keep project path handling centralized in `lib/server/project-config.ts`.
