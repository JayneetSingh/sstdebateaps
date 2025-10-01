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
app.use(cors({ origin: true }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.post('/api/search', async (req, res) => {
  try {
    const { query, num = 10 } = req.body || {};
    if (!query) return res.status(400).json({ error: 'Missing query' });
    const key = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CSE_ID;
    if (!key || !cx) return res.status(500).json({ error: 'Missing server config (GOOGLE_API_KEY / GOOGLE_CSE_ID)' });
    const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(query)}&num=${num}`;
    const r = await fetch(url);
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch(e) { json = { raw: text }; }
    if (!r.ok) return res.status(r.status).json({ error: 'Google error', body: json });
    return res.json({ items: json.items || [], raw: json });
  } catch (err) {
    console.error('proxy error', err);
    return res.status(500).json({ error: 'proxy failed', details: String(err) });
  }
});
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
