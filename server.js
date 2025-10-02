const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());

// allow frontend (GitHub Pages or your custom domain)
const GHPAGES_ORIGIN = "https://jayneetsingh.github.io";
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || origin === GHPAGES_ORIGIN) return cb(null, true);
      return cb(null, false);
    },
  })
);

// ---- Hugging Face AI verify ----
app.post("/api/ai-verify", async (req, res) => {
  try {
    const { claim } = req.body;
    if (!claim) return res.status(400).json({ error: "Missing claim" });

    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: claim,
          parameters: { candidate_labels: ["true", "false", "uncertain"] },
        }),
      }
    );

    const data = await response.json();
    let verdict = "unsure";

    if (data && data.labels && data.labels.length > 0) {
      const best = data.labels[0];
      if (best === "true") verdict = "valid";
      else if (best === "false") verdict = "invalid";
      else verdict = "unsure";
    }

    res.json({
      verdict,
      explanation: `AI suggests this claim is "${verdict}"`,
      sources: [],
      model_output: data,
    });
  } catch (err) {
    console.error("AI verify error:", err);
    res.status(500).json({ error: "AI verify failed", details: err.message });
  }
});

// ---- Google CSE proxy ----
app.post("/api/search", async (req, res) => {
  try {
    const { query, num } = req.body;
    if (!query) return res.status(400).json({ error: "Missing query" });

    const apiKey = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CSE_ID;
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
      query
    )}&cx=${cx}&key=${apiKey}&num=${num || 5}`;

    const resp = await fetch(url);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error("Google search error:", err);
    res.status(500).json({ error: "Search failed", details: err.message });
  }
});

// ---- Serve static frontend if needed ----
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
