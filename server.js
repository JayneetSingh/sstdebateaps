import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

// AI Verify endpoint
app.post("/api/ai-verify", async (req, res) => {
  try {
    const { claim, team, topic } = req.body;
    if (!claim) return res.status(400).json({ error: "Missing claim" });

    const stance = team === "A" ? "For" : "Against";
    const context = `Topic: ${topic}\nTeam stance: ${stance}\nQuestion: Does this claim SUPPORT this team's stance, CONTRADICT it, or is it NEUTRAL?`;

    const hfResp = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-mnli", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: `${context}\nClaim: "${claim}"`,
        parameters: {
          candidate_labels: ["supports", "contradicts", "neutral"]
        }
      })
    });

    if (!hfResp.ok) {
      const txt = await hfResp.text();
      return res.status(502).json({ error: "HuggingFace error", details: txt });
    }

    const out = await hfResp.json();
    const label = out.labels?.[0] || "neutral";

    let verdict = "unsure";
    if (label === "supports") verdict = "valid";
    else if (label === "contradicts") verdict = "invalid";

    res.json({ verdict, raw: out });
  } catch (err) {
    console.error("AI verify error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
