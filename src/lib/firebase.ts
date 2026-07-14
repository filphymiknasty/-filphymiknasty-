import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // We'll fetch this from the environment or AI Studio provides it via metadata / config
};

export async function fetchFirebaseConfig() {
  const res = await fetch('/firebase-applet-config.json');
  if (!res.ok) throw new Error('Failed to load Firebase config');
  return res.json();
}

// Initialize placeholder, actual init happens when we load config
let app: any = null;
let auth: any = null;
let db: any = null;

export const initFirebase = async () => {
  if (app) return { app, auth, db };
  const config = await fetchFirebaseConfig();
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  return { app, auth, db };
};

export const getFirebase = () => {
  if (!app) throw new Error('Firebase not initialized');
  return { app, auth, db };
};
