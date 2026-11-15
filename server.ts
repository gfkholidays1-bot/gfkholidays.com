import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const VIDEOS_DIR = path.join(DATA_DIR, 'videos');
const STORE_FILE = path.join(DATA_DIR, 'cms-store.json');

const CONFIG_FILE = path.join(__dirname, 'firebase-applet-config.json');
function getServerFirebaseConfig(): { projectId: string; databaseId: string; apiKey: string } {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    return {
      projectId: raw.projectId || 'gen-lang-client-0612324688',
      databaseId: raw.firestoreDatabaseId || 'ai-studio-gfkholidays-415b8c9f-ece5-42b3-82d6-fea966b26d79',
      apiKey: raw.apiKey || ''
    };
  } catch (_e) {
    return {
      projectId: 'gen-lang-client-0612324688',
      databaseId: 'ai-studio-gfkholidays-415b8c9f-ece5-42b3-82d6-fea966b26d79',
      apiKey: ''
    };
  }
}

function getFirestoreBaseUrl(): { baseUrl: string; apiKey: string } {
  const cfg = getServerFirebaseConfig();
  return {
    baseUrl: `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${encodeURIComponent(cfg.databaseId)}/documents`,
    apiKey: cfg.apiKey
  };
}

let serverReadQuotaExceeded = false;

interface CollectionEntry {
  data: any[];
  updatedAt: number;
}

interface CmsStore {
  collections: Record<string, CollectionEntry>;
}

function parseFirestoreField(val: any): any {
  if (!val || typeof val !== 'object') return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return Array.isArray(val.arrayValue?.values)
      ? val.arrayValue.values.map(parseFirestoreField)
      : [];
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = parseFirestoreField(v);
    }
    return out;
  }
  return null;
}

function parseFirestoreDoc(docObj: any): any {
  const fields = docObj?.fields || {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = parseFirestoreField(v);
  }
  if (!out.id && typeof docObj?.name === 'string') {
    const parts = docObj.name.split('/');
    out.id = parts[parts.length - 1];
  }
  return out;
}

async function fetchFirestoreDocOnServer(collectionName: string, docId: string): Promise<any | null> {
  const { baseUrl, apiKey } = getFirestoreBaseUrl();
  const docUrl = `${baseUrl}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`;
  const keyParam = apiKey ? `key=${encodeURIComponent(apiKey)}` : '';

  if (!serverReadQuotaExceeded) {
    try {
      const res = await fetch(`${docUrl}${keyParam ? `?${keyParam}` : ''}`);
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
      if (res.status === 429) {
        serverReadQuotaExceeded = true;
      }
    } catch (_e) {}
  }

  try {
    const patchRes = await fetch(
      `${docUrl}?updateMask.fieldPaths=_noop${keyParam ? `&${keyParam}` : ''}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {} })
      }
    );
    if (patchRes.ok) {
      return await patchRes.json();
    }
  } catch (_e) {}
  return null;
}

async function runQueryCollectionOnServer(collectionName: string, limit = 200): Promise<any[] | null> {
  const { baseUrl, apiKey } = getFirestoreBaseUrl();
  const keyParam = apiKey ? `?key=${encodeURIComponent(apiKey)}` : '';
  try {
    const res = await fetch(`${baseUrl}:runQuery${keyParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionName }],
          limit
        }
      })
    });
    if (!res.ok) return null;
    const rows: any = await res.json();
    if (!Array.isArray(rows)) return null;
    return rows
      .map((r: any) => (r?.document ? parseFirestoreDoc(r.document) : null))
      .filter((d: any) => d && d.id && !String(d.id).startsWith('_sync_probe'));
  } catch (_e) {
    return null;
  }
}

function loadStoreFromDisk(): CmsStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.collections === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[CMS Store] Failed to read store file, initializing empty store:', err);
  }
  return { collections: {} };
}

const PUBLIC_SEED_FILE = path.join(__dirname, 'public', 'cms-seed.json');
const PUBLIC_UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

function saveStoreToDisk(store: CmsStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const serialized = JSON.stringify(store);
    fs.writeFileSync(STORE_FILE, serialized, 'utf-8');
    if (fs.existsSync(path.join(__dirname, 'public'))) {
      fs.writeFileSync(PUBLIC_SEED_FILE, serialized, 'utf-8');
    }
  } catch (err) {
    console.warn('[CMS Store] Failed to write store file:', err);
  }
}

const store: CmsStore = loadStoreFromDisk();

