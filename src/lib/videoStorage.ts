// IndexedDB-backed, Server-backed & Firebase Firestore Cloud-Chunked storage manager for uploaded video files
// Guarantees uploaded video files sync across Netlify, GitHub Pages, Google AI Studio, and all browsers

import {
  getFirestoreRestBaseUrl,
  getActiveFirebaseConfig,
  fetchFirestoreDocRest
} from './firebase';

const DB_NAME = 'gfk_video_storage_db';
const DB_VERSION = 2;
const STORE_NAME = 'videos';

export const UNIFIED_VIDEO_STORAGE_KEY = 'hero_background_video';

export const DEFAULT_SCENIC_HERO_VIDEO =
  'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4';
export const DEFAULT_FEATURED_VIDEO =
  'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4';

export interface StoredVideoItem {
  id: string;
  storageKey: string;
  name: string;
  sizeBytes: number;
  sizeFormatted: string;
  uploadedAt: string;
  type: 'file' | 'url';
  url?: string;
  serverUrl?: string;
  isActive: boolean;
}

export interface StorageAuditResult {
  indexedDbKeys: string[];
  totalStoredCount: number;
  totalSizeFormatted: string;
  hasPreviousVideos: boolean;
  libraryCount: number;
}

// Cache object URLs by key + blob size so repeated loadVideoBlob calls return the exact same blob: URL
// without unmounting or restarting <video> elements
const activeBlobUrls = new Map<string, { url: string; size: number; fileName?: string }>();

export function isUploadedVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return (
    url.startsWith('blob:') ||
    url.startsWith('/api/cms-video/') ||
    url.startsWith('/uploads/') ||
    url.startsWith('firestore-video://')
  );
}

export function getVideoSourceMode(): 'upload' | 'url' {
  if (typeof window === 'undefined') return 'url';
  try {
    const mode = localStorage.getItem('gfk_video_source_mode');
    if (mode === 'upload' || mode === 'url') return mode;
    if (
      localStorage.getItem('gfk_video_cached_hero_background_video') === 'true' ||
      Boolean(localStorage.getItem('gfk_uploaded_server_video_url'))
    ) {
      return 'upload';
    }
  } catch (_e) {}
  return 'url';
}

export function setVideoSourceMode(
  mode: 'upload' | 'url',
  serverVideoUrl?: string,
  fileName?: string
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('gfk_video_source_mode', mode);
    if (mode === 'upload') {
      if (serverVideoUrl) {
        localStorage.setItem('gfk_uploaded_server_video_url', serverVideoUrl);
      }
      if (fileName) {
        localStorage.setItem('gfk_video_name_hero_background_video', fileName);
      }
    } else {
      localStorage.removeItem('gfk_uploaded_server_video_url');
      localStorage.removeItem('gfk_video_cached_hero_background_video');
      localStorage.removeItem('gfk_video_cached_featured_attractions_video');
    }
  } catch (_e) {}
}

export function getUploadedServerVideoUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('gfk_uploaded_server_video_url') || null;
  } catch (_e) {
    return null;
  }
}

function openVideoDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

const getLibraryStorageKey = (storageKey: string) => `gfk_video_lib_${storageKey}`;

export function getStoredVideosList(
  storageKey: string = UNIFIED_VIDEO_STORAGE_KEY
): StoredVideoItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getLibraryStorageKey(storageKey));
    const list: StoredVideoItem[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (_e) {
    return [];
  }
}

function saveStoredVideosList(storageKey: string, list: StoredVideoItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getLibraryStorageKey(storageKey), JSON.stringify(list));
  } catch (_e) {}
}

async function blobSliceToBase64(slice: Blob): Promise<string> {
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + step))
    );
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Patch Firebase Firestore settings/global with the active video URL & metadata
 * so all browsers and deployments (Netlify, GitHub, AI Studio) receive the update immediately
 */
