import { initializeApp } from 'firebase/app';
import { initializeFirestore, Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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
