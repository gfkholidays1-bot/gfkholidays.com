import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { getFirebaseFirestore, getFirebaseAuth } from '../lib/firebase';

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code || '';
  // Silently ignore transient offline, unavailable, or free-tier daily quota messages
  if (
    errMsg.includes('Could not reach Cloud Firestore') ||
    errMsg.includes('offline') ||
    errMsg.includes('unavailable') ||
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('resource-exhausted') ||
    code === 'unavailable' ||
    code === 'resource-exhausted'
  ) {
    console.debug(`[Firestore:${path}] Handled non-fatal status (${code || 'quota/offline'}):`, errMsg);
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
  console.warn('Firestore Warning:', JSON.stringify(errInfo));
  if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
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

// Shared SSE EventSource manager so all 9 collection hooks share a single stream connection
type StreamListener = (payload: { collection: string; data: any[]; updatedAt: number }) => void;
const streamListeners = new Set<StreamListener>();
let sharedEventSource: EventSource | null = null;

function subscribeToCmsStream(listener: StreamListener) {
  streamListeners.add(listener);
  if (typeof window !== 'undefined' && typeof EventSource !== 'undefined' && !sharedEventSource) {
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
        // Browser EventSource automatically reconnects
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
  if (typeof window === 'undefined') return;
  try {
    await fetch(`/api/cms/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, updatedAt }),
    });
  } catch (_e) {
    // Ignore if running in static-only preview without /api/cms
  }
}

export function useFirestoreCollection<T extends { id: string }>(collectionName: string, initialData: T[]) {
  const initialDataRef = useRef<T[]>(initialData);

  const [data, setData] = useState<T[]>(() => {
    if (typeof window !== 'undefined') {
      try {
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
  const updatedAtRef = useRef<number>((() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem(`gfk_updated_at_${collectionName}`)) || 0;
    }
    return 0;
  })());
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
    (rawItems: any[], incomingUpdatedAt: number, source: string) => {
      if (!Array.isArray(rawItems) || rawItems.length === 0) return;

      const normalized = normalizeItems(rawItems);
      const serializedNext = JSON.stringify(normalized);
      const serializedCurr = JSON.stringify(dataRef.current);

      if (incomingUpdatedAt > updatedAtRef.current) {
        updatedAtRef.current = incomingUpdatedAt;
      }

      if (serializedNext === serializedCurr) {
        console.debug(
          `[useFirestoreCollection:${collectionName}] (${source}) Data matches current state; skipping re-render`
        );
        return;
      }

      console.debug(
        `[useFirestoreCollection:${collectionName}] (${source}) Applying real-time update (${normalized.length} items, updatedAt=${incomingUpdatedAt})`
      );

      dataRef.current = normalized;
      setData(normalized);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`gfk_cache_${collectionName}`, serializedNext);
          if (updatedAtRef.current > 0) {
            localStorage.setItem(`gfk_updated_at_${collectionName}`, String(updatedAtRef.current));
          }
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

  // 1. Sync with Backend CMS API (/api/cms/:collection) on mount, focus, and SSE stream
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isMounted = true;

    const fetchFromServer = async () => {
      try {
        const res = await fetch(`/api/cms/${collectionName}`, { cache: 'no-store' });
        if (!res.ok) return;
        const payload = await res.json();
        if (!isMounted || !payload || !Array.isArray(payload.data) || payload.data.length === 0) return;

        const serverUpdatedAt = Number(payload.updatedAt) || 0;
        // Apply if server has newer or equal timestamp, or if we haven't written locally yet
        if (serverUpdatedAt >= updatedAtRef.current || updatedAtRef.current === 0) {
          applyIncomingState(payload.data, serverUpdatedAt, 'server-api');
        } else if (updatedAtRef.current > serverUpdatedAt && dataRef.current.length > 0) {
          // Push our newer local state to server so all browsers stay in sync
          pushCollectionToServer(collectionName, dataRef.current, updatedAtRef.current);
        }
      } catch (_e) {}
    };

    fetchFromServer();

    const unsubscribeStream = subscribeToCmsStream((msg) => {
      if (msg.collection === collectionName && Array.isArray(msg.data)) {
        const streamUpdatedAt = Number(msg.updatedAt) || Date.now();
        if (streamUpdatedAt >= updatedAtRef.current) {
          applyIncomingState(msg.data, streamUpdatedAt, 'sse-stream');
        }
      }
    });

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchFromServer();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      isMounted = false;
      unsubscribeStream();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [collectionName, applyIncomingState]);

  // 2. BroadcastChannel & localStorage 'storage' event for instant 0ms cross-tab sync
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(`gfk_sync_${collectionName}`);
      channel.onmessage = (event) => {
        if (event.data && Array.isArray(event.data)) {
          lastLocalWriteAtRef.current = Date.now();
          applyIncomingState(event.data, Date.now(), 'broadcast-channel');
        } else if (event.data && Array.isArray(event.data.items)) {
          lastLocalWriteAtRef.current = Date.now();
          applyIncomingState(
            event.data.items,
            Number(event.data.updatedAt) || Date.now(),
            'broadcast-channel'
          );
        }
      };
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === `gfk_cache_${collectionName}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            applyIncomingState(parsed, Date.now(), 'localStorage-event');
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

  // 3. Real-time Firestore Snapshot Listener with _updatedAt version protection
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
            msSinceLocalWrite,
            localUpdatedAt: updatedAtRef.current,
          }
        );

        if (snapshot.empty) {
          console.debug(
            `[useFirestoreCollection:${collectionName}] Snapshot is empty; retaining current state (${dataRef.current.length} items)`
          );
          return;
        }

        if (
          isWritingRef.current ||
          (fromCache && !hasPendingWrites && msSinceLocalWrite < 15000)
        ) {
          console.debug(
            `[useFirestoreCollection:${collectionName}] Skipping stale/in-flight snapshot to prevent revert-cycle`
          );
          return;
        }

        const rawItems: any[] = [];
        let maxRemoteUpdatedAt = 0;

        snapshot.forEach((docSnap) => {
          const docData = docSnap.data();
          const itemUpdatedAt = Number(docData?._updatedAt) || 0;
          if (itemUpdatedAt > maxRemoteUpdatedAt) {
            maxRemoteUpdatedAt = itemUpdatedAt;
          }
          rawItems.push({ ...docData, id: docSnap.id });
        });

        // CRITICAL REVERT-CYCLE GUARD:
        // If we have a newer local/server write timestamp than Firestore (e.g. when Firestore
        // daily write quota is exhausted and Firestore returns the older server document),
        // never let the stale Firestore snapshot overwrite our newer state!
        if (updatedAtRef.current > 0 && maxRemoteUpdatedAt < updatedAtRef.current) {
          console.debug(
            `[useFirestoreCollection:${collectionName}] Ignoring stale Firestore snapshot (remoteUpdatedAt=${maxRemoteUpdatedAt} < localUpdatedAt=${updatedAtRef.current})`
          );
          return;
        }

        if (rawItems.length > 0) {
          applyIncomingState(rawItems, maxRemoteUpdatedAt || 1, 'firestore-snapshot');
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
      const stampedData: T[] = rawNext.map((item: any) => ({
        ...item,
        _updatedAt: now,
      }));

      const normalizedNext = normalizeItems(stampedData);

      isWritingRef.current = true;
      lastLocalWriteAtRef.current = now;
      updatedAtRef.current = now;

      // 1. Update local React state immediately
      dataRef.current = normalizedNext;
      setData(normalizedNext);

      // 2. Persist to localStorage & broadcast across tabs
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

      // 3. Immediately persist to backend CMS server (/api/cms/:collection) for instant cross-browser sync
      await pushCollectionToServer(collectionName, normalizedNext, now);

      // 4. Sync to Firestore in background without blocking or throwing on quota limits
      try {
        const db = getFirebaseFirestore();
        const batch = writeBatch(db);

        normalizedNext.forEach((item: T) => {
          const docRef = doc(db, collectionName, item.id);
          batch.set(docRef, stripUndefined(item), { merge: true });
        });

        const newIds = new Set(normalizedNext.map((item: T) => item.id));
        currentData.forEach((item) => {
          if (!newIds.has(item.id)) {
            batch.delete(doc(db, collectionName, item.id));
          }
        });

        console.debug(
          `[useFirestoreCollection:${collectionName}] Syncing batch write (${normalizedNext.length} items) to Firestore...`
        );

        batch
          .commit()
          .then(() => {
            lastLocalWriteAtRef.current = Date.now();
            isWritingRef.current = false;
            console.debug(`[useFirestoreCollection:${collectionName}] Batch write committed to Firestore`);
          })
          .catch((err) => {
            isWritingRef.current = false;
            handleFirestoreError(err, OperationType.WRITE, collectionName);
          });

        // Release write lock shortly after server persistence completes
        setTimeout(() => {
          isWritingRef.current = false;
        }, 1200);
      } catch (err) {
        isWritingRef.current = false;
        handleFirestoreError(err, OperationType.WRITE, collectionName);
      }
    },
    [collectionName, normalizeItems]
  );

  return [data, updateCollection] as const;
}
