import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import {
  getFirebaseFirestore,
  getFirebaseAuth,
  getFirestoreRestBaseUrl,
  getActiveFirebaseConfig,
  isFirebaseWriteQuotaExceeded,
  setFirebaseWriteQuotaExceeded,
  setFirebaseReadQuotaExceeded,
  fetchFirestoreDocRest,
  fetchCollectionViaRunQuery
} from '../lib/firebase';
import {
  evictStaleLocalVideoIfMismatch,
  loadVideoBlob,
  isUniversalHttpVideoUrl
} from '../lib/videoStorage';

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code || '';

  if (
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('resource-exhausted') ||
    code === 'resource-exhausted'
  ) {
    if (
      operationType === OperationType.GET ||
      operationType === OperationType.LIST ||
      errMsg.includes('Free daily read units')
    ) {
      setFirebaseReadQuotaExceeded(true);
      return;
    }

    setFirebaseWriteQuotaExceeded(true);
    emitFirebaseStatus(
      'quota_exceeded',
      'Firebase quota limit reached (429). Check Firebase Console billing & quotas.'
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
  console.debug('Firestore Error Info:', JSON.stringify(errInfo));
  if (
    (error instanceof Error && error.message.includes('Missing or insufficient permissions')) ||
    code === 'permission-denied'
  ) {
    // Log structured FirestoreErrorInfo cleanly without crashing React tree when single-doc fallback is active
    console.warn(`[Firestore:${path}] Collection permission restriction (using single-doc & runQuery sync):`, JSON.stringify(errInfo));
  }
}

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

  const rawHeroUrl = typeof docData?.heroVideoUrl === 'string' ? docData.heroVideoUrl : '';
  const isUploadSource =
    docData?.heroVideoSource === 'upload' ||
    rawHeroUrl.startsWith('/api/cms-video/') ||
    rawHeroUrl.startsWith('/uploads/') ||
    rawHeroUrl.startsWith('firestore-video://') ||
    rawHeroUrl.includes('firebasestorage.googleapis.com');

  const normalizedHeroVideoUrl = isUploadSource
    ? rawHeroUrl || '/api/cms-video/hero_background_video'
    : rawHeroUrl ||
      defaults?.heroVideoUrl ||
      'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4';

  const normalizedFeaturedVideoUrl = isUploadSource
    ? normalizedHeroVideoUrl
    : docData?.featuredVideoEmbedUrl || normalizedHeroVideoUrl;

  return {
    ...defaults,
    ...docData,
    id: 'global',
    heroVideoSource: isUploadSource ? 'upload' : docData?.heroVideoSource || 'url',
    heroVideoUrl: normalizedHeroVideoUrl,
    featuredVideoEmbedUrl: normalizedFeaturedVideoUrl,
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
    partnerReelStyle:
      docData?.partnerReelStyle || defaults?.partnerReelStyle || 'live-video-sequence',
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

let cmsBackendAvailable: boolean | null =
  typeof window !== 'undefined' &&
  !window.location.hostname.includes('run.app') &&
  window.location.hostname !== 'localhost'
    ? false
    : null;

type StreamListener = (payload: { collection: string; data: any[]; updatedAt: number }) => void;
const streamListeners = new Set<StreamListener>();
let sharedEventSource: EventSource | null = null;

function subscribeToCmsStream(listener: StreamListener) {
  streamListeners.add(listener);
  if (
    typeof window !== 'undefined' &&
    typeof EventSource !== 'undefined' &&
    !sharedEventSource &&
    cmsBackendAvailable !== false
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

export async function pushCollectionToServer(
  collectionName: string,
  data: any[],
  updatedAt: number
) {
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

/**
 * Fetches collection state directly from Firebase Firestore across ALL hosts (Netlify, Phone, Chrome, Safari, AI Studio).
 * - For `settings`: fetches `settings/global` directly (`200 OK`)
 * - For catalog & operations collections: checks `cms_snapshots/{collectionName}` (authoritative atomic array incl. deletions)
 *   AND `POST :runQuery` (`200 OK`), avoiding the blocked `GET /documents/{col}` (`403`) REST LIST endpoint!
 */
async function fetchCollectionFromFirestoreRest(collectionName: string): Promise<any[] | null> {
  try {
    if (collectionName === 'settings') {
      const docJson = await fetchFirestoreDocRest('settings', 'global');
      if (docJson && docJson.fields) {
        const parsed = parseFirestoreRestDoc(docJson);
        parsed.id = 'global';
        emitFirebaseStatus('connected', 'Connected to Firebase Firestore');
        return [parsed];
      }
      return null;
    }

    // Read atomic single-doc snapshot mirror AND structured :runQuery in parallel
    const [snapDoc, runQueryRawDocs] = await Promise.all([
      fetchFirestoreDocRest('cms_snapshots', collectionName),
      fetchCollectionViaRunQuery(collectionName, 200)
    ]);

    let snapshotItems: any[] | null = null;
    let snapshotUpdatedAt = 0;
    const itemsJson = snapDoc?.fields?.itemsJson?.stringValue;
    if (itemsJson && typeof itemsJson === 'string') {
      try {
        const parsedItems = JSON.parse(itemsJson);
        if (Array.isArray(parsedItems)) {
          snapshotItems = parsedItems.filter(
            (d) => d && typeof d.id === 'string' && !d.id.startsWith('_')
          );
          snapshotUpdatedAt = Number(snapDoc?.fields?.updatedAt?.integerValue || 0);
        }
      } catch (_e) {}
    }

    let runQueryItems: any[] | null = null;
    let runQueryMaxUpdatedAt = 0;
    if (Array.isArray(runQueryRawDocs) && runQueryRawDocs.length > 0) {
      runQueryItems = runQueryRawDocs
        .map(parseFirestoreRestDoc)
        .filter((d) => d && typeof d.id === 'string' && !d.id.startsWith('_'));
      runQueryMaxUpdatedAt = runQueryItems.reduce(
        (max, d) => Math.max(max, Number(d?._updatedAt) || 0),
        0
      );
    }

    // Choose authoritative dataset: if snapshot is newer or equal (preserves deletions cleanly!), use snapshot
    if (snapshotItems && snapshotItems.length > 0 && snapshotUpdatedAt >= runQueryMaxUpdatedAt) {
      emitFirebaseStatus('connected', 'Connected to Firebase Firestore');
      return snapshotItems;
    }

    if (runQueryItems && runQueryItems.length > 0) {
      emitFirebaseStatus('connected', 'Connected to Firebase Firestore');
      return runQueryItems;
    }

    if (snapshotItems) {
      emitFirebaseStatus('connected', 'Connected to Firebase Firestore');
      return snapshotItems;
    }
  } catch (_e) {}
  return null;
}

/**
 * Direct Firestore REST API writer for changed documents + deletions + atomic collection snapshot mirror
 */
async function writeDocsToFirestoreRest(
  collectionName: string,
  changedItems: any[],
  deletedIds: string[],
  fullCollection: any[],
  now: number
): Promise<{ ok: boolean; quotaExceeded: boolean }> {
  if (changedItems.length === 0 && deletedIds.length === 0) {
    return { ok: true, quotaExceeded: false };
  }
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

  for (const delId of deletedIds) {
    try {
      const res = await fetch(
        `${baseUrl}/${encodeURIComponent(collectionName)}/${encodeURIComponent(delId)}${keyParam}`,
        { method: 'DELETE' }
      );
      if (res.status === 429) {
        quotaExceeded = true;
        allOk = false;
      }
    } catch (_e) {}
  }

  // Always update atomic collection snapshot `cms_snapshots/{collectionName}` so all browsers & phones
  // receive real-time single-doc push updates (even for deletions and new additions!)
  if (collectionName !== 'settings' && Array.isArray(fullCollection)) {
    try {
      const serialized = JSON.stringify(fullCollection.map(stripUndefined));
      if (serialized.length < 950000) {
        const snapRes = await fetch(
          `${baseUrl}/cms_snapshots/${encodeURIComponent(collectionName)}${keyParam}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                itemsJson: { stringValue: serialized },
                updatedAt: { integerValue: String(now) }
              }
            })
          }
        );
        if (snapRes.status === 429) {
          quotaExceeded = true;
          allOk = false;
        }
      }
    } catch (_e) {}
  }

  return { ok: allOk, quotaExceeded };
}

function stripTimestampMeta(item: any): any {
  if (!item || typeof item !== 'object') return item;
  const copy = { ...item };
  delete copy._updatedAt;
  delete copy._testPing;
  delete copy._noop;
  return copy;
}

function getCollectionMaxUpdatedAt(items: any[]): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((max, item) => Math.max(max, Number(item?._updatedAt) || 0), 0);
}

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  initialData: T[]
) {
  const initialDataRef = useRef<T[]>(initialData);

  const normalizeItems = useCallback(
    (rawItems: any[]): T[] => {
      const validItems = (Array.isArray(rawItems) ? rawItems : []).filter(
        (item) => item && typeof item.id === 'string' && !item.id.startsWith('_')
      );

      if (collectionName === 'settings' && initialDataRef.current.length > 0) {
        const defaults = initialDataRef.current[0] as any;
        return validItems.map((item) =>
          item.id === 'global' ? normalizeGlobalSettings(item, defaults) : item
        ) as T[];
      }

      if (collectionName === 'packages') {
        return validItems.map((p) => ({
          ...p,
          base_price: Number(p?.base_price ?? p?.price ?? 0) || 0,
          duration_days: Number(p?.duration_days ?? 1) || 1
        })) as T[];
      }

      if (collectionName === 'tickets' || collectionName === 'hotels') {
        return validItems.map((item) => ({
          ...item,
          price: Number(item?.price ?? item?.base_price ?? 0) || 0
        })) as T[];
      }

      if (collectionName === 'transport') {
        return validItems.map((tr) => ({
          ...tr,
          car: Number(tr?.car ?? tr?.price ?? 0) || 0,
          van7: Number(tr?.van7 ?? 0) || 0,
          van13: Number(tr?.van13 ?? 0) || 0
        })) as T[];
      }

      if (collectionName === 'bookings') {
        return validItems.map((b) => ({
          ...b,
          total: Number(b?.total ?? 0) || 0,
          commission: Number(b?.commission ?? 0) || 0
        })) as T[];
      }

      return validItems as T[];
    },
    [collectionName]
  );

  const [data, setData] = useState<T[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`gfk_quota_unsynced_${collectionName}`);
        const cached = localStorage.getItem(`gfk_cache_${collectionName}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleaned = parsed.filter(
              (item: any) => item && typeof item.id === 'string' && !item.id.startsWith('_')
            );
            if (cleaned.length > 0) {
              return cleaned;
            }
          }
        }
      } catch (_e) {}
    }
    return initialData;
  });

  const dataRef = useRef<T[]>(data);
  const isWritingRef = useRef<boolean>(false);
  const lastLocalWriteAtRef = useRef<number>(0);

  const applyIncomingState = useCallback(
    (rawItems: any[], source: string) => {
      if (!Array.isArray(rawItems)) return;
      if (rawItems.length === 0 && collectionName === 'settings') return;

      const normalized = normalizeItems(rawItems);
      const serializedNext = JSON.stringify(normalized.map(stripTimestampMeta));
      const serializedCurr = JSON.stringify(dataRef.current.map(stripTimestampMeta));

      if (serializedNext === serializedCurr) {
        return;
      }

      // Guard against stale Express server cache or old static seed overwriting newer local/cloud state
      const incomingTs = getCollectionMaxUpdatedAt(rawItems);
      const currentTs = getCollectionMaxUpdatedAt(dataRef.current);
      if (
        (source === 'server-api' || source === 'static-seed') &&
        currentTs > 0 &&
        incomingTs > 0 &&
        incomingTs < currentTs
      ) {
        console.debug(
          `[useFirestoreCollection:${collectionName}] (${source}) Ignoring older seed/cache (${incomingTs} < ${currentTs})`
        );
        return;
      }

      console.debug(
        `[useFirestoreCollection:${collectionName}] (${source}) Applying universal cloud update (${normalized.length} items)`
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
              if (globalItem.logoAlign) {
                localStorage.setItem('gfk_logo_align', globalItem.logoAlign);
              }
              if (globalItem.logoFit) {
                localStorage.setItem('gfk_logo_fit', globalItem.logoFit);
              }
              window.dispatchEvent(new CustomEvent('gfk-logo-updated', { detail: globalItem }));

              if (globalItem.heroVideoSource === 'upload') {
                const cloudFileName = globalItem.heroVideoFileName || '';
                const cloudUrl = globalItem.heroVideoUrl || '';
                if (cloudFileName) {
                  evictStaleLocalVideoIfMismatch(cloudFileName);
                  localStorage.setItem('gfk_video_name_hero_background_video', cloudFileName);
                }
                localStorage.setItem('gfk_video_source_mode', 'upload');
                if (cloudUrl) {
                  localStorage.setItem('gfk_uploaded_server_video_url', cloudUrl);
                  localStorage.setItem('gfk_hero_video_url', cloudUrl);
                  localStorage.setItem('gfk_featured_video_url', cloudUrl);
                }
                if (isUniversalHttpVideoUrl(cloudUrl)) {
                  window.dispatchEvent(
                    new CustomEvent('gfk-video-updated', {
                      detail: {
                        key: 'hero_background_video',
                        videoUrl: cloudUrl,
                        serverUrl: cloudUrl,
                        sourceMode: 'upload',
                        fileName: cloudFileName
                      }
                    })
                  );
                } else {
                  loadVideoBlob('hero_background_video', cloudFileName, cloudUrl).then(
                    (blobOrServerUrl) => {
                      if (blobOrServerUrl) {
                        window.dispatchEvent(
                          new CustomEvent('gfk-video-updated', {
                            detail: {
                              key: 'hero_background_video',
                              videoUrl: blobOrServerUrl,
                              serverUrl: cloudUrl || blobOrServerUrl,
                              sourceMode: 'upload',
                              fileName: cloudFileName
                            }
                          })
                        );
                      }
                    }
                  );
                }
              } else if (globalItem.heroVideoSource === 'url') {
                localStorage.setItem('gfk_video_source_mode', 'url');
                localStorage.removeItem('gfk_uploaded_server_video_url');
                if (globalItem.heroVideoUrl) {
                  localStorage.setItem('gfk_hero_video_url', globalItem.heroVideoUrl);
                  localStorage.setItem('gfk_featured_video_url', globalItem.heroVideoUrl);
                }
                window.dispatchEvent(
                  new CustomEvent('gfk-video-updated', {
                    detail: {
                      key: 'hero_background_video',
                      videoUrl: globalItem.heroVideoUrl,
                      serverUrl: globalItem.heroVideoUrl,
                      sourceMode: 'url',
                      fileName: globalItem.heroVideoFileName || ''
                    }
                  })
                );
              }
            }
          }
        } catch (_e) {}
      }
    },
    [collectionName, normalizeItems]
  );

  // 1. Primary Universal Cloud Sync (Firestore REST :runQuery + Single-Doc GET across Netlify, Phone & AI Studio)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isMounted = true;
    let lastFocusSyncAt = 0;

    const syncInitialAndFocus = async () => {
      if (isWritingRef.current || Date.now() - lastLocalWriteAtRef.current < 3500) {
        return;
      }

      // A) Always read authoritative Firebase Firestore state first
      const restDocs = await fetchCollectionFromFirestoreRest(collectionName);
      if (isMounted && restDocs && (restDocs.length > 0 || collectionName !== 'settings')) {
        applyIncomingState(restDocs, 'firestore-rest');
        if (cmsBackendAvailable !== false) {
          pushCollectionToServer(collectionName, restDocs, Date.now());
        }
      }

      // B) Express SSE stream only inside Google AI Studio / localhost dev container
      if (cmsBackendAvailable !== false) {
        try {
          const res = await fetch(`/api/cms/${collectionName}`, { cache: 'no-store' });
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            cmsBackendAvailable = true;
            const payload = await res.json();
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

      // C) Static build seed fallback ONLY when Firestore AND localStorage are both empty
      if (
        (!restDocs || restDocs.length === 0) &&
        !localStorage.getItem(`gfk_cache_${collectionName}`)
      ) {
        try {
          const seedRes = await fetch('/cms-seed.json', { cache: 'no-store' });
          const seedType = seedRes.headers.get('content-type') || '';
          if (seedRes.ok && seedType.includes('application/json')) {
            const seedJson = await seedRes.json();
            const colEntry = seedJson?.collections?.[collectionName];
            if (
              isMounted &&
              colEntry &&
              Array.isArray(colEntry.data) &&
              colEntry.data.length > 0
            ) {
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
      if (document.visibilityState === 'visible' && Date.now() - lastFocusSyncAt > 2500) {
        lastFocusSyncAt = Date.now();
        syncInitialAndFocus();
      }
    };

    // Background sync belt-and-suspenders poll (especially useful on iOS/Android mobile browsers where tabs sleep)
    const pollIntervalMs = collectionName === 'settings' ? 5000 : 12000;
    const pollTimer = setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        !isWritingRef.current &&
        Date.now() - lastLocalWriteAtRef.current >= 4000
      ) {
        fetchCollectionFromFirestoreRest(collectionName).then((docs) => {
          if (isMounted && docs && (docs.length > 0 || collectionName !== 'settings')) {
            applyIncomingState(docs, 'firestore-poll');
          }
        });
      }
    }, pollIntervalMs);

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      unsubscribeStream();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [collectionName, applyIncomingState]);

  // 2. BroadcastChannel & localStorage 'storage' event for instant 0ms cross-tab sync in same browser
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

  // 3. Real-Time Single-Doc + Collection Firestore Snapshot Listeners (immune to Enterprise LIST 403!)
  useEffect(() => {
    const db = getFirebaseFirestore();
    let active = true;

    // A) Single-Document Real-Time Listener (settings/global OR cms_snapshots/{collectionName})
    // Single-document onSnapshot ALWAYS succeeds with 200 across all devices without needing collection LIST!
    const docRef =
      collectionName === 'settings'
        ? doc(db, 'settings', 'global')
        : doc(db, 'cms_snapshots', collectionName);

    const unsubscribeDoc = onSnapshot(
      docRef,
      (docSnap) => {
        if (!active || !docSnap.exists()) return;
        const fromCache = docSnap.metadata.fromCache;
        const hasPendingWrites = docSnap.metadata.hasPendingWrites;
        const msSinceLocalWrite = Date.now() - lastLocalWriteAtRef.current;

        if (isWritingRef.current || msSinceLocalWrite < 3500 || (fromCache && !hasPendingWrites)) {
          return;
        }

        const raw = docSnap.data();
        if (collectionName === 'settings') {
          emitFirebaseStatus('connected', 'Live real-time sync active');
          applyIncomingState([{ ...raw, id: 'global' }], 'firestore-doc-snapshot');
        } else if (raw && typeof raw.itemsJson === 'string') {
          try {
            const parsedItems = JSON.parse(raw.itemsJson);
            if (Array.isArray(parsedItems)) {
              emitFirebaseStatus('connected', 'Live real-time sync active');
              applyIncomingState(parsedItems, 'firestore-snapshot-mirror');
            }
          } catch (_e) {}
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, docRef.path);
      }
    );

    // B) Secondary Collection Snapshot Listener (automatically steps back quietly if LIST returns permission-denied)
    let unsubscribeCol: (() => void) | null = null;
    if (collectionName !== 'settings') {
      const colRef = collection(db, collectionName);
      unsubscribeCol = onSnapshot(
        colRef,
        (snapshot) => {
          if (!active || snapshot.empty) return;
          const fromCache = snapshot.metadata.fromCache;
          const hasPendingWrites = snapshot.metadata.hasPendingWrites;
          const msSinceLocalWrite = Date.now() - lastLocalWriteAtRef.current;
          if (isWritingRef.current || msSinceLocalWrite < 3500 || (fromCache && !hasPendingWrites)) {
            return;
          }
          const rawItems: any[] = [];
          snapshot.forEach((docSnap) => {
            if (!docSnap.id.startsWith('_sync_probe')) {
              rawItems.push({ ...docSnap.data(), id: docSnap.id });
            }
          });
          if (rawItems.length > 0) {
            emitFirebaseStatus('connected', 'Live real-time sync active');
            applyIncomingState(rawItems, 'firestore-collection-snapshot');
          }
        },
        (err) => {
          const code = (err as any)?.code || '';
          if (code === 'permission-denied') {
            // Expected on Enterprise LIST rules; single-doc snapshot mirror & :runQuery handle sync cleanly
            if (unsubscribeCol) {
              try {
                unsubscribeCol();
              } catch (_e) {}
              unsubscribeCol = null;
            }
            return;
          }
          handleFirestoreError(err, OperationType.LIST, collectionName);
        }
      );
    }

    return () => {
      active = false;
      unsubscribeDoc();
      if (unsubscribeCol) unsubscribeCol();
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

      // 2. Persist to localStorage & BroadcastChannel for instant same-browser tabs
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
              if (globalItem.logoAlign) {
                localStorage.setItem('gfk_logo_align', globalItem.logoAlign);
              }
              if (globalItem.logoFit) {
                localStorage.setItem('gfk_logo_fit', globalItem.logoFit);
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

      // 3. Mirror to Express backend when running in AI Studio
      pushCollectionToServer(collectionName, normalizedNext, now).catch(() => {});

      // 4. Persist to Firebase Firestore (REST PATCH/DELETE + atomic cms_snapshots mirror)
      const newIds = new Set(normalizedNext.map((item: T) => item.id));
      const deletedIds = currentData.filter((item) => !newIds.has(item.id)).map((item) => item.id);

      if (changedItems.length === 0 && deletedIds.length === 0) {
        isWritingRef.current = false;
        return;
      }

      try {
        const restResult = await writeDocsToFirestoreRest(
          collectionName,
          changedItems,
          deletedIds,
          normalizedNext,
          now
        );

        if (restResult.ok) {
          setFirebaseWriteQuotaExceeded(false);
          lastLocalWriteAtRef.current = Date.now();
          isWritingRef.current = false;
          emitFirebaseStatus('synced', `Saved ${changedItems.length} item(s) to Firebase Firestore`);
          return;
        }

        if (restResult.quotaExceeded) {
          setFirebaseWriteQuotaExceeded(true);
          isWritingRef.current = false;
          emitFirebaseStatus(
            'quota_exceeded',
            `Quota exceeded on Firebase project "${getActiveFirebaseConfig().projectId}" (HTTP 429).`
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

        if (collectionName !== 'settings') {
          const serializedSnap = JSON.stringify(normalizedNext.map(stripUndefined));
          if (serializedSnap.length < 950000) {
            batch.set(
              doc(db, 'cms_snapshots', collectionName),
              { itemsJson: serializedSnap, updatedAt: now },
              { merge: true }
            );
          }
        }

        await Promise.race([
          batch.commit().then(() => {
            setFirebaseWriteQuotaExceeded(false);
            lastLocalWriteAtRef.current = Date.now();
            emitFirebaseStatus('synced', `Synced to Firebase Firestore`);
          }),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Firestore batch timeout')), 5500)
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
