import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import {
  getFirebaseFirestore,
  getFirebaseAuth,
  getFirestoreRestBaseUrl,
  getActiveFirebaseConfig,
  isFirebaseWriteQuotaExceeded,
  setFirebaseWriteQuotaExceeded
} from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function emitFirebaseStatus(
  status: 'connected' | 'synced' | 'quota_exceeded' | 'error',
  detailMessage?: string
) {
  if (typeof window === 'undefined') return;
  if (status === 'connected' && isFirebaseWriteQuotaExceeded()) {
    return;
  }
  try {
    window.dispatchEvent(
      new CustomEvent('gfk-firebase-status', {
        detail: {
          status,
          message: detailMessage || '',
          timestamp: Date.now(),
          projectId: getActiveFirebaseConfig().projectId
        }
      })
    );
  } catch (_e) {}
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code || '';

  if (
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('resource-exhausted') ||
    code === 'resource-exhausted'
  ) {
    console.debug(`[Firestore:${path}] Free-tier daily write quota reached (429):`, errMsg);
    setFirebaseWriteQuotaExceeded(true);
    emitFirebaseStatus(
      'quota_exceeded',
      'Firebase free-tier daily write quota (20,000 writes/day) reached. Resets at midnight PT or connect your own Firebase project.'
    );
    return;
  }

  if (
    errMsg.includes('Could not reach Cloud Firestore') ||
    errMsg.includes('offline') ||
    errMsg.includes('unavailable') ||
    code === 'unavailable'
  ) {
    console.debug(`[Firestore:${path}] Handled transient offline status:`, errMsg);
    return;
  }

  const auth = getFirebaseAuth();
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
    emitFirebaseStatus('error', `Permissions error on ${path}`);
    throw new Error(JSON.stringify(errInfo));
  }
}

// Helper to remove undefined fields recursively
export const stripUndefined = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  const result: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = stripUndefined(obj[key]);
    }
  }
  return result;
};

// Convert JS value to Firestore REST API Value format
function toFirestoreRestValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreRestValue(item))
      }
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreRestValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function parseFirestoreRestField(val: any): any {
  if (!val || typeof val !== 'object') return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return Array.isArray(val.arrayValue?.values)
      ? val.arrayValue.values.map(parseFirestoreRestField)
      : [];
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = parseFirestoreRestField(v);
    }
    return out;
  }
  return null;
}

function parseFirestoreRestDoc(docObj: any): any {
  const fields = docObj?.fields || {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = parseFirestoreRestField(v);
  }
  if (!out.id && typeof docObj?.name === 'string') {
    const parts = docObj.name.split('/');
    out.id = parts[parts.length - 1];
  }
  return out;
}

