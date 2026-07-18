# BiteFlow — Security

## 1. Threat model

- **In scope:** the React SPA, Firestore data, Firebase Auth sessions, the AI Concierge path, and the Cloud Function proxy.
- **Out of scope:** Google Cloud / Firebase platform infrastructure.
- **Honest posture:** this is a hackathon demo. Where a control is demo-grade rather than production-grade, it is labelled as such below rather than overclaimed.

## 2. Secrets — no API keys in the client bundle

The Gemini API key is **not shipped to the browser** in a production build. AI requests go through a server-side Cloud Function that holds the key as a Secret Manager secret:

```
Browser ──POST /api/concierge──▶ Cloud Function (functions/index.js)
                                   ├── validates + rate-limits
                                   ├── holds GEMINI_API_KEY (server-side)
                                   └──▶ Gemini API
```

- Function: [`functions/index.js`](functions/index.js) — deployed behind a Firebase Hosting rewrite (`/api/concierge`, see [`firebase.json`](firebase.json)).
- The client only ever receives generated **text**; it never sees the key.
- A `VITE_GEMINI_API_KEY` remains supported **for local development only**; production builds route through the proxy.
- `.env` is git-ignored; `.env.example` documents every variable with empty placeholders.

**Setup:**
```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy --only functions,hosting
```

## 3. Authentication

- **Every** Firestore access requires a real Firebase Auth session. `ensureFirebaseAuth()` ([`src/utils/firebase.ts`](src/utils/firebase.ts)) signs in roles that don't use email/password (platform admin, stall merchants, guest shoppers) **anonymously**; registered customers upgrade to an email/password identity whose uid becomes their data namespace.
- **Admin login stores no plaintext password.** Only a SHA-256 digest lives in the environment (`VITE_ADMIN_PASSWORD_HASH`); the plaintext is absent from source, bundle, UI, and README. Comparison is length-constant (`timingSafeEqual`) to avoid timing leaks. Auth **fails closed** when no digest is configured.
  ```bash
  npm run hash:password "your-strong-password"   # prints the digest for .env
  ```
- Merchant passwords are AES-GCM encrypted at rest ([`src/utils/crypto.ts`](src/utils/crypto.ts)) rather than stored in plaintext. The file documents the caveat that a client-shipped key cannot provide true secrecy.

## 4. Firestore rules

[`firestore.rules`](firestore.rules) replaces the wide-open `allow read, write: if true` default with:

- **No unauthenticated access anywhere** (`request.auth != null` on every path).
- **Shape, type, bound and size validation** on every write (`validUser`, `validStall`, `validMenuItem`, `validOrder`, 64 KB payload cap).
- Only the collection paths the app actually uses are enumerated; **everything else is denied**.
- Wallets require a valid non-negative balance and can never be deleted.

**Cross-customer order enumeration is denied.** A `collectionGroup('orders')` query requires an explicit `/{path=**}/orders/{orderId}` rule. Granting it would let *any* signed-in session — including an anonymous guest — enumerate every customer's orders (names, seat numbers, totals). This was found and closed during testing; the rule is deliberately absent and the omission is documented inline in `firestore.rules`.

*Verified:* an anonymous session issuing that query receives `403 PERMISSION_DENIED`, while the public menu catalogue (`collectionGroup('menu_items')`, no personal data) still reads normally.

*Accepted tradeoff:* the admin console cannot compute a platform-wide order count client-side and falls back to locally-known orders. Restoring it properly needs role-based custom claims from a trusted backend or a server-maintained aggregate.

**A one-time order backfill was removed from app startup.** It ran on every page load for every visitor, performing a full cross-customer scan of the orders collection group and rewriting documents. `placeOrder` already dual-writes each order to the customer's and every involved kiosk's subcollection, so the backfill was unnecessary; historical migrations belong in a one-off admin script.

**Documented limitation:** writes are gated on *authenticated + valid* rather than strict per-uid ownership, because actors legitimately touch data they don't own by uid — the single admin manages every stall, and a merchant issues a wallet **refund** to a customer on decline. Tightening this to true per-role ownership requires a trusted backend minting custom claims (or Cloud Functions performing refunds server-side). This is stated inline in the rules file too.

## 5. AI-specific hardening

| Control | Where |
| :-- | :-- |
| Input sanitization (HTML stripped) | `sanitizePrompt` — [`src/utils/aiActions.ts`](src/utils/aiActions.ts) |
| Length clamping (500 chars) | `sanitizePrompt` |
| Prompt-injection / jailbreak detection | `detectPromptInjection` — 13 patterns, client **and** server |
| Server-side rate limiting | `functions/index.js` — 20 req/min per IP |
| Model-output validation | `parseAiResponse` only honours cart additions whose ids resolve to **real** menu items; quantities are clamped. The model cannot inject arbitrary ids, prices, or quantities. |
| Request size cap | 20 KB in the function |
| Upstream timeout | 15 s `AbortSignal.timeout` |

The injection guard runs before any request reaches the model, and again server-side (never trust the client).

## 6. HTTP hardening

Security headers are served on every response via [`firebase.json`](firebase.json):

- `Content-Security-Policy` — `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, with `connect-src`/`img-src`/`font-src` narrowed to exactly the origins used (Gemini, Firebase, Unsplash images, Google Fonts).
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

## 7. Supply chain & CI

- Lockfile committed; `npm audit` runs in CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).
- **CodeQL** static analysis on every push/PR and weekly ([`.github/workflows/codeql.yml`](.github/workflows/codeql.yml)).
- **Dependabot** weekly npm + GitHub Actions updates ([`.github/dependabot.yml`](.github/dependabot.yml)).
- CI runs with least-privilege `permissions: contents: read`.

## 8. XSS

No `dangerouslySetInnerHTML` anywhere in the codebase. All AI and user content renders as React text nodes; control tags are stripped by `parseAiResponse` before display.

## 9. Rotation notice

The demo credentials published in an earlier commit/post (`biteflow-admin-2026`) are considered **compromised and rotated**. Regenerate with `npm run hash:password` and rotate the Gemini key in Google AI Studio if it was ever exposed client-side.
