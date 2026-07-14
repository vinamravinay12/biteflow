import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const isFirebaseConfigured = 
  !!import.meta.env.VITE_FIREBASE_PROJECT_ID && 
  import.meta.env.VITE_FIREBASE_PROJECT_ID !== 'your-project-id';

let dbInstance: ReturnType<typeof getFirestore> | null = null;
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
    dbInstance = getFirestore(app);
    authInstance = getAuth(app);
    console.log("Firebase services initialized successfully.");
  } catch (e) {
    console.error("Firebase failed to initialize:", e);
  }
} else {
  console.log("Firebase is not configured in .env. Operating in LocalStorage sandbox mode.");
}

export { dbInstance as db, authInstance as auth };