export async function patchFirestoreVideoSettings(
  videoUrl: string,
  fileName: string,
  sourceMode: 'upload' | 'url',
  extraMeta?: { chunkCount?: number; version?: number; mimeType?: string; sizeBytes?: number }
): Promise<boolean> {
  try {
    const baseUrl = getFirestoreRestBaseUrl();
    const apiKey = getActiveFirebaseConfig().apiKey;
    const now = extraMeta?.version || Date.now();
    const maskFields = [
      'heroVideoUrl',
      'featuredVideoEmbedUrl',
      'heroVideoSource',
      'heroVideoFileName',
      '_updatedAt'
    ];
    const fields: Record<string, any> = {
      heroVideoUrl: { stringValue: videoUrl },
      featuredVideoEmbedUrl: { stringValue: videoUrl },
      heroVideoSource: { stringValue: sourceMode },
      heroVideoFileName: { stringValue: fileName || '' },
      _updatedAt: { integerValue: String(now) }
    };

    if (extraMeta?.chunkCount !== undefined) {
      maskFields.push('heroVideoChunkCount');
      fields.heroVideoChunkCount = { integerValue: String(extraMeta.chunkCount) };
    }
    if (extraMeta?.version !== undefined) {
      maskFields.push('heroVideoVersion');
      fields.heroVideoVersion = { integerValue: String(extraMeta.version) };
    }
    if (extraMeta?.mimeType) {
      maskFields.push('heroVideoMimeType');
      fields.heroVideoMimeType = { stringValue: extraMeta.mimeType };
    }
    if (extraMeta?.sizeBytes !== undefined) {
      maskFields.push('heroVideoSize');
      fields.heroVideoSize = { integerValue: String(extraMeta.sizeBytes) };
    }

    const maskParams = maskFields.map((f) => `updateMask.fieldPaths=${f}`).join('&');
    const keyQuery = apiKey ? `&key=${encodeURIComponent(apiKey)}` : '';
    const res = await fetch(`${baseUrl}/settings/global?${maskParams}${keyQuery}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    return res.ok;
  } catch (_e) {
    return false;
  }
}

/**
 * Upload video binary in 525KB raw chunks (~700KB Base64 per document) directly into Firebase Firestore
 * collection `cms_video_chunks`. This works on Netlify, GitHub Pages, and Google AI Studio alike without
 * needing a shared Express filesystem!
 */
export async function uploadVideoToFirestoreChunks(
  storageKey: string,
  blob: Blob,
  fileName: string,
  onProgress?: (percent: number, loadedMb: string, totalMb: string) => void
): Promise<{ ok: boolean; totalChunks: number; version: number }> {
  const CHUNK_RAW_BYTES = 525 * 1024; // 525 KB raw -> 700 KB Base64 (safely under Firestore 1 MiB doc limit)
  const totalBytes = blob.size;
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
  const totalChunks = Math.max(1, Math.ceil(totalBytes / CHUNK_RAW_BYTES));
  const mimeType = blob.type || 'video/mp4';
  const version = Date.now();
  const baseUrl = getFirestoreRestBaseUrl();
  const apiKey = getActiveFirebaseConfig().apiKey;
  const keyParam = apiKey ? `?key=${encodeURIComponent(apiKey)}` : '';

  // Cap cloud-chunked video size at 65 MB (~125 chunks) to protect Firestore daily write quota
  if (totalBytes > 65 * 1024 * 1024) {
    console.warn('[videoStorage] Video exceeds 65MB Firestore chunk cap; skipping Firestore chunk upload');
    return { ok: false, totalChunks: 0, version };
  }

  try {
    let completedChunks = 0;
    const BATCH_CONCURRENCY = 5;

    for (let batchStart = 0; batchStart < totalChunks; batchStart += BATCH_CONCURRENCY) {
      const batchIndices: number[] = [];
      for (
        let idx = batchStart;
        idx < Math.min(batchStart + BATCH_CONCURRENCY, totalChunks);
        idx++
      ) {
        batchIndices.push(idx);
      }

      const batchResults = await Promise.all(
        batchIndices.map(async (i) => {
          const start = i * CHUNK_RAW_BYTES;
          const end = Math.min(start + CHUNK_RAW_BYTES, totalBytes);
          const slice = blob.slice(start, end, mimeType);
          const base64Data = await blobSliceToBase64(slice);

          const res = await fetch(
            `${baseUrl}/cms_video_chunks/${encodeURIComponent(`${storageKey}_${i}`)}${keyParam}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: {
                  data: { stringValue: base64Data },
                  index: { integerValue: String(i) },
                  version: { integerValue: String(version) },
                  fileName: { stringValue: fileName }
                }
              })
            }
          );
          if (!res.ok) return false;
          completedChunks++;
          if (onProgress) {
            const loadedBytes = Math.min(totalBytes, completedChunks * CHUNK_RAW_BYTES);
            const loadedMb = (loadedBytes / (1024 * 1024)).toFixed(1);
            const pct = Math.min(99, Math.round((completedChunks / totalChunks) * 100));
            onProgress(pct, loadedMb, totalMb);
          }
          return true;
        })
      );

      if (batchResults.some((ok) => !ok)) {
        return { ok: false, totalChunks: 0, version };
      }
    }

    // Write metadata document cms_video_chunks/${storageKey}_meta
    const metaRes = await fetch(
      `${baseUrl}/cms_video_chunks/${encodeURIComponent(`${storageKey}_meta`)}${keyParam}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            fileName: { stringValue: fileName },
            mimeType: { stringValue: mimeType },
            sizeBytes: { integerValue: String(totalBytes) },
            totalChunks: { integerValue: String(totalChunks) },
            version: { integerValue: String(version) },
            updatedAt: { integerValue: String(version) }
          }
        })
      }
    );

    return { ok: metaRes.ok, totalChunks, version };
  } catch (err) {
    console.warn('[videoStorage] uploadVideoToFirestoreChunks error:', err);
    return { ok: false, totalChunks: 0, version };
  }
}

let activeCloudDownloadPromise: Promise<Blob | null> | null = null;

/**
 * Download and reassemble an uploaded video file from Firebase Firestore `cms_video_chunks`.
 * Uses `fetchFirestoreDocRest` which automatically falls back to `PATCH ?updateMask.fieldPaths=_noop`
 * when Firestore's 50,000 daily read quota is exhausted!
 */
export async function downloadVideoFromFirestoreChunks(
  storageKey: string = UNIFIED_VIDEO_STORAGE_KEY,
  expectedFileName?: string
): Promise<{ blob: Blob; fileName: string; version: number } | null> {
  try {
    const metaDoc = await fetchFirestoreDocRest('cms_video_chunks', `${storageKey}_meta`);
    const metaFields = metaDoc?.fields;
    if (!metaFields) return null;

    const totalChunks = Number(metaFields.totalChunks?.integerValue || 0);
    const fileName = String(metaFields.fileName?.stringValue || expectedFileName || 'uploaded-video.mp4');
    const mimeType = String(metaFields.mimeType?.stringValue || 'video/mp4');
    const version = Number(metaFields.version?.integerValue || Date.now());

    if (totalChunks <= 0 || totalChunks > 200) return null;
    if (expectedFileName && fileName && fileName !== expectedFileName) {
      return null;
    }

    const orderedChunks: Uint8Array[] = new Array(totalChunks);
    const BATCH_CONCURRENCY = 5;

    for (let batchStart = 0; batchStart < totalChunks; batchStart += BATCH_CONCURRENCY) {
      const indices: number[] = [];
      for (
        let idx = batchStart;
        idx < Math.min(batchStart + BATCH_CONCURRENCY, totalChunks);
        idx++
      ) {
        indices.push(idx);
      }

      const chunkDocs = await Promise.all(
        indices.map((i) => fetchFirestoreDocRest('cms_video_chunks', `${storageKey}_${i}`))
      );

      for (let k = 0; k < indices.length; k++) {
        const chunkIdx = indices[k];
        const b64 = chunkDocs[k]?.fields?.data?.stringValue;
        if (!b64 || typeof b64 !== 'string') {
          return null;
        }
        orderedChunks[chunkIdx] = base64ToUint8Array(b64);
      }
    }

    const reconstructed = new Blob(orderedChunks, { type: mimeType });
    return { blob: reconstructed, fileName, version };
  } catch (err) {
    console.warn('[videoStorage] downloadVideoFromFirestoreChunks error:', err);
    return null;
  }
}

/**
 * Upload video binary in 4MB chunks to Express backend (/api/cms-video-chunk/:key) if available,
 * AND upload to Firebase Firestore (`cms_video_chunks`) so Netlify and Google AI Studio share the exact same video!
 */
export async function uploadVideoToServer(
  storageKey: string,
  blob: Blob,
  fileName: string,
  onProgress?: (percent: number, loadedMb: string, totalMb: string) => void
): Promise<string | null> {
  const CHUNK_SIZE = 4 * 1024 * 1024;
  const totalBytes = blob.size;
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
  const totalChunks = Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE));
  const videoType = blob.type || 'video/mp4';

  let expressVideoUrl: string | null = null;

  // 1. Try uploading to local Express server (succeeds in Google AI Studio; fails fast on chunk 0 on Netlify)
  try {
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalBytes);
      const chunk = blob.slice(start, end, videoType);

      const query = new URLSearchParams({
        index: String(i),
        total: String(totalChunks),
        fileName: encodeURIComponent(fileName),
        videoType
      });

      const res = await fetch(
        `/api/cms-video-chunk/${encodeURIComponent(storageKey)}?${query.toString()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Video-Type': videoType,
            'X-Video-Name': encodeURIComponent(fileName)
          },
          body: chunk
        }
      );

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        break;
      }

      const data = await res.json();
      if (data && data.complete && data.videoUrl) {
        expressVideoUrl = data.videoUrl as string;
      }
    }
  } catch (_err) {
    // Express backend not present (e.g. Netlify static host)
  }

  // 2. Upload chunks to Firebase Firestore (`cms_video_chunks`) so Netlify, AI Studio, and all browsers share this video
  const firestoreChunkResult = await uploadVideoToFirestoreChunks(
    storageKey,
    blob,
    fileName,
    onProgress
  );

  const version = firestoreChunkResult.version || Date.now();
  const finalVideoUrl = expressVideoUrl || `/api/cms-video/${storageKey}?v=${version}`;

  await patchFirestoreVideoSettings(finalVideoUrl, fileName, 'upload', {
    chunkCount: firestoreChunkResult.totalChunks,
    version,
    mimeType: videoType,
    sizeBytes: totalBytes
  });

  if (onProgress) {
    onProgress(100, totalMb, totalMb);
  }

  return finalVideoUrl;
}

