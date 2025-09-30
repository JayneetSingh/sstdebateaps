// server.js (minimal, secure-ish proxy to Google CSE)
import express from 'express';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8787;

// CORS: in prod, change origin to your frontend domain
app.use(cors({ origin: true }));
app.use(express.json());

// basic rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30
});
app.use(limiter);

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

    // return trimmed data
    return res.json({ items: json.items || [], raw: json });
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Proxy failed', details: String(err) });
  }
});

app.listen(PORT, () => console.log(`Search proxy listening on ${PORT}`));
