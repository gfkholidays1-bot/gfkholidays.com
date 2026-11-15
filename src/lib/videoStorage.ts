// Universal Cloud Video Manager:
// 1. Primary: Firebase Storage CDN (https://firebasestorage.googleapis.com/...) for instant streaming on phones, Netlify & AI Studio
// 2. Fallback: Rate-limited retrying Firestore Chunks (cms_video_chunks) when Firebase Storage is not yet initialized in Console
// 3. Local Accelerator: IndexedDB cache keyed by cloud filename + version so stale browser videos never linger

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  getFirestoreRestBaseUrl,
  getActiveFirebaseConfig,
  fetchFirestoreDocRest,
  getFirebaseStorage,
  inspectFirebaseStorage
} from './firebase';

const DB_NAME = 'gfk_video_storage_db';
const DB_VERSION = 2;
const STORE_NAME = 'videos';
const HERO_VIDEO_CACHE_NAME = 'gfk-hero-video-v1';

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
  storageBackend?: 'firebase-storage' | 'firestore-chunks' | 'url' | 'local';
  isActive: boolean;
}

export interface StorageAuditResult {
  indexedDbKeys: string[];
  totalStoredCount: number;
  totalSizeFormatted: string;
  hasPreviousVideos: boolean;
  libraryCount: number;
}

const activeBlobUrls = new Map<string, { url: string; size: number; fileName?: string }>();
const httpCachedBlobUrls = new Map<string, string>();
const cachingInFlight = new Set<string>();
let bootWarmed = false;

export function getHeroPosterCache(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('gfk_hero_poster_image') || null;
  } catch (_e) {
    return null;
  }
}

export function saveHeroPosterCache(posterUrl?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (posterUrl) {
      localStorage.setItem('gfk_hero_poster_image', posterUrl);
    } else {
      localStorage.removeItem('gfk_hero_poster_image');
    }
  } catch (_e) {}
}

export function getWarmMemoryBlobUrl(
  key: string = UNIFIED_VIDEO_STORAGE_KEY,
  expectedCloudFileName?: string
): string | null {
  const cached = activeBlobUrls.get(key);
  if (
    cached &&
    cached.url &&
    (!expectedCloudFileName || !cached.fileName || cached.fileName === expectedCloudFileName)
  ) {
    return cached.url;
  }
  return null;
}

export function getWarmHttpBlobUrl(httpUrl?: string | null): string | null {
  if (!httpUrl) return null;
  return httpCachedBlobUrls.get(httpUrl) || null;
}

export async function getCachedPlayableVideoUrl(httpUrl: string): Promise<string> {
  if (typeof window === 'undefined' || !isUniversalHttpVideoUrl(httpUrl)) {
    return httpUrl;
  }
  const warmMem = httpCachedBlobUrls.get(httpUrl);
  if (warmMem) return warmMem;

  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(HERO_VIDEO_CACHE_NAME);
      const matched = await cache.match(httpUrl);
      if (matched && matched.ok) {
        const blob = await matched.blob();
        if (blob && blob.size > 1024) {
          const objUrl = URL.createObjectURL(blob);
          httpCachedBlobUrls.set(httpUrl, objUrl);
          return objUrl;
        }
      }
    } catch (_e) {}
  }
  return httpUrl;
}

export async function cacheHttpVideoInBackground(httpUrl?: string | null): Promise<void> {
  if (
    typeof window === 'undefined' ||
    typeof caches === 'undefined' ||
    !httpUrl ||
    !isUniversalHttpVideoUrl(httpUrl) ||
    httpCachedBlobUrls.has(httpUrl) ||
    cachingInFlight.has(httpUrl)
  ) {
    return;
  }

  cachingInFlight.add(httpUrl);
  try {
    const cache = await caches.open(HERO_VIDEO_CACHE_NAME);
    const existing = await cache.match(httpUrl);
    if (existing && existing.ok) {
      const blob = await existing.blob();
      if (blob && blob.size > 1024 && !httpCachedBlobUrls.has(httpUrl)) {
        httpCachedBlobUrls.set(httpUrl, URL.createObjectURL(blob));
      }
      return;
    }

    const res = await fetch(httpUrl, { mode: 'cors', credentials: 'omit' });
    if (res.ok && res.type !== 'opaque') {
      const lenHeader = Number(res.headers.get('content-length') || 0);
      // Only persist up to 65MB in browser Cache API so mobile storage stays healthy
      if (!lenHeader || lenHeader <= 65 * 1024 * 1024) {
        const cloneForCache = res.clone();
        const blob = await res.blob();
        if (blob.size > 1024 && blob.size <= 65 * 1024 * 1024) {
          await cache.put(httpUrl, cloneForCache);
          if (!httpCachedBlobUrls.has(httpUrl)) {
            httpCachedBlobUrls.set(httpUrl, URL.createObjectURL(blob));
          }
        }
      }
    }
  } catch (_e) {
  } finally {
    cachingInFlight.delete(httpUrl);
  }
}

