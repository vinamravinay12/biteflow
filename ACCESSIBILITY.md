# BiteFlow — Accessibility

**Target:** WCAG 2.1 AA. Verified by automated axe scans (`vitest-axe`), `jsx-a11y` lint rules enforced as build errors, and manual keyboard/screen-reader passes.

## 1. Automated enforcement

| Layer | Tool | Result |
| :-- | :-- | :-- |
| Lint (static) | `jsx-a11y` rules in [`.oxlintrc.json`](.oxlintrc.json), set to **error** | 0 errors |
| Unit (rendered DOM) | `vitest-axe` in [`StallLogin.test.tsx`](src/components/StallLogin.test.tsx) | 0 violations |

Enforced `jsx-a11y` rules: `alt-text`, `anchor-has-content`, `aria-props`, `aria-role`, `role-has-required-aria-props`, `label-has-associated-control`, `no-redundant-roles`. A missing label or invalid ARIA role now **fails the build**.

## 2. Language & direction (multilingual a11y)

`useDocumentLanguage` ([`src/utils/useDocumentLanguage.ts`](src/utils/useDocumentLanguage.ts)) keeps `<html lang>` and `<html dir>` in sync with the selected language across all four portals.

This is a functional requirement, not cosmetic: screen readers switch pronunciation and voice based on `lang`, and Arabic renders in native `dir="rtl"` so assistive tech gets the correct reading order. Verified in-browser: selecting العربية sets `lang="ar" dir="rtl"` and the layout mirrors.

## 3. Forms & labels

- Every input, textarea, and select has a programmatically associated `<label htmlFor>` / `id` pair — across the customer, merchant, and admin portals.
- Language selectors expose `aria-label`.
- Password-visibility toggles expose an accessible name (`Show password` / `Hide password`) plus `aria-pressed` state.
- Groups that aren't a single control (branding colour swatches, image pickers) use `role="group"` with an accessible name instead of a dangling `<label>`.

## 4. Controls & icons

- Icon-only buttons (cart, quantity ±, remove, close, refresh, edit, delete) all carry `aria-label`s that include the item they act on, e.g. `Remove: Classic Burger`.
- Decorative icons and SVG ornamentation are `aria-hidden="true"` to reduce screen-reader noise.
- Selected states are exposed via `aria-pressed` / `aria-checked`, not colour alone.

## 5. Keyboard operability

- **Skip-to-main-content link** is the first focusable element ([`App.tsx`](src/App.tsx)), visually hidden until focused.
- The interactive **stadium seat map** is fully keyboard-operable: the four stand wedges are SVG paths exposed as `role="radio"` with `tabIndex={0}`, `aria-checked`, and Enter/Space activation; seats are real `<button>`s with `aria-label` and `aria-pressed`.
- Modals (cart drawer, seat map) use `role="dialog"` + `aria-modal` + `aria-labelledby`, and the seat map closes on **Escape**.

## 6. Live regions

The AI Concierge thread is a `role="log"` with `aria-live="polite"`, so replies are announced to screen-reader users as they arrive without stealing focus. Cart quantity changes announce politely.

## 7. Landmarks & structure

Routed content is wrapped in a `<main id="main-content">` landmark. The route-loading fallback is announced via `role="status" aria-live="polite"`.

## 8. Motion

`@media (prefers-reduced-motion: reduce)` in [`index.css`](src/index.css) neutralizes animations, transitions, and smooth scrolling for users who request reduced motion (WCAG 2.3.3), covering the app's slide, pulse, and scan animations.

## 9. Resilience

An app-level [`ErrorBoundary`](src/components/ErrorBoundary.tsx) renders a `role="alert"` recovery screen instead of a blank page if a component throws.

## 10. Known gaps (stated honestly)

- **Colour contrast is not yet machine-verified.** jsdom cannot compute rendered colour, so the axe unit scan disables that rule; contrast has only been checked by eye. A real-browser Playwright + `@axe-core/playwright` scan is the next step.
- Automated axe coverage currently spans `StallLogin`; the larger portals rely on lint-level enforcement plus manual passes.
- No focus-trap inside modals yet (Escape-to-close and dialog semantics are in place).
