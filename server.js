const express = require("express");
const cors = require("cors");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/ai-verify", async (req, res) => {
  try {
    const { claim, topic, stance } = req.body;
    if (!claim) return res.status(400).json({ error: "Claim text required" });

    // Build context for Hugging Face
    const fullPrompt = `Debate topic: ${topic}. Team stance: ${stance}. Claim: "${claim}". 
    Decide if this supports the stance (valid), contradicts it (invalid), or is unrelated (unsure).`;

    const hfResp = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-mnli", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: { candidate_labels: ["valid", "invalid", "unsure"] }
      })
    });

    const result = await hfResp.json();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => res.send("Mock Debate API is live 🚀"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
