// server.js — Express server that serves static frontend and the /api/search proxy
import express from 'express';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8787;

// Middlewares
app.use(cors({ origin: true }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60 * 1000, max: 30 }));

// Global crash logging so Render shows stack traces
process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection', reason && reason.stack ? reason.stack : reason);
});

// --- Serve static frontend ---
// Put your index.html and assets into a folder named "public" at repo root.
// Example: repo-root/public/index.html
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// If no static file matched, send index.html (so SPA routes work)
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// --- API routes ---
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/search', async (req, res) => {
  try {
    const { query, num = 10 } = req.body || {};
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Missing query' });
    }

    const key = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CSE_ID;
    if (!key || !cx) {
      return res.status(500).json({ error: 'Server not configured with Google API key / CSE ID' });
    }

    const q = encodeURIComponent(query);
    const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${q}&num=${num}`;

    const r = await fetch(url);
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }

    if (!r.ok) return res.status(r.status).json({ error: 'Google error', body: json });

    // Only return what's needed to frontend
    return res.json({ items: json.items || [], raw: json });
  } catch (err) {
    console.error('Proxy error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Proxy failed', details: String(err) });
  }
});

// Fallback 404 for other API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route' }));

// Start server
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
