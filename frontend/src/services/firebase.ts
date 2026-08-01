import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDummyApiKeyForLocalDevAuth123456',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'retailsphere-app.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'retailsphere-app',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'retailsphere-app.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1088492040989',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1088492040989:web:abcdef1234567890',
};

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export interface FirebaseGoogleUser {
  email: string;
  displayName: string;
  photoURL?: string | null;
  uid: string;
  idToken: string;
}

export async function signInWithGoogleFirebase(): Promise<FirebaseGoogleUser> {
  const result: UserCredential = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const idToken = await user.getIdToken();

  return {
    email: user.email || '',
    displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Google User'),
    photoURL: user.photoURL,
    uid: user.uid,
    idToken: idToken,
  };
}
