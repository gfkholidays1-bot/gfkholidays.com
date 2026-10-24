import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot, doc, getDocs, writeBatch } from 'firebase/firestore';
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
  // Silently ignore transient offline/delayed backend connection messages as Firestore operates in offline mode
  if (
    errMsg.includes('Could not reach Cloud Firestore') ||
    errMsg.includes('offline') ||
    errMsg.includes('unavailable') ||
    (error as any)?.code === 'unavailable'
  ) {
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
    throw new Error(JSON.stringify(errInfo));
  }
}

// Helper to remove undefined fields recursively
const stripUndefined = (obj: any): any => {
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
function normalizeGlobalSettings(docData: any, defaults: any) {
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
        : (typeof window !== 'undefined' && localStorage.getItem('gfk_active_logo')) || defaults?.logoUrl || '/logo-transparent.svg',
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

export function useFirestoreCollection<T extends { id: string }>(collectionName: string, initialData: T[]) {
  const [data, setData] = useState<T[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`gfk_cache_${collectionName}`);
        if (cached) return JSON.parse(cached);
      } catch (_e) {}
    }
    return initialData;
  });
  const dataRef = useRef<T[]>(data);

  useEffect(() => {
    dataRef.current = data;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`gfk_cache_${collectionName}`, JSON.stringify(data));
      } catch (_e) {}
    }
  }, [data, collectionName]);

  // BroadcastChannel for instant cross-tab / cross-window sync
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(`gfk_sync_${collectionName}`);
    
    channel.onmessage = (event) => {
      if (event.data && Array.isArray(event.data)) {
        setData(event.data);
        dataRef.current = event.data;
      }
    };

    return () => {
      channel.close();
    };
  }, [collectionName]);

  useEffect(() => {
    const db = getFirebaseFirestore();
    const colRef = collection(db, collectionName);

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (snapshot.empty) {
          return;
        }
        const items: any[] = [];
        snapshot.forEach((docSnap) => {
          const docData = docSnap.data();
          if (collectionName === 'settings' && docSnap.id === 'global' && initialData.length > 0) {
            const defaults = initialData[0] as any;
            items.push(normalizeGlobalSettings(docData, defaults));
          } else {
            items.push({ ...docData, id: docSnap.id });
          }
        });
        if (items.length > 0) {
          setData(items as T[]);
          dataRef.current = items as T[];
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(`gfk_cache_${collectionName}`, JSON.stringify(items));
            } catch (_e) {}
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, collectionName)
    );

    return () => unsubscribe();
  }, [collectionName]);

  const updateCollection = useCallback(
    async (newDataOrUpdater: T[] | ((prev: T[]) => T[])) => {
      const currentData = dataRef.current;
      const newData: T[] =
        typeof newDataOrUpdater === 'function'
          ? (newDataOrUpdater as (prev: T[]) => T[])(currentData)
          : newDataOrUpdater;

      // Update local state immediately for snappy UI
      setData(newData);
      dataRef.current = newData;

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`gfk_cache_${collectionName}`, JSON.stringify(newData));
          if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel(`gfk_sync_${collectionName}`);
            channel.postMessage(newData);
            channel.close();
          }
        } catch (_e) {}
      }

      try {
        const db = getFirebaseFirestore();
        const batch = writeBatch(db);

        // Upsert all new data
        newData.forEach((item: T) => {
          const docRef = doc(db, collectionName, item.id);
          batch.set(docRef, stripUndefined(item));
        });

        // Delete removed items
        const newIds = new Set(newData.map((item: T) => item.id));
        currentData.forEach((item) => {
          if (!newIds.has(item.id)) {
            batch.delete(doc(db, collectionName, item.id));
          }
        });

        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, collectionName);
        throw err;
      }
    },
    [collectionName]
  );

  return [data, updateCollection] as const;
}