export async function clearHttpVideoCache(): Promise<void> {
  httpCachedBlobUrls.forEach((blobUrl) => {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch (_e) {}
  });
  httpCachedBlobUrls.clear();
  if (typeof caches !== 'undefined') {
    try {
      await caches.delete(HERO_VIDEO_CACHE_NAME);
    } catch (_e) {}
  }
}

/**
 * Extract a lightweight compressed WebP poster frame from a Blob/File or CORS-enabled video URL
 * so desktop & mobile hero render frame-0 in 0ms before video buffers.
 */
export async function extractVideoPosterFrame(
  blobOrUrl: Blob | string,
  maxWidth = 960
): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  let tempObjectUrl: string | null = null;
  const videoSrc =
    blobOrUrl instanceof Blob
      ? (tempObjectUrl = URL.createObjectURL(blobOrUrl))
      : blobOrUrl;

  if (!videoSrc || videoSrc.startsWith('firestore-video://')) return null;

  return await new Promise<string | null>((resolve) => {
    const video = document.createElement('video');
    let settled = false;

    const cleanup = () => {
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch (_e) {}
      if (tempObjectUrl) {
        try {
          URL.revokeObjectURL(tempObjectUrl);
        } catch (_e) {}
      }
    };

    const done = (val: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve(val);
    };

    const timer = setTimeout(() => done(null), 5500);

    if (typeof blobOrUrl === 'string' && isUniversalHttpVideoUrl(blobOrUrl)) {
      video.crossOrigin = 'anonymous';
    }
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const captureFrame = () => {
      try {
        const vw = video.videoWidth || 0;
        const vh = video.videoHeight || 0;
        if (!vw || !vh) {
          done(null);
          return;
        }
        const scale = vw > maxWidth ? maxWidth / vw : 1;
        const w = Math.max(1, Math.round(vw * scale));
        const h = Math.max(1, Math.round(vh * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          done(null);
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        let dataUrl = canvas.toDataURL('image/webp', 0.72);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        }
        // Keep well inside Firestore settings/global document footprint (< 180KB)
        if (dataUrl.length > 180000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.58);
        }
        done(dataUrl.length <= 220000 ? dataUrl : null);
      } catch (_e) {
        done(null);
      }
    };

    video.onloadeddata = () => {
      try {
        if (video.duration && video.duration > 0.25) {
          video.currentTime = Math.min(0.25, video.duration / 4);
        } else {
          captureFrame();
        }
      } catch (_e) {
        captureFrame();
      }
    };
    video.onseeked = captureFrame;
    video.onerror = () => done(null);
    video.src = videoSrc;
  });
}

/**
 * Boot-time pre-warmer called in main.tsx before React renders so IndexedDB/Cache API
 * video blobs are already ready when Hero mounts.
 */
