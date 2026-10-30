const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// Load backend/.env no matter which folder the server is started from
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
// FRONTEND_URL may hold one or more origins separated by commas. Trailing slashes and
// stray spaces are ignored, so "https://site.vercel.app/" still matches.
const normalizeOrigin = (o) => String(o || '').trim().replace(/\/+$/, '').toLowerCase();
const allowedOrigins = new Set([
  ...String(process.env.FRONTEND_URL || '').split(','),
  'https://docs-app-roan.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
].map(normalizeOrigin).filter(Boolean));
// Vercel preview deployments of this project, e.g. https://docs-app-git-main-team.vercel.app
const vercelPreview = /^https:\/\/docs-app[a-z0-9-]*\.vercel\.app$/;

const corsOptions = {
  origin(origin, callback) {
    // Requests without an Origin header (curl, server-to-server, Razorpay webhooks) are allowed
    if (!origin) return callback(null, true);
    const o = normalizeOrigin(origin);
    if (allowedOrigins.has(o) || vercelPreview.test(o)) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}. Add it to FRONTEND_URL to allow it.`);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // let browsers cache the preflight for a day
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions)); // also answers preflight (OPTIONS) requests
console.log('[CORS] Allowed origins:', [...allowedOrigins].join(', '), '+ docs-app*.vercel.app previews');
// Documents carry inline content (base64 images, workbook/deck JSON), so the 100kb default is far too small
app.use(express.json({
  limit: '25mb',
  // Razorpay webhooks are signed over the exact raw bytes
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/api/subscription/webhook')) req.rawBody = buf;
  }
}));

const path = require('path');

const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Routes
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const groupRoutes = require('./routes/groups');
const aiRoutes = require('./routes/ai');
const subscriptionRoutes = require('./routes/subscription');
const superadminRoutes = require('./routes/superadmin');

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/superadmin', superadminRoutes);

// Simple health check (also handy for keeping a free Render instance awake)
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Unknown API routes → JSON 404 (still carries CORS headers)
app.use('/api', (req, res) => res.status(404).json({ message: `Not found: ${req.method} ${req.originalUrl}` }));

// Last-resort error handler. Runs after CORS, so the browser gets a readable error
// (e.g. "document too large") instead of a misleading CORS failure.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'This document is too large to save (over 25 MB). Remove or shrink some images, then try again.' });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'The request body is not valid JSON.' });
  }
  console.error('[Unhandled error]', req.method, req.originalUrl, err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  res.status(err.status || err.statusCode || 500).json({ message: 'Server error. Please try again.' });
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/docs_app';

const Group = require('./models/Group');
const Document = require('./models/Document');
const User = require('./models/User');

// A stray rejected promise in one request must never take the whole API down
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason && reason.message ? reason.message : reason);
});
// Log memory now and then so out-of-memory restarts are easy to spot in the Render logs
setInterval(() => {
  const m = process.memoryUsage();
  const mb = (n) => Math.round(n / 1048576);
  if (mb(m.rss) > 350) console.warn(`[memory] rss ${mb(m.rss)} MB, heap ${mb(m.heapUsed)}/${mb(m.heapTotal)} MB`);
}, 60000).unref();

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    // One-time: wipe old/demo subscription data and put every user on the 25 MB free plan
    try {
      await require('./scripts/resetSubscriptions').runOnce();
    } catch (err) {
      console.error('[Subscription reset] failed:', err.message);
    }
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
