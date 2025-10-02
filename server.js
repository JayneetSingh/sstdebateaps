const express = require("express");
const cors = require("cors");
const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());

// Hugging Face AI fact-check endpoint
app.post("/api/ai-verify", async (req, res) => {
  try {
    const { claim } = req.body;

    if (!claim) return res.status(400).json({ error: "Claim text required" });

    const hfResp = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-mnli", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: claim,
        parameters: { candidate_labels: ["valid", "invalid", "unsure"] }
      })
    });

    if (!hfResp.ok) {
      const txt = await hfResp.text();
      return res.status(500).json({ error: "HF API failed", details: txt });
    }

    const result = await hfResp.json();
    res.json(result);

  } catch (err) {
    console.error("AI verify error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Simple health check
app.get("/", (req, res) => {
  res.send("Mock Debate API is live 🚀");
});

// Render requires process.env.PORT
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
