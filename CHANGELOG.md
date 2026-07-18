# Changelog

Notable changes to BiteFlow. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Security

- **Moved the Gemini API call server-side.** A Cloud Function (`/api/concierge`)
  now holds the key as a Secret Manager secret; production builds no longer
  inline it. Verified: 0 occurrences in the served bundle. ([ADR-0002](docs/decisions.md#adr-0002))
- **Closed a cross-customer order enumeration leak.** Any signed-in session,
  including an anonymous guest, could enumerate every customer's orders with a
  single query. Denied outright. ([ADR-0003](docs/decisions.md#adr-0003))
- Replaced the wide-open Firestore rules with authenticated, shape-validated,
  size-capped, per-collection rules; every client now holds a real Firebase Auth
  session (anonymous for guests/merchants/admin, email/password for registered fans).
- Removed the hardcoded admin password. Login now compares a SHA-256 digest from
  the environment using a timing-safe comparison, and fails closed when unset.
- Added prompt-injection detection (13 patterns) enforced on the client **and**
  again server-side, plus input sanitization and length clamping.
- Added OWASP-aligned response headers including a Content-Security-Policy.
- Added CodeQL, Dependabot, `npm audit`, and gitleaks secret scanning to CI.
- Published `.well-known/security.txt` (RFC 9116).
- Removed a legacy order backfill that ran a full cross-customer scan on every
  page load, for every visitor.

### Accessibility

- Made the SVG stadium seat map keyboard-operable — stands are exposed as
  `radio`s activated by Enter/Space; a bare `<path onClick>` was mouse-only.
- Fixed touch-target sizes on password toggles (WCAG 2.5.8), taking Lighthouse
  Accessibility from 95 to **100**.
- Associated every form label with its control across all three portals; enabled
  `jsx-a11y` lint rules as build **errors** (21 violations → 0).
- Added a skip-to-content link, `<main>` landmark, dialog semantics with
  Escape-to-close, an `aria-live` log for the AI concierge, and
  `prefers-reduced-motion` support.
- `<html lang>`/`dir` now track the selected language, with native RTL for Arabic.

### Testing

- Grew the suite from 5 to **119 tests**. Added component + `vitest-axe` tests
  for `StallLogin`, `SeatMapModal`, and `CartDrawer`, and covered the full
  LocalStorage persistence surface.
- **Fixed a quality gate that did nothing:** `npm run typecheck` was
  `tsc --noEmit` against a solution-style root config, which type-checks no files
  and passed vacuously. It immediately surfaced three real errors.
- Coverage is enforced in two tiers and reports the honest project-wide figure
  rather than excluding a file to inflate it. ([ADR-0005](docs/decisions.md#adr-0005))

### Performance

- Code-split the admin and merchant portals so fans never download them, with a
  stale-chunk reload guard and correct cache headers. ([ADR-0004](docs/decisions.md#adr-0004))
- Measured Lighthouse: **95/100/100/100** desktop, **91/100/93/100** mobile,
  with 0 ms Total Blocking Time and 0 Cumulative Layout Shift.

### Code quality

- Extracted `SeatMapModal`, `CartDrawer`, and `AuthScreen` out of the
  `CustomerPortal` monolith, each with a typed props interface.
- Adopted Prettier and `.editorconfig`; unified the quality gate behind
  `npm run verify`.
- Completed localization: every user-facing string now resolves through the
  translation catalogues in all languages (verified programmatically).
- Added architecture documentation and ADRs.
