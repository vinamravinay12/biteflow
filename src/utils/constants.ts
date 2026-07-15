// Single hardcoded platform admin. Since the app supports exactly one admin
// account, stalls can live in a deterministic subcollection path
// (users/{ADMIN_UID}/stalls) instead of a top-level collection.
export const ADMIN_UID = 'admin-biteflow';

// Identity used for the LocalStorage sandbox customer when Firebase Auth
// is not configured or the visitor hasn't signed in.
export const DEFAULT_CUSTOMER_UID = 'sandbox-customer';
export const DEFAULT_CUSTOMER_NAME = 'Alex Mercer';
