import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
// The build emits CJS, where import.meta is empty, so paths are resolved from process.cwd()
// rather than __dirname. Hosts such as Cloud Run inject the port they expect us to listen on.
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to get lazy Gemini AI instance
function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// API Route: AI Caption Suggestions
app.post('/api/generate-captions', async (req, res) => {
  try {
    const { vibe, topic } = req.body || {};
    const ai = getGemini();

    if (!ai) {
      // Fallback captions if key is not configured yet
      return res.json({
        captions: [
          'Summer 2026 ✨',
          'Best Memories 📸',
          'Good Times & Tan Lines ☀️',
          'Forever & Always 💖',
          'Unforgettable Moments 🎞️'
        ]
      });
    }

    const prompt = `Generate 5 short, catchy, photobooth strip captions/titles for a photobooth strip.
Theme/Vibe: "${vibe || 'Cute & Vintage'}".
Context/Topic: "${topic || 'Friendship / Memories'}".
Requirements:
- Short (1 to 4 words per caption).
- Cute, retro, aesthetic, or nostalgic.
- Include 1 tasteful emoji in each caption.
- Output strictly a JSON array of 5 strings, e.g. ["Summer '26 ✨", "Besties Forever 🎀", ...]. Do not include markdown code block syntax if possible, or plain JSON array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '[]';
    let captions = [];
    try {
      captions = JSON.parse(text);
    } catch {
      captions = [
        'Pure Magic ✨',
        'Making Memories 📸',
        'Golden Hour 🌅',
        'Sweet Times 🌸',
        'Together Always 🤍'
      ];
    }

    return res.json({ captions });
  } catch (err: any) {
    console.error('Error generating captions:', err);
    return res.json({
      captions: [
        'Golden Memories 🎞️',
        'Sweet Moments ✨',
        'Best Day Ever 💖',
        'Photobooth Chronicles 📸',
        'Forever Young 🌟'
      ]
    });
  }
});

// API Route: AI Memory Story / Note Generator
app.post('/api/generate-memory-note', async (req, res) => {
  try {
    const { caption, location, date } = req.body || {};
    const ai = getGemini();

    if (!ai) {
      return res.json({
        note: 'A timeless day captured in film. The laughter, late-night talks, and endless smiles frozen in four small frames forever. 📸✨'
      });
    }

    const prompt = `Write a short 2-sentence vintage memory note for the back/bottom of a photobooth memory strip card.
Caption: "${caption || 'Best Friends'}".
Location: "${location || 'Seoul, South Korea'}".
Date: "${date || 'Summer 2026'}".
Style: Warm, romantic/wholesome, nostalgic, photobooth memory book style. No quote marks around output.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.json({ note: response.text?.trim() || 'A timeless moment saved forever in film.' });
  } catch (err) {
    return res.json({ note: 'A priceless memory captured in film to keep forever.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Striply Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