export function warmBootVideoCache(): void {
  if (typeof window === 'undefined' || bootWarmed) return;
  bootWarmed = true;

  try {
    let cachedUrl = localStorage.getItem('gfk_hero_video_url') || '';
    let cachedSource = getVideoSourceMode();
    let cachedFileName = localStorage.getItem('gfk_video_name_hero_background_video') || '';
    let cachedPoster = '';

    const rawSettings = localStorage.getItem('gfk_cache_settings');
    if (rawSettings) {
      try {
        const parsed = JSON.parse(rawSettings);
        const globalDoc = Array.isArray(parsed)
          ? parsed.find((item: any) => item?.id === 'global')
          : null;
        if (globalDoc) {
          if (globalDoc.heroVideoUrl) cachedUrl = globalDoc.heroVideoUrl;
          if (globalDoc.heroVideoSource === 'upload' || globalDoc.heroVideoSource === 'url') {
            cachedSource = globalDoc.heroVideoSource;
          }
          if (globalDoc.heroVideoFileName) cachedFileName = globalDoc.heroVideoFileName;
          if (globalDoc.heroFallbackImage) cachedPoster = globalDoc.heroFallbackImage;
        }
      } catch (_e) {}
    }

    if (cachedPoster) {
      saveHeroPosterCache(cachedPoster);
    }

    if (cachedUrl && isUniversalHttpVideoUrl(cachedUrl)) {
      getCachedPlayableVideoUrl(cachedUrl).then((resolved) => {
        if (resolved && resolved.startsWith('blob:')) {
          window.dispatchEvent(
            new CustomEvent('gfk-video-updated', {
              detail: {
                key: UNIFIED_VIDEO_STORAGE_KEY,
                videoUrl: resolved,
                serverUrl: cachedUrl,
                sourceMode: cachedSource,
                fileName: cachedFileName
              }
            })
          );
        } else {
          cacheHttpVideoInBackground(cachedUrl).catch(() => {});
        }
      });
      return;
    }

    if (cachedSource === 'upload' || isUploadedVideoUrl(cachedUrl)) {
      openVideoDatabase()
        .then((db) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(UNIFIED_VIDEO_STORAGE_KEY);
          req.onsuccess = (ev: any) => {
            const b = ev.target?.result;
            if (b instanceof Blob && !activeBlobUrls.has(UNIFIED_VIDEO_STORAGE_KEY)) {
              const objUrl = URL.createObjectURL(b);
              activeBlobUrls.set(UNIFIED_VIDEO_STORAGE_KEY, {
                url: objUrl,
                size: b.size,
                fileName: cachedFileName
              });
              window.dispatchEvent(
                new CustomEvent('gfk-video-updated', {
                  detail: {
                    key: UNIFIED_VIDEO_STORAGE_KEY,
                    videoUrl: objUrl,
                    serverUrl: cachedUrl || objUrl,
                    sourceMode: 'upload',
                    fileName: cachedFileName
                  }
                })
              );
            }
          };
        })
        .catch(() => {});
    }
  } catch (_e) {}
}

export function isUploadedVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return (
    url.startsWith('blob:') ||
    url.startsWith('/api/cms-video/') ||
    url.startsWith('/uploads/') ||
    url.startsWith('firestore-video://') ||
    url.includes('firebasestorage.googleapis.com')
  );
}

export function isUniversalHttpVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.startsWith('https://') || url.startsWith('http://');
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
 * so all browsers and deployments (Netlify, Phone, GitHub, AI Studio) receive the update immediately
 */
export async function patchFirestoreVideoSettings(
  videoUrl: string,
  fileName: string,
  sourceMode: 'upload' | 'url',
  extraMeta?: {
    chunkCount?: number;
    version?: number;
    mimeType?: string;
    sizeBytes?: number;
    posterDataUrl?: string | null;
  }
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
    if (extraMeta?.posterDataUrl) {
      maskFields.push('heroFallbackImage');
      fields.heroFallbackImage = { stringValue: extraMeta.posterDataUrl };
      saveHeroPosterCache(extraMeta.posterDataUrl);
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
 * Primary Upload Channel: Firebase Storage CDN (universal HTTPS URL for phones, Netlify & AI Studio)
 */
export async function uploadVideoToFirebaseStorage(
  storageKey: string,
  blob: Blob,
  fileName: string,
  onProgress?: (percent: number, loadedMb: string, totalMb: string, stageNote?: string) => void
): Promise<{ url: string | null; rulesLocked?: boolean; bucketMissing?: boolean }> {
  try {
    const storageStatus = await inspectFirebaseStorage();
    if (!storageStatus.exists) {
      console.warn(
        '[videoStorage] Firebase Storage bucket returned 404 (not yet enabled in Firebase Console); using throttled Firestore chunk fallback.'
      );
      return { url: null, bucketMissing: true };
    }
    if (storageStatus.rulesLocked) {
      console.warn(
        '[videoStorage] Firebase Storage bucket is in Production Mode (403 Permission Denied). Update Storage Rules for cms-videos/ in Firebase Console; using Firestore chunk fallback meanwhile.'
      );
      return { url: null, rulesLocked: true };
    }

    const storage = getFirebaseStorage();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectPath = `cms-videos/${storageKey}_${Date.now()}_${safeName}`;
    const storageRef = ref(storage, objectPath);
    const totalMb = (blob.size / (1024 * 1024)).toFixed(1);

    return await new Promise<{ url: string | null; rulesLocked?: boolean }>((resolve) => {
      const task = uploadBytesResumable(storageRef, blob, {
        contentType: blob.type || 'video/mp4',
        cacheControl: 'public, max-age=31536000, immutable'
      });

      let settled = false;
      let lastBytes = -1;
      let stallTimer: ReturnType<typeof setTimeout> | null = null;

      const resetInactivityTimer = () => {
        if (stallTimer) clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          if (!settled) {
            settled = true;
            try {
              task.cancel();
            } catch (_e) {}
            resolve({ url: null });
          }
        }, 35000);
      };

      resetInactivityTimer();

      task.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.bytesTransferred > lastBytes) {
            lastBytes = snapshot.bytesTransferred;
            resetInactivityTimer();
          }
          const pct = Math.min(
            99,
            Math.round((snapshot.bytesTransferred / Math.max(1, snapshot.totalBytes)) * 100)
          );
          const loadedMb = (snapshot.bytesTransferred / (1024 * 1024)).toFixed(1);
          if (onProgress) {
            onProgress(pct, loadedMb, totalMb, 'Uploading to Firebase Storage CDN');
          }
        },
        (err) => {
          if (stallTimer) clearTimeout(stallTimer);
          if (!settled) {
            settled = true;
            const code = String((err as any)?.code || '');
            const msg = String(err?.message || '');
            const isUnauthorized =
              code.includes('unauthorized') ||
              msg.includes('403') ||
              msg.toLowerCase().includes('permission');
            console.warn('[videoStorage] Firebase Storage upload failed, falling back:', msg);
            resolve({ url: null, rulesLocked: isUnauthorized });
          }
        },
        async () => {
          if (stallTimer) clearTimeout(stallTimer);
          if (settled) return;
          settled = true;
          try {
            const downloadUrl = await getDownloadURL(task.snapshot.ref);
            resolve({ url: downloadUrl });
          } catch (_e) {
            resolve({ url: null });
          }
        }
      );
    });
  } catch (err) {
    console.warn('[videoStorage] uploadVideoToFirebaseStorage warning:', err);
    return { url: null };
  }
}

