// IndexedDB-backed & Server-backed storage & library manager for uploaded video files
// Ensures uploaded video files take strict priority over URLs when active, and persist across tabs & browsers

const DB_NAME = 'gfk_video_storage_db';
const DB_VERSION = 2;
const STORE_NAME = 'videos';

export const UNIFIED_VIDEO_STORAGE_KEY = 'hero_background_video';

export const DEFAULT_SCENIC_HERO_VIDEO =
  'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4';
export const DEFAULT_FEATURED_VIDEO =
  'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4';

export interface StoredVideoItem {
  id: string; // Unique identifier (e.g. vid_1730000000_abc)
  storageKey: string; // hero_background_video
  name: string; // e.g. "malaysia_hero_drone.mp4"
  sizeBytes: number;
  sizeFormatted: string; // e.g. "18.4 MB"
  uploadedAt: string; // e.g. "24 Oct 2026, 4:45 PM"
  type: 'file' | 'url';
  url?: string; // Direct link, server URL (/api/cms-video/...), or cached blob object URL
  serverUrl?: string; // Persistent server stream URL (/api/cms-video/hero_background_video?v=...)
  isActive: boolean;
}

export interface StorageAuditResult {
  indexedDbKeys: string[];
  totalStoredCount: number;
  totalSizeFormatted: string;
  hasPreviousVideos: boolean;
  libraryCount: number;
}

/**
 * Get or set the explicit video source priority ('upload' vs 'url').
 * When 'upload' is active, external URLs are prevented from overriding the uploaded video file.
 */
export function getVideoSourceMode(): 'upload' | 'url' {
  if (typeof window === 'undefined') return 'url';
  try {
    const mode = localStorage.getItem('gfk_video_source_mode');
    if (mode === 'upload' || mode === 'url') return mode;
    if (localStorage.getItem('gfk_video_cached_hero_background_video') === 'true') {
      return 'upload';
    }
  } catch (_e) {}
  return 'url';
}

export function setVideoSourceMode(mode: 'upload' | 'url', serverVideoUrl?: string, fileName?: string): void {
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

/**
 * Get all stored videos metadata list for a specific key (merges legacy featured_attractions_video if needed)
 */
export function getStoredVideosList(storageKey: string = UNIFIED_VIDEO_STORAGE_KEY): StoredVideoItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getLibraryStorageKey(storageKey));
    const list: StoredVideoItem[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (_e) {
    return [];
  }
}

/**
 * Save updated list to localStorage
 */
function saveStoredVideosList(storageKey: string, list: StoredVideoItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getLibraryStorageKey(storageKey), JSON.stringify(list));
  } catch (_e) {}
}

/**
 * Upload video binary to Express backend (/api/cms-video/hero_background_video) so it persists across browsers & tabs
 */
