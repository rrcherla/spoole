import express from "express";
import OpenAI from "openai";

const app = express();

// Render sets PORT (default 10000). You must bind to it.
const PORT = process.env.PORT || 10000;

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY env var.");
  process.exit(1);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Serve your static frontend from /public
app.use(express.static("public"));

// Parse JSON
app.use(express.json({ limit: "1mb" }));

// Health check (useful in Render)
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// Chat endpoint: browser calls /api/chat, server calls OpenAI
app.post("/api/chat", async (req, res) => {
  try {
    const { model, messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages must be a non-empty array" });
    }

    // Conservative default; you can change this in the UI.
    const chosenModel = typeof model === "string" && model.trim() ? model.trim() : "gpt-4.1-mini";

    // Responses API is the recommended interface for new projects. :contentReference[oaicite:10]{index=10}
    const response = await client.responses.create({
      model: chosenModel,
      input: messages.map(m => ({
        role: m.role,
        content: String(m.content ?? "")
      }))
    });

    // SDK commonly provides output_text; fallback if needed
    const text =
      response.output_text ??
      (Array.isArray(response.output)
        ? response.output
            .flatMap(o => o.content || [])
            .map(c => c.text || "")
            .join("")
        : "");

    res.json({ text: text || "" });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`MyLM running on port ${PORT}`);
});
