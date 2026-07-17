import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, collectionGroup } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA9CgiEmWUa2ry5PbeiU4zmCQ9BrF_zCPE",
  authDomain: "biteflow-6b1f9.firebaseapp.com",
  projectId: "biteflow-6b1f9",
  storageBucket: "biteflow-6b1f9.firebasestorage.app",
  messagingSenderId: "499274273494",
  appId: "1:499274273494:web:bf3fc83458d061c6db2f77"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const run = async () => {
  console.log("Testing collectionGroup('orders') query:");
  try {
    const allOrdersSnap = await getDocs(collectionGroup(db, 'orders'));
    console.log(`Found ${allOrdersSnap.size} orders via collectionGroup.`);
    for (const d of allOrdersSnap.docs) {
      console.log(`Order ID: ${d.id}, Path: ${d.ref.path}`, d.data());
    }
  } catch (e) {
    console.error("collectionGroup('orders') failed:", e);
  }

  console.log("\nTesting manual users loop query:");
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      console.log(`User Doc: ${userDoc.id}, Role: ${userData.role}`);
      if (userDoc.id !== 'admin-biteflow' && userData.role !== 'foodkiosk') {
        const ordersSnap = await getDocs(collection(db, 'users', userDoc.id, 'orders'));
        console.log(`  Found ${ordersSnap.size} orders for user ${userDoc.id}`);
        for (const orderDoc of ordersSnap.docs) {
          console.log(`    Order ID: ${orderDoc.id}`, orderDoc.data());
        }
      }
    }
  } catch (e) {
    console.error("Manual users loop failed:", e);
  }

  process.exit(0);
};

run();
