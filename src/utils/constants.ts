// Single hardcoded platform admin. Since the app supports exactly one admin
// account, stalls can live in a deterministic subcollection path
// (users/{ADMIN_UID}/stalls) instead of a top-level collection.
export const ADMIN_UID = 'admin-biteflow';

// Identity used for the LocalStorage sandbox customer when Firebase Auth
// is not configured or the visitor hasn't signed in.
export const DEFAULT_CUSTOMER_UID = 'sandbox-customer';
export const DEFAULT_CUSTOMER_NAME = 'Alex Mercer';

// Platform admin credentials. The password is NEVER stored here or in the
// bundle in plaintext — only its SHA-256 digest lives in the environment
// (VITE_ADMIN_PASSWORD_HASH). Rotate by running `npm run hash:password` and
// pasting the new digest into .env. See README "Security" for the rationale
// and the caveat that a backend-less SPA can only ever offer demo-grade auth.
export const ADMIN_USERNAME = (import.meta.env.VITE_ADMIN_USERNAME || 'admin').trim().toLowerCase();
export const ADMIN_PASSWORD_HASH = import.meta.env.VITE_ADMIN_PASSWORD_HASH || '';