// Helper to enrich OTA partners with default logos if saved before logoUrl was introduced
export function normalizeGlobalSettings(docData: any, defaults: any) {
  const defaultOtaMap = new Map<string, any>(
    (defaults?.otaPartners || []).map((p: any) => [p.id || p.name, p])
  );

  const normalizedOta = Array.isArray(docData?.otaPartners)
    ? docData.otaPartners.map((p: any) => {
        const fallback = defaultOtaMap.get(p.id) || defaultOtaMap.get(p.name);
        return {
          ...fallback,
          ...p,
          logoUrl: p.logoUrl || fallback?.logoUrl || '',
        };
      })
    : defaults?.otaPartners || [];

  return {
    ...defaults,
    ...docData,
    id: 'global',
    logoUrl:
      docData?.logoUrl && docData.logoUrl !== 'https://iili.io/ChVw1zF.png'
        ? docData.logoUrl
        : defaults?.logoUrl || '/logo-transparent.svg',
    showBrandText:
      docData?.showBrandText !== undefined
        ? Boolean(docData.showBrandText)
        : defaults?.showBrandText !== false,
    logoHeight:
      docData?.logoHeight !== undefined
        ? Number(docData.logoHeight)
        : Number(defaults?.logoHeight || 54),
    logoFit: docData?.logoFit || defaults?.logoFit || 'edge-to-edge',
    logoAlign: docData?.logoAlign || defaults?.logoAlign || 'left',
    customerMedia: Array.isArray(docData?.customerMedia)
      ? docData.customerMedia
      : defaults?.customerMedia || [],
    socialChannels: Array.isArray(docData?.socialChannels)
      ? docData.socialChannels
      : defaults?.socialChannels || [],
    otaPartners: normalizedOta,
    hotelPartnerLogos: Array.isArray(docData?.hotelPartnerLogos)
      ? docData.hotelPartnerLogos
      : defaults?.hotelPartnerLogos || [],
    flightPartnerLogos: Array.isArray(docData?.flightPartnerLogos)
      ? docData.flightPartnerLogos
      : defaults?.flightPartnerLogos || [],
    partnerReelStyle: docData?.partnerReelStyle || defaults?.partnerReelStyle || 'live-video-sequence',
    partnerReelStageDuration:
      docData?.partnerReelStageDuration !== undefined
        ? Number(docData.partnerReelStageDuration)
        : Number(defaults?.partnerReelStageDuration || 7),
    partnerReelBgVideoUrl:
      docData?.partnerReelBgVideoUrl !== undefined
        ? docData.partnerReelBgVideoUrl
        : defaults?.partnerReelBgVideoUrl || '',
    partnerReelAutoPlay:
      docData?.partnerReelAutoPlay !== undefined
        ? Boolean(docData.partnerReelAutoPlay)
        : defaults?.partnerReelAutoPlay !== false,
    partnerReelShowHud:
      docData?.partnerReelShowHud !== undefined
        ? Boolean(docData.partnerReelShowHud)
        : defaults?.partnerReelShowHud !== false,
    partnerReelTitle:
      docData?.partnerReelTitle !== undefined
        ? docData.partnerReelTitle
        : defaults?.partnerReelTitle || '',
    partnerReelSubtitle:
      docData?.partnerReelSubtitle !== undefined
        ? docData.partnerReelSubtitle
        : defaults?.partnerReelSubtitle || '',
  };
}

let cmsBackendAvailable: boolean | null = null;
type StreamListener = (payload: { collection: string; data: any[]; updatedAt: number }) => void;
const streamListeners = new Set<StreamListener>();
let sharedEventSource: EventSource | null = null;

function subscribeToCmsStream(listener: StreamListener) {
  streamListeners.add(listener);
  if (
    typeof window !== 'undefined' &&
    typeof EventSource !== 'undefined' &&
    !sharedEventSource &&
    cmsBackendAvailable === true
  ) {
    try {
      sharedEventSource = new EventSource('/api/cms-stream');
      sharedEventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.type === 'update' && parsed.collection && Array.isArray(parsed.data)) {
            streamListeners.forEach((fn) => fn(parsed));
          }
        } catch (_e) {}
      };
      sharedEventSource.onerror = () => {
        if (cmsBackendAvailable === false && sharedEventSource) {
          sharedEventSource.close();
          sharedEventSource = null;
        }
      };
    } catch (_e) {}
  }

  return () => {
    streamListeners.delete(listener);
    if (streamListeners.size === 0 && sharedEventSource) {
      sharedEventSource.close();
      sharedEventSource = null;
    }
  };
}

export async function pushCollectionToServer(collectionName: string, data: any[], updatedAt: number) {
  if (typeof window === 'undefined' || cmsBackendAvailable === false) return;
  try {
    const res = await fetch(`/api/cms/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, updatedAt }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      cmsBackendAvailable = false;
    } else {
      cmsBackendAvailable = true;
    }
  } catch (_e) {
    cmsBackendAvailable = false;
  }
}

// Direct Firestore REST API reader so all browsers immediately fetch live cloud state
async function fetchCollectionFromFirestoreRest(collectionName: string): Promise<any[] | null> {
  try {
    const baseUrl = getFirestoreRestBaseUrl();
    const apiKey = getActiveFirebaseConfig().apiKey;
    const keyQuery = apiKey ? `&key=${encodeURIComponent(apiKey)}` : '';

    if (collectionName === 'settings') {
      const res = await fetch(
        `${baseUrl}/settings/global${apiKey ? `?key=${encodeURIComponent(apiKey)}` : ''}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const docJson = await res.json();
        if (docJson && docJson.fields) {
          const parsed = parseFirestoreRestDoc(docJson);
          parsed.id = 'global';
          emitFirebaseStatus('connected', 'Connected to Firebase Firestore');
          return [parsed];
        }
      }
    }

    const res = await fetch(`${baseUrl}/${collectionName}?pageSize=100${keyQuery}`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (Array.isArray(json?.documents) && json.documents.length > 0) {
      emitFirebaseStatus('connected', 'Connected to Firebase Firestore');
      return json.documents.map(parseFirestoreRestDoc);
    }
  } catch (_e) {}
  return null;
}