async function patchChunkWithRetry(
  url: string,
  payload: string,
  maxRetries = 3
): Promise<boolean> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });
      if (res.ok) return true;
      if (res.status === 429 || res.status >= 500) {
        const delayMs = 650 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      return false;
    } catch (_e) {
      const delayMs = 650 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}

/**
 * Fallback Channel: Rate-limited & retrying Firebase Firestore Cloud Chunks (`cms_video_chunks`)
 * Uses concurrency=2 + exponential retry backoff so even 50MB-75MB videos succeed reliably
 * without triggering Firestore write bursts.
 */
export async function uploadVideoToFirestoreChunks(
  storageKey: string,
  blob: Blob,
  fileName: string,
  onProgress?: (percent: number, loadedMb: string, totalMb: string, stageNote?: string) => void
): Promise<{ ok: boolean; totalChunks: number; version: number; reason?: string }> {
  const CHUNK_RAW_BYTES = 525 * 1024; // 525 KB raw -> 700 KB Base64 (< 1 MiB Firestore doc limit)
  const totalBytes = blob.size;
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
  const totalChunks = Math.max(1, Math.ceil(totalBytes / CHUNK_RAW_BYTES));
  const mimeType = blob.type || 'video/mp4';
  const version = Date.now();
  const baseUrl = getFirestoreRestBaseUrl();
  const apiKey = getActiveFirebaseConfig().apiKey;
  const keyParam = apiKey ? `?key=${encodeURIComponent(apiKey)}` : '';

  if (totalBytes > 75 * 1024 * 1024) {
    return {
      ok: false,
      totalChunks: 0,
      version,
      reason: 'Video exceeds 75MB without Firebase Storage enabled. Enable Firebase Storage in Console for multi-hundred-MB 4K uploads.'
    };
  }

  try {
    let completedChunks = 0;
    const BATCH_CONCURRENCY = 2;

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

          const url = `${baseUrl}/cms_video_chunks/${encodeURIComponent(`${storageKey}_${i}`)}${keyParam}`;
          const payload = JSON.stringify({
            fields: {
              data: { stringValue: base64Data },
              index: { integerValue: String(i) },
              version: { integerValue: String(version) },
              fileName: { stringValue: fileName }
            }
          });

          const ok = await patchChunkWithRetry(url, payload, 3);
          if (!ok) return false;

          completedChunks++;
          if (onProgress) {
            const loadedBytes = Math.min(totalBytes, completedChunks * CHUNK_RAW_BYTES);
            const loadedMb = (loadedBytes / (1024 * 1024)).toFixed(1);
            const pct = Math.min(99, Math.round((completedChunks / totalChunks) * 100));
            onProgress(
              pct,
              loadedMb,
              totalMb,
              `Syncing video chunk ${completedChunks}/${totalChunks} to Firestore`
            );
          }
          return true;
        })
      );

      if (batchResults.some((ok) => !ok)) {
        return {
          ok: false,
          totalChunks: 0,
          version,
          reason: 'Firestore chunk write interrupted. Try enabling Firebase Storage or retry upload.'
        };
      }
    }

    const metaUrl = `${baseUrl}/cms_video_chunks/${encodeURIComponent(`${storageKey}_meta`)}${keyParam}`;
    const metaPayload = JSON.stringify({
      fields: {
        fileName: { stringValue: fileName },
        mimeType: { stringValue: mimeType },
        sizeBytes: { integerValue: String(totalBytes) },
        totalChunks: { integerValue: String(totalChunks) },
        version: { integerValue: String(version) },
        updatedAt: { integerValue: String(version) }
      }
    });
    const metaOk = await patchChunkWithRetry(metaUrl, metaPayload, 3);

    return { ok: metaOk, totalChunks: metaOk ? totalChunks : 0, version };
  } catch (err: any) {
    console.warn('[videoStorage] uploadVideoToFirestoreChunks error:', err);
    return { ok: false, totalChunks: 0, version, reason: err?.message };
  }
}

