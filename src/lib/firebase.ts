import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  setLogLevel as setFirestoreLogLevel
} from 'firebase/firestore';
import { setLogLevel } from 'firebase/app';
import firebaseConfigFromJson from '../../firebase-applet-config.json';

// Suppress verbose Firebase debug/offline logs
try {
  setLogLevel('silent');
  setFirestoreLogLevel('silent');
} catch (_e) {}

const fallbackConfig = {
  apiKey: "AIzaSyD4A1n6GAe81TplBXGgVorN7qowKCBqjvM",
  authDomain: "gen-lang-client-0612324688.firebaseapp.com",
  projectId: "gen-lang-client-0612324688",
  storageBucket: "gen-lang-client-0612324688.firebasestorage.app",
  messagingSenderId: "1095118801112",
  appId: "1:1095118801112:web:1dfe10cbf4bfa0cecb6fad",
  firestoreDatabaseId: "ai-studio-gfkholidays-415b8c9f-ece5-42b3-82d6-fea966b26d79"
};

const metaEnv = (typeof import.meta !== 'undefined' ? (import.meta as Record<string, any>).env : null) || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || (firebaseConfigFromJson as any)?.apiKey || fallbackConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || (firebaseConfigFromJson as any)?.authDomain || fallbackConfig.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || (firebaseConfigFromJson as any)?.projectId || fallbackConfig.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || (firebaseConfigFromJson as any)?.storageBucket || fallbackConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || (firebaseConfigFromJson as any)?.messagingSenderId || fallbackConfig.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || (firebaseConfigFromJson as any)?.appId || fallbackConfig.appId,
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (firebaseConfigFromJson as any)?.firestoreDatabaseId || fallbackConfig.firestoreDatabaseId
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

// Extract databaseId and initialize Firestore with auto-detected long polling first
// so writes and snapshots never hang behind proxy/iframe environments
const databaseId = (firebaseConfig as any).firestoreDatabaseId;
export const firestore = (() => {
  try {
    return initializeFirestore(
      app,
      {
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true,
      },
      databaseId
    );
  } catch (_e) {
    try {
      return getFirestore(app, databaseId);
    } catch (_e2) {
      return getFirestore(app);
    }
  }
})();

export const getFirebaseAuth = () => auth;
export const getFirebaseFirestore = () => firestore;

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/gmail.send');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogle = async () => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error.code !== 'auth/popup-closed-by-user') {
      console.error('Sign in error:', error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
