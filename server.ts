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

const FIRESTORE_PROJECT_ID = 'gen-lang-client-0612324688';
const FIRESTORE_DB_ID = 'ai-studio-gfkholidays-415b8c9f-ece5-42b3-82d6-fea966b26d79';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents`;

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

function saveStoreToDisk(store: CmsStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store), 'utf-8');
  } catch (err) {
    console.warn('[CMS Store] Failed to write store file:', err);
  }
}

const store: CmsStore = loadStoreFromDisk();

async function seedFromFirestoreIfNeeded(onSeeded?: (col: string, entry: CollectionEntry) => void) {
  const collectionsToSeed = [
    'settings',
    'packages',
    'tickets',
    'hotels',
    'transport',
    'agents',
    'bookings',
    'allotments',
    'reviews',
  ];

  let changed = false;

  // Explicitly ensure settings/global is seeded from Firestore if not in store
  if (!store.collections.settings || !Array.isArray(store.collections.settings.data) || store.collections.settings.data.length === 0) {
    try {
      const res = await fetch(`${FIRESTORE_BASE_URL}/settings/global`);
      if (res.ok) {
        const docJson: any = await res.json();
        if (docJson && docJson.fields) {
          const parsedDoc = parseFirestoreDoc(docJson);
          parsedDoc.id = 'global';
          store.collections.settings = {
            data: [parsedDoc],
            updatedAt: Number(parsedDoc._updatedAt) || 1,
          };
          changed = true;
          onSeeded?.('settings', store.collections.settings);
          console.log(`[CMS Store] Seeded 'settings/global' from Firestore`);
        }
      }
    } catch (_e) {}
  }

  for (const colName of collectionsToSeed) {
    if (store.collections[colName] && Array.isArray(store.collections[colName].data) && store.collections[colName].data.length > 0) {
      continue;
    }
    try {
      const res = await fetch(`${FIRESTORE_BASE_URL}/${colName}?pageSize=100`);
      if (!res.ok) continue;
      const json: any = await res.json();
      if (Array.isArray(json.documents) && json.documents.length > 0) {
        const docs = json.documents.map(parseFirestoreDoc);
        store.collections[colName] = {
          data: docs,
          updatedAt: 1,
        };
        changed = true;
        onSeeded?.(colName, store.collections[colName]);
        console.log(`[CMS Store] Seeded '${colName}' from Firestore (${docs.length} docs)`);
      }
    } catch (_e) {
      // Ignore network/offline errors on seed
    }
  }

  if (changed) {
    saveStoreToDisk(store);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  // SSE clients for instant real-time cross-browser updates
  const sseClients = new Set<express.Response>();

  const broadcastUpdate = (collection: string, entry: CollectionEntry) => {
    const payload = `data: ${JSON.stringify({ type: 'update', collection, data: entry.data, updatedAt: entry.updatedAt })}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch (_e) {
        sseClients.delete(client);
      }
    }
  };

  // Trigger Firestore seed asynchronously so port 3000 binds immediately
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

    return res.json({ ok: true, updatedAt: entry.updatedAt });
  });

  app.post(
    '/api/cms-video/:key',
    express.raw({ type: '*/*', limit: '250mb' }),
    (req, res) => {
      try {
        const key = String(req.params.key || 'hero_background_video').replace(/[^a-zA-Z0-9_-]/g, '');
        if (!fs.existsSync(VIDEOS_DIR)) {
          fs.mkdirSync(VIDEOS_DIR, { recursive: true });
        }
        const buf = req.body;
        if (!Buffer.isBuffer(buf) || buf.length === 0) {
          return res.status(400).json({ error: 'Empty video buffer' });
        }
        const contentType = String(req.headers['x-video-type'] || req.headers['content-type'] || 'video/mp4');
        const fileName = String(req.headers['x-video-name'] || 'uploaded-video.mp4');
        const videoPath = path.join(VIDEOS_DIR, `${key}.bin`);
        const metaPath = path.join(VIDEOS_DIR, `${key}.meta.json`);

        fs.writeFileSync(videoPath, buf);
        fs.writeFileSync(
          metaPath,
          JSON.stringify({ contentType, fileName, size: buf.length, updatedAt: Date.now() }),
          'utf-8'
        );

        const version = Date.now();
        const videoUrl = `/api/cms-video/${key}?v=${version}`;
        return res.json({ ok: true, videoUrl, fileName, size: buf.length });
      } catch (err: any) {
        console.error('[CMS Video Upload Error]:', err);
        return res.status(500).json({ error: err?.message || 'Failed to save video' });
      }
    }
  );

  app.get('/api/cms-video/:key', (req, res) => {
    try {
      const key = String(req.params.key || 'hero_background_video').replace(/[^a-zA-Z0-9_-]/g, '');
      const videoPath = path.join(VIDEOS_DIR, `${key}.bin`);
      const metaPath = path.join(VIDEOS_DIR, `${key}.meta.json`);

      if (!fs.existsSync(videoPath)) {
        return res.status(404).json({ error: 'No uploaded video found' });
      }

      let contentType = 'video/mp4';
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          if (meta.contentType && meta.contentType.startsWith('video/')) {
            contentType = meta.contentType;
          }
        } catch (_e) {}
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.sendFile(videoPath);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to stream video' });
    }
  });

  app.delete('/api/cms-video/:key', (req, res) => {
    try {
      const key = String(req.params.key || 'hero_background_video').replace(/[^a-zA-Z0-9_-]/g, '');
      const videoPath = path.join(VIDEOS_DIR, `${key}.bin`);
      const metaPath = path.join(VIDEOS_DIR, `${key}.meta.json`);
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
      return res.json({ ok: true });
    } catch (_e) {
      return res.json({ ok: false });
    }
  });

  app.post('/api/send-email', (_req, res) => {
    return res.json({ ok: true, message: 'Email queued' });
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