// Direct Firestore REST API writer for changed documents
async function writeDocsToFirestoreRest(
  collectionName: string,
  changedItems: any[]
): Promise<{ ok: boolean; quotaExceeded: boolean }> {
  if (changedItems.length === 0) return { ok: true, quotaExceeded: false };
  const baseUrl = getFirestoreRestBaseUrl();
  const apiKey = getActiveFirebaseConfig().apiKey;
  const keyParam = apiKey ? `?key=${encodeURIComponent(apiKey)}` : '';
  let allOk = true;
  let quotaExceeded = false;

  for (const item of changedItems) {
    if (!item?.id) continue;
    const cleaned = stripUndefined(item);
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(cleaned)) {
      if (v !== undefined) {
        fields[k] = toFirestoreRestValue(v);
      }
    }

    try {
      const res = await fetch(
        `${baseUrl}/${encodeURIComponent(collectionName)}/${encodeURIComponent(item.id)}${keyParam}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields })
        }
      );
      if (res.status === 429) {
        quotaExceeded = true;
        allOk = false;
      } else if (!res.ok) {
        allOk = false;
      }
    } catch (_e) {
      allOk = false;
    }
  }

  return { ok: allOk, quotaExceeded };
}

function stripTimestampMeta(item: any): any {
  if (!item || typeof item !== 'object') return item;
  const copy = { ...item };
  delete copy._updatedAt;
  delete copy._testPing;
  return copy;
}

export function useFirestoreCollection<T extends { id: string }>(collectionName: string, initialData: T[]) {
  const initialDataRef = useRef<T[]>(initialData);

  const [data, setData] = useState<T[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        // Clean up any legacy quota-unsynced flags that previously blocked cross-browser sync
        localStorage.removeItem(`gfk_quota_unsynced_${collectionName}`);

        const cached = localStorage.getItem(`gfk_cache_${collectionName}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (_e) {}
    }
    return initialData;
  });

  const dataRef = useRef<T[]>(data);
  const isWritingRef = useRef<boolean>(false);
  const lastLocalWriteAtRef = useRef<number>(0);

  const normalizeItems = useCallback(
    (rawItems: any[]): T[] => {
      if (collectionName === 'settings' && initialDataRef.current.length > 0) {
        const defaults = initialDataRef.current[0] as any;
        return rawItems.map((item) =>
          item.id === 'global' ? normalizeGlobalSettings(item, defaults) : item
        ) as T[];
      }
      return rawItems as T[];
    },
    [collectionName]
  );

  const applyIncomingState = useCallback(
    (rawItems: any[], source: string) => {
      if (!Array.isArray(rawItems) || rawItems.length === 0) return;

      const normalized = normalizeItems(rawItems);
      const serializedNext = JSON.stringify(normalized.map(stripTimestampMeta));
      const serializedCurr = JSON.stringify(dataRef.current.map(stripTimestampMeta));

      if (serializedNext === serializedCurr) {
        console.debug(
          `[useFirestoreCollection:${collectionName}] (${source}) Data matches current state; skipping re-render`
        );
        return;
      }

      console.debug(
        `[useFirestoreCollection:${collectionName}] (${source}) Applying real-time update (${normalized.length} items)`
      );

      dataRef.current = normalized;
      setData(normalized);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`gfk_cache_${collectionName}`, JSON.stringify(normalized));
          if (collectionName === 'settings') {
            const globalItem = (normalized as any[]).find((i: any) => i.id === 'global');
            if (globalItem) {
              if (globalItem.logoUrl) localStorage.setItem('gfk_active_logo', globalItem.logoUrl);
              if (globalItem.showBrandText !== undefined) {
                localStorage.setItem('gfk_show_brand_text', String(globalItem.showBrandText));
              }
              if (globalItem.logoHeight !== undefined) {
                localStorage.setItem('gfk_logo_height', String(globalItem.logoHeight));
              }
              window.dispatchEvent(new CustomEvent('gfk-logo-updated', { detail: globalItem }));
            }
          }
        } catch (_e) {}
      }
    },
    [collectionName, normalizeItems]
  );

  // 1. Primary Cloud Sync: Fetch directly from Firebase Firestore first across all browsers, with Express SSE & static seed support
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isMounted = true;

    const syncInitialAndFocus = async () => {
      if (isWritingRef.current || Date.now() - lastLocalWriteAtRef.current < 3500) {
        return;
      }

      // A) Fetch live from Firebase Firestore REST API first so all browsers share the exact same cloud state
      const restDocs = await fetchCollectionFromFirestoreRest(collectionName);
      if (isMounted && restDocs && restDocs.length > 0) {
        applyIncomingState(restDocs, 'firestore-rest');
      }

      // B) Also connect to Express backend SSE stream if running in AI Studio / Node server
      if (cmsBackendAvailable !== false) {
        try {
          const res = await fetch(`/api/cms/${collectionName}`, { cache: 'no-store' });
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            cmsBackendAvailable = true;
            const payload = await res.json();
            // Only fall back to server payload if Firestore had no documents
            if (
              isMounted &&
              (!restDocs || restDocs.length === 0) &&
              payload &&
              Array.isArray(payload.data) &&
              payload.data.length > 0
            ) {
              applyIncomingState(payload.data, 'server-api');
            }
            subscribeToCmsStream((msg) => {
              if (msg.collection === collectionName && Array.isArray(msg.data)) {
                applyIncomingState(msg.data, 'sse-stream');
              }
            });
            return;
          } else {
            cmsBackendAvailable = false;
          }
        } catch (_e) {
          cmsBackendAvailable = false;
        }
      }

      // C) Static build seed fallback (/cms-seed.json) if both Firestore and local cache are empty
      if ((!restDocs || restDocs.length === 0) && !localStorage.getItem(`gfk_cache_${collectionName}`)) {
        try {
          const seedRes = await fetch('/cms-seed.json', { cache: 'no-store' });
          const seedType = seedRes.headers.get('content-type') || '';
          if (seedRes.ok && seedType.includes('application/json')) {
            const seedJson = await seedRes.json();
            const colEntry = seedJson?.collections?.[collectionName];
            if (isMounted && colEntry && Array.isArray(colEntry.data) && colEntry.data.length > 0) {
              applyIncomingState(colEntry.data, 'static-seed');
            }
          }
        } catch (_e) {}
      }
    };

    syncInitialAndFocus();

    const unsubscribeStream = subscribeToCmsStream((msg) => {
      if (msg.collection === collectionName && Array.isArray(msg.data)) {
        applyIncomingState(msg.data, 'sse-stream');
      }
    });

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncInitialAndFocus();
      }
    };

    // Periodic lightweight cloud poll for 'settings' so even browsers with strict adblockers blocking WebChannel get live updates
    let pollTimer: any = null;
    if (collectionName === 'settings') {
      pollTimer = setInterval(() => {
        if (
          document.visibilityState === 'visible' &&
          !isWritingRef.current &&
          Date.now() - lastLocalWriteAtRef.current >= 4000
        ) {
          fetchCollectionFromFirestoreRest('settings').then((docs) => {
            if (isMounted && docs && docs.length > 0) {
              applyIncomingState(docs, 'firestore-poll');
            }
          });
        }
      }, 6000);
    }

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
      unsubscribeStream();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [collectionName, applyIncomingState]);

  // 2. BroadcastChannel & localStorage 'storage' event for instant 0ms cross-tab sync in the same browser
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(`gfk_sync_${collectionName}`);
      channel.onmessage = (event) => {
        if (event.data && Array.isArray(event.data)) {
          lastLocalWriteAtRef.current = Date.now();
          applyIncomingState(event.data, 'broadcast-channel');
        } else if (event.data && Array.isArray(event.data.items)) {
          lastLocalWriteAtRef.current = Date.now();
          applyIncomingState(event.data.items, 'broadcast-channel');
        }
      };
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === `gfk_cache_${collectionName}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            lastLocalWriteAtRef.current = Date.now();
            applyIncomingState(parsed, 'localStorage-event');
          }
        } catch (_err) {}
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [collectionName, applyIncomingState]);

  // 3. Real-time Firestore Snapshot Listener across all browsers & sessions
  useEffect(() => {
    const db = getFirebaseFirestore();
    const colRef = collection(db, collectionName);

    console.debug(`[useFirestoreCollection:${collectionName}] Subscribing to real-time snapshot listener`);

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const fromCache = snapshot.metadata.fromCache;
        const hasPendingWrites = snapshot.metadata.hasPendingWrites;
        const msSinceLocalWrite = Date.now() - lastLocalWriteAtRef.current;

        console.debug(
          `[useFirestoreCollection:${collectionName}] Snapshot event:`,
          {
            size: snapshot.size,
            empty: snapshot.empty,
            fromCache,
            hasPendingWrites,
            isWriting: isWritingRef.current,
            msSinceLocalWrite
          }
        );

        if (snapshot.empty) {
          console.debug(
            `[useFirestoreCollection:${collectionName}] Snapshot is empty; retaining current state (${dataRef.current.length} items)`
          );
          return;
        }

        // Only skip if this specific tab is currently executing a write or receiving an offline cached snapshot
        if (
          isWritingRef.current ||
          msSinceLocalWrite < 3500 ||
          (fromCache && !hasPendingWrites)
        ) {
          console.debug(
            `[useFirestoreCollection:${collectionName}] Skipping in-flight/cached snapshot`
          );
          return;
        }

        const rawItems: any[] = [];
        snapshot.forEach((docSnap) => {
          const docData = docSnap.data();
          rawItems.push({ ...docData, id: docSnap.id });
        });

        if (rawItems.length > 0) {
          emitFirebaseStatus('connected', 'Live real-time sync active');
          applyIncomingState(rawItems, 'firestore-snapshot');
        }
      },
      (err) => {
        console.debug(`[useFirestoreCollection:${collectionName}] Snapshot listener error:`, err);
        handleFirestoreError(err, OperationType.GET, collectionName);
      }
    );

    return () => {
      console.debug(`[useFirestoreCollection:${collectionName}] Unsubscribing snapshot listener`);
      unsubscribe();
    };
  }, [collectionName, applyIncomingState]);

  const updateCollection = useCallback(
    async (newDataOrUpdater: T[] | ((prev: T[]) => T[])) => {
      const currentData = dataRef.current;
      const rawNext: T[] =
        typeof newDataOrUpdater === 'function'
          ? (newDataOrUpdater as (prev: T[]) => T[])(currentData)
          : newDataOrUpdater;

      const now = Date.now();
      const prevMap = new Map<string, string>();
      currentData.forEach((item) => {
        prevMap.set(item.id, JSON.stringify(stripTimestampMeta(item)));
      });

      const changedItems: T[] = [];
      const stampedData: T[] = rawNext.map((item: any) => {
        const cleanStr = JSON.stringify(stripTimestampMeta(item));
        const prevStr = prevMap.get(item.id);
        if (prevStr !== cleanStr) {
          const updatedItem = { ...item, _updatedAt: now };
          changedItems.push(updatedItem);
          return updatedItem;
        }
        return item;
      });

      if (collectionName === 'settings' && changedItems.length === 0 && stampedData.length > 0) {
        const globalDoc = { ...stampedData[0], _updatedAt: now };
        changedItems.push(globalDoc);
        stampedData[0] = globalDoc;
      }

      const normalizedNext = normalizeItems(stampedData);

      isWritingRef.current = true;
      lastLocalWriteAtRef.current = now;

      // 1. Update local React state immediately
      dataRef.current = normalizedNext;
      setData(normalizedNext);

      // 2. Persist to localStorage & broadcast across tabs in the same browser
      const serializedNew = JSON.stringify(normalizedNext);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`gfk_cache_${collectionName}`, serializedNew);
          localStorage.setItem(`gfk_updated_at_${collectionName}`, String(now));
          if (collectionName === 'settings') {
            const globalItem = (normalizedNext as any[]).find((i: any) => i.id === 'global');
            if (globalItem) {
              if (globalItem.logoUrl) localStorage.setItem('gfk_active_logo', globalItem.logoUrl);
              if (globalItem.showBrandText !== undefined) {
                localStorage.setItem('gfk_show_brand_text', String(globalItem.showBrandText));
              }
              if (globalItem.logoHeight !== undefined) {
                localStorage.setItem('gfk_logo_height', String(globalItem.logoHeight));
              }
              window.dispatchEvent(new CustomEvent('gfk-logo-updated', { detail: globalItem }));
            }
          }
          if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel(`gfk_sync_${collectionName}`);
            channel.postMessage({ items: normalizedNext, updatedAt: now });
            channel.close();
          }
        } catch (_e) {}
      }

      // 3. Persist to Express backend CMS server if available (/api/cms/:collection)
      await pushCollectionToServer(collectionName, normalizedNext, now);

      // 4. Write changed documents to Firebase Firestore (both REST PATCH and SDK writeBatch for deletions)
      const newIds = new Set(normalizedNext.map((item: T) => item.id));
      const deletedIds = currentData.filter((item) => !newIds.has(item.id)).map((item) => item.id);

      if (changedItems.length === 0 && deletedIds.length === 0) {
        isWritingRef.current = false;
        return;
      }

      try {
        const restResult = await writeDocsToFirestoreRest(collectionName, changedItems);

        if (restResult.ok && deletedIds.length === 0) {
          setFirebaseWriteQuotaExceeded(false);
          lastLocalWriteAtRef.current = Date.now();
          isWritingRef.current = false;
          emitFirebaseStatus('synced', `Saved ${changedItems.length} item(s) to Firebase Firestore`);
          console.debug(
            `[useFirestoreCollection:${collectionName}] Direct Firestore REST write succeeded (${changedItems.length} changed items)`
          );
          return;
        }

        if (restResult.quotaExceeded) {
          setFirebaseWriteQuotaExceeded(true);
          isWritingRef.current = false;
          emitFirebaseStatus(
            'quota_exceeded',
            `Quota exceeded on Firebase project "${getActiveFirebaseConfig().projectId}" (20,000 free writes/day limit reached — HTTP 429).`
          );
          return;
        }

        // Fallback to Firebase JS SDK writeBatch
        const db = getFirebaseFirestore();
        const batch = writeBatch(db);

        changedItems.forEach((item: T) => {
          const docRef = doc(db, collectionName, item.id);
          batch.set(docRef, stripUndefined(item), { merge: true });
        });

        deletedIds.forEach((id) => {
          batch.delete(doc(db, collectionName, id));
        });

        console.debug(
          `[useFirestoreCollection:${collectionName}] Syncing diff batch write (${changedItems.length} changed, ${deletedIds.length} deleted) to Firestore...`
        );

        await Promise.race([
          batch.commit().then(() => {
            setFirebaseWriteQuotaExceeded(false);
            lastLocalWriteAtRef.current = Date.now();
            emitFirebaseStatus('synced', `Synced to Firebase Firestore`);
            console.debug(`[useFirestoreCollection:${collectionName}] Batch write committed to Firestore`);
          }),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Firestore batch timeout')), 4500)
          )
        ]);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, collectionName);
      } finally {
        isWritingRef.current = false;
      }
    },
    [collectionName, normalizeItems]
  );

  return [data, updateCollection] as const;
}