export async function uploadVideoToServer(
  storageKey: string,
  blob: Blob,
  fileName: string
): Promise<string | null> {
  try {
    const res = await fetch(`/api/cms-video/${encodeURIComponent(storageKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': blob.type || 'video/mp4',
        'X-Video-Type': blob.type || 'video/mp4',
        'X-Video-Name': encodeURIComponent(fileName)
      },
      body: blob
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.videoUrl) {
        return data.videoUrl as string;
      }
    }
  } catch (err) {
    console.warn('[videoStorage] Server video upload fallback to local IndexedDB:', err);
  }
  return null;
}

/**
 * Scan all stored videos in IndexedDB & localStorage to check if previous videos exist
 */
export async function auditStoredVideos(storageKey: string = UNIFIED_VIDEO_STORAGE_KEY): Promise<StorageAuditResult> {
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
 * Save a video Blob/File into IndexedDB AND upload to server, locking source mode to 'upload'
 */
export async function saveVideoBlob(
  storageKey: string,
  blob: Blob,
  customName?: string
): Promise<{ playbackUrl: string; serverUrl: string | null; fileName: string }> {
  const id = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fileName =
    customName || (blob as any).name || `video-${new Date().toISOString().slice(0, 10)}.mp4`;
  const sizeMb = (blob.size / (1024 * 1024)).toFixed(1);

  // 1. Upload to backend server so it gets a permanent HTTP streaming URL (/api/cms-video/hero_background_video?v=...)
  const serverUrl = await uploadVideoToServer('hero_background_video', blob, fileName);

  // 2. Save in IndexedDB for instant 0ms local blob playback
  const objectUrl = URL.createObjectURL(blob);
  try {
    const db = await openVideoDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      // Store under unified keys and unique library ID
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

  const effectivePersistentUrl = serverUrl || objectUrl;

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

  // Lock source mode to 'upload' so external URLs cannot override the uploaded file
  setVideoSourceMode('upload', serverUrl || undefined, fileName);

  // Update library list
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
    url: serverUrl || objectUrl,
    serverUrl: serverUrl || undefined,
    isActive: true
  };

  updatedList.unshift(newItem);
  saveStoredVideosList(storageKey, updatedList);

  return {
    playbackUrl: serverUrl || objectUrl,
    serverUrl,
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
  // Explicitly switch mode to 'url' and remove active blob overrides so uploaded video no longer blocks URL
  setVideoSourceMode('url');
  await deleteVideoBlob('hero_background_video');
  await deleteVideoBlob('featured_attractions_video');

  try {
    localStorage.setItem('gfk_hero_video_url', url);
    localStorage.setItem('gfk_featured_video_url', url);
  } catch (_e) {}

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

/**
 * Retrieve a stored video Blob from IndexedDB ONLY if source mode is 'upload'
 */
export async function loadVideoBlob(key: string = UNIFIED_VIDEO_STORAGE_KEY): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // If the admin explicitly switched to URL mode, do not return stale IndexedDB blobs
  if (getVideoSourceMode() === 'url') {
    return null;
  }

  // First check if we have a server-streamed URL for the uploaded video
  const serverUrl = getUploadedServerVideoUrl();

  try {
    const db = await openVideoDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = (event: any) => {
        const blob = event.target.result;
        if (blob instanceof Blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(serverUrl);
        }
      };

      request.onerror = () => {
        resolve(serverUrl);
      };
    });
  } catch (_e) {
    return serverUrl;
  }
}

/**
 * Set an existing library item as active
 */
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

  // File in IndexedDB
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
      const finalUrl = serverUrl || objUrl;

      setVideoSourceMode('upload', serverUrl || undefined, item.name);
      try {
        localStorage.setItem(`gfk_video_cached_${storageKey}`, 'true');
        localStorage.setItem('gfk_video_cached_hero_background_video', 'true');
        localStorage.setItem(`gfk_video_name_${storageKey}`, item.name);
        localStorage.setItem(`gfk_video_active_id_${storageKey}`, item.id);
        localStorage.setItem('gfk_hero_video_url', finalUrl);
        localStorage.setItem('gfk_featured_video_url', finalUrl);
      } catch (_e) {}

      const list = getStoredVideosList(storageKey).map((v) => ({
        ...v,
        isActive: v.id === item.id
      }));
      saveStoredVideosList(storageKey, list);

      return { activeUrl: finalUrl, sourceMode: 'upload', fileName: item.name };
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

/**
 * Delete a specific stored video item from library and IndexedDB
 */
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

/**
 * Delete a stored video from IndexedDB
 */
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

/**
 * Clear all stored videos for a specific key
 */
export async function clearAllStoredVideos(storageKey: string = UNIFIED_VIDEO_STORAGE_KEY): Promise<void> {
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

/**
 * Master Purge: Eradicate ALL previous uploaded video files from IndexedDB, Server, and localStorage
 */
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

/**
 * Helper to determine if a URL is a direct video file/stream (vs an iframe embed)
 */
export function isDirectVideoSource(src?: string): boolean {
  if (!src) return false;
  return (
    src.startsWith('blob:') ||
    src.startsWith('data:video') ||
    src.startsWith('/api/cms-video/') ||
    src.includes('/api/cms-video/') ||
    src.includes('.mp4') ||
    src.includes('.webm') ||
    src.includes('.mov') ||
    src.includes('pixabay.com/video')
  );
}