let activeCloudDownloadPromise: Promise<Blob | null> | null = null;

/**
 * Download and reassemble an uploaded video file from Firebase Firestore `cms_video_chunks`
 * across Netlify, Phone, and Google AI Studio.
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
    const fileName = String(
      metaFields.fileName?.stringValue || expectedFileName || 'uploaded-video.mp4'
    );
    const mimeType = String(metaFields.mimeType?.stringValue || 'video/mp4');
    const version = Number(metaFields.version?.integerValue || Date.now());

    if (totalChunks <= 0 || totalChunks > 220) return null;
    if (expectedFileName && fileName && fileName !== expectedFileName) {
      return null;
    }

    const orderedChunks: Uint8Array[] = new Array(totalChunks);
    const BATCH_CONCURRENCY = 16;

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
 * Upload video to Universal Cloud Storage:
 * 1) Try Firebase Storage CDN first -> returns permanent public HTTPS URL (instant streaming on phones, Netlify & AI Studio)
 * 2) If Firebase Storage bucket isn't enabled (404), fall back to throttled retrying Firestore chunks (cms_video_chunks)
 * 3) Optionally mirror to AI Studio Express server if running locally
 */
export async function uploadVideoToServer(
  storageKey: string,
  blob: Blob,
  fileName: string,
  onProgress?: (percent: number, loadedMb: string, totalMb: string, stageNote?: string) => void,
  posterDataUrl?: string | null
): Promise<{
  url: string | null;
  backend: 'firebase-storage' | 'firestore-chunks' | 'local';
  chunkCount: number;
  errorReason?: string;
}> {
  const totalBytes = blob.size;
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
  const videoType = blob.type || 'video/mp4';

  // 1. Primary: Firebase Storage CDN (universal HTTPS URL)
  const storageRes = await uploadVideoToFirebaseStorage(
    storageKey,
    blob,
    fileName,
    onProgress
  );

  if (storageRes.url) {
    const version = Date.now();
    await patchFirestoreVideoSettings(storageRes.url, fileName, 'upload', {
      chunkCount: 0,
      version,
      mimeType: videoType,
      sizeBytes: totalBytes,
      posterDataUrl
    });
    // Pre-seed Cache API on uploader browser too for instant 0ms local playback
    cacheHttpVideoInBackground(storageRes.url).catch(() => {});
    if (onProgress) {
      onProgress(100, totalMb, totalMb, 'Published to Firebase Storage CDN');
    }
    return {
      url: storageRes.url,
      backend: 'firebase-storage',
      chunkCount: 0
    };
  }

  // 2. Fallback: Rate-limited & retrying Firestore Cloud Chunks (`cms_video_chunks`)
  const firestoreChunkResult = await uploadVideoToFirestoreChunks(
    storageKey,
    blob,
    fileName,
    onProgress
  );

  if (firestoreChunkResult.ok && firestoreChunkResult.totalChunks > 0) {
    const version = firestoreChunkResult.version;
    const cloudVideoUri = `firestore-video://${storageKey}?v=${version}&name=${encodeURIComponent(fileName)}`;

    await patchFirestoreVideoSettings(cloudVideoUri, fileName, 'upload', {
      chunkCount: firestoreChunkResult.totalChunks,
      version,
      mimeType: videoType,
      sizeBytes: totalBytes,
      posterDataUrl
    });

    if (onProgress) {
      onProgress(100, totalMb, totalMb, 'Synced to Firebase Firestore Cloud Chunks');
    }

    return {
      url: cloudVideoUri,
      backend: 'firestore-chunks',
      chunkCount: firestoreChunkResult.totalChunks,
      errorReason: storageRes.rulesLocked
        ? 'Storage bucket is in Production Mode (403 Permission Denied) — update Storage Rules for cms-videos/ to stream via Firebase Storage CDN.'
        : undefined
    };
  }

  return {
    url: null,
    backend: 'local',
    chunkCount: 0,
    errorReason: storageRes.rulesLocked
      ? 'Firebase Storage blocked the upload because Production Mode rules deny writes (403). Update Storage Rules for cms-videos/ in Firebase Console -> Storage -> Rules.'
      : firestoreChunkResult.reason ||
        'Enable Firebase Storage in Firebase Console to sync large uploaded videos across devices.'
  };
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
 * Save a video Blob/File into IndexedDB AND upload universally to Firebase Storage (or Firestore Chunks fallback)
 */
export async function saveVideoBlob(
  storageKey: string,
  blob: Blob,
  customName?: string,
  onProgress?: (percent: number, loadedMb: string, totalMb: string, stageNote?: string) => void
): Promise<{
  playbackUrl: string;
  serverUrl: string | null;
  fileName: string;
  backend: 'firebase-storage' | 'firestore-chunks' | 'local';
  posterDataUrl?: string | null;
  errorReason?: string;
}> {
  const id = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fileName =
    customName || (blob as any).name || `video-${new Date().toISOString().slice(0, 10)}.mp4`;
  const sizeMb = (blob.size / (1024 * 1024)).toFixed(1);

  const objectUrl = URL.createObjectURL(blob);
  activeBlobUrls.set('hero_background_video', { url: objectUrl, size: blob.size, fileName });
  activeBlobUrls.set('featured_attractions_video', { url: objectUrl, size: blob.size, fileName });
  activeBlobUrls.set(storageKey, { url: objectUrl, size: blob.size, fileName });

  // Extract instant WebP poster frame at frame-0 while saving to IndexedDB
  const [posterDataUrl] = await Promise.all([
    extractVideoPosterFrame(blob).catch(() => null),
    (async () => {
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
    })()
  ]);

  if (posterDataUrl) {
    saveHeroPosterCache(posterDataUrl);
  }

  const uploadResult = await uploadVideoToServer(
    'hero_background_video',
    blob,
    fileName,
    onProgress,
    posterDataUrl
  );

  const persistentUrl = uploadResult.url;
  try {
    localStorage.setItem('gfk_video_cached_hero_background_video', 'true');
    localStorage.setItem('gfk_video_cached_featured_attractions_video', 'true');
    localStorage.setItem(`gfk_video_cached_${storageKey}`, 'true');
    localStorage.setItem(`gfk_video_name_${storageKey}`, fileName);
    localStorage.setItem('gfk_video_name_hero_background_video', fileName);
    localStorage.setItem(`gfk_video_active_id_${storageKey}`, id);
    if (persistentUrl) {
      localStorage.setItem('gfk_hero_video_url', persistentUrl);
      localStorage.setItem('gfk_featured_video_url', persistentUrl);
    }
  } catch (_e) {}

  setVideoSourceMode('upload', persistentUrl || undefined, fileName);

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
    url: persistentUrl && persistentUrl.startsWith('https://') ? persistentUrl : objectUrl,
    serverUrl: persistentUrl || undefined,
    storageBackend: uploadResult.backend,
    isActive: true
  };

  updatedList.unshift(newItem);
  saveStoredVideosList(storageKey, updatedList);

  return {
    playbackUrl: persistentUrl && persistentUrl.startsWith('https://') ? persistentUrl : objectUrl,
    serverUrl: persistentUrl,
    fileName,
    backend: uploadResult.backend,
    posterDataUrl,
    errorReason: uploadResult.errorReason
  };
}

