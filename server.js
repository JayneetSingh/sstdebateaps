// server.js
import express from 'express'
import fetch from 'node-fetch' // or use global fetch if Node 18+
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()
const app = express()
const PORT = process.env.PORT || 8787

// Basic rate limiter to avoid accidental quota burning
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // adjust as needed
})

app.use(express.json())
app.use(limiter)

// Simple health check
app.get('/api/health', (req, res) => res.json({ ok: true }))

// Main proxy endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { query, num = 10 } = req.body || {}
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Missing query' })
    }

    const key = process.env.GOOGLE_API_KEY
    const cx = process.env.GOOGLE_CSE_ID
    if (!key || !cx) {
      return res.status(500).json({ error: 'Server not configured with Google API key / CSE ID' })
    }

    const q = encodeURIComponent(query)
    const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${q}&num=${num}`

    const r = await fetch(url)
    if (!r.ok) {
      const text = await r.text()
      return res.status(r.status).json({ error: `Google API error: ${r.status}`, body: text })
    }
    const data = await r.json()
    // Optionally trim/shape the response to only what frontend needs
    return res.json({ items: data.items || [], raw: data })
  } catch (err) {
    console.error('Proxy error:', err)
    return res.status(500).json({ error: 'Proxy failed', details: String(err) })
  }
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Serve static files (index.html, etc.)
app.use(express.static(__dirname))

app.listen(PORT, () => {
  console.log(`Search proxy listening on ${PORT}`)
})
