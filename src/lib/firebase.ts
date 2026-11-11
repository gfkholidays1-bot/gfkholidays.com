import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfigFromJson from '../../firebase-applet-config.json';

export interface ActiveFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId: string;
}

const CUSTOM_FIREBASE_STORAGE_KEY = 'gfk_custom_firebase_config';

const fallbackConfig: ActiveFirebaseConfig = {
  apiKey: firebaseConfigFromJson.apiKey,
  authDomain: firebaseConfigFromJson.authDomain,
  projectId: firebaseConfigFromJson.projectId,
  storageBucket: firebaseConfigFromJson.storageBucket,
  messagingSenderId: firebaseConfigFromJson.messagingSenderId,
  appId: firebaseConfigFromJson.appId,
  firestoreDatabaseId: firebaseConfigFromJson.firestoreDatabaseId
};

function loadCustomFirebaseConfigFromStorage(): Partial<ActiveFirebaseConfig> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CUSTOM_FIREBASE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.projectId && parsed.apiKey) {
      return parsed;
    }
  } catch (_e) {}
  return null;
}

export function isUsingCustomFirebaseConfig(): boolean {
  return Boolean(loadCustomFirebaseConfigFromStorage());
}

export function saveCustomFirebaseConfig(configInput: Partial<ActiveFirebaseConfig> | string): ActiveFirebaseConfig {
  let parsed: any = configInput;
  if (typeof configInput === 'string') {
    const cleaned = configInput
      .replace(/const\s+firebaseConfig\s*=\s*/g, '')
      .replace(/;\s*$/, '')
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
      .replace(/'/g, '"')
      .replace(/,\s*}/g, '}');
    parsed = JSON.parse(cleaned);
  }

  if (!parsed || !parsed.projectId || !parsed.apiKey) {
    throw new Error('Firebase config must include at least projectId and apiKey.');
  }

  const normalized: ActiveFirebaseConfig = {
    apiKey: String(parsed.apiKey).trim(),
    authDomain: String(parsed.authDomain || `${parsed.projectId}.firebaseapp.com`).trim(),
    projectId: String(parsed.projectId).trim(),
    storageBucket: String(parsed.storageBucket || `${parsed.projectId}.firebasestorage.app`).trim(),
    messagingSenderId: String(parsed.messagingSenderId || '').trim(),
    appId: String(parsed.appId || '').trim(),
    firestoreDatabaseId: String(parsed.firestoreDatabaseId || '(default)').trim()
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(CUSTOM_FIREBASE_STORAGE_KEY, JSON.stringify(normalized));
    fetch('/api/firebase-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized)
    }).catch(() => {});
  }
  return normalized;
}

export function clearCustomFirebaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CUSTOM_FIREBASE_STORAGE_KEY);
    fetch('/api/firebase-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fallbackConfig)
    }).catch(() => {});
  }
}

const metaEnv = (typeof import.meta !== 'undefined' ? (import.meta as Record<string, any>).env : null) || {};
const customStored = loadCustomFirebaseConfigFromStorage();

export const firebaseConfig: ActiveFirebaseConfig = {
  apiKey:
    customStored?.apiKey ||
    metaEnv.VITE_FIREBASE_API_KEY ||
    firebaseConfigFromJson.apiKey ||
    fallbackConfig.apiKey,
  authDomain:
    customStored?.authDomain ||
    metaEnv.VITE_FIREBASE_AUTH_DOMAIN ||
    firebaseConfigFromJson.authDomain ||
    fallbackConfig.authDomain,
  projectId:
    customStored?.projectId ||
    metaEnv.VITE_FIREBASE_PROJECT_ID ||
    firebaseConfigFromJson.projectId ||
    fallbackConfig.projectId,
  storageBucket:
    customStored?.storageBucket ||
    metaEnv.VITE_FIREBASE_STORAGE_BUCKET ||
    firebaseConfigFromJson.storageBucket ||
    fallbackConfig.storageBucket,
  messagingSenderId:
    customStored?.messagingSenderId ||
    metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    firebaseConfigFromJson.messagingSenderId ||
    fallbackConfig.messagingSenderId,
  appId:
    customStored?.appId ||
    metaEnv.VITE_FIREBASE_APP_ID ||
    firebaseConfigFromJson.appId ||
    fallbackConfig.appId,
  firestoreDatabaseId:
    customStored?.firestoreDatabaseId ||
    metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
    firebaseConfigFromJson.firestoreDatabaseId ||
    fallbackConfig.firestoreDatabaseId
};

export function getActiveFirebaseConfig(): ActiveFirebaseConfig {
  return firebaseConfig;
}

export function getFirestoreRestBaseUrl(): string {
  const dbId = encodeURIComponent(firebaseConfig.firestoreDatabaseId || '(default)');
  return `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents`;
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const firestore = db;
export const auth = getAuth(app);

// Validate connection to Firestore on boot per firebase-integration-rpc skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
if (typeof window !== 'undefined') {
  testConnection();
}

export const getFirebaseAuth = () => auth;
export const getFirebaseFirestore = () => db;

export interface FirebaseConnectionCheckResult {
  readOk: boolean;
  writeOk: boolean;
  quotaExceeded: boolean;
  projectId: string;
  databaseId: string;
  message: string;
}

let liveWriteQuotaExceeded = false;

export function isFirebaseWriteQuotaExceeded(): boolean {
  return liveWriteQuotaExceeded;
}

export function setFirebaseWriteQuotaExceeded(val: boolean): void {
  liveWriteQuotaExceeded = val;
}

export function getFirebaseConsoleDatabaseUrl(): string {
  return `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;
}

export async function testFirebaseConnection(): Promise<FirebaseConnectionCheckResult> {
  const baseUrl = getFirestoreRestBaseUrl();
  const apiKeyParam = firebaseConfig.apiKey ? `key=${encodeURIComponent(firebaseConfig.apiKey)}` : '';
  const result: FirebaseConnectionCheckResult = {
    readOk: false,
    writeOk: false,
    quotaExceeded: false,
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId,
    message: ''
  };

  try {
    const readRes = await fetch(`${baseUrl}/settings/global${apiKeyParam ? `?${apiKeyParam}` : ''}`, {
      cache: 'no-store'
    });
    if (readRes.ok || readRes.status === 404) {
      result.readOk = true;
    } else {
      const errText = await readRes.text();
      result.message = `Read HTTP ${readRes.status}: ${errText.slice(0, 140)}`;
      return result;
    }

    const writeUrl = `${baseUrl}/_diagnostics/ping?updateMask.fieldPaths=lastCheckedAt${apiKeyParam ? `&${apiKeyParam}` : ''}`;
    const writeRes = await fetch(writeUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          lastCheckedAt: { integerValue: String(Date.now()) }
        }
      })
    });

    if (writeRes.ok) {
      result.writeOk = true;
      liveWriteQuotaExceeded = false;
      result.message = `Connected to Firebase Firestore (${firebaseConfig.projectId}) — Live Read & Write Active`;
    } else if (writeRes.status === 429) {
      result.quotaExceeded = true;
      liveWriteQuotaExceeded = true;
      result.message = `Quota exceeded on Firebase project "${firebaseConfig.projectId}" (Free daily write limit of 20,000 writes/day reached — HTTP 429). Quota resets next day at midnight PT, or connect a new Firebase project below.`;
    } else {
      const errText = await writeRes.text();
      result.message = `Write HTTP ${writeRes.status}: ${errText.slice(0, 160)}`;
    }
  } catch (err: any) {
    result.message = err?.message || 'Network error reaching Firebase Firestore';
  }

  return result;
}

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