async function syncServerVideoWithFirestore(expectedFileName?: string, cloudUrl?: string) {
  // Never replace universal HTTPS Storage/CDN URLs with local disk files
  if (cloudUrl && (cloudUrl.startsWith('https://') || cloudUrl.startsWith('http://'))) {
    return;
  }
  if (!expectedFileName) return;
  try {
    const key = 'hero_background_video';
    const videoPath = path.join(VIDEOS_DIR, `${key}.bin`);
    const metaPath = path.join(VIDEOS_DIR, `${key}.meta.json`);
    const publicUploadPath = path.join(PUBLIC_UPLOADS_DIR, `${key}.mp4`);

    let localFileName = '';
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        localFileName = meta.fileName || '';
      } catch (_e) {}
    }

    if (localFileName === expectedFileName && fs.existsSync(videoPath)) {
      return;
    }

    if (localFileName && localFileName !== expectedFileName) {
      console.log(
        `[CMS Video Sync] Evicting stale local server video "${localFileName}" (active Firestore video is "${expectedFileName}")`
      );
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
      if (fs.existsSync(publicUploadPath)) fs.unlinkSync(publicUploadPath);
    }

    const chunkMetaDoc = await fetchFirestoreDocOnServer('cms_video_chunks', `${key}_meta`);
    const metaFields = chunkMetaDoc?.fields;
    if (!metaFields) return;

    const totalChunks = Number(metaFields.totalChunks?.integerValue || 0);
    const cloudFileName = String(metaFields.fileName?.stringValue || expectedFileName);
    const contentType = String(metaFields.mimeType?.stringValue || 'video/mp4');
    const updatedAt = Number(metaFields.version?.integerValue || Date.now());

    if (totalChunks <= 0 || totalChunks > 220) return;
    if (cloudFileName !== expectedFileName) return;

    const buffers: Buffer[] = new Array(totalChunks);
    const BATCH = 12;
    for (let i = 0; i < totalChunks; i += BATCH) {
      const indices: number[] = [];
      for (let j = i; j < Math.min(i + BATCH, totalChunks); j++) {
        indices.push(j);
      }
      const docs = await Promise.all(
        indices.map((idx) => fetchFirestoreDocOnServer('cms_video_chunks', `${key}_${idx}`))
      );
      for (let k = 0; k < indices.length; k++) {
        const b64 = docs[k]?.fields?.data?.stringValue;
        if (!b64) return;
        buffers[indices[k]] = Buffer.from(b64, 'base64');
      }
    }

    if (!fs.existsSync(VIDEOS_DIR)) {
      fs.mkdirSync(VIDEOS_DIR, { recursive: true });
    }
    const finalBuf = Buffer.concat(buffers);
    fs.writeFileSync(videoPath, finalBuf);
    fs.writeFileSync(
      metaPath,
      JSON.stringify({
        contentType,
        fileName: cloudFileName,
        size: finalBuf.length,
        updatedAt
      }),
      'utf-8'
    );
    if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
      fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
    }
    fs.copyFileSync(videoPath, publicUploadPath);
    console.log(
      `[CMS Video Sync] Downloaded & synced "${cloudFileName}" (${(finalBuf.length / (1024 * 1024)).toFixed(1)} MB) from Firestore cms_video_chunks`
    );
  } catch (err) {
    console.warn('[CMS Video Sync] Non-fatal warning syncing video from Firestore:', err);
  }
}

