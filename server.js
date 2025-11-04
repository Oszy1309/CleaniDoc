/**
 * Express Backend Server - Authentication & API Routes
 * Runs on port 5000 in development
 * Provides API endpoints for the React frontend
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Try to import auth endpoints (if using ES modules)
let authRoutes;
try {
  // This is a workaround for using ES modules in a Node server
  // In production, consider using a proper backend setup
  const authRoutesPath = './src/api/authAPI.js';
  console.log(`[Server] Loading auth routes from ${authRoutesPath}...`);
} catch (error) {
  console.warn('[Server] Auth routes not available as ES module');
}

// ===== INITIALIZE EXPRESS =====
const app = express();
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARE =====
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===== MOCK AUTH ENDPOINTS (Until we can import authAPI.js) =====

// Detect role from email
app.post('/api/auth/detect-role', (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Ungültige E-Mail-Adresse',
    });
  }

  // Simple role detection logic
  const detectedRole = detectRoleFromEmail(email);

  res.json({
    success: true,
    email: email,
    role: detectedRole,
    has2FA: false,
  });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'E-Mail und Passwort erforderlich',
    });
  }

  // Mock authentication - for demo, accept any password
  if (password.length < 3) {
    return res.status(401).json({
      success: false,
      message: 'Ungültiges Passwort',
    });
  }

  // Generate mock JWT token
  const mockToken = Buffer.from(
    JSON.stringify({
      id: '123',
      email: email,
      role: role || 'employee',
      iat: Date.now(),
    })
  ).toString('base64');

  res.json({
    success: true,
    token: mockToken,
    refreshToken: mockToken,
    user: {
      id: '123',
      email: email,
      role: role || 'employee',
    },
    role: role || 'employee',
  });
});

// Verify 2FA endpoint
app.post('/api/auth/verify-2fa', (req, res) => {
  const { email, code } = req.body;

  if (!code || code.length !== 6) {
    return res.status(401).json({
      success: false,
      message: 'Ungültiger 2FA-Code',
    });
  }

  const mockToken = Buffer.from(
    JSON.stringify({
      id: '123',
      email: email,
      role: 'employee',
      iat: Date.now(),
    })
  ).toString('base64');

  res.json({
    success: true,
    token: mockToken,
    refreshToken: mockToken,
    user: {
      id: '123',
      email: email,
      role: 'employee',
    },
    role: 'employee',
  });
});

// Refresh token endpoint
app.post('/api/auth/refresh-token', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token erforderlich',
    });
  }

  const mockToken = Buffer.from(
    JSON.stringify({
      id: '123',
      email: 'user@example.com',
      role: 'employee',
      iat: Date.now(),
    })
  ).toString('base64');

  res.json({
    success: true,
    token: mockToken,
  });
});

// Validate token endpoint
app.get('/api/auth/validate-token', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token erforderlich',
    });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

    res.json({
      success: true,
      user: decoded,
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token ungültig',
    });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Erfolgreich abgemeldet',
  });
});

// Password reset request endpoint
app.post('/api/auth/request-password-reset', (req, res) => {
  const { email } = req.body;

  res.json({
    success: true,
    message: 'Wenn diese E-Mail registriert ist, erhalten Sie einen Reset-Link',
  });
});

// Password reset endpoint
app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Ungültige Eingaben',
    });
  }

  res.json({
    success: true,
    message: 'Passwort erfolgreich zurückgesetzt',
  });
});

// ===== HELPER FUNCTIONS =====

function detectRoleFromEmail(email) {
  const domain = email.split('@')[1] || '';

  // Simple detection based on email patterns
  if (email.includes('admin') || email.includes('betrieb')) {
    return 'admin';
  }
  if (email.includes('manager')) {
    return 'manager';
  }
  if (email.includes('worker') || email.includes('employee')) {
    return 'employee';
  }
  if (email.includes('customer') || email.includes('audit')) {
    return 'customer';
  }

  // Domain-based detection
  if (domain === 'cleanidoc.de') {
    return 'admin';
  }
  if (domain === 'example.com') {
    return 'employee';
  }

  // Default
  return 'customer';
}

// ===== ERROR HANDLER =====
app.use((error, req, res, next) => {
  console.error('[Server Error]', error);
  res.status(500).json({
    success: false,
    message: 'Interner Server-Fehler',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route nicht gefunden: ${req.method} ${req.path}`,
  });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   CleaniDoc API Server                 ║
║   Environment: ${process.env.NODE_ENV || 'development'}                     ║
║   Port: ${PORT}                                  ║
║   API Base URL: http://localhost:${PORT}/api     ║
╚════════════════════════════════════════╝
  `);
});

module.exports = app;
