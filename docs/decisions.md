# Architecture Decision Records

Short records of the decisions that shaped BiteFlow, including the tradeoffs
accepted. Each states what was chosen, why, and what it costs.

---

## ADR-0001 — Firestore with a LocalStorage fallback

**Status:** Accepted

**Context.** The app must be demonstrable by anyone who clones the repo, including
an evaluator with no Firebase project and no credentials.

**Decision.** Every persistence operation in `database.ts` targets Firestore when
it is configured and falls back to LocalStorage otherwise. Each Firestore call is
individually wrapped, so the fallback triggers per-operation, not just at startup.

**Consequences.** The product is fully clickable with zero configuration, and a
rules denial or network failure degrades instead of breaking. The cost is that
every operation is written twice, which roughly doubles the size of the
persistence layer and leaves the mirrored Firestore branch untested by unit tests.

---

## ADR-0002 — Move the Gemini call to a Cloud Function

**Status:** Accepted · supersedes the original client-side call

**Context.** Vite inlines `VITE_*` variables at build time. The Gemini API key was
therefore embedded in the deployed JS bundle, where anyone could extract it — and
it was, for a period, publicly downloadable.

**Decision.** Route AI requests through a Cloud Function (`/api/concierge`) that
holds the key as a Secret Manager secret. `.env.production` blanks the client key
so production builds cannot inline it. The function also rate-limits per IP,
caps payload size, and re-runs prompt-injection detection.

**Consequences.** The key no longer reaches the browser — verified: 0 occurrences
in the served bundle. The costs are a Blaze-plan dependency, one extra network
hop, and a second place where request validation lives.

---

## ADR-0003 — Deny cross-customer order enumeration

**Status:** Accepted

**Context.** Firestore requires an explicit `/{path=**}/` rule to authorize a
`collectionGroup()` query. Adding one for `orders` made the admin's platform-wide
statistics work — and also let _any_ signed-in session, including an anonymous
guest, enumerate every customer's orders. This was confirmed with a single
`curl`, which returned another customer's real name.

**Decision.** Omit the collection-group rule for `orders`. Keep it for
`menu_items`, which is a public catalogue with no personal data.

**Consequences.** Cross-customer enumeration returns `403`. The admin console
cannot compute a platform-wide order count client-side and falls back to
locally-known orders; that path logs at `info`, not `error`, because it is
expected. A correct fix needs role-based custom claims from a trusted backend.

**Principle applied:** a slightly degraded admin statistic is cheaper than a
demonstrable privacy leak.

---

## ADR-0004 — Route-level code splitting, with a stale-chunk guard

**Status:** Accepted

**Context.** The admin and merchant portals are ~78 kB of code that a fan — the
overwhelming majority of traffic — never opens.

**Decision.** Lazy-load them with `React.lazy` + `Suspense`.

**Consequences.** Smaller initial bundle for the common path. But splitting
introduced a failure mode: a browser holding a cached `index.html` requests chunk
filenames that no longer exist after a deploy, and the route dies. Mitigated two
ways — `index.html` is served `no-cache` while hashed assets stay `immutable`, and
`lazyWithReload` performs one guarded reload if a chunk fails to fetch.

---

## ADR-0005 — Report honest coverage instead of excluding a file

**Status:** Accepted

**Context.** `database.ts` had ~19% coverage. Excluding it from the report raised
the headline number to ~99% without testing a single additional line.

**Decision.** Keep it in the report. Instead of hiding the gap, cover it: the
entire LocalStorage-sandbox surface is now tested. Thresholds are two-tier — pure
domain modules pinned at 100% lines, plus a project-wide floor set to the real
figure.

**Consequences.** The headline number is lower than an exclusion would produce but
describes the project accurately, and the enforced floor makes the gain
non-regressable.

---

## ADR-0006 — Client-side inline styles

**Status:** Accepted, with known cost

**Context.** Components style elements with inline `style={{}}` objects rather
than CSS classes or a utility framework.

**Decision.** Retained — changing it now would touch every component's rendering
in a codebase that is deployed and working.

**Consequences.** This is the largest maintainability debt in the repo. It
inflates component line counts (adopting Prettier expanded these objects across
multiple lines), prevents style reuse, and makes visual consistency manual.
Migrating to CSS classes is the highest-value structural refactor remaining.
