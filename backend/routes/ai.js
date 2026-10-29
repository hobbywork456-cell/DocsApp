const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { marked } = require('marked');
const auth = require('../middleware/auth');

const apiKey = (process.env.GEMINI_API_KEY || '').trim();
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Models offered in the assistant. Thinking is kept minimal for writing tasks: it cuts the time to the
// first word from ~17s to ~2s with no visible quality loss for drafting/editing text.
const MODELS = {
  'gemini-3.6-flash': { label: 'Gemini 3.6 Flash', hint: 'Fast & smart (recommended)', thinking: { thinkingLevel: 'minimal' } },
  'gemini-3.5-flash': { label: 'Gemini 3.5 Flash', hint: 'Fast', thinking: { thinkingLevel: 'minimal' } },
  'gemini-3.1-flash-lite': { label: 'Gemini 3.1 Flash Lite', hint: 'Fastest, lighter answers', thinking: { thinkingLevel: 'minimal' } },
  'gemini-3.1-pro-preview': { label: 'Gemini 3.1 Pro', hint: 'Best quality, slower', thinking: { thinkingLevel: 'low' } }
};
const DEFAULT_MODEL = 'gemini-3.6-flash';
const FALLBACKS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];

const FIRST_CHUNK_TIMEOUT_MS = 25000; // give up on a model that has not started answering
const TOTAL_TIMEOUT_MS = 120000;
const MAX_CONTEXT_CHARS = 60000;

const SYSTEM_INSTRUCTION = `You are the writing assistant inside DocsApp, a document editor (documents, spreadsheets, presentations).
- Do exactly what the user asks with the provided document or selected text.
- Reply with the finished content only: no preamble ("Sure!", "Here is…"), no closing remarks, no questions back.
- Format with Markdown (headings, lists, bold, tables) only when it helps; plain paragraphs otherwise.
- When editing, rewriting, fixing or translating text, return the full revised text, preserving meaning and structure.
- Match the language of the source text unless asked to translate.
- Never invent facts about the user's organisation; use placeholders like [Company Name] when details are missing.`;

// Small per-user rate limit (in memory): protects the API quota from runaway clicking
const RATE_WINDOW_MS = 60000;
const RATE_MAX = 20;
const rateHits = new Map();
const rateLimited = (userId) => {
  const now = Date.now();
  const hits = (rateHits.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  rateHits.set(userId, hits);
  return hits.length > RATE_MAX;
};

// Model output is rendered as HTML in the editor, so strip anything executable
const sanitizeHtml = (html) => String(html)
  .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, '')
  .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');

const toHtml = (markdown) => sanitizeHtml(marked.parse(String(markdown || '').trim(), { gfm: true, breaks: false }));

const clip = (s, n) => {
  const str = String(s || '');
  return str.length > n ? `${str.slice(0, n)}\n…[truncated]` : str;
};

// Build the user turn from the instruction plus whatever document context the editor sent
const buildPrompt = ({ prompt, context = {} }) => {
  const parts = [];
  const type = { doc: 'document', sheet: 'spreadsheet', ppt: 'presentation' }[context.docType] || 'document';
  if (context.title) parts.push(`Title of the ${type}: ${clip(context.title, 200)}`);
  if (context.selection && context.selection.trim()) {
    parts.push(`Selected text (apply the instruction to this text):\n"""\n${clip(context.selection, MAX_CONTEXT_CHARS)}\n"""`);
    if (context.documentText) parts.push(`Surrounding ${type} for reference:\n"""\n${clip(context.documentText, 8000)}\n"""`);
  } else if (context.documentText && context.documentText.trim()) {
    parts.push(`Current ${type} content:\n"""\n${clip(context.documentText, MAX_CONTEXT_CHARS)}\n"""`);
  }
  parts.push(`Instruction: ${clip(prompt, 4000)}`);
  return parts.join('\n\n');
};

const isRetryable = (err) => {
  if (err?.name === 'AbortError' || err?.code === 'FIRST_CHUNK_TIMEOUT') return true;
  const status = Number(err?.status);
  return !status || status === 429 || status >= 500;
};

const friendlyError = (err) => {
  const status = Number(err?.status);
  if (status === 400) return 'The AI could not process this request. Try shortening or rephrasing it.';
  if (status === 401 || status === 403) return 'The AI service rejected the API key. Check GEMINI_API_KEY in backend/.env.';
  if (status === 429) return 'AI usage limit reached for now. Please wait a minute and try again.';
  return 'The AI service is busy right now. Please try again in a moment.';
};

