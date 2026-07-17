#!/usr/bin/env node
// Prints the SHA-256 hex digest of a password so it can be stored in
// VITE_ADMIN_PASSWORD_HASH without the plaintext ever touching the repo.
//
// Usage:  npm run hash:password "your-strong-password"
import { createHash } from 'node:crypto';

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run hash:password "<password>"');
  process.exit(1);
}

const digest = createHash('sha256').update(password).digest('hex');
console.log('\nAdd this line to your .env (never commit the plaintext):\n');
console.log(`VITE_ADMIN_PASSWORD_HASH=${digest}\n`);