/**
 * Promote an existing `firestore-video://` uploaded video (saved during Storage Production Mode 403)
 * up to Firebase Storage CDN for instant HTTP 206 streaming across mobile & desktop browsers.
 */
export async function migrateCachedVideoToFirebaseStorage(
  expectedFileName?: string,
  onProgress?: (percent: number, loadedMb: string, totalMb: string, stageNote?: string) => void
): Promise<{
  ok: boolean;
  url?: string;
  fileName?: string;
  posterDataUrl?: string | null;
  reason?: string;
}> {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'Client environment required.' };
  }

  let targetBlob: Blob | null = null;
  let resolvedName =
    expectedFileName ||
    localStorage.getItem('gfk_video_name_hero_background_video') ||
    'hero-video.mp4';

  try {
    const db = await openVideoDatabase();
    targetBlob = await new Promise<Blob | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(UNIFIED_VIDEO_STORAGE_KEY);
      req.onsuccess = (ev: any) => resolve(ev.target?.result instanceof Blob ? ev.target.result : null);
      req.onerror = () => resolve(null);
    });
  } catch (_e) {}

  if (!targetBlob) {
    const downloaded = await downloadVideoFromFirestoreChunks(
      UNIFIED_VIDEO_STORAGE_KEY,
      expectedFileName
    );
    if (downloaded) {
      targetBlob = downloaded.blob;
      resolvedName = downloaded.fileName || resolvedName;
    }
  }

  if (!targetBlob) {
    return {
      ok: false,
      reason: 'Could not locate cached video binary to promote. Please re-upload the video file.'
    };
  }

  const storageRes = await uploadVideoToFirebaseStorage(
    UNIFIED_VIDEO_STORAGE_KEY,
    targetBlob,
    resolvedName,
    onProgress
  );

  if (!storageRes.url) {
    return {
      ok: false,
      reason: storageRes.rulesLocked
        ? 'Firebase Storage Rules still deny writes (HTTP 403). Publish the cms-videos/ rules in Firebase Console -> Storage -> Rules first.'
        : storageRes.bucketMissing
        ? 'Firebase Storage bucket is not initialized yet.'
        : 'Firebase Storage upload did not complete.'
    };
  }

  const posterDataUrl =
    getHeroPosterCache() || (await extractVideoPosterFrame(targetBlob).catch(() => null));

  await patchFirestoreVideoSettings(storageRes.url, resolvedName, 'upload', {
    chunkCount: 0,
    version: Date.now(),
    mimeType: targetBlob.type || 'video/mp4',
    sizeBytes: targetBlob.size,
    posterDataUrl
  });

  setVideoSourceMode('upload', storageRes.url, resolvedName);
  cacheHttpVideoInBackground(storageRes.url).catch(() => {});

  const list = getStoredVideosList(UNIFIED_VIDEO_STORAGE_KEY).map((item) =>
    item.isActive
      ? {
          ...item,
          url: storageRes.url!,
          serverUrl: storageRes.url!,
          storageBackend: 'firebase-storage' as const
        }
      : item
  );
  saveStoredVideosList(UNIFIED_VIDEO_STORAGE_KEY, list);

  return {
    ok: true,
    url: storageRes.url,
    fileName: resolvedName,
    posterDataUrl
  };
}

