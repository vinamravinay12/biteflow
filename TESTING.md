# BiteFlow — Testing & Quality Assurance

## 1. Current state

```
Test Files  9 passed (9)
     Tests  119 passed (119)
```

Run everything with the single quality gate:

```bash
npm run verify   # format → lint → typecheck → test:coverage → build
```

## 2. Coverage

Coverage is measured on the domain logic in `src/utils/**` (where the business rules live) and **enforced** — the run fails below the thresholds in [`vite.config.ts`](vite.config.ts).

| Module                                        |   Lines    |  Branches  | Functions  |
| :-------------------------------------------- | :--------: | :--------: | :--------: |
| `aiActions.ts` (AI action parser, safety)     |    100%    |   98.75%   |    100%    |
| `cart.ts` (cart + multi-kiosk math)           |    100%    |   85.71%   |    100%    |
| `crypto.ts` (AES-GCM, admin auth hashing)     |    100%    |   87.5%    |    100%    |
| `useDocumentLanguage.ts` (lang/dir a11y hook) |    100%    |    75%     |    100%    |
| `constants.ts`                                |    100%    |    50%     |    100%    |
| `database.ts` (persistence layer)             |   55.34%   |   57.05%   |   75.36%   |
| **Project-wide**                              | **67.72%** | **71.81%** | **84.25%** |

`database.ts` mirrors every operation across two backends. Its **entire
LocalStorage-sandbox surface is tested** — stall/menu/order/match CRUD, wallet
arithmetic with overdraft protection, per-kiosk order status updates, and session
helpers. The uncovered remainder is the mirrored Firestore branch: thin
`setDoc`/`getDocs` passthroughs exercised through the running app rather than
mocked line-by-line.

The file is deliberately **included** in the report. Excluding it would raise the
headline number to ~99% without testing a single additional line, which would
misrepresent the project.

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
The full LocalStorage-sandbox surface, run against an in-memory storage stub with Firebase mocked out:

- Wallet load/deduct/refund arithmetic including **overdraft protection**.
- Stall CRUD, and that **deleting a stall cascades to its menu items**.
- Credential verification: case-insensitive usernames, password rotation invalidating the old password, unknown users rejected.
- Menu item CRUD, including the failure result when updating a non-existent item.
- Orders: newest-first ordering, platform-wide and per-kiosk queries, and **updating one kiosk's status without disturbing the others** in a multi-kiosk order.
- Match CRUD and session helpers — including that the stored merchant session **omits the encrypted password**.

**Unit — i18n** (`src/utils/translations.test.ts`)
Key parity across all languages, so no locale can silently miss a string.

**Component + accessibility** (`StallLogin`, `SeatMapModal`, `CartDrawer`)
Rendered with React Testing Library and queried **by role/label** so the tests double as accessibility assertions. Every suite runs an `axe` scan asserting **zero violations**.

- **StallLogin** — fields reachable by accessible name (proves `<label htmlFor>` wiring), password toggle flips the input type, invalid credentials do not authenticate.
- **SeatMapModal** — dialog semantics, the four stands exposed as `radio`s with correct `aria-checked`, **Enter and Space activate an SVG wedge** (a plain `<path onClick>` would be mouse-only), seat `aria-pressed` state, and Spanish/Arabic rendering.
- **CartDrawer** — wallet balance and top-up, empty-cart state, quantity/removal callbacks, and the **insufficient-funds checkout guard** (disabled below balance, enabled above).

## 4. Automated accessibility testing

`vitest-axe` runs an axe scan against rendered components and fails on any violation. `color-contrast` is disabled in the jsdom run (jsdom has no canvas and cannot compute rendered colour) — contrast is verified in a real browser instead.

Static a11y enforcement also runs at lint time: `jsx-a11y` rules are configured as **errors** in [`.oxlintrc.json`](.oxlintrc.json), so a missing `alt`, an invalid ARIA role, or an unassociated `<label>` fails the build.

## 5. Type safety & linting

- `npm run typecheck` — `tsc -b --force`, strict mode, zero errors. (It builds the referenced projects; a plain `tsc --noEmit` against this repo's solution-style root config checks nothing and passes vacuously.)
- `npm run lint` — oxlint with `react`, `typescript`, and `jsx-a11y` plugins; **zero errors**.
- `npm run format:check` — Prettier, enforced in `verify` and CI.

## 6. CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `npm audit`, lint, typecheck, coverage-enforced tests, and a production build on every push and pull request. [`codeql.yml`](.github/workflows/codeql.yml) adds static security analysis.

## 7. Known gaps (stated honestly)

- **No end-to-end (Playwright) suite yet.** The critical order journey — sign in, add to cart, pick a seat on the stadium map, top up the wallet, and check out — is verified manually in a real browser. This is the highest-value next addition, and would also let colour contrast be machine-verified (jsdom cannot compute rendered colour, so the axe unit runs disable that rule).
- Component + axe testing covers `StallLogin`, `SeatMapModal`, and `CartDrawer`. The three large portal shells (`CustomerPortal`, `StallDashboard`, `SuperAdminPortal`) are still exercised manually; extending the established RTL + axe pattern to them as they are decomposed is the next step.
- `database.ts`'s Firestore branch is untested (see §2). Covering it would require mocking the Firestore SDK.
