import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
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
export const storage = getStorage(app);

// Validate connection to Firestore on boot per firebase-integration-rpc skill
async function testBootConnection() {
  try {
    await getDocFromServer(doc(db, 'settings', 'global'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
if (typeof window !== 'undefined') {
  testBootConnection();
}

export const getFirebaseAuth = () => auth;
export const getFirebaseFirestore = () => db;
export const getFirebaseStorage = () => storage;

export interface FirebaseConnectionCheckResult {
  readOk: boolean;
  writeOk: boolean;
  queryOk: boolean;
  storageOk: boolean;
  storageRulesLocked?: boolean;
  quotaExceeded: boolean;
  readQuotaBypassActive?: boolean;
  projectId: string;
  databaseId: string;
  storageBucket: string;
  message: string;
}

let liveWriteQuotaExceeded = false;
let liveReadQuotaExceeded = false;

export function isFirebaseWriteQuotaExceeded(): boolean {
  return liveWriteQuotaExceeded;
}

export function setFirebaseWriteQuotaExceeded(val: boolean): void {
  liveWriteQuotaExceeded = val;
}

export function isFirebaseReadQuotaExceeded(): boolean {
  return liveReadQuotaExceeded;
}

export function setFirebaseReadQuotaExceeded(val: boolean): void {
  liveReadQuotaExceeded = val;
}

export function getFirebaseConsoleDatabaseUrl(): string {
  return `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;
}

export function getFirebaseConsoleStorageUrl(): string {
  return `https://console.firebase.google.com/project/${firebaseConfig.projectId}/storage`;
}

export function getFirebaseConsoleStorageRulesUrl(): string {
  return `https://console.firebase.google.com/project/${firebaseConfig.projectId}/storage/rules`;
}

/**
 * Inspects whether Firebase Storage bucket exists AND whether Production Mode rules (403) block cms-videos access.
 */
export async function inspectFirebaseStorage(): Promise<{ exists: boolean; rulesLocked: boolean }> {
  try {
    const bucket = firebaseConfig.storageBucket;
    if (!bucket) return { exists: false, rulesLocked: false };
    const res = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?prefix=cms-videos%2F&maxResults=1`,
      { cache: 'no-store' }
    );
    if (res.status === 404) {
      return { exists: false, rulesLocked: false };
    }
    if (res.status === 401 || res.status === 403) {
      return { exists: true, rulesLocked: true };
    }
    return { exists: res.ok, rulesLocked: false };
  } catch (_e) {
    return { exists: false, rulesLocked: false };
  }
}

/**
 * Check if Firebase Storage bucket exists and allows cms-videos operations.
 */
export async function checkFirebaseStorageBucket(): Promise<boolean> {
  const status = await inspectFirebaseStorage();
  return status.exists && !status.rulesLocked;
}

/**
 * Reads a single Firestore document via REST API.
 * Uses GET first, and falls back to no-op PATCH if 429 read limit is ever hit.
 */
export async function fetchFirestoreDocRest(
  collectionName: string,
  docId: string
): Promise<any | null> {
  const baseUrl = getFirestoreRestBaseUrl();
  const apiKey = firebaseConfig.apiKey;
  const docPath = `${baseUrl}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`;

  if (!liveReadQuotaExceeded) {
    try {
      const getUrl = apiKey ? `${docPath}?key=${encodeURIComponent(apiKey)}` : docPath;
      const getRes = await fetch(getUrl, { cache: 'no-store' });
      if (getRes.ok) {
        return await getRes.json();
      }
      if (getRes.status === 404) {
        return null;
      }
      if (getRes.status === 429) {
        liveReadQuotaExceeded = true;
      }
    } catch (_e) {}
  }

  try {
    const patchUrl = `${docPath}?updateMask.fieldPaths=_noop${
      apiKey ? `&key=${encodeURIComponent(apiKey)}` : ''
    }`;
    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {} })
    });
    if (patchRes.ok) {
      liveWriteQuotaExceeded = false;
      return await patchRes.json();
    }
    if (patchRes.status === 429) {
      liveWriteQuotaExceeded = true;
    }
  } catch (_e) {}

  return null;
}

/**
 * Executes a structured query (:runQuery) against Firestore REST API.
 * Unlike GET /documents/{collection} (which returns 403 PERMISSION_DENIED on Enterprise editions),
 * POST /documents:runQuery executes cleanly with HTTP 200 OK across all collections!
 */
export async function fetchCollectionViaRunQuery(
  collectionName: string,
  limit = 200
): Promise<any[] | null> {
  try {
    const baseUrl = getFirestoreRestBaseUrl();
    const apiKey = firebaseConfig.apiKey;
    const url = `${baseUrl}:runQuery${apiKey ? `?key=${encodeURIComponent(apiKey)}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionName }],
          limit
        }
      })
    });
    if (res.status === 429) {
      liveReadQuotaExceeded = true;
      return null;
    }
    if (!res.ok) return null;
    liveReadQuotaExceeded = false;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    const docs = rows.map((r: any) => r?.document).filter(Boolean);
    return docs;
  } catch (_e) {
    return null;
  }
}

export async function testFirebaseConnection(): Promise<FirebaseConnectionCheckResult> {
  const baseUrl = getFirestoreRestBaseUrl();
  const apiKeyParam = firebaseConfig.apiKey ? `key=${encodeURIComponent(firebaseConfig.apiKey)}` : '';
  const result: FirebaseConnectionCheckResult = {
    readOk: false,
    writeOk: false,
    queryOk: false,
    storageOk: false,
    storageRulesLocked: false,
    quotaExceeded: false,
    readQuotaBypassActive: false,
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId,
    storageBucket: firebaseConfig.storageBucket,
    message: ''
  };

  try {
    const [readRes, queryDocs, storageStatus] = await Promise.all([
      fetch(`${baseUrl}/settings/global${apiKeyParam ? `?${apiKeyParam}` : ''}`, {
        cache: 'no-store'
      }),
      fetchCollectionViaRunQuery('packages', 5),
      inspectFirebaseStorage()
    ]);

    result.storageOk = storageStatus.exists && !storageStatus.rulesLocked;
    result.storageRulesLocked = storageStatus.rulesLocked;
    result.queryOk = Array.isArray(queryDocs);

    if (readRes.ok || readRes.status === 404) {
      result.readOk = true;
      liveReadQuotaExceeded = false;
    } else if (readRes.status === 429) {
      liveReadQuotaExceeded = true;
      result.readQuotaBypassActive = true;
    } else {
      const errText = await readRes.text();
      result.message = `Read HTTP ${readRes.status}: ${errText.slice(0, 140)}`;
      return result;
    }

    const writeUrl = `${baseUrl}/_diagnostics/ping?updateMask.fieldPaths=lastCheckedAt${
      apiKeyParam ? `&${apiKeyParam}` : ''
    }`;
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
      result.readOk = true;
      result.writeOk = true;
      liveWriteQuotaExceeded = false;
      if (storageStatus.rulesLocked) {
        result.message = `Firestore Read/Write & Catalog Query Active on "${firebaseConfig.projectId}". Firebase Storage bucket exists, but "Production Mode" rules are blocking cms-videos/ (403 Permission Denied). Update Storage Rules in Firebase Console -> Storage -> Rules.`;
      } else if (!storageStatus.exists) {
        result.message = `Firestore Read/Write & Catalog Query Active on "${firebaseConfig.projectId}"! (Firebase Storage bucket is not yet enabled — videos use Firestore chunk sync fallback until you click "Get Started" in Firebase Storage Console.)`;
      } else {
        result.message = `Universal Cloud Sync Active on "${firebaseConfig.projectId}" — Firestore Read/Write + Catalog Queries + Firebase Storage CDN Ready across Phone, Netlify & AI Studio.`;
      }
    } else if (writeRes.status === 429) {
      result.quotaExceeded = true;
      liveWriteQuotaExceeded = true;
      result.message = `Quota exceeded on Firebase project "${firebaseConfig.projectId}" (HTTP 429 RESOURCE_EXHAUSTED).`;
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
    if (error.code !== 'auth/popup-closed-user') {
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
