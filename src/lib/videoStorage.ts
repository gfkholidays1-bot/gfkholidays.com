// IndexedDB-backed local storage & library manager for uploaded video files
// Bypasses Firestore's 1MB document limit, allowing videos up to 500MB to play smoothly

const DB_NAME = 'gfk_video_storage_db';
const DB_VERSION = 2;
const STORE_NAME = 'videos';

export const DEFAULT_SCENIC_HERO_VIDEO =
  'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4';
export const DEFAULT_FEATURED_VIDEO =
  'https://viddler.com/embed/player?id=20382&color=default';

export interface StoredVideoItem {
  id: string; // Unique identifier (e.g. vid_1730000000_abc)
  storageKey: string; // hero_background_video or featured_attractions_video
  name: string; // e.g. "malaysia_hero_drone.mp4"
  sizeBytes: number;
  sizeFormatted: string; // e.g. "18.4 MB"
  uploadedAt: string; // e.g. "24 Oct 2026, 4:45 PM"
  type: 'file' | 'url';
  url?: string; // Direct link or cached blob object URL
  isActive: boolean;
}

export interface StorageAuditResult {
  indexedDbKeys: string[];
  totalStoredCount: number;
  totalSizeFormatted: string;
  hasPreviousVideos: boolean;
  libraryCount: number;
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
 * Get all stored videos metadata list for a specific key
 */
export function getStoredVideosList(storageKey: string): StoredVideoItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getLibraryStorageKey(storageKey));
    if (!raw) return [];
    const list: StoredVideoItem[] = JSON.parse(raw);
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
 * Scan all stored videos in IndexedDB & localStorage to check if previous videos exist
 */
export async function auditStoredVideos(storageKey: string): Promise<StorageAuditResult> {
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
 * Save a video Blob/File into IndexedDB under storageKey and create a library record
 */
export async function saveVideoBlob(
  storageKey: string,
  blob: Blob,
  customName?: string
): Promise<string> {
  const db = await openVideoDatabase();
  const id = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fileName = customName || (blob as any).name || `video-${new Date().toISOString().slice(0, 10)}.mp4`;
  const sizeMb = (blob.size / (1024 * 1024)).toFixed(1);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Store under both the active storageKey (for immediate lookup) and unique id (for library persistence)
    store.put(blob, storageKey);
    store.put(blob, id);

    tx.oncomplete = () => {
      const objectUrl = URL.createObjectURL(blob);
      try {
        localStorage.setItem(`gfk_video_cached_${storageKey}`, 'true');
        localStorage.setItem(`gfk_video_name_${storageKey}`, fileName);
        localStorage.setItem(`gfk_video_active_id_${storageKey}`, id);
        if (storageKey === 'hero_background_video') {
          localStorage.setItem('gfk_hero_video_url', objectUrl);
        }
      } catch (_e) {}

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
        url: objectUrl,
        isActive: true
      };

      updatedList.unshift(newItem);
      saveStoredVideosList(storageKey, updatedList);

      resolve(objectUrl);
    };

    tx.onerror = (e: any) => {
      reject(e.target.error);
    };
  });
}

/**
 * Register a URL in the stored video library
 */
