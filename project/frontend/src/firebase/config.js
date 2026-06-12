import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder_api_key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "placeholder_auth_domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "placeholder_project_id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "placeholder_storage_bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "placeholder_sender_id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "placeholder_app_id",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "placeholder_database_url",
};

// Check if credentials are placeholders
const isConfigured = 
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_API_KEY !== "your_api_key_here";

if (!isConfigured) {
  console.warn(
    "⚠️ Firebase is not fully configured. Please update your .env file with actual Firebase web credentials to enable authentication, database, and storage services."
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
export const storage = getStorage(app);
export const rtdb = getDatabase(app);
export { app };
