# BiteFlow — Testing & Quality Assurance

## 1. Current state

```
Test Files  7 passed (7)
     Tests  65 passed (65)
```

Run everything with the single quality gate:

```bash
npm run verify   # lint → typecheck → test:coverage → build
```

## 2. Coverage

Coverage is measured on the domain logic in `src/utils/**` (where the business rules live) and **enforced** — the run fails below the thresholds in [`vite.config.ts`](vite.config.ts).

| Module                                        | Lines  | Branches | Functions |
| :-------------------------------------------- | :----: | :------: | :-------: |
| `aiActions.ts` (AI action parser, safety)     |  100%  |  91.25%  |   100%    |
| `cart.ts` (cart + multi-kiosk math)           |  100%  |  85.71%  |   100%    |
| `crypto.ts` (AES-GCM, admin auth hashing)     |  100%  |  87.5%   |   100%    |
| `useDocumentLanguage.ts` (lang/dir a11y hook) |  100%  |   75%    |   100%    |
| `constants.ts`                                |  100%  |   50%    |   100%    |
| `database.ts` (mostly Firestore I/O)          | 18.82% |  9.31%   |  17.39%   |

`database.ts` is dominated by Firebase I/O wrappers; its **pure** logic (wallet arithmetic, credential verification) is covered by dedicated tests, while the thin CRUD passthroughs are exercised through the app rather than mocked line-by-line.

## 3. What is tested and why

**Unit — AI behaviour** (`src/utils/aiActions.test.ts`)
The Concierge's control-tag protocol is the headline feature, so it is tested as a contract:

- `[ADD_TO_CART]`, `[ITEMS]`, `[SHOW_CHECKOUT]` parsing and stripping (users never see raw protocol).
- **Injection resistance:** additions referencing unknown item ids are dropped — the model cannot inject arbitrary ids.
- Quantity clamping (missing/zero/fractional → sane integers).
- Malformed JSON degrades gracefully instead of throwing.
- `detectPromptInjection` — 10 jailbreak strings flagged, 4 legitimate orders allowed.

**Unit — money** (`src/utils/cart.test.ts`)
Cart totals, item counts, multi-kiosk grouping, and the invariant that **the sum of kiosk subtotals equals the cart total**. Immutability of cart updates.

**Unit — crypto/auth** (`src/utils/crypto.test.ts`)
AES-GCM round-trip, IV randomness (identical plaintexts → distinct ciphertexts), SHA-256 against the **NIST test vector**, `verifyHash` accept/reject, and fail-closed behaviour with no configured digest.

**Unit — persistence** (`src/utils/database.test.ts`)
Wallet load/deduct/refund arithmetic including **overdraft protection**, and stall credential verification — run against an in-memory storage stub with Firebase mocked out.

**Unit — i18n** (`src/utils/translations.test.ts`)
Key parity across all languages, so no locale can silently miss a string.

**Component + accessibility** (`src/components/StallLogin.test.tsx`)
Rendered with React Testing Library and queried **by role/label** so the tests double as accessibility assertions:

- `axe` scan asserts **zero violations**.
- Fields are reachable via their accessible names (proves `<label htmlFor>` wiring).
- Password toggle exposes an accessible name and flips the input type.
- Invalid credentials do not authenticate.

## 4. Automated accessibility testing

`vitest-axe` runs an axe scan against rendered components and fails on any violation. `color-contrast` is disabled in the jsdom run (jsdom has no canvas and cannot compute rendered colour) — contrast is verified in a real browser instead.

Static a11y enforcement also runs at lint time: `jsx-a11y` rules are configured as **errors** in [`.oxlintrc.json`](.oxlintrc.json), so a missing `alt`, an invalid ARIA role, or an unassociated `<label>` fails the build.

## 5. Type safety & linting

- `npm run typecheck` — `tsc --noEmit`, strict mode, zero errors.
- `npm run lint` — oxlint with `react`, `typescript`, and `jsx-a11y` plugins; **zero errors**.

## 6. CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `npm audit`, lint, typecheck, coverage-enforced tests, and a production build on every push and pull request. [`codeql.yml`](.github/workflows/codeql.yml) adds static security analysis.

## 7. Known gaps (stated honestly)

- **No end-to-end (Playwright) suite yet.** The critical order journey is verified manually in-browser. This is the highest-value next addition.
- Component testing currently covers `StallLogin`; the three larger portals are exercised manually. Extending the established RTL + axe pattern to them is the next step.
