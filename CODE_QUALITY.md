# BiteFlow — Code Quality & Architecture

## 1. Quality gate

A single command runs the whole gate; CI runs it on every push and PR:

```bash
npm run verify   # lint → typecheck → test:coverage → build
```

| Check | Command | Status |
| :-- | :-- | :-- |
| Lint (react, typescript, jsx-a11y) | `npm run lint` | 0 errors, 0 warnings |
| Types (strict mode) | `npm run typecheck` | 0 errors |
| Tests (coverage-enforced) | `npm run test:coverage` | 65 passing, 100% lines covered |
| Production build | `npm run build` | passing |

## 2. Architecture — pure logic separated from UI

Business rules were deliberately extracted out of the React components into pure, dependency-free modules so they are testable without a DOM and reusable across portals:

```
src/utils/
  aiActions.ts          AI control-tag parsing, safety (sanitize, injection detection), NLU fallback
  cart.ts               cart totals, counts, multi-kiosk order grouping
  crypto.ts             AES-GCM encrypt/decrypt, SHA-256 hashing, timing-safe compare
  database.ts           persistence layer (Firestore with LocalStorage fallback)
  useDocumentLanguage.ts  lang/dir synchronisation hook
  translations.ts       8-language string catalogue
  constants.ts          single source of truth for ids and admin config
src/components/         React views (customer, merchant, admin portals) + ErrorBoundary
functions/              server-side Gemini proxy (keeps the API key off the client)
```

Every function in `aiActions.ts` and `cart.ts` is **deterministic**: same input → same output, no I/O. That is what makes 100% line coverage on them achievable and meaningful.

## 3. Type safety

- TypeScript `strict` mode; `npm run typecheck` is part of the gate.
- Domain models (`Stall`, `MenuItem`, `Order`, `KioskOrderEntry`, `CartItem`, `UserWallet`) are centralised in [`src/types/index.ts`](src/types/index.ts) and shared across all three portals.
- `StallSession` is a derived type (`Omit<Stall, 'ownerPasswordEnc'>`) so a merchant session **cannot structurally carry the encrypted password** — the type system enforces the security boundary.
- Exported utilities declare explicit return types.

## 4. Defensive coding

- The AI response parser never trusts model output: unknown item ids are dropped, quantities clamped, malformed JSON caught and degraded rather than thrown.
- Every `await` on Firestore is wrapped in `try/catch` with a LocalStorage fallback, so the app remains usable offline or unconfigured.
- Auth **fails closed** when no credential digest is configured.
- An app-level [`ErrorBoundary`](src/components/ErrorBoundary.tsx) prevents a single component failure from blanking the page.

## 5. Comments explain *why*

Comments document rationale and constraints, not mechanics — e.g. `crypto.ts` states plainly that a client-shipped key cannot provide real secrecy; `firestore.rules` explains why writes are gated on *authenticated + valid* rather than per-uid ownership. Known limitations are written down rather than hidden.

## 6. Consistency

- Naming: `handle*` for event handlers, `use*` for hooks, `compute*`/`build*` for pure helpers.
- All user-facing strings flow through the translation catalogue; a parity test fails the build if a locale drifts.
- Firestore paths are built through named helpers (`stallDocRef`, `userOrdersRef`, …) rather than string literals scattered across the file.

## 7. Known gaps (stated honestly)

- **`CustomerPortal.tsx` is ~2,700 lines** and should be decomposed into feature components (cart drawer, seat map, chat panel, order history). This is the single biggest maintainability debt in the repo.
- Styling is inline `style={{}}` objects rather than a design-token system, which makes visual consistency manual.
- No Prettier/Husky pre-commit formatting hook yet.