export async function auditStoredVideos(
  storageKey: string = UNIFIED_VIDEO_STORAGE_KEY
): Promise<StorageAuditResult> {
  const result: StorageAuditResult = {
    indexedDbKeys: [],
    totalStoredCount: 0,
    totalSizeFormatted: '0 MB',
    hasPreviousVideos: false,
    libraryCount: 0
  };

  if (typeof window === 'undefined') return result;

  const libItems = getStoredVideosList(storageKey);
  result.libraryCount = libItems.length;

  try {
    const db = await openVideoDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        result.indexedDbKeys = (req.result || []).map(String);
        resolve();
      };
      req.onerror = () => resolve();
    });
  } catch (_e) {}

  result.totalStoredCount = Math.max(result.indexedDbKeys.length, libItems.length);
  result.hasPreviousVideos = result.indexedDbKeys.length > 0 || libItems.length > 0;

  let totalBytes = 0;
  libItems.forEach((i) => {
    totalBytes += i.sizeBytes || 0;
  });
  if (totalBytes > 0) {
    result.totalSizeFormatted = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return result;
}

/**
 * Save a video Blob/File into IndexedDB AND upload to Server + Firebase Firestore Chunks
 */
export async function saveVideoBlob(
  storageKey: string,
  blob: Blob,
  customName?: string,
  onProgress?: (percent: number, loadedMb: string, totalMb: string) => void
): Promise<{ playbackUrl: string; serverUrl: string | null; fileName: string }> {
  const id = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fileName =
    customName || (blob as any).name || `video-${new Date().toISOString().slice(0, 10)}.mp4`;
  const sizeMb = (blob.size / (1024 * 1024)).toFixed(1);

  // 1. Save in IndexedDB first for instant 0ms local blob playback
  const objectUrl = URL.createObjectURL(blob);
  activeBlobUrls.set('hero_background_video', { url: objectUrl, size: blob.size, fileName });
  activeBlobUrls.set('featured_attractions_video', { url: objectUrl, size: blob.size, fileName });
  activeBlobUrls.set(storageKey, { url: objectUrl, size: blob.size, fileName });

  try {
    const db = await openVideoDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      store.put(blob, 'hero_background_video');
      store.put(blob, 'featured_attractions_video');
      store.put(blob, storageKey);
      store.put(blob, id);

      tx.oncomplete = () => resolve();
      tx.onerror = (e: any) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[videoStorage] IndexedDB write warning:', err);
  }

  // 2. Upload to Express Server (if present) AND Firebase Firestore Chunks (for Netlify <-> AI Studio sync)
  const serverUrl = await uploadVideoToServer('hero_background_video', blob, fileName, onProgress);
  const effectivePersistentUrl = serverUrl || `/api/cms-video/hero_background_video?v=${Date.now()}`;

  try {
    localStorage.setItem('gfk_video_cached_hero_background_video', 'true');
    localStorage.setItem('gfk_video_cached_featured_attractions_video', 'true');
    localStorage.setItem(`gfk_video_cached_${storageKey}`, 'true');
    localStorage.setItem(`gfk_video_name_${storageKey}`, fileName);
    localStorage.setItem('gfk_video_name_hero_background_video', fileName);
    localStorage.setItem(`gfk_video_active_id_${storageKey}`, id);
    localStorage.setItem('gfk_hero_video_url', effectivePersistentUrl);
    localStorage.setItem('gfk_featured_video_url', effectivePersistentUrl);
  } catch (_e) {}

  setVideoSourceMode('upload', effectivePersistentUrl, fileName);

  const existing = getStoredVideosList(storageKey);
  const updatedList: StoredVideoItem[] = existing.map((item) => ({
    ...item,
    isActive: false
  }));

  const newItem: StoredVideoItem = {
    id,
    storageKey,
    name: fileName,
    sizeBytes: blob.size,
    sizeFormatted: `${sizeMb} MB`,
    uploadedAt: new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    type: 'file',
    url: objectUrl,
    serverUrl: effectivePersistentUrl,
    isActive: true
  };

  updatedList.unshift(newItem);
  saveStoredVideosList(storageKey, updatedList);

  return {
    playbackUrl: objectUrl,
    serverUrl: effectivePersistentUrl,
    fileName
  };
}

