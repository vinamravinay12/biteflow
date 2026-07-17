# 🍔 Biteflow – Stadium Food Court Multilingual Assistant

Biteflow is a modern, premium, and feature-rich Web Application designed for stadium food courts, campus cafeterias, and high-traffic event hubs. It streamlines the ordering process by allowing visitors to order from multiple food stalls in a single transaction, tracks order statuses in real-time, and integrates a smart AI Concierge powered by Gemini.

**Live Demo Links**:
* 📱 **Customer Portal**: [https://biteflow-6b1f9.web.app](https://biteflow-6b1f9.web.app)
* 🛡️ **Platform Admin Portal**: [https://biteflow-6b1f9.web.app/admin](https://biteflow-6b1f9.web.app/admin) (Credentials: `admin` / `biteflow-admin-2026`)
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
* **Front-end**: React 18, TypeScript, Vite
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

## 🛠️ Verification & Testing
* **Type Safety**: Fully checked using TypeScript compile (`tsc -b`).
* **Visual Testing**: Responsive elements tested across mobile viewport sizes and desktop screens.
* **Localization Validation**: Verified translation keys across Customer Portal, Merchant Dashboard, and Super Admin logs.
