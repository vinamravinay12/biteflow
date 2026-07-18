# Contributing to BiteFlow

## Getting set up

```bash
npm install
cp .env.example .env      # fill in values, or leave blank to run in sandbox mode
npm run dev
```

With no Firebase credentials the app runs entirely against a LocalStorage
sandbox, so you can develop and click through the whole product without a
Firebase project. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#3-the-dual-backend-persistence-layer).

## The quality gate

One command runs everything CI runs:

```bash
npm run verify   # format:check → lint → typecheck → test:coverage → build
```

Please make sure it passes before opening a PR. Individually:

| Command                 | What it checks                                         |
| :---------------------- | :----------------------------------------------------- |
| `npm run format`        | Applies Prettier                                       |
| `npm run lint`          | oxlint — `jsx-a11y` rules are **errors**, not warnings |
| `npm run typecheck`     | `tsc -b --force`, strict mode                          |
| `npm run test`          | Vitest                                                 |
| `npm run test:coverage` | Vitest with enforced thresholds                        |

## Conventions

**Business logic goes in `src/utils` as pure functions.** No React, no I/O. If
logic needs a DOM to test, it is probably in the wrong place. Components render
and hold state; the domain modules hold the rules.

**Tests live next to what they test** (`foo.ts` → `foo.test.ts`). Component tests
query **by role and label**, never by test-id, so they double as accessibility
assertions.

**Accessibility is enforced, not reviewed.** A missing `alt`, an invalid ARIA
role, or an unassociated `<label>` fails the build. New interactive components
should ship with a `vitest-axe` assertion.

**All user-facing strings go through the translation catalogues** in
`src/utils/translations.ts`. A parity test fails the build if a locale is missing
a key. Never hardcode English in a component.

**Never commit secrets.** `.env` is git-ignored; `.env.example` documents the
variable names with blank values. CI runs gitleaks over the full history.

## Coverage expectations

Two tiers, enforced in `vite.config.ts`:

- Pure domain modules (`aiActions`, `cart`, `crypto`, `useDocumentLanguage`) are
  pinned at **100% lines**.
- The project-wide floor reflects the real figure and is raised as coverage
  genuinely improves — please don't lower it, and don't exclude a file to make
  the number look better.

## Commit messages

Describe the behaviour change and the reasoning, not just the files touched. If
you accept a tradeoff, say what it costs. Significant architectural choices
belong in [docs/decisions.md](docs/decisions.md) as an ADR.