const validateRequest = (req, res) => {
  if (!genAI) {
    res.status(503).json({ message: 'The AI assistant is not configured. Add GEMINI_API_KEY to backend/.env and restart the server.' });
    return null;
  }
  const { prompt, model, context } = req.body || {};
  if (!prompt || !String(prompt).trim()) {
    res.status(400).json({ message: 'Please type what you would like the AI to do.' });
    return null;
  }
  if (rateLimited(String(req.user.userId))) {
    res.status(429).json({ message: 'You are sending requests too quickly. Please wait a moment.' });
    return null;
  }
  const chosen = MODELS[model] ? model : DEFAULT_MODEL;
  const chain = [chosen, ...FALLBACKS.filter((m) => m !== chosen)];
  return { chain, text: buildPrompt({ prompt, context }) };
};

const modelFor = (name) => genAI.getGenerativeModel({
  model: name,
  systemInstruction: SYSTEM_INSTRUCTION,
  generationConfig: { temperature: 0.7, maxOutputTokens: 8192, thinkingConfig: MODELS[name].thinking }
});

// ── Available models (for the picker) ─────────────────────────────────────
router.get('/models', auth, (req, res) => {
  res.json({
    configured: Boolean(genAI),
    defaultModel: DEFAULT_MODEL,
    models: Object.entries(MODELS).map(([id, m]) => ({ id, label: m.label, hint: m.hint }))
  });
});

// ── Streaming generation (Server-Sent Events) ─────────────────────────────
// Events: {type:'model', model} · {type:'chunk', text} · {type:'done', text, html, model} · {type:'error', message}
router.post('/stream', auth, async (req, res) => {
  const job = validateRequest(req, res);
  if (!job) return;

  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  let clientGone = false;
  const controller = new AbortController();
  res.on('close', () => {
    clientGone = true;
    controller.abort(); // user pressed Stop or closed the panel: stop billing tokens
  });
  const totalTimer = setTimeout(() => controller.abort(), TOTAL_TIMEOUT_MS);

  let lastError = null;
  for (const name of job.chain) {
    if (clientGone) break;
    let full = '';
    let started = false;
    const attempt = new AbortController();
    const abortAttempt = () => attempt.abort();
    controller.signal.addEventListener('abort', abortAttempt);
    const firstChunkTimer = setTimeout(() => attempt.abort(), FIRST_CHUNK_TIMEOUT_MS);
    try {
      const result = await modelFor(name).generateContentStream(
        { contents: [{ role: 'user', parts: [{ text: job.text }] }] },
        { signal: attempt.signal }
      );
      // The SDK also exposes the aggregated response as a separate promise; when the stream is aborted
      // it rejects, and an unobserved rejection would crash the whole Node process
      result.response.catch(() => {});
      for await (const chunk of result.stream) {
        const piece = chunk.text();
        if (!piece) continue;
        if (!started) {
          started = true;
          clearTimeout(firstChunkTimer);
          send({ type: 'model', model: name, label: MODELS[name].label });
        }
        full += piece;
        send({ type: 'chunk', text: piece });
      }
      clearTimeout(firstChunkTimer);
      controller.signal.removeEventListener('abort', abortAttempt);
      if (!full.trim()) throw Object.assign(new Error('Empty response'), { status: 500 });
      send({ type: 'done', text: full, html: toHtml(full), model: name, label: MODELS[name].label });
      clearTimeout(totalTimer);
      return res.end();
    } catch (err) {
      clearTimeout(firstChunkTimer);
      controller.signal.removeEventListener('abort', abortAttempt);
      lastError = err;
      if (clientGone) break;
      console.warn(`[AI] ${name} failed: ${err.status || err.name || ''} ${String(err.message).slice(0, 160)}`);
      // Once text has reached the user, switching models would produce a mixed answer
      if (started || !isRetryable(err)) break;
    }
  }
  clearTimeout(totalTimer);
  if (!clientGone) {
    send({ type: 'error', message: friendlyError(lastError) });
    res.end();
  }
});

// ── Non-streaming generation (kept for simple callers) ────────────────────
router.post('/generate', auth, async (req, res) => {
  const job = validateRequest(req, res);
  if (!job) return;
  let lastError = null;
  for (const name of job.chain) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const result = await modelFor(name).generateContent(
        { contents: [{ role: 'user', parts: [{ text: job.text }] }] },
        { signal: controller.signal }
      );
      clearTimeout(timer);
      const text = result.response.text();
      return res.json({ text, html: toHtml(text), modelUsed: name });
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      console.warn(`[AI] ${name} failed: ${err.status || err.name || ''} ${String(err.message).slice(0, 160)}`);
      if (!isRetryable(err)) break;
    }
  }
  res.status(lastError?.status === 429 ? 429 : 502).json({ message: friendlyError(lastError) });
});

module.exports = router;
