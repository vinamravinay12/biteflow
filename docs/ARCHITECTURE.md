# BiteFlow — Architecture

## 1. Shape of the system

BiteFlow is a React SPA with one small server-side component. Three personas share
a single deployment, separated by route:

```
                         ┌──────────────────────────────┐
   Fan  ── /             │                              │
   Merchant ── /foodkiosk│   React SPA (Vite, TS)       │
   Admin ── /admin       │   Firebase Hosting + CDN     │
                         └───────────┬──────────────────┘
                                     │
              ┌──────────────────────┼───────────────────────┐
              │                      │                       │
     ┌────────▼────────┐   ┌─────────▼─────────┐   ┌─────────▼─────────┐
     │ Firebase Auth   │   │ Cloud Firestore   │   │ Cloud Function    │
     │ anon + email/pw │   │ rules-enforced    │   │ /api/concierge    │
     └─────────────────┘   └───────────────────┘   └─────────┬─────────┘
                                                             │ holds GEMINI_API_KEY
                                                   ┌─────────▼─────────┐
                                                   │   Gemini 2.5      │
                                                   └───────────────────┘
```

The Cloud Function exists for exactly one reason: **the Gemini API key must never
reach the browser.** A pure SPA would have to inline it into the JS bundle. See
[ADR-0002](decisions.md#adr-0002).

## 2. Layers

```
src/
  components/        Portal shells — one per persona, owns state and data loading
  features/customer/ Extracted, presentational feature components + their tests
  utils/             Pure domain logic and the persistence layer
  types/             Shared domain model
functions/           Server-side Gemini proxy (Node 22)
```

**The rule:** business logic lives in `src/utils` as pure functions with no React
and no I/O; components render and hold state. That is what makes the domain
modules 100%-testable without a DOM, and it is why the AI action parser can be
tested as a contract rather than through the UI.

| Module                   | Responsibility                                                                               | Purity      |
| :----------------------- | :------------------------------------------------------------------------------------------- | :---------- |
| `aiActions.ts`           | Parse Gemini control tags, sanitize input, detect prompt injection, offline keyword matching | Pure        |
| `cart.ts`                | Cart totals, counts, multi-kiosk grouping                                                    | Pure        |
| `crypto.ts`              | AES-GCM encrypt/decrypt, SHA-256, timing-safe compare                                        | Pure        |
| `useDocumentLanguage.ts` | Sync `<html lang>`/`dir` with the active locale                                              | Effect only |
| `translations.ts`        | Locale catalogues for all three portals                                                      | Data        |
| `database.ts`            | Persistence — Firestore with a LocalStorage fallback                                         | I/O         |

## 3. The dual-backend persistence layer

`database.ts` mirrors every operation across two backends:

- **Firestore** when configured, and
- **LocalStorage** as a fallback.

Every Firestore call is wrapped in `try/catch` and degrades to LocalStorage. This
is why the app stays fully usable when Firebase is unconfigured, offline, or
denied by rules — an evaluator can clone the repo with no credentials and still
click through the entire product. It is also why `database.ts` is the one module
with partial coverage: its LocalStorage half is exhaustively tested, while the
mirrored Firestore half is thin SDK passthrough. See
[TESTING.md](../TESTING.md#2-coverage).

## 4. Identity model

| Persona          | Authentication                                 | Firestore identity                                     |
| :--------------- | :--------------------------------------------- | :----------------------------------------------------- |
| Fan (guest)      | Anonymous Firebase Auth                        | anonymous uid                                          |
| Fan (registered) | Email/password                                 | Firebase uid — owns `users/{uid}/orders` and `/wallet` |
| Merchant         | Username + AES-encrypted password in Firestore | anonymous uid                                          |
| Admin            | Username + SHA-256 digest from env             | anonymous uid                                          |

**Every** client holds a real Firebase Auth session before touching Firestore, so
the rules can require `request.auth != null` everywhere. The honest limitation:
merchant and admin auth are verified client-side, so their checks gate rendering
rather than data access. [SECURITY.md](../SECURITY.md) states this plainly and
describes what a production fix requires.

## 5. The AI concierge flow

```
user message
  → sanitizePrompt (strip HTML, clamp to 500 chars)
  → detectPromptInjection  ── flagged ─→ canned safe reply, model never called
  → POST /api/concierge  (Cloud Function: rate-limit, re-validate, add key)
  → Gemini
  → parseAiResponse  (strip control tags; drop cart additions whose ids
                      don't resolve to a real menu item; clamp quantities)
  → UI state
```

Two properties matter here. The injection guard runs **client-side and again
server-side**, because the server must never trust the client. And the model's
output is treated as untrusted input: it cannot inject an arbitrary item id,
price, or quantity into the cart, because every addition is resolved against the
real menu before it is applied.

If the proxy or the model is unavailable, the flow falls back to
`getMatchingItems` — local keyword matching, no network call — so ordering never
depends on the model being up.

## 6. Rendering and delivery

- Admin and merchant portals are `React.lazy` code-split; a fan never downloads them.
- A stale-chunk guard reloads once if a lazy chunk 404s after a deploy
  ([ADR-0004](decisions.md#adr-0004)).
- `index.html` is served `no-cache`; hashed assets are `immutable`.
- An app-level `ErrorBoundary` renders a recovery screen instead of a blank page.

## 7. Quality gate

`npm run verify` — format → lint → typecheck → coverage-enforced tests → build.
Runs locally and in CI on every push and PR, alongside CodeQL and gitleaks.
