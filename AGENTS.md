# Repository Guidelines

## Project Structure & Module Organization

- `src/components/` contains React panels and shared controls; `src/hooks/` connects UI subscriptions.
- `src/editor/` owns PPTX XML, selection, geometry, preview caches, and undo. `src/services/` handles resource loading and browser persistence.
- `src/vendor/` contains bundled renderer modules; `public/` holds the sample PPTX, browser libraries, and license notices.
- `tests/` contains unit tests and fixtures; `scripts/*-checks.mjs` contains browser scenarios.
- `docs/wiki.md` documents features; architecture, development, deployment, and performance guides also live in `docs/`. `dist/` and `artifacts/` are generated and ignored.

## Build, Test, and Development Commands

Use Node.js **22.19.0**, as specified in `.node-version`.

- `npm ci`: install locked dependencies.
- `npm run dev`: start the local Vite development server.
- `npm run build`: generate the production distribution in `dist/`.
- `npm run preview`: inspect the production build locally.
- `npm test`: run Node's built-in test runner against `tests/*.test.js`.
- `npm run test:browser`: run Chrome regression checks after building. Set `CHROME_BIN` if necessary; ports 5179, 4179, and 4189 must be free.

## Coding Style & Naming Conventions

Use JavaScript ES modules, two-space indentation, and semicolons; follow surrounding conventions without reformatting compact legacy code. Name React components and classes in PascalCase, functions and variables in camelCase, and hooks with `use`.

Reuse shared controls and keep domain logic outside components. React owns panel structure; the editor runtime owns preview descendants and designated uncontrolled fields. Preserve that boundary. Document public classes and utilities with JSDoc explaining parameters and behavior. No formatter or lint script is configured; run `git diff --check`.

## Testing Guidelines

Name unit tests `tests/<feature>.test.js`. Add browser scenarios to `scripts/<feature>-checks.mjs` and register them in `scripts/browser-test.mjs`. Cover changed behavior, undo, checked-slide scope, export preservation, and relevant cache/lifecycle regressions. Avoid implementation-only assertions. Record measurement conditions rather than promising timings from one synthetic run.

## Commit & Pull Request Guidelines

Follow history: `type(scope): Korean summary`, for example `perf(editor): 반복 편집과 미리보기의 중복 처리를 최적화`. Use Korean change bullets and a `검증:` section listing checks and outcomes.

Keep commits focused. PRs should explain the problem, resulting behavior, validation, relevant issue links, and screenshots for visible UI changes. Update `docs/wiki.md` when behavior changes.

## Safety & Collaboration

Keep PPTX processing local. Preserve CSP, script-disabled preview frames, input limits, original package parts, and vendor notices. Obtain approval before adding external dependencies. Clarify ambiguous behavior and preserve unrelated working-tree changes.