/**
 * Register a URL in the stored video library and switch priority mode to 'url'
 */
export async function registerUrlInLibrary(
  storageKey: string,
  url: string,
  customLabel?: string
): Promise<string | null> {
  setVideoSourceMode('url');
  activeBlobUrls.clear();
  await deleteVideoBlob('hero_background_video');
  await deleteVideoBlob('featured_attractions_video');

  try {
    localStorage.setItem('gfk_hero_video_url', url);
    localStorage.setItem('gfk_featured_video_url', url);
  } catch (_e) {}

  const posterDataUrl = await extractVideoPosterFrame(url).catch(() => null);
  await patchFirestoreVideoSettings(url, customLabel || '', 'url', {
    chunkCount: 0,
    posterDataUrl
  });
  cacheHttpVideoInBackground(url).catch(() => {});

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
      storageBackend: 'url',
      isActive: true
    });
  }

  saveStoredVideosList(storageKey, updatedList);
  return posterDataUrl;
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

export async function ensureUploadedVideoSyncedToServer(
  key: string = UNIFIED_VIDEO_STORAGE_KEY,
  expectedCloudFileName?: string
): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (expectedCloudFileName) {
    await evictStaleLocalVideoIfMismatch(expectedCloudFileName);
  }
  return getUploadedServerVideoUrl();
}

/**
 * Retrieve active uploaded video for playback on Phone, Netlify, or AI Studio:
 * 1) If cloud URL is a universal HTTPS URL (https://firebasestorage.googleapis.com/... or https://...), return it directly!
 * 2) Otherwise check IndexedDB (matching cloud filename) -> download Firestore cms_video_chunks -> return instant blob: URL
 */