/**
 * Register a URL in the stored video library and switch priority mode to 'url'
 */
export async function registerUrlInLibrary(
  storageKey: string,
  url: string,
  customLabel?: string
): Promise<void> {
  setVideoSourceMode('url');
  activeBlobUrls.clear();
  await deleteVideoBlob('hero_background_video');
  await deleteVideoBlob('featured_attractions_video');

  try {
    localStorage.setItem('gfk_hero_video_url', url);
    localStorage.setItem('gfk_featured_video_url', url);
  } catch (_e) {}

  await patchFirestoreVideoSettings(url, customLabel || '', 'url');

  const existing = getStoredVideosList(storageKey);
  const updatedList: StoredVideoItem[] = existing.map((item) => ({
    ...item,
    isActive: item.url === url
  }));

  const already = updatedList.find((i) => i.url === url && i.type === 'url');
  if (already) {
    already.isActive = true;
  } else {
    let name = customLabel;
    if (!name) {
      try {
        const parsed = new URL(url);
        name = parsed.pathname.split('/').filter(Boolean).pop() || 'Web Video Link';
      } catch {
        name = 'External Video Link';
      }
    }

    updatedList.unshift({
      id: `url_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      storageKey,
      name,
      sizeBytes: 0,
      sizeFormatted: 'Cloud Stream',
      uploadedAt: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      type: 'url',
      url,
      isActive: true
    });
  }

  saveStoredVideosList(storageKey, updatedList);
}

let isBackgroundSyncingVideo = false;

async function fetchCurrentCloudVideoMeta(): Promise<{
  heroVideoSource?: string;
  heroVideoFileName?: string;
  heroVideoUrl?: string;
  heroVideoChunkCount?: number;
  heroVideoVersion?: number;
} | null> {
  try {
    const docJson = await fetchFirestoreDocRest('settings', 'global');
    const fields = docJson?.fields;
    if (!fields) return null;
    return {
      heroVideoSource: fields.heroVideoSource?.stringValue,
      heroVideoFileName: fields.heroVideoFileName?.stringValue,
      heroVideoUrl: fields.heroVideoUrl?.stringValue,
      heroVideoChunkCount: Number(fields.heroVideoChunkCount?.integerValue || 0),
      heroVideoVersion: Number(fields.heroVideoVersion?.integerValue || 0)
    };
  } catch (_e) {
    return null;
  }
}

export async function evictStaleLocalVideoIfMismatch(cloudFileName?: string): Promise<boolean> {
  if (typeof window === 'undefined' || !cloudFileName) return false;
  try {
    const localName = localStorage.getItem('gfk_video_name_hero_background_video') || '';
    if (localName && localName !== cloudFileName) {
      activeBlobUrls.forEach((val) => {
        try {
          URL.revokeObjectURL(val.url);
        } catch (_e) {}
      });
      activeBlobUrls.clear();
      await deleteVideoBlob('hero_background_video');
      await deleteVideoBlob('featured_attractions_video');
      localStorage.setItem('gfk_video_name_hero_background_video', cloudFileName);
      return true;
    }
  } catch (_e) {}
  return false;
}

export async function syncIndexedDbBlobToServerIfNeeded(blob: Blob): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (isBackgroundSyncingVideo) {
    return getUploadedServerVideoUrl();
  }
  isBackgroundSyncingVideo = true;
  try {
    const savedName = localStorage.getItem('gfk_video_name_hero_background_video') || '';
    const cloudMeta = await fetchCurrentCloudVideoMeta();
    if (cloudMeta?.heroVideoSource === 'url') {
      return null;
    }
    if (
      cloudMeta?.heroVideoFileName &&
      savedName &&
      savedName !== cloudMeta.heroVideoFileName
    ) {
      await evictStaleLocalVideoIfMismatch(cloudMeta.heroVideoFileName);
      return null;
    }

    const effectiveName = savedName || cloudMeta?.heroVideoFileName || 'uploaded-hero-video.mp4';

    // Check if Firestore cms_video_chunks already has this exact video
    const chunkMetaDoc = await fetchFirestoreDocRest(
      'cms_video_chunks',
      'hero_background_video_meta'
    );
    const chunkMetaFields = chunkMetaDoc?.fields;
    const firestoreHasMatchingChunks =
      chunkMetaFields &&
      chunkMetaFields.fileName?.stringValue === effectiveName &&
      Number(chunkMetaFields.sizeBytes?.integerValue || 0) === blob.size &&
      Number(chunkMetaFields.totalChunks?.integerValue || 0) > 0;

    // Also check if local Express server (when running in AI Studio) has this exact video
    let serverHasMatchingVideo = false;
    let serverVideoUrl = '/api/cms-video/hero_background_video';
    try {
      const checkRes = await fetch('/api/cms-video/hero_background_video', { method: 'HEAD' });
      if (checkRes.ok) {
        const serverSize = Number(checkRes.headers.get('x-video-size') || 0);
        let serverFileName = '';
        try {
          serverFileName = decodeURIComponent(checkRes.headers.get('x-video-name') || '');
        } catch (_e) {}
        serverVideoUrl =
          checkRes.headers.get('x-video-url') || '/api/cms-video/hero_background_video';
        if (
          serverSize === blob.size &&
          serverSize > 0 &&
          (!effectiveName || !serverFileName || serverFileName === effectiveName)
        ) {
          serverHasMatchingVideo = true;
        }
      }
    } catch (_e) {}

    if (firestoreHasMatchingChunks && serverHasMatchingVideo) {
      localStorage.setItem('gfk_uploaded_server_video_url', serverVideoUrl);
      return serverVideoUrl;
    }

    // If this browser (e.g. Netlify tab or AI Studio tab) holds the active video in IndexedDB,
    // push it to Firestore chunks (and Express if available) so the other environment gets it!
    const uploadedUrl = await uploadVideoToServer('hero_background_video', blob, effectiveName);
    if (uploadedUrl) {
      localStorage.setItem('gfk_uploaded_server_video_url', uploadedUrl);
      localStorage.setItem('gfk_hero_video_url', uploadedUrl);
      localStorage.setItem('gfk_featured_video_url', uploadedUrl);
      return uploadedUrl;
    }
  } catch (_e) {
  } finally {
    isBackgroundSyncingVideo = false;
  }
  return null;
}

export async function ensureUploadedVideoSyncedToServer(
  key: string = UNIFIED_VIDEO_STORAGE_KEY,
  expectedCloudFileName?: string
): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    if (expectedCloudFileName) {
      await evictStaleLocalVideoIfMismatch(expectedCloudFileName);
    }
    const db = await openVideoDatabase();
    const blob: Blob | null = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = (e: any) => {
        const res = e.target.result;
        resolve(res instanceof Blob ? res : null);
      };
      req.onerror = () => resolve(null);
    });
    if (blob) {
      return await syncIndexedDbBlobToServerIfNeeded(blob);
    }
  } catch (_e) {}
  return getUploadedServerVideoUrl();
}

/**
 * Retrieve the active uploaded video from:
 * 1) Local in-memory / IndexedDB cache (if filename matches active Firestore heroVideoFileName)
 * 2) Firebase Firestore Cloud Chunks (`cms_video_chunks`) — works across Netlify & Google AI Studio!
 * 3) Local Express server (`/api/cms-video/hero_background_video`) ONLY if its X-Video-Name matches expectedCloudFileName
 */
export async function loadVideoBlob(
  key: string = UNIFIED_VIDEO_STORAGE_KEY,
  expectedCloudFileName?: string
): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (expectedCloudFileName) {
    await evictStaleLocalVideoIfMismatch(expectedCloudFileName);
  }

  const cachedMem = activeBlobUrls.get(key);
  if (
    cachedMem &&
    cachedMem.url &&
    (!expectedCloudFileName || !cachedMem.fileName || cachedMem.fileName === expectedCloudFileName)
  ) {
    ensureUploadedVideoSyncedToServer(key, expectedCloudFileName);
    return cachedMem.url;
  }

  // 1. Check local IndexedDB
  try {
    const db = await openVideoDatabase();
    const localBlob: Blob | null = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = (event: any) => {
        const b = event.target.result;
        resolve(b instanceof Blob ? b : null);
      };
      request.onerror = () => resolve(null);
    });

    if (localBlob) {
      syncIndexedDbBlobToServerIfNeeded(localBlob);
      const existing = activeBlobUrls.get(key);
      if (existing && existing.size === localBlob.size) {
        return existing.url;
      }
      const created = URL.createObjectURL(localBlob);
      activeBlobUrls.set(key, {
        url: created,
        size: localBlob.size,
        fileName: expectedCloudFileName
      });
      return created;
    }
  } catch (_e) {}

  // 2. Not in local IndexedDB — check if Firebase Firestore `cms_video_chunks` has the uploaded video!
  try {
    if (!activeCloudDownloadPromise) {
      activeCloudDownloadPromise = downloadVideoFromFirestoreChunks(
        'hero_background_video',
        expectedCloudFileName
      )
        .then(async (downloaded) => {
          if (!downloaded) return null;
          try {
            const db = await openVideoDatabase();
            await new Promise<void>((resolve) => {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              const store = tx.objectStore(STORE_NAME);
              store.put(downloaded.blob, 'hero_background_video');
              store.put(downloaded.blob, 'featured_attractions_video');
              store.put(downloaded.blob, key);
              tx.oncomplete = () => resolve();
              tx.onerror = () => resolve();
            });
            localStorage.setItem('gfk_video_cached_hero_background_video', 'true');
            localStorage.setItem('gfk_video_name_hero_background_video', downloaded.fileName);
          } catch (_e) {}
          return downloaded.blob;
        })
        .finally(() => {
          activeCloudDownloadPromise = null;
        });
    }

    const cloudBlob = await activeCloudDownloadPromise;
    if (cloudBlob) {
      const created = URL.createObjectURL(cloudBlob);
      activeBlobUrls.set(key, {
        url: created,
        size: cloudBlob.size,
        fileName: expectedCloudFileName
      });
      return created;
    }
  } catch (_e) {}

  // 3. Check Express server `/api/cms-video/hero_background_video` ONLY if its filename matches expectedCloudFileName
  try {
    const headRes = await fetch('/api/cms-video/hero_background_video', { method: 'HEAD' });
    if (headRes.ok) {
      let serverFileName = '';
      try {
        serverFileName = decodeURIComponent(headRes.headers.get('x-video-name') || '');
      } catch (_e) {}
      const serverVideoUrl =
        headRes.headers.get('x-video-url') || '/api/cms-video/hero_background_video';
      if (!expectedCloudFileName || !serverFileName || serverFileName === expectedCloudFileName) {
        return serverVideoUrl;
      }
    }
  } catch (_e) {}

  return null;
}

export async function activateStoredVideo(
  item: StoredVideoItem,
  storageKey: string = UNIFIED_VIDEO_STORAGE_KEY
): Promise<{ activeUrl: string; sourceMode: 'upload' | 'url'; fileName: string } | null> {
  if (item.type === 'url' && item.url) {
    setVideoSourceMode('url');
    await deleteVideoBlob('hero_background_video');
    await deleteVideoBlob('featured_attractions_video');
    try {
      localStorage.setItem('gfk_hero_video_url', item.url);
      localStorage.setItem('gfk_featured_video_url', item.url);
    } catch (_e) {}
    const list = getStoredVideosList(storageKey).map((v) => ({
      ...v,
      isActive: v.id === item.id
    }));
    saveStoredVideosList(storageKey, list);
    return { activeUrl: item.url, sourceMode: 'url', fileName: item.name };
  }

  try {
    const db = await openVideoDatabase();
    const blob: Blob | null = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(item.id);

      getReq.onsuccess = (event: any) => {
        const b = event.target.result;
        if (b instanceof Blob) {
          store.put(b, 'hero_background_video');
          store.put(b, 'featured_attractions_video');
          store.put(b, storageKey);
          resolve(b);
        } else {
          resolve(null);
        }
      };

      getReq.onerror = () => resolve(null);
    });

    if (blob) {
      const serverUrl = await uploadVideoToServer('hero_background_video', blob, item.name);
      const objUrl = URL.createObjectURL(blob);
      activeBlobUrls.set('hero_background_video', {
        url: objUrl,
        size: blob.size,
        fileName: item.name
      });
      const finalUrl = serverUrl || objUrl;

      setVideoSourceMode('upload', serverUrl || undefined, item.name);
      try {
        localStorage.setItem(`gfk_video_cached_${storageKey}`, 'true');
        localStorage.setItem('gfk_video_cached_hero_background_video', 'true');
        localStorage.setItem(`gfk_video_name_${storageKey}`, item.name);
        localStorage.setItem('gfk_video_name_hero_background_video', item.name);
        localStorage.setItem(`gfk_video_active_id_${storageKey}`, item.id);
        localStorage.setItem('gfk_hero_video_url', finalUrl);
        localStorage.setItem('gfk_featured_video_url', finalUrl);
      } catch (_e) {}

      const list = getStoredVideosList(storageKey).map((v) => ({
        ...v,
        isActive: v.id === item.id
      }));
      saveStoredVideosList(storageKey, list);

      return { activeUrl: objUrl, sourceMode: 'upload', fileName: item.name };
    } else if (item.serverUrl) {
      setVideoSourceMode('upload', item.serverUrl, item.name);
      const list = getStoredVideosList(storageKey).map((v) => ({
        ...v,
        isActive: v.id === item.id
      }));
      saveStoredVideosList(storageKey, list);
      return { activeUrl: item.serverUrl, sourceMode: 'upload', fileName: item.name };
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteStoredVideoItem(
  id: string,
  storageKey: string = UNIFIED_VIDEO_STORAGE_KEY
): Promise<{ wasActive: boolean }> {
  const currentList = getStoredVideosList(storageKey);
  const target = currentList.find((v) => v.id === id);
  const wasActive = Boolean(target?.isActive);

  if (target?.url && target.url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(target.url);
    } catch (_e) {}
  }

  try {
    const db = await openVideoDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      if (wasActive) {
        store.delete(storageKey);
        store.delete('hero_background_video');
        store.delete('featured_attractions_video');
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (_e) {}

  if (wasActive) {
    setVideoSourceMode('url');
    try {
      await fetch('/api/cms-video/hero_background_video', { method: 'DELETE' });
    } catch (_e) {}
    try {
      localStorage.removeItem(`gfk_video_cached_${storageKey}`);
      localStorage.removeItem('gfk_video_cached_hero_background_video');
      localStorage.removeItem('gfk_video_cached_featured_attractions_video');
      localStorage.removeItem(`gfk_video_name_${storageKey}`);
      localStorage.removeItem(`gfk_video_active_id_${storageKey}`);
      localStorage.removeItem('gfk_hero_video_url');
      localStorage.removeItem('gfk_featured_video_url');
    } catch (_e) {}
  }

  const nextList = currentList.filter((v) => v.id !== id);
  saveStoredVideosList(storageKey, nextList);

  return { wasActive };
}

export async function deleteVideoBlob(key: string): Promise<void> {
  try {
    const db = await openVideoDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      try {
        localStorage.removeItem(`gfk_video_cached_${key}`);
        localStorage.removeItem(`gfk_video_name_${key}`);
        localStorage.removeItem(`gfk_video_active_id_${key}`);
      } catch (_e) {}
      resolve();
    });
  } catch (_e) {}
}

export async function clearAllStoredVideos(
  storageKey: string = UNIFIED_VIDEO_STORAGE_KEY
): Promise<void> {
  const list = getStoredVideosList(storageKey);
  for (const item of list) {
    if (item.url && item.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(item.url);
      } catch (_e) {}
    }
  }

  try {
    const db = await openVideoDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(storageKey);
      store.delete('hero_background_video');
      store.delete('featured_attractions_video');
      for (const item of list) {
        if (item.type === 'file') {
          store.delete(item.id);
        }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (_e) {}

  try {
    await fetch('/api/cms-video/hero_background_video', { method: 'DELETE' });
  } catch (_e) {}

  setVideoSourceMode('url');

  try {
    localStorage.removeItem(getLibraryStorageKey(storageKey));
    localStorage.removeItem(`gfk_video_cached_${storageKey}`);
    localStorage.removeItem('gfk_video_cached_hero_background_video');
    localStorage.removeItem('gfk_video_cached_featured_attractions_video');
    localStorage.removeItem(`gfk_video_name_${storageKey}`);
    localStorage.removeItem(`gfk_video_active_id_${storageKey}`);
    localStorage.removeItem('gfk_hero_video_url');
    localStorage.removeItem('gfk_featured_video_url');
  } catch (_e) {}
}

export async function purgeAllVideoStorage(): Promise<{ purgedCount: number }> {
  let purgedCount = 0;

  if (typeof window === 'undefined') return { purgedCount: 0 };

  try {
    await fetch('/api/cms-video/hero_background_video', { method: 'DELETE' });
  } catch (_e) {}

  try {
    const db = await openVideoDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => {
        purgedCount += 5;
        resolve();
      };
      req.onerror = () => resolve();
    });
    db.close();
  } catch (_e) {}

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (
      k &&
      (k.startsWith('gfk_video_') ||
        k.startsWith('gfk_hero_video') ||
        k.startsWith('gfk_featured_video') ||
        k.startsWith('gfk_uploaded_server_video') ||
        k.includes('custom_hero_video') ||
        k.includes('cms_hero_video'))
    ) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach((k) => {
    localStorage.removeItem(k);
    purgedCount++;
  });

  setVideoSourceMode('url');

  return { purgedCount };
}

export function isDirectVideoSource(src?: string): boolean {
  if (!src) return false;
  return (
    src.startsWith('blob:') ||
    src.startsWith('data:video') ||
    src.startsWith('/api/cms-video/') ||
    src.startsWith('/uploads/') ||
    src.startsWith('firestore-video://') ||
    src.includes('/api/cms-video/') ||
    src.includes('/uploads/') ||
    src.includes('.mp4') ||
    src.includes('.webm') ||
    src.includes('.mov') ||
    src.includes('pixabay.com/video')
  );
}
