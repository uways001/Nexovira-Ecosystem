import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import config from '../../firebase-applet-config.json';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || config.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || config.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || config.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || config.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || config.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = getFirestore(app, config.firestoreDatabaseId);

// Silence benign Firestore internal connection retry notices
try {
  setLogLevel('silent');
} catch {
  // Ignore if log level setting fails
}

export const storage = getStorage(app);

// Soft connection validation without blocking or unhandled errors
async function testConnection() {
  try {
    if (typeof window !== 'undefined' && navigator && !navigator.onLine) {
      return;
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline notice: client is operating with local cache until online.');
    }
  }
}

if (typeof window !== 'undefined') {
  setTimeout(() => {
    testConnection().catch(() => {});
  }, 2000);
}

export default app;

