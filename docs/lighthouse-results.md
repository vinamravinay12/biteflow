# BiteFlow — Lighthouse Results

Measured against the **live deployment** (`https://biteflow-6b1f9.web.app`), not a
local dev server, so the numbers include real network latency, the production
bundle, and the CDN cache headers.

- **Tool:** Lighthouse 12.8.2 (headless Chrome)
- **Date:** 2026-07-18
- **Reproduce:**
  ```bash
  npx lighthouse https://biteflow-6b1f9.web.app --preset=desktop --view   # desktop
  npx lighthouse https://biteflow-6b1f9.web.app --view                    # mobile
  ```

## Scores

| Category       | Desktop | Mobile  |
| :------------- | :-----: | :-----: |
| Performance    | **95**  | **91**  |
| Accessibility  | **100** | **100** |
| Best Practices | **100** |   93    |
| SEO            | **100** | **100** |

## Core Web Vitals

| Metric                   | Desktop  |  Mobile  |
| :----------------------- | :------: | :------: |
| First Contentful Paint   |  1.1 s   |  2.4 s   |
| Largest Contentful Paint |  1.1 s   |  3.2 s   |
| Total Blocking Time      | **0 ms** | **0 ms** |
| Cumulative Layout Shift  |  **0**   |  **0**   |
| Speed Index              |  1.3 s   |  2.4 s   |

Total Blocking Time of 0 ms and CLS of exactly 0 on both profiles are the results
worth highlighting: the main thread is never blocked, and nothing shifts as the
page loads.

## What this audit changed

The first run scored **Performance 89 / Accessibility 95 / SEO 82**. Auditing
surfaced three concrete defects, all since fixed:

| Finding                                                                                    | Fix                                                                                                                 | Result                     |
| :----------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ | :------------------------- |
| `target-size` — the password-visibility toggle was below the 24×24 px minimum (WCAG 2.5.8) | Gave all four toggles a `min-width`/`min-height` of 24 px                                                           | Accessibility 95 → **100** |
| `meta-description` missing                                                                 | Added a description to `index.html`                                                                                 | —                          |
| `robots.txt` invalid (absent)                                                              | Added `robots.txt` + `sitemap.xml`, excluding the credential-gated `/admin` and `/foodkiosk` consoles from indexing | SEO 82 → **100**           |

That touch-target defect is a genuine accessibility bug that the unit-level axe
scans could not catch, because jsdom has no layout engine and therefore cannot
measure rendered element size. It is the clearest argument for adding a
real-browser audit to the pipeline.

## Known remaining items (not fixed)

Stated rather than hidden:

- **`render-blocking-resources` / `network-dependency-tree`** — the Firebase SDK
  is imported eagerly, so the first paint waits on it. Fixing this means
  lazy-loading Firestore/Auth, which is real surgery on working, deployed code.
- **`uses-rel-preconnect`** — no `preconnect` hint for `generativelanguage.googleapis.com`.
- **`bf-cache`** — back/forward cache is blocked, most likely by the Firebase
  realtime connection.
- **`valid-source-maps`** — production source maps are not published.
- **Mobile Best Practices (93)** — `errors-in-console`; the deployed app logs a
  console entry on load.

None are correctness or accessibility problems; all are performance polish on a
codebase whose largest cost is the Firebase SDK in the initial bundle. See
[EFFICIENCY.md](../EFFICIENCY.md) for the bundle breakdown.
