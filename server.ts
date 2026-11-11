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

const PUBLIC_SEED_FILE = path.join(__dirname, 'public', 'cms-seed.json');
const PUBLIC_UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

function saveStoreToDisk(store: CmsStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const serialized = JSON.stringify(store);
    fs.writeFileSync(STORE_FILE, serialized, 'utf-8');
    // Also mirror to public/cms-seed.json so GitHub static builds include the latest CMS state
    if (fs.existsSync(path.join(__dirname, 'public'))) {
      fs.writeFileSync(PUBLIC_SEED_FILE, serialized, 'utf-8');
    }
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

  // Always sync settings/global from live Firestore on startup so local server cache is never stale
  try {
    const res = await fetch(`${FIRESTORE_BASE_URL}/settings/global`);
    if (res.ok) {
      const docJson: any = await res.json();
      if (docJson && docJson.fields) {
        const parsedDoc = parseFirestoreDoc(docJson);
        parsedDoc.id = 'global';
        store.collections.settings = {
          data: [parsedDoc],
          updatedAt: Date.now(),
        };
        changed = true;
        onSeeded?.('settings', store.collections.settings);
        console.log(`[CMS Store] Synced latest 'settings/global' from Firestore`);
      }
    }
  } catch (_e) {}

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

  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Video-Type, X-Video-Name');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

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

  const finalizeUploadedVideo = (key: string, videoPath: string, metaPath: string, contentType: string, rawFileName: string) => {
    const stat = fs.statSync(videoPath);
    const version = Date.now();
    let decodedFileName = rawFileName;
    try {
      decodedFileName = decodeURIComponent(rawFileName);
    } catch (_e) {}

    fs.writeFileSync(
      metaPath,
      JSON.stringify({ contentType, fileName: decodedFileName, size: stat.size, updatedAt: version }),
      'utf-8'
    );

    // Mirror to public/uploads/${key}.mp4 so static deployments also have the file
    try {
      if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
        fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
      }
      fs.copyFileSync(videoPath, path.join(PUBLIC_UPLOADS_DIR, `${key}.mp4`));
    } catch (_e) {}

    const videoUrl = `/api/cms-video/${key}?v=${version}`;

    // Automatically update settings collection on server & broadcast via SSE so all browsers immediately play the uploaded video
    if (store.collections.settings && Array.isArray(store.collections.settings.data) && store.collections.settings.data.length > 0) {
      store.collections.settings.data = store.collections.settings.data.map((docItem: any) =>
        docItem.id === 'global'
          ? {
              ...docItem,
              heroVideoUrl: videoUrl,
              featuredVideoEmbedUrl: videoUrl,
              heroVideoSource: 'upload',
              heroVideoFileName: decodedFileName,
              _updatedAt: version
            }
          : docItem
      );
      store.collections.settings.updatedAt = version;
      saveStoreToDisk(store);
      broadcastUpdate('settings', store.collections.settings);
    }

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

  // Chunked video upload endpoint (4MB chunks) to bypass Cloud Run's 32MB single-request limit
  app.post(
    '/api/cms-video-chunk/:key',
    express.raw({ type: '*/*', limit: '20mb' }),
    (req, res) => {
      try {
        const key = String(req.params.key || 'hero_background_video').replace(/[^a-zA-Z0-9_-]/g, '');
        if (!fs.existsSync(VIDEOS_DIR)) {
          fs.mkdirSync(VIDEOS_DIR, { recursive: true });
        }
        const buf = req.body;
        if (!Buffer.isBuffer(buf) || buf.length === 0) {
          return res.status(400).json({ error: 'Empty video chunk buffer' });
        }

        const chunkIndex = Math.max(0, Number(req.query.index || 0));
        const totalChunks = Math.max(1, Number(req.query.total || 1));
        const contentType = String(req.query.videoType || req.headers['x-video-type'] || req.headers['content-type'] || 'video/mp4');
        const fileName = String(req.query.fileName || req.headers['x-video-name'] || 'uploaded-video.mp4');

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

        // Final chunk received: atomically move .part to .bin and publish
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
      const key = String(req.params.key || 'hero_background_video').replace(/[^a-zA-Z0-9_-]/g, '');
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

      // Cap each response chunk to 8MB so Cloud Run's 32MB HTTP response limit is never exceeded
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

      // If no Range header is sent and the video is larger than 20MB, send the first 8MB as 206 Partial Content
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
      const key = String(req.params.key || 'hero_background_video').replace(/[^a-zA-Z0-9_-]/g, '');
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
