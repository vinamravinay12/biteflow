import { initializeApp } from 'firebase/app';
import { initializeFirestore, Firestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

export const isFirebaseConfigured =
  !!import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID !== 'your-project-id';

let dbInstance: Firestore | null = null;
let authInstance: ReturnType<typeof getAuth> | null = null;

if (isFirebaseConfigured) {
  try {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
    const app = initializeApp(firebaseConfig);
    // Firestore rejects any field whose value is `undefined` (e.g. an
    // omitted optional Order field like `notes` or `matchName`). Since this
    // app builds documents with plain object spreads/optionals throughout,
    // ignoreUndefinedProperties strips those fields instead of throwing.
    dbInstance = initializeFirestore(app, { ignoreUndefinedProperties: true });
    authInstance = getAuth(app);
    console.log("Firebase services initialized successfully.");
  } catch (e) {
    console.error("Firebase failed to initialize:", e);
  }
} else {
  console.log("Firebase is not configured in .env. Operating in LocalStorage sandbox mode.");
}

export { dbInstance as db, authInstance as auth };

// Every Firestore access in this app now requires an authenticated Firebase
// session (the security rules enforce `request.auth != null`). Roles that don't
// use email/password — the platform admin, stall merchants, and guest shoppers
// browsing before they register — are signed in ANONYMOUSLY so they still have a
// real, non-null `request.auth` principal. Registered customers later upgrade to
// an email/password identity. This resolves once a user (anonymous or not) is
// established, and is safe to await before any read/write or seeding.
let authReadyPromise: Promise<void> | null = null;

export const ensureFirebaseAuth = (): Promise<void> => {
  if (!authInstance) return Promise.resolve(); // LocalStorage sandbox mode
  if (authReadyPromise) return authReadyPromise;

  authReadyPromise = new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(authInstance!, (user) => {
      if (user) {
        unsubscribe();
        resolve();
      } else {
        // No session yet — establish the anonymous baseline. onAuthStateChanged
        // will fire again with the new user and resolve above.
        signInAnonymously(authInstance!).catch((e) => {
          console.error('Anonymous Firebase sign-in failed:', e);
          unsubscribe();
          resolve(); // don't hang the app; reads/writes will simply be denied
        });
      }
    });
  });
  return authReadyPromise;
};
