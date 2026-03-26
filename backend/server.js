const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

dotenv.config();

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' })); // allow base64 image payloads

// ─── Health Check ──────────────────────────────────────────────────────────────
/**
 * GET /
 * Returns a simple status message to confirm the server is running.
 */
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Identity Hub API is running' });
});

// ─── API Routes ────────────────────────────────────────────────────────────────

/**
 * POST /api/enroll   — User enrollment with AI face match (2.1)
 * POST /api/auth     — Face-based authentication, returns JWT (2.2)
 * GET  /api/sso      — Simplified OAuth2/SSO login + redirect (2.3)
 * GET  /api/sso/callback — SSO callback helper (2.3)
 * GET  /api/credential/:userId — Verifiable credential JWT (2.4)
 * POST /api/consent  — Grant data-sharing consent (2.5)
 * GET  /api/consent/:userId — List approved services (2.5)
 */
app.use('/api/enroll',     require('./api/enrollment'));
app.use('/api/auth',       require('./api/auth'));
app.use('/api/sso',        require('./api/oauth'));
app.use('/api/credential', require('./api/credential'));
app.use('/api/consent',    require('./api/consent'));

// ─── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ─── Start Server (after DB connection) ────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();              // wait for MongoDB before accepting requests
  app.listen(PORT, () => {
    console.log(`✅ Identity Hub API running on http://localhost:${PORT}`);
    // console.log(`   MongoDB: ${process.env.MONGODB_URI}`);
  });
};

start();

module.exports = app; // exported for testing
