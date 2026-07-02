# Repository Guidelines

## Project Structure & Module Organization
This repository is a single Next.js 16 codebase using the App Router. Do not split it into separate SPA and API projects. Keep UI, server code, and future route handlers inside `src/app/` and related in-project modules. Use `public/` for static assets and `specs/` for supporting notes, skills, and design references. Root config files such as `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, and `tsconfig.json` define project behavior and should stay aligned with the app architecture.

## Architecture & Design References
API work must be built inside this project, not in a separate backend repository. Prefer native Next.js server capabilities, with SQLite as the default local database direction for persistence. Use `DESIGN.MD` as the source of truth for design patterns, layout decisions, tokens, and visual consistency. When requirements or implementation choices are unclear, consult `specs/skills/grill-me/SKILL.md` and run the documented `/grilling` session before locking the approach.

## Build, Test, and Development Commands
Use `npm run dev` to start local development at `http://localhost:3000`. Run `npm run build` to create the production bundle and catch integration issues. Use `npm run start` to serve the built app locally. Run `npm run lint` before opening a pull request; it applies the repository ESLint rules for Next.js and TypeScript.

## Coding Style & Naming Conventions
Write application code in TypeScript. Use `PascalCase` for React components, `camelCase` for helpers and functions, and lowercase names for route segment folders. Prefer Tailwind utility classes for styling and keep shared global styling in `src/app/globals.css`. Follow the existing `eslint-config-next` rules, including Core Web Vitals and TypeScript guidance. For new pages and user-facing copy, write text in `pt-BR`, with correct accents, spelling, and natural wording before considering the task complete.

## Testing, Commits & Pull Requests
No dedicated test framework is configured yet, so `npm run lint` and `npm run build` are the minimum required checks for each change. If tests are added later, prefer names like `component.test.tsx` or `utils.test.ts`. Keep commit messages short and imperative, for example `Add inventory table`. Pull requests should include a summary, impacted areas, local validation steps, and screenshots for visible UI changes.