export function registerUrlInLibrary(
  storageKey: string,
  url: string,
  customLabel?: string
): void {
  const existing = getStoredVideosList(storageKey);
  const updatedList: StoredVideoItem[] = existing.map((item) => ({
    ...item,
    isActive: item.url === url
  }));

  const already = updatedList.find((i) => i.url === url);
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
 * Retrieve a stored video Blob from IndexedDB and return an active Object URL
 */
export async function loadVideoBlob(key: string): Promise<string | null> {
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
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (_e) {
    return null;
  }
}

/**
 * Set an existing library item as active
 */
export async function activateStoredVideo(
  item: StoredVideoItem,
  storageKey: string
): Promise<string | null> {
  if (item.type === 'url' && item.url) {
    // URL video
    await deleteVideoBlob(storageKey); // clear active blob override
    const list = getStoredVideosList(storageKey).map((v) => ({
      ...v,
      isActive: v.id === item.id
    }));
    saveStoredVideosList(storageKey, list);
    return item.url;
  }

  // File in IndexedDB
  try {
    const db = await openVideoDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(item.id);

      getReq.onsuccess = (event: any) => {
        const blob = event.target.result;
        if (blob instanceof Blob) {
          store.put(blob, storageKey);
          const objUrl = URL.createObjectURL(blob);

          try {
            localStorage.setItem(`gfk_video_cached_${storageKey}`, 'true');
            localStorage.setItem(`gfk_video_name_${storageKey}`, item.name);
            localStorage.setItem(`gfk_video_active_id_${storageKey}`, item.id);
            if (storageKey === 'hero_background_video') {
              localStorage.setItem('gfk_hero_video_url', objUrl);
            }
          } catch (_e) {}

          const list = getStoredVideosList(storageKey).map((v) => ({
            ...v,
            isActive: v.id === item.id
          }));
          saveStoredVideosList(storageKey, list);

          resolve(objUrl);
        } else {
          resolve(null);
        }
      };

      getReq.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

/**
 * Delete a specific stored video item from library and IndexedDB
 * Returns boolean indicating if the deleted video was the active one
 */
export async function deleteStoredVideoItem(
  id: string,
  storageKey: string
): Promise<{ wasActive: boolean }> {
  const currentList = getStoredVideosList(storageKey);
  const target = currentList.find((v) => v.id === id);
  const wasActive = Boolean(target?.isActive);

  // Revoke object URL if exists
  if (target?.url && target.url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(target.url);
    } catch (_e) {}
  }

  // Delete from IndexedDB if it was a file
  try {
    const db = await openVideoDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      if (wasActive) {
        store.delete(storageKey);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (_e) {}

  if (wasActive) {
    try {
      localStorage.removeItem(`gfk_video_cached_${storageKey}`);
      localStorage.removeItem(`gfk_video_name_${storageKey}`);
      localStorage.removeItem(`gfk_video_active_id_${storageKey}`);
      if (storageKey === 'hero_background_video') {
        localStorage.removeItem('gfk_hero_video_url');
      } else if (storageKey === 'featured_attractions_video') {
        localStorage.removeItem('gfk_featured_video_url');
      }
    } catch (_e) {}
  }

  // Update library list
  const nextList = currentList.filter((v) => v.id !== id);
  saveStoredVideosList(storageKey, nextList);

  return { wasActive };
}

/**
 * Delete a stored video from IndexedDB (legacy fallback)
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
export async function clearAllStoredVideos(storageKey: string): Promise<void> {
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
    localStorage.removeItem(getLibraryStorageKey(storageKey));
    localStorage.removeItem(`gfk_video_cached_${storageKey}`);
    localStorage.removeItem(`gfk_video_name_${storageKey}`);
    localStorage.removeItem(`gfk_video_active_id_${storageKey}`);
    if (storageKey === 'hero_background_video') {
      localStorage.removeItem('gfk_hero_video_url');
    } else if (storageKey === 'featured_attractions_video') {
      localStorage.removeItem('gfk_featured_video_url');
    }
  } catch (_e) {}
}

/**
 * Master Purge: Eradicate ALL previous uploaded video files from both IndexedDB and localStorage
 */
export async function purgeAllVideoStorage(): Promise<{ purgedCount: number }> {
  let purgedCount = 0;

  if (typeof window === 'undefined') return { purgedCount: 0 };

  // 1. Clear IndexedDB store
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

  // 2. Clear all video-related localStorage keys
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (
      k &&
      (k.startsWith('gfk_video_') ||
        k.startsWith('gfk_hero_video') ||
        k.startsWith('gfk_featured_video') ||
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

  return { purgedCount };
}
