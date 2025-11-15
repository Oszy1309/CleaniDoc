// server.js
/**
 * CleaniDoc Backend Server - Supabase Integration
 * - Läuft auf Render mit Node
 * - Nutzt Supabase Service Role für DB-Zugriff
 * - Stellt Auth-API für das React-Frontend bereit
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ===== ENV / SUPABASE =====
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   REACT_APP_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein');
  process.exit(1);
}

// Service-Client: volle Rechte, RLS wird umgangen
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
console.log('✅ Supabase client initialized');

// ===== EXPRESS SETUP =====
const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===== JWT SECRETS =====
const JWT_SECRET = process.env.REACT_APP_JWT_SECRET || 'dev-secret-key';
const JWT_REFRESH_SECRET = process.env.REACT_APP_JWT_REFRESH_SECRET || 'dev-refresh-secret';

// ===== HELPERS =====
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
      type: 'refresh',
    },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

async function logAuditEvent(userId, email, action, metadata = {}) {
  try {
    await supabase.from('audit_events').insert({
      user_id: userId || null,
      email,
      action,
      metadata,
      occurred_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error logging audit event:', err.message);
  }
}

// ===== AUTH ENDPOINTS =====

/**
 * POST /api/auth/detect-role
 * Prüft, ob es zu der E-Mail einen User in public.users gibt
 * und liefert die gespeicherte Rolle zurück.
 */
app.post('/api/auth/detect-role', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige E-Mail-Adresse',
      });
    }

    // User aus deiner eigenen Credential-Tabelle public.users
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      console.log(`User not found in public.users: ${email}`);
      return res.status(404).json({
        success: false,
        message: 'E-Mail nicht gefunden. Bitte überprüfen Sie die Eingabe.',
      });
    }

    // Rolle aus public.users zurückgeben
    res.json({
      success: true,
      email: user.email,
      role: user.role,
      has2FA: false,
    });

    await logAuditEvent(user.id, email, 'ROLE_DETECTION_SUCCESS');
  } catch (err) {
    console.error('detect-role error:', err);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Identifizierung',
    });
  }
});

/**
 * POST /api/auth/login
 * Login über public.users (password_hash), Rolle wird von dort gelesen.
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail und Passwort erforderlich',
      });
    }

    // User + Passwort-Hash holen
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, role, first_name, last_name')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      console.log(`Login failed - user not found: ${email}`);
      await logAuditEvent(null, email, 'LOGIN_FAILED', { reason: 'USER_NOT_FOUND' });
      return res.status(401).json({
        success: false,
        message: 'E-Mail oder Passwort ungültig',
      });
    }

    // optional: Rolle prüfen, falls Frontend schon eine erwartete Rolle übergibt
    if (role && role !== user.role) {
      console.log(`Login failed - role mismatch: ${email}, expected ${role}, got ${user.role}`);
      await logAuditEvent(user.id, email, 'LOGIN_FAILED', { reason: 'ROLE_MISMATCH' });
      return res.status(401).json({
        success: false,
        message: 'Rollen-Konflikt',
      });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      console.log(`Login failed - invalid password: ${email}`);
      await logAuditEvent(user.id, email, 'LOGIN_FAILED', { reason: 'INVALID_PASSWORD' });
      return res.status(401).json({
        success: false,
        message: 'E-Mail oder Passwort ungültig',
      });
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    await logAuditEvent(user.id, email, 'LOGIN_SUCCESS');

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      role: user.role,
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({
      success: false,
      message: 'Anmeldung fehlgeschlagen',
    });
  }
});

/**
 * POST /api/auth/refresh-token
 */
app.post('/api/auth/refresh-token', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token erforderlich',
      });
    }

    const refreshToken = authHeader.substring(7);

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token ungültig',
      });
    }

    // Nur die ID ist im Refresh-Token gespeichert
    const newAccessToken = jwt.sign(
      {
        id: decoded.id,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token: newAccessToken,
    });
  } catch (err) {
    console.error('refresh-token error:', err);
    res.status(500).json({
      success: false,
      message: 'Token-Aktualisierung fehlgeschlagen',
    });
  }
});

/**
 * GET /api/auth/validate-token
 */
app.get('/api/auth/validate-token', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token erforderlich',
      });
    }

    const token = authHeader.substring(7);

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Token ungültig oder abgelaufen',
      });
    }

    res.json({
      success: true,
      user: decoded,
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    });
  } catch (err) {
    console.error('validate-token error:', err);
    res.status(500).json({
      success: false,
      message: 'Token-Validierung fehlgeschlagen',
    });
  }
});

/**
 * POST /api/auth/logout
 */
app.post('/api/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.decode(token);
        if (decoded) {
          await logAuditEvent(decoded.id, decoded.email, 'LOGOUT');
        }
      } catch (e) {
        // ignore
      }
    }

    res.json({
      success: true,
      message: 'Erfolgreich abgemeldet',
    });
  } catch (err) {
    console.error('logout error:', err);
    res.status(500).json({
      success: false,
      message: 'Abmeldung fehlgeschlagen',
    });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route nicht gefunden: ${req.method} ${req.path}`,
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Interner Server-Fehler',
  });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   CleaniDoc API Server                 ║
║   Environment: ${process.env.NODE_ENV || 'development'}               
║   Port: ${PORT}                                 
║   Supabase: Connected ✓                ║
║   API Base URL: http://localhost:${PORT}/api    
╚════════════════════════════════════════╝
  `);
});

module.exports = app;
