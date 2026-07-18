// Server-side Gemini proxy for the BiteFlow AI Concierge.
//
// WHY THIS EXISTS: a browser-only SPA has to embed the Gemini API key in its
// JS bundle, where anyone can extract and abuse it. This Cloud Function holds
// the key server-side (as a Secret Manager secret), so the client never sees
// it. The client POSTs the conversation payload to `/api/concierge` (a Firebase
// Hosting rewrite → this function); the function validates + rate-limits the
// request, calls Gemini with the secret key, and returns only the text.
//
// Deploy: requires the Blaze plan.
//   firebase functions:secrets:set GEMINI_API_KEY   # paste your key
//   firebase deploy --only functions,hosting
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const GEMINI_MODEL = 'gemini-2.5-flash';

// --- Abuse controls --------------------------------------------------------

// In-memory sliding-window rate limiter (per warm instance). For durable,
// multi-instance limiting, back this with Firestore or a managed store.
const hits = new Map();
function rateLimited(key, max = 20, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => t > now - windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

// Plain-text prompt-injection / jailbreak patterns (defense in depth — the
// client checks these too, but the server must never trust the client).
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(the\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
  /disregard\s+(all\s+)?(your|the|previous)\b/i,
  /forget\s+(everything|all|your|the)\b/i,
  /\byou\s+are\s+now\b/i,
  /\bpretend\s+(you|to)\s+be\b/i,
  /override\s+(the\s+)?(system|safety|instructions?|prompt)/i,
  /\breveal\s+(your|the)\s+(system\s+)?(prompt|instructions?)/i,
  /^\s*system\s*:/im,
];
function isInjection(text) {
  return typeof text === 'string' && INJECTION_PATTERNS.some((re) => re.test(text));
}

const MAX_BODY_CHARS = 20_000;

export const concierge = onRequest(
  { secrets: [GEMINI_API_KEY], cors: true, region: 'us-central1', maxInstances: 10 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const ip = (req.headers['x-forwarded-for'] || req.ip || 'unknown').toString();
    if (rateLimited(ip)) {
      res.status(429).json({ error: 'Too many requests. Please slow down.' });
      return;
    }

    const { contents, systemInstruction, userMessage } = req.body || {};
    if (!Array.isArray(contents) || contents.length === 0) {
      res.status(400).json({ error: 'Invalid request payload.' });
      return;
    }
    if (JSON.stringify(req.body).length > MAX_BODY_CHARS) {
      res.status(413).json({ error: 'Request too large.' });
      return;
    }
    if (isInjection(userMessage)) {
      res.status(400).json({ error: 'Request blocked by safety guard.' });
      return;
    }

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY.value(),
          },
          body: JSON.stringify({
            contents,
            ...(systemInstruction
              ? { systemInstruction: { parts: [{ text: String(systemInstruction).slice(0, 8000) }] } }
              : {}),
            generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
          }),
          signal: AbortSignal.timeout(15_000),
        }
      );

      if (!geminiRes.ok) {
        res.status(502).json({ error: 'Upstream AI error.' });
        return;
      }

      const data = await geminiRes.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      res.set('Cache-Control', 'no-store');
      res.json({ text });
    } catch {
      res.status(502).json({ error: 'AI request failed.' });
    }
  }
);
