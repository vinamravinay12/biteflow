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

## 🔒 Security

Biteflow is a backend-less single-page app (SPA), which shapes what security can and cannot guarantee. The measures below reflect that honestly rather than overclaiming.

* **No plaintext admin password anywhere.** The platform-admin login compares a SHA-256 digest stored in the environment (`VITE_ADMIN_PASSWORD_HASH`) — the plaintext is never in the source, the bundle, the README, or the UI. Rotate it with:
  ```bash
  npm run hash:password "your-new-strong-password"
  # paste the printed digest into .env as VITE_ADMIN_PASSWORD_HASH
  ```
  Login also **fails closed**: with no digest configured, authentication is rejected rather than falling back to any default.
* **Hardened Firestore rules.** The default wildcard `allow read, write: if true` has been replaced with per-collection rules that validate document shape, field types, and string/number bounds and cap payload size (`firestore.rules`). This shrinks the attack surface and blocks malformed/oversized writes. *Known limitation:* because the demo does not sign users in with Firebase Auth, rules cannot bind writes to an authenticated principal — a production deployment must layer Firebase Auth and gate writes on `request.auth` / custom claims. This is documented inline in the rules file.
* **Secrets kept out of version control.** `.env` is git-ignored; `.env.example` documents every variable with placeholders. The Firebase *web* config is public by design (it is not a secret).
* **Credential handling.** Merchant passwords are AES-GCM encrypted (`src/utils/crypto.ts`) rather than stored in plaintext. The file itself documents the caveat that a client-shipped key cannot provide true secrecy in an SPA — the honest posture, not security theater.
* **Constant-time comparison** (`timingSafeEqual`) is used for the admin credential check to avoid leaking match progress via timing.

> ⚠️ **If you cloned an earlier commit:** the previously published demo password (`biteflow-admin-2026`) is considered compromised and must be rotated using the command above.

---

## ♿ Accessibility

* **Dynamic language & direction.** `<html lang>` and `<html dir>` update live with the selected language via the `useDocumentLanguage` hook — screen readers switch pronunciation off `lang`, and Arabic renders in native `dir="rtl"`.
* **Labeled controls.** Icon-only buttons (cart, quantity +/–, remove, close, refresh, edit/delete, password visibility) expose `aria-label`s; decorative icons are marked `aria-hidden`. Form inputs and every language `<select>` have accessible names.
* **Live regions & dialogs.** The AI Concierge thread is an `aria-live="polite"` log so new replies are announced; the cart drawer uses `role="dialog"` / `aria-modal`.
* **Toggle state.** Password-visibility toggles expose `aria-pressed`.

---

## 🛠️ Verification & Testing

* **Automated unit tests (`npm test`)** — 39 tests across 5 suites (Vitest), covering the real business logic the UI depends on:
  * `aiActions` — the Gemini action-tag parser (`[ADD_TO_CART]`, `[ITEMS]`, `[SHOW_CHECKOUT]`), including malformed-JSON resilience and rejection of injected/unknown item ids.
  * `cart` — cart totals, item counts, and multi-kiosk order grouping/subtotals.
  * `crypto` — AES-GCM round-trips plus the admin-auth SHA-256 / `verifyHash` / `timingSafeEqual` helpers (validated against NIST vectors).
  * `database` — wallet load/deduct/refund arithmetic (including overdraft protection) and stall credential verification.
  * `translations` — localization key parity across all languages.
* **Coverage (`npm run test:coverage`)** — the domain logic in `src/utils` reports ~100% line coverage on the tested modules.
* **Type Safety** — fully checked with `tsc -b`; linted with `oxlint`.
* **Manual/visual** — verified in-browser across desktop and mobile viewports, with RTL confirmed for Arabic.

---

## 📌 Assumptions

* **Demo-grade auth.** Without a backend, admin/merchant auth is client-side and intended for demonstration; production requires Firebase Auth (see [Security](#-security)).
* **Sandbox mode.** If Firebase env vars are absent, the app runs entirely against a LocalStorage sandbox so it is fully usable offline for evaluation.
* **Wallet is a mock gateway.** Funds are simulated in-app; no real payment processing occurs.
* **Gemini is optional.** With no `VITE_GEMINI_API_KEY`, the AI Concierge falls back to an offline keyword-matching assistant, so the flow always works.
* **Single platform admin.** The model assumes exactly one admin account, which is why stalls live under a deterministic `users/{ADMIN_UID}/stalls` path.