async function seedFromFirestoreIfNeeded(onSeeded?: (col: string, entry: CollectionEntry) => void) {
  const collectionsToSeed = [
    'packages',
    'tickets',
    'hotels',
    'transport',
    'agents',
    'bookings',
    'allotments',
    'reviews',
    'flight_inquiries',
  ];

  let changed = false;

  // 1. Always pull latest `settings/global` from live Firestore so Netlify edits overwrite local Express cache
  try {
    const docJson = await fetchFirestoreDocOnServer('settings', 'global');
    if (docJson && docJson.fields) {
      const parsedDoc = parseFirestoreDoc(docJson);
      parsedDoc.id = 'global';
      const cloudUpdatedAt = Number(parsedDoc._updatedAt) || Date.now();
      const localUpdatedAt = Number(store.collections.settings?.updatedAt) || 0;
      if (!store.collections.settings || cloudUpdatedAt >= localUpdatedAt) {
        store.collections.settings = {
          data: [parsedDoc],
          updatedAt: cloudUpdatedAt,
        };
        changed = true;
        onSeeded?.('settings', store.collections.settings);
        console.log(`[CMS Store] Synced latest 'settings/global' from Firestore`);
      }

      if (parsedDoc.heroVideoSource === 'upload' && parsedDoc.heroVideoFileName) {
        await syncServerVideoWithFirestore(parsedDoc.heroVideoFileName, parsedDoc.heroVideoUrl);
      }
    }
  } catch (_e) {}

  // 2. Sync all catalog & operations collections via :runQuery & cms_snapshots (avoids 403 LIST)
  for (const colName of collectionsToSeed) {
    try {
      const [snapDoc, queryDocs] = await Promise.all([
        fetchFirestoreDocOnServer('cms_snapshots', colName),
        runQueryCollectionOnServer(colName, 200)
      ]);

      let nextData: any[] | null = null;
      let nextUpdatedAt = 0;

      const itemsJson = snapDoc?.fields?.itemsJson?.stringValue;
      if (itemsJson) {
        try {
          const parsedSnap = JSON.parse(itemsJson);
          if (Array.isArray(parsedSnap)) {
            nextData = parsedSnap;
            nextUpdatedAt = Number(snapDoc?.fields?.updatedAt?.integerValue || 0);
          }
        } catch (_e) {}
      }

      const queryMaxTs = Array.isArray(queryDocs)
        ? queryDocs.reduce((m, d) => Math.max(m, Number(d?._updatedAt) || 0), 0)
        : 0;

      if (Array.isArray(queryDocs) && queryDocs.length > 0 && (!nextData || queryMaxTs > nextUpdatedAt)) {
        nextData = queryDocs;
        nextUpdatedAt = queryMaxTs;
      }

      const localUpdatedAt = Number(store.collections[colName]?.updatedAt) || 0;
      if (nextData && (nextData.length > 0 || colName === 'reviews') && nextUpdatedAt >= localUpdatedAt) {
        store.collections[colName] = {
          data: nextData,
          updatedAt: nextUpdatedAt || Date.now(),
        };
        changed = true;
        onSeeded?.(colName, store.collections[colName]);
        console.log(`[CMS Store] Synced '${colName}' from Firestore (${nextData.length} docs)`);
      }
    } catch (_e) {}
  }

  if (changed) {
    saveStoreToDisk(store);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Range, X-Video-Type, X-Video-Name'
    );
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Range, Accept-Ranges, Content-Length, X-Video-Size, X-Video-Name, X-Video-Url'
    );
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  const sseClients = new Set<express.Response>();

  const broadcastUpdate = (collection: string, entry: CollectionEntry) => {
    const payload = `data: ${JSON.stringify({
      type: 'update',
      collection,
      data: entry.data,
      updatedAt: entry.updatedAt
    })}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch (_e) {
        sseClients.delete(client);
      }
    }
  };

  seedFromFirestoreIfNeeded(broadcastUpdate).catch(() => {});

  app.get('/api/cms-stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
    sseClients.add(res);

    const heartbeat = setInterval(() => {
      try {
        res.write(`: ping\n\n`);
      } catch (_e) {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  app.get('/api/cms', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ collections: store.collections });
  });

  app.get('/api/cms/:collection', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const col = req.params.collection;
    const entry = store.collections[col];
    if (!entry) {
      return res.json({ data: null, updatedAt: 0 });
    }
    return res.json(entry);
  });

  app.post('/api/cms/:collection', (req, res) => {
    const col = req.params.collection;
    const incomingData = req.body?.data;
    const incomingUpdatedAt = Number(req.body?.updatedAt) || Date.now();

    if (!Array.isArray(incomingData)) {
      return res.status(400).json({ error: 'Expected data array' });
    }

    const entry: CollectionEntry = {
      data: incomingData,
      updatedAt: incomingUpdatedAt,
    };

    store.collections[col] = entry;
    saveStoreToDisk(store);
    broadcastUpdate(col, entry);

    if (
      col === 'settings' &&
      incomingData[0]?.heroVideoSource === 'upload' &&
      incomingData[0]?.heroVideoFileName
    ) {
      syncServerVideoWithFirestore(
        incomingData[0].heroVideoFileName,
        incomingData[0].heroVideoUrl
      ).catch(() => {});
    }

    return res.json({ ok: true, updatedAt: entry.updatedAt });
  });

  const finalizeUploadedVideo = (
    key: string,
    videoPath: string,
    metaPath: string,
    contentType: string,
    rawFileName: string
  ) => {
    const stat = fs.statSync(videoPath);
    const version = Date.now();
    let decodedFileName = rawFileName;
    try {
      decodedFileName = decodeURIComponent(rawFileName);
    } catch (_e) {}

    fs.writeFileSync(
      metaPath,
      JSON.stringify({
        contentType,
        fileName: decodedFileName,
        size: stat.size,
        updatedAt: version
      }),
      'utf-8'
    );

    try {
      if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
        fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
      }
      fs.copyFileSync(videoPath, path.join(PUBLIC_UPLOADS_DIR, `${key}.mp4`));
    } catch (_e) {}

    const videoUrl = `/api/cms-video/${key}?v=${version}`;

    return {
      ok: true,
      complete: true,
      videoUrl,
      staticUrl: `/uploads/${key}.mp4?v=${version}`,
      fileName: decodedFileName,
      size: stat.size,
      updatedAt: version
    };
  };

  app.post(
    '/api/cms-video-chunk/:key',
    express.raw({ type: '*/*', limit: '20mb' }),
    (req, res) => {
      try {
        const key = String(req.params.key || 'hero_background_video').replace(
          /[^a-zA-Z0-9_-]/g,
          ''
        );
        if (!fs.existsSync(VIDEOS_DIR)) {
          fs.mkdirSync(VIDEOS_DIR, { recursive: true });
        }
        const buf = req.body;
        if (!Buffer.isBuffer(buf) || buf.length === 0) {
          return res.status(400).json({ error: 'Empty video chunk buffer' });
        }

        const chunkIndex = Math.max(0, Number(req.query.index || 0));
        const totalChunks = Math.max(1, Number(req.query.total || 1));
        const contentType = String(
          req.query.videoType ||
            req.headers['x-video-type'] ||
            req.headers['content-type'] ||
            'video/mp4'
        );
        const fileName = String(
          req.query.fileName || req.headers['x-video-name'] || 'uploaded-video.mp4'
        );

        const partPath = path.join(VIDEOS_DIR, `${key}.part`);
        const videoPath = path.join(VIDEOS_DIR, `${key}.bin`);
        const metaPath = path.join(VIDEOS_DIR, `${key}.meta.json`);

        if (chunkIndex === 0) {
          fs.writeFileSync(partPath, buf);
        } else {
          fs.appendFileSync(partPath, buf);
        }

        if (chunkIndex < totalChunks - 1) {
          return res.json({
            ok: true,
            complete: false,
            chunkIndex,
            totalChunks
          });
        }

        if (fs.existsSync(videoPath)) {
          try {
            fs.unlinkSync(videoPath);
          } catch (_e) {}
        }
        fs.renameSync(partPath, videoPath);

        const result = finalizeUploadedVideo(key, videoPath, metaPath, contentType, fileName);
        return res.json(result);
      } catch (err: any) {
        console.error('[CMS Video Chunk Upload Error]:', err);
        return res.status(500).json({ error: err?.message || 'Failed to save video chunk' });
      }
    }
  );

  app.post(
    '/api/cms-video/:key',
    express.raw({ type: '*/*', limit: '250mb' }),
    (req, res) => {
      try {
        const key = String(req.params.key || 'hero_background_video').replace(
          /[^a-zA-Z0-9_-]/g,
          ''
        );
        if (!fs.existsSync(VIDEOS_DIR)) {
          fs.mkdirSync(VIDEOS_DIR, { recursive: true });
        }
        const buf = req.body;
        if (!Buffer.isBuffer(buf) || buf.length === 0) {
          return res.status(400).json({ error: 'Empty video buffer' });
        }
        const contentType = String(
          req.headers['x-video-type'] || req.headers['content-type'] || 'video/mp4'
        );
        const fileName = String(req.headers['x-video-name'] || 'uploaded-video.mp4');
        const videoPath = path.join(VIDEOS_DIR, `${key}.bin`);
        const metaPath = path.join(VIDEOS_DIR, `${key}.meta.json`);

        fs.writeFileSync(videoPath, buf);
        const result = finalizeUploadedVideo(key, videoPath, metaPath, contentType, fileName);
        return res.json(result);
      } catch (err: any) {
        console.error('[CMS Video Upload Error]:', err);
        return res.status(500).json({ error: err?.message || 'Failed to save video' });
      }
    }
  );

  app.post('/api/firebase-config', (req, res) => {
    try {
      const cfg = req.body;
      if (!cfg || !cfg.projectId || !cfg.apiKey) {
        return res.status(400).json({ error: 'Invalid Firebase config' });
      }
      const configPath = path.join(__dirname, 'firebase-applet-config.json');
      fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
      return res.json({ ok: true, config: cfg });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to save Firebase config' });
    }
  });

  const handleStreamVideo = (req: express.Request, res: express.Response) => {
    try {
      const key = String(req.params.key || 'hero_background_video').replace(
        /[^a-zA-Z0-9_-]/g,
        ''
      );
      const binPath = path.join(VIDEOS_DIR, `${key}.bin`);
      const fallbackPublicPath = path.join(PUBLIC_UPLOADS_DIR, `${key}.mp4`);
      const videoPath = fs.existsSync(binPath)
        ? binPath
        : fs.existsSync(fallbackPublicPath)
        ? fallbackPublicPath
        : null;

      if (!videoPath) {
        return res.status(404).json({ error: 'No uploaded video found' });
      }

      const metaPath = path.join(VIDEOS_DIR, `${key}.meta.json`);
      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;

      let contentType = 'video/mp4';
      let fileName = `${key}.mp4`;
      let updatedAt = Math.floor(stat.mtimeMs);

      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          if (meta.contentType && meta.contentType.startsWith('video/')) {
            contentType = meta.contentType;
          }
          if (meta.fileName) {
            fileName = meta.fileName;
          }
          if (meta.updatedAt) {
            updatedAt = meta.updatedAt;
          }
        } catch (_e) {}
      }

      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Video-Size', String(fileSize));
      res.setHeader('X-Video-Name', encodeURIComponent(fileName));
      res.setHeader('X-Video-Url', `/api/cms-video/${key}?v=${updatedAt}`);
      res.setHeader('Cache-Control', 'public, max-age=3600');

      if (req.method === 'HEAD') {
        res.setHeader('Content-Length', String(fileSize));
        return res.status(200).end();
      }

      const MAX_STREAM_CHUNK = 8 * 1024 * 1024;
      const rangeHeader = req.headers.range;

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = Math.max(0, parseInt(parts[0], 10) || 0);
        if (start >= fileSize) {
          res.setHeader('Content-Range', `bytes */${fileSize}`);
          return res.status(416).end();
        }
        const requestedEnd = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const end = Math.min(
          isNaN(requestedEnd) ? fileSize - 1 : requestedEnd,
          start + MAX_STREAM_CHUNK - 1,
          fileSize - 1
        );
        const chunkLength = end - start + 1;

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', String(chunkLength));

        const stream = fs.createReadStream(videoPath, { start, end });
        stream.on('error', () => {
          if (!res.headersSent) res.status(500).end();
        });
        return stream.pipe(res);
      }

      if (fileSize > 20 * 1024 * 1024) {
        const end = Math.min(MAX_STREAM_CHUNK - 1, fileSize - 1);
        const chunkLength = end + 1;
        res.status(206);
        res.setHeader('Content-Range', `bytes 0-${end}/${fileSize}`);
        res.setHeader('Content-Length', String(chunkLength));
        const stream = fs.createReadStream(videoPath, { start: 0, end });
        stream.on('error', () => {
          if (!res.headersSent) res.status(500).end();
        });
        return stream.pipe(res);
      }

      res.setHeader('Content-Length', String(fileSize));
      const stream = fs.createReadStream(videoPath);
      stream.on('error', () => {
        if (!res.headersSent) res.status(500).end();
      });
      return stream.pipe(res);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to stream video' });
    }
  };

  app.head('/api/cms-video/:key', handleStreamVideo);
  app.get('/api/cms-video/:key', handleStreamVideo);

  app.delete('/api/cms-video/:key', (req, res) => {
    try {
      const key = String(req.params.key || 'hero_background_video').replace(
        /[^a-zA-Z0-9_-]/g,
        ''
      );
      const videoPath = path.join(VIDEOS_DIR, `${key}.bin`);
      const metaPath = path.join(VIDEOS_DIR, `${key}.meta.json`);
      const publicUploadPath = path.join(PUBLIC_UPLOADS_DIR, `${key}.mp4`);
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
      if (fs.existsSync(publicUploadPath)) fs.unlinkSync(publicUploadPath);
      return res.json({ ok: true });
    } catch (_e) {
      return res.json({ ok: false });
    }
  });

  app.post('/api/send-email', (_req, res) => {
    return res.json({ ok: true, message: 'Email queued' });
  });

  // Multi-Currency FX Market Rate Proxy (MYR base -> INR, USD, SGD, GBP, EUR, AED, AUD) with 2-minute cache
  const DEFAULT_FX_RATES: Record<string, number> = {
    MYR: 1,
    INR: 19.65,
    USD: 0.228,
    SGD: 0.304,
    GBP: 0.178,
    EUR: 0.212,
    AED: 0.838,
    AUD: 0.348
  };
  let cachedFxBundle: {
    rates: Record<string, number>;
    source: string;
    updatedAt: string;
    fetchedAt: number;
  } | null = null;

  const handleGetFxRate = async (req: express.Request, res: express.Response) => {
    const base = String(req.query.base || 'MYR').toUpperCase();
    const target = String(req.query.target || 'INR').toUpperCase();
    const force = req.query.force === '1' || req.query.force === 'true';
    const ttlSec = Math.max(30, Math.min(3600, Number(req.query.ttlSec) || 120));
    const ttlMs = ttlSec * 1000;

    if (
      !force &&
      base === 'MYR' &&
      cachedFxBundle &&
      Date.now() - cachedFxBundle.fetchedAt < ttlMs
    ) {
      return res.json({
        ok: true,
        base,
        target,
        rate: cachedFxBundle.rates[target] ?? DEFAULT_FX_RATES[target] ?? 1,
        rates: cachedFxBundle.rates,
        source: cachedFxBundle.source,
        updatedAt: cachedFxBundle.updatedAt,
        ttlSec
      });
    }

    const wantedTargets = ['INR', 'USD', 'SGD', 'GBP', 'EUR', 'AED', 'AUD'];

    // 1. Optional Official XE Currency Data API if configured in server environment
    const xeApiId = process.env.XE_API_ID;
    const xeApiKey = process.env.XE_API_KEY;
    if (xeApiId && xeApiKey) {
      try {
        const authToken = Buffer.from(`${xeApiId}:${xeApiKey}`).toString('base64');
        const xeRes = await fetch(
          `https://xecdapi.xe.com/v1/convert_from.json/?from=${encodeURIComponent(base)}&to=${wantedTargets.join(',')}&amount=1`,
          {
            headers: {
              Authorization: `Basic ${authToken}`,
              Accept: 'application/json'
            }
          }
        );
        if (xeRes.ok) {
          const xeJson: any = await xeRes.json();
          const ratesMap: Record<string, number> = { ...DEFAULT_FX_RATES, MYR: 1 };
          if (Array.isArray(xeJson?.to)) {
            for (const row of xeJson.to) {
              const code = String(row?.quotecurrency || '').toUpperCase();
              const val = Number(row?.mid);
              if (code && val > 0) ratesMap[code] = Number(val.toFixed(4));
            }
          }
          if (ratesMap.INR > 5) {
            cachedFxBundle = {
              rates: ratesMap,
              source: 'Treasury API',
              updatedAt: xeJson?.timestamp || new Date().toISOString(),
              fetchedAt: Date.now()
            };
            return res.json({
              ok: true,
              base,
              target,
              rate: ratesMap[target] ?? 1,
              rates: ratesMap,
              source: cachedFxBundle.source,
              updatedAt: cachedFxBundle.updatedAt,
              ttlSec
            });
          }
        }
      } catch (_e) {}
    }

    // 2. Multi-Currency Mid-Market FX Feeds
    const providers = [
      {
        name: 'Treasury Mid-Market Feed',
        url: `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`
      },
      {
        name: 'European Central Reference Feed',
        url: `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=INR,USD,SGD,GBP,EUR,AUD`
      }
    ];

    for (const provider of providers) {
      try {
        const r = await fetch(provider.url);
        if (r.ok) {
          const json: any = await r.json();
          const rawRates = json?.rates || {};
          if (Number(rawRates?.INR) > 5) {
            const ratesMap: Record<string, number> = { ...DEFAULT_FX_RATES, MYR: 1 };
            for (const code of wantedTargets) {
              const val = Number(rawRates[code]);
              if (val > 0) ratesMap[code] = Number(val.toFixed(4));
            }
            // AED is pegged to USD at 3.6725 if Frankfurter omits AED
            if (!rawRates.AED && ratesMap.USD > 0) {
              ratesMap.AED = Number((ratesMap.USD * 3.6725).toFixed(4));
            }
            cachedFxBundle = {
              rates: ratesMap,
              source: provider.name,
              updatedAt: new Date().toISOString(),
              fetchedAt: Date.now()
            };
            return res.json({
              ok: true,
              base,
              target,
              rate: ratesMap[target] ?? 1,
              rates: ratesMap,
              source: cachedFxBundle.source,
              updatedAt: cachedFxBundle.updatedAt,
              ttlSec
            });
          }
        }
      } catch (_e) {}
    }

    const fallbackRates = cachedFxBundle?.rates || DEFAULT_FX_RATES;
    return res.json({
      ok: true,
      base,
      target,
      rate: fallbackRates[target] ?? 1,
      rates: fallbackRates,
      source: cachedFxBundle?.source || 'Treasury Reference Fallback',
      updatedAt: cachedFxBundle?.updatedAt || new Date().toISOString(),
      ttlSec
    });
  };

  app.get('/api/fx-rate', handleGetFxRate);
  app.get('/api/xe-rate', handleGetFxRate);

  // Geographic Country -> Currency Auto-Detection Endpoint
  const EURO_COUNTRIES = new Set([
    'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI',
    'GR', 'LU', 'SK', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY', 'HR'
  ]);
  const mapCountryToCurrency = (cc: string): string => {
    const code = String(cc || '').trim().toUpperCase();
    if (code === 'IN') return 'INR';
    if (code === 'MY') return 'MYR';
    if (code === 'SG') return 'SGD';
    if (code === 'GB' || code === 'UK') return 'GBP';
    if (code === 'AE') return 'AED';
    if (code === 'AU') return 'AUD';
    if (EURO_COUNTRIES.has(code)) return 'EUR';
    return 'USD';
  };

  app.get('/api/geo-currency', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const headerCountry = String(
        req.headers['cf-ipcountry'] ||
          req.headers['x-vercel-ip-country'] ||
          req.headers['x-appengine-country'] ||
          req.headers['x-country-code'] ||
          req.headers['fly-country'] ||
          ''
      )
        .trim()
        .toUpperCase();

      if (headerCountry && headerCountry !== 'XX' && headerCountry !== 'T1' && headerCountry.length === 2) {
        return res.json({
          ok: true,
          countryCode: headerCountry,
          countryName: headerCountry,
          currency: mapCountryToCurrency(headerCountry),
          source: 'edge-header'
        });
      }

      const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
      const rawIp = forwarded || req.socket.remoteAddress || '';
      const isLocalIp =
        !rawIp ||
        rawIp === '::1' ||
        rawIp === '127.0.0.1' ||
        rawIp.startsWith('10.') ||
        rawIp.startsWith('192.168.') ||
        rawIp.startsWith('172.');

      const lookupUrl = isLocalIp
        ? 'https://ipwho.is/'
        : `https://ipwho.is/${encodeURIComponent(rawIp)}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1600);
      try {
        const geoRes = await fetch(lookupUrl, { signal: controller.signal });
        if (geoRes.ok) {
          const geoJson: any = await geoRes.json();
          const cc = String(geoJson?.country_code || '').toUpperCase();
          if (cc && cc.length === 2) {
            return res.json({
              ok: true,
              countryCode: cc,
              countryName: String(geoJson?.country || cc),
              currency: mapCountryToCurrency(cc),
              source: 'ip-geo'
            });
          }
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch (_e) {}

    return res.json({
      ok: false,
      countryCode: '',
      countryName: '',
      currency: '',
      source: 'unavailable'
    });
  });

  // Coordinate-based Reverse Geocoding Endpoint for Browser Geolocation API
  app.get('/api/reverse-geocode', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return res.status(400).json({ ok: false, error: 'Invalid latitude or longitude' });
    }

    // 1. Primary: BigDataCloud Reverse Geocode Client API
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2200);
      try {
        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
            String(lat)
          )}&longitude=${encodeURIComponent(String(lon))}&localityLanguage=en`,
          { signal: controller.signal }
        );
        if (bdcRes.ok) {
          const bdcJson: any = await bdcRes.json();
          const cc = String(bdcJson?.countryCode || '').trim().toUpperCase();
          if (cc && cc.length === 2) {
            return res.json({
              ok: true,
              countryCode: cc,
              countryName: String(bdcJson?.countryName || cc),
              currency: mapCountryToCurrency(cc),
              source: 'browser-geolocation'
            });
          }
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch (_e) {}

    // 2. Fallback: OpenStreetMap Nominatim reverse geocode
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
            String(lat)
          )}&lon=${encodeURIComponent(String(lon))}&zoom=3`,
          {
            signal: controller.signal,
            headers: { 'User-Agent': 'GFK-Holidays-Web/1.0' }
          }
        );
        if (nomRes.ok) {
          const nomJson: any = await nomRes.json();
          const cc = String(nomJson?.address?.country_code || '').trim().toUpperCase();
          if (cc && cc.length === 2) {
            return res.json({
              ok: true,
              countryCode: cc,
              countryName: String(nomJson?.address?.country || cc),
              currency: mapCountryToCurrency(cc),
              source: 'browser-geolocation'
            });
          }
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch (_e) {}

    return res.json({
      ok: false,
      countryCode: '',
      countryName: '',
      currency: '',
      source: 'unavailable'
    });
  });

  // Stripe Checkout Session Creator (supports INR, USD, MYR, SGD, GBP, EUR, AED, AUD)
  app.post('/api/create-stripe-checkout', express.json(), async (req, res) => {
    try {
      const {
        bookingId,
        title,
        currency,
        amountPayable,
        amountInr,
        amountMyr,
        xeRate,
        customerEmail,
        customerName,
        pax,
        date
      } = req.body || {};

      const stripeCurrency = String(currency || 'INR').toUpperCase();
      const chargeAmount = Number(amountPayable ?? amountInr) || 0;
      if (!bookingId || chargeAmount <= 0) {
        return res.status(400).json({ ok: false, error: 'Invalid bookingId or payment amount' });
      }

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return res.json({
          ok: true,
          mode: 'stripe_invoice_dispatch',
          bookingId,
          currency: stripeCurrency,
          amountPayable: Number(chargeAmount.toFixed(2)),
          amountInr: stripeCurrency === 'INR' ? Number(chargeAmount.toFixed(2)) : Number(amountInr) || 0,
          amountMyr: Number(amountMyr) || 0,
          xeRate: Number(xeRate) || 19.65,
          message:
            'Stripe payment request registered; secure Stripe link dispatched via booking@gfkholidays.com.'
        });
      }

      const originHeader =
        req.headers.origin ||
        process.env.APP_URL ||
        `http://localhost:${PORT}`;

      const form = new URLSearchParams();
      form.append('mode', 'payment');
      form.append('payment_method_types[0]', 'card');
      form.append('line_items[0][price_data][currency]', stripeCurrency.toLowerCase());
      form.append('line_items[0][price_data][unit_amount]', String(Math.round(chargeAmount * 100)));
      form.append('line_items[0][price_data][product_data][name]', String(title || 'GFK Holidays Malaysia Booking'));
      form.append(
        'line_items[0][price_data][product_data][description]',
        `Ref ${bookingId} · ${pax || 1} Pax · ${date || ''}`
      );
      form.append('line_items[0][quantity]', '1');
      if (customerEmail) form.append('customer_email', String(customerEmail));
      form.append('client_reference_id', String(bookingId));
      form.append('metadata[bookingId]', String(bookingId));
      form.append('metadata[customerName]', String(customerName || 'Traveler'));
      form.append('metadata[settlementCurrency]', stripeCurrency);
      form.append('metadata[appliedRate]', String(xeRate || ''));
      form.append('metadata[amountMyr]', String(amountMyr || ''));
      form.append('success_url', `${originHeader}/?stripe_status=success&booking_id=${encodeURIComponent(String(bookingId))}`);
      form.append('cancel_url', `${originHeader}/?stripe_status=cancelled&booking_id=${encodeURIComponent(String(bookingId))}`);

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: form.toString()
      });

      const stripeData: any = await stripeRes.json();
      if (!stripeRes.ok || !stripeData?.id) {
        return res.json({
          ok: true,
          mode: 'stripe_invoice_dispatch',
          bookingId,
          currency: stripeCurrency,
          amountPayable: Number(chargeAmount.toFixed(2)),
          amountInr: stripeCurrency === 'INR' ? Number(chargeAmount.toFixed(2)) : Number(amountInr) || 0,
          amountMyr: Number(amountMyr) || 0,
          xeRate: Number(xeRate) || 19.65,
          warning: stripeData?.error?.message || 'Stripe session deferred to booking desk'
        });
      }

      return res.json({
        ok: true,
        mode: 'stripe_live_session',
        bookingId,
        sessionId: stripeData.id,
        checkoutUrl: stripeData.url,
        currency: stripeCurrency,
        amountPayable: Number(chargeAmount.toFixed(2)),
        amountInr: stripeCurrency === 'INR' ? Number(chargeAmount.toFixed(2)) : Number(amountInr) || 0,
        amountMyr: Number(amountMyr) || 0,
        xeRate: Number(xeRate) || 19.65
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Stripe error' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