export async function loadVideoBlob(
  key: string = UNIFIED_VIDEO_STORAGE_KEY,
  expectedCloudFileName?: string,
  cloudVideoUrl?: string
): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // Universal HTTPS CDN URLs check Cache API for 0ms instant disk playback, otherwise stream immediately
  if (cloudVideoUrl && isUniversalHttpVideoUrl(cloudVideoUrl)) {
    const cachedUrl = await getCachedPlayableVideoUrl(cloudVideoUrl);
    if (cachedUrl === cloudVideoUrl) {
      cacheHttpVideoInBackground(cloudVideoUrl).catch(() => {});
    }
    return cachedUrl;
  }

  if (expectedCloudFileName) {
    await evictStaleLocalVideoIfMismatch(expectedCloudFileName);
  }

  const cachedMem = activeBlobUrls.get(key);
  if (
    cachedMem &&
    cachedMem.url &&
    (!expectedCloudFileName || !cachedMem.fileName || cachedMem.fileName === expectedCloudFileName)
  ) {
    return cachedMem.url;
  }

  // 1. Check local IndexedDB ONLY if local filename matches expectedCloudFileName
  try {
    const localName = localStorage.getItem('gfk_video_name_hero_background_video') || '';
    const matchesCloud =
      !expectedCloudFileName || !localName || localName === expectedCloudFileName;

    if (matchesCloud) {
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
    }
  } catch (_e) {}

  // 2. Download from Firebase Firestore Cloud Chunks (`cms_video_chunks`) across Netlify / Phone / AI Studio
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

  // 3. Last resort: check local Express stream only if running on AI Studio container and filename matches
  if (typeof window !== 'undefined' && (window.location.hostname.includes('run.app') || window.location.hostname === 'localhost')) {
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
  }

  return null;
}

export async function activateStoredVideo(
  item: StoredVideoItem,
  storageKey: string = UNIFIED_VIDEO_STORAGE_KEY
): Promise<{ activeUrl: string; cloudUrl: string; sourceMode: 'upload' | 'url'; fileName: string } | null> {
  if (item.type === 'url' && item.url) {
    setVideoSourceMode('url');
    await deleteVideoBlob('hero_background_video');
    await deleteVideoBlob('featured_attractions_video');
    await patchFirestoreVideoSettings(item.url, item.name, 'url', { chunkCount: 0 });
    const list = getStoredVideosList(storageKey).map((v) => ({
      ...v,
      isActive: v.id === item.id
    }));
    saveStoredVideosList(storageKey, list);
    return { activeUrl: item.url, cloudUrl: item.url, sourceMode: 'url', fileName: item.name };
  }

  if (item.serverUrl && isUniversalHttpVideoUrl(item.serverUrl)) {
    setVideoSourceMode('upload', item.serverUrl, item.name);
    await patchFirestoreVideoSettings(item.serverUrl, item.name, 'upload', { chunkCount: 0 });
    const list = getStoredVideosList(storageKey).map((v) => ({
      ...v,
      isActive: v.id === item.id
    }));
    saveStoredVideosList(storageKey, list);
    return { activeUrl: item.serverUrl, cloudUrl: item.serverUrl, sourceMode: 'upload', fileName: item.name };
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
      const uploadResult = await uploadVideoToServer('hero_background_video', blob, item.name);
      const objUrl = URL.createObjectURL(blob);
      activeBlobUrls.set('hero_background_video', {
        url: objUrl,
        size: blob.size,
        fileName: item.name
      });
      const finalCloudUrl = uploadResult.url || item.serverUrl || objUrl;
      const playbackUrl =
        uploadResult.url && isUniversalHttpVideoUrl(uploadResult.url) ? uploadResult.url : objUrl;

      setVideoSourceMode('upload', finalCloudUrl, item.name);
      const list = getStoredVideosList(storageKey).map((v) => ({
        ...v,
        serverUrl: finalCloudUrl,
        isActive: v.id === item.id
      }));
      saveStoredVideosList(storageKey, list);

      return {
        activeUrl: playbackUrl,
        cloudUrl: finalCloudUrl,
        sourceMode: 'upload',
        fileName: item.name
      };
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
  saveHeroPosterCache(null);
  await clearHttpVideoCache();

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
    src.includes('firebasestorage.googleapis.com') ||
    src.includes('/api/cms-video/') ||
    src.includes('/uploads/') ||
    src.includes('.mp4') ||
    src.includes('.webm') ||
    src.includes('.mov') ||
    src.includes('pixabay.com/video')
  );
}
