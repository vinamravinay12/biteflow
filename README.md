# 🍔 Biteflow – Stadium Food Court Multilingual Assistant

Biteflow is a modern, premium, and feature-rich Web Application designed for stadium food courts, campus cafeterias, and high-traffic event hubs. It streamlines the ordering process by allowing visitors to order from multiple food stalls in a single transaction, tracks order statuses in real-time, and integrates a smart AI Concierge powered by Gemini.

**Live Demo Links**:
* 📱 **Customer Portal**: [https://biteflow-6b1f9.web.app](https://biteflow-6b1f9.web.app)
* 🛡️ **Platform Admin Portal**: [https://biteflow-6b1f9.web.app/admin](https://biteflow-6b1f9.web.app/admin) — the admin password is **not** published here or committed to the repo; only its SHA-256 digest lives in the environment (see [Security](#-security)). Reviewer credentials are shared separately with the submission.
* 🏪 **Stall Merchant Portal**: [https://biteflow-6b1f9.web.app/foodkiosk](https://biteflow-6b1f9.web.app/foodkiosk) (Stall merchant credentials can be generated in the Admin Portal)

---

## 🎯 Chosen Vertical & Persona
* **Vertical**: Stadium & Event Venue Food Court Management (FIFA Match Roster & Delivery Kiosks)
* **The Problem (Reasoning behind the project)**: 
  At high-traffic stadiums and events, visitor break times (like halftime or recess) are extremely short and chaotic. Attendees face three major pain points:
  1. **Huge Queues**: Standing in long lines at individual stalls means missing the live action of the game.
  2. **Information Overload & Confusion**: Navigating multiple separate menus in a hurry leads to confusion and decision fatigue.
  3. **Disjointed Transactions**: Ordering different types of food (e.g. tacos and bubble tea) requires making multiple payments and waiting in multiple separate lines.
  
  **Biteflow** solves this by unifying all vendors into a single cart checkout, enabling seat delivery tracking, and utilizing a multilingual AI Concierge to help visitors search, customize, and order instantly.

* **Persona**: An all-in-one platform coordinating:
  1. **Platform Admins**: Register food stalls, generate secure merchant credentials, and schedule match events.
  2. **Food Kiosk Merchants**: Manage menu availability, receive and decline orders with refund options, and monitor live sales analytics.
  3. **Event Attendees**: Order from multiple stalls, customize items, specify seat/stand locations, track live prep progress, and chat with an intelligent AI Concierge.

---

## 🌐 Multilingual & Inclusive Design
Biteflow offers complete localized layouts and catalog translations for **8 languages**:
* 🇺🇸 English
* 🇪🇸 Español (Spanish)
* 🇫🇷 Français (French)
* 🇩🇪 Deutsch (German)
* 🇮🇹 Italiano (Italian)
* 🇵🇹 Português (Portuguese)
* 🇳🇱 Nederlands (Dutch)
* 🇸🇦 العربية (Arabic)

### Right-To-Left (RTL) Layout
For Arabic language selection, the user interface dynamically flips into a native RTL formatting structure to ensure accessibility and professional alignment.

---

## 🤖 How AI is Used (Gemini Integration)
The platform integrates **Gemini 2.5 Flash** as an interactive food court assistant. Here is how AI is leveraged:

1. **Natural Language Interface**: Users can chat with the assistant to ask for recommendations, filter by dietary preferences, search specific ingredients, or request custom modifications (e.g., *"Show me tacos without onions"*).
2. **Intent Parsing & Action Calling**: Gemini analyzes user intent to automatically perform UI actions. When the user asks to add an item, Gemini appends a machine-readable payload (e.g., `[ADD_TO_CART: [{"id": "item-id", "quantity": 1}]]`) which the front-end intercepts to update the cart in real-time, leaving no technical strings visible to the end-user.
3. **Dynamic Prompt Contextualization**: The system injects context into the Gemini API calls:
   * **Active Kiosk Menu**: Ensures Gemini only recommends items currently available and operating.
   * **User Seating & Selections**: Tailors recommendations based on nearby kiosks.
   * **Language Constraints**: Instructs the model to output text in the user's active selected language.
4. **Multilingual Fallbacks**: Detects Dutch, Arabic, Spanish, French, German, Italian, and Portuguese inputs to adjust response guidelines dynamically.

---

## ⚙️ Core Architecture & Tech Stack
* **Front-end**: React 19, TypeScript, Vite
* **Styling**: Vanilla CSS with custom modern glassmorphism design variables, responsive grid configurations, and animations
* **Database & Auth**: Firebase / Sandbox LocalStorage fallback mode
* **Icons**: Lucide React
* **Hosting**: Firebase Hosting

---

## 🚀 How to Run Locally

### 1. Prerequisites
Ensure you have `Node.js` (v18+) and `npm` installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 📚 Documentation

Detailed engineering documentation lives in dedicated files, each with evidence:

| Doc | Covers |
| :-- | :-- |
| [SECURITY.md](SECURITY.md) | Threat model, server-side key handling, auth, Firestore rules, AI hardening, HTTP headers |
| [TESTING.md](TESTING.md) | Test strategy, coverage numbers, automated a11y testing, CI |
| [ACCESSIBILITY.md](ACCESSIBILITY.md) | WCAG 2.1 AA approach, keyboard/RTL/live regions, automated enforcement |
| [EFFICIENCY.md](EFFICIENCY.md) | Bundle analysis, code splitting, network behaviour |
| [CODE_QUALITY.md](CODE_QUALITY.md) | Architecture, type safety, quality gate |

Run the full quality gate with a single command:

```bash
npm run verify   # lint → typecheck → test:coverage → build
```

---

## 🔒 Security

Full details in **[SECURITY.md](SECURITY.md)**. Highlights:

* **The Gemini API key is never shipped to the browser.** AI requests route through a server-side Cloud Function (`functions/index.js`) behind a Hosting rewrite (`/api/concierge`) that holds the key as a Secret Manager secret, rate-limits per IP, and validates input. The client only receives generated text.
* **Every Firestore access requires a Firebase Auth session.** `ensureFirebaseAuth()` signs admins, merchants, and guests in anonymously; registered customers upgrade to email/password. The wide-open `allow read, write: if true` default is gone, replaced by shape/type/bound/size-validated rules.
* **No plaintext admin password anywhere.** Only a SHA-256 digest lives in the environment; comparison is timing-safe and **fails closed**. Rotate with `npm run hash:password "…"`.
* **Prompt-injection defense.** User input is sanitized, length-clamped, and screened against 13 jailbreak patterns — on the client *and* again server-side.
* **OWASP-aligned headers** (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) via `firebase.json`.
* **CodeQL + Dependabot + `npm audit`** run in CI.

> ⚠️ **If you cloned an earlier commit:** the previously published demo password (`biteflow-admin-2026`) is considered compromised and has been rotated.

---

## ♿ Accessibility

Full details in **[ACCESSIBILITY.md](ACCESSIBILITY.md)**. Highlights:

* **Enforced automatically:** `jsx-a11y` lint rules are build **errors**, and `vitest-axe` asserts zero violations on rendered components.
* **Dynamic language & direction.** `<html lang>`/`<html dir>` track the selected language; Arabic renders in native RTL.
* **Fully keyboard operable**, including the interactive SVG stadium seat map (stands are `role="radio"` with Enter/Space activation) and a skip-to-main-content link.
* **Labeled controls** throughout — every input has an associated `<label>`; icon-only buttons carry `aria-label`s; decorative icons are `aria-hidden`.
* **Live regions & dialogs.** The Concierge thread is a polite `role="log"`; modals use `role="dialog"`/`aria-modal` and close on Escape.
* **`prefers-reduced-motion`** disables non-essential animation.

---

## 🛠️ Verification & Testing

Full details in **[TESTING.md](TESTING.md)**. Highlights:

* **65 tests across 7 suites** (Vitest), covering the AI action-tag parser and its injection resistance, cart/multi-kiosk money math, AES-GCM + admin-auth hashing (against NIST vectors), wallet arithmetic with overdraft protection, localization key parity, and a component + axe accessibility test.
* **Coverage is enforced** — thresholds in `vite.config.ts` fail the run if breached. The pure domain modules (`aiActions`, `cart`, `crypto`) sit at **100% line coverage**.
* **CI** runs audit → lint → typecheck → coverage → build on every push and PR, plus weekly CodeQL analysis.
* **Known gap:** no Playwright E2E suite yet; the critical order journey is verified manually in-browser.

---

## 📌 Assumptions

* **Demo-grade authorization.** All roles hold a real Firebase Auth session, but per-role authorization (admin vs merchant vs customer) would need custom claims minted by a trusted backend — documented in [SECURITY.md](SECURITY.md).
* **Sandbox mode.** If Firebase env vars are absent, the app runs entirely against a LocalStorage sandbox so it is fully usable offline for evaluation.
* **Wallet is a mock gateway.** Funds are simulated in-app; no real payment processing occurs.
* **Gemini is optional.** If neither the server proxy nor a local dev key is reachable, the AI Concierge falls back to an offline keyword-matching assistant, so the ordering flow always works.
* **The AI proxy requires the Blaze plan.** Cloud Functions need a billing-enabled Firebase project. Without it, deploy hosting only and use a local `VITE_GEMINI_API_KEY` for development.
* **Single platform admin.** The model assumes exactly one admin account, which is why stalls live under a deterministic `users/{ADMIN_UID}/stalls` path.
