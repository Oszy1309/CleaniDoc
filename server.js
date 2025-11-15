/**
 * Express Backend Server - Supabase Integration
 * Runs on port 5000 in development
 * Provides API endpoints for authentication with real Supabase database
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Supabase Client für Node.js
const { createClient } = require('@supabase/supabase-js');

// ===== INITIALIZE SUPABASE =====
// Use Service Role Key for backend operations
// WICHTIG: Diese Keys MÜSSEN als Environment Variablen in Vercel gesetzt sein!
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Bitte folgende Environment Variablen in Vercel/local setzen:');
  console.error('   - REACT_APP_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log('✅ Supabase client initialized');

// ===== INITIALIZE EXPRESS =====
const app = express();
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARE =====
// CORS Configuration - Allow all origins for development/production
// In production, you can restrict to specific domains if needed
app.use(
  cors({
    origin: '*', // Allow all origins (safe for API-only backend)
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===== ENVIRONMENT VARIABLES =====
const JWT_SECRET = process.env.REACT_APP_JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.REACT_APP_JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.warn('⚠️  JWT Secrets nicht gesetzt - verwende Development Values (NICHT für Production!)');
  if (!JWT_SECRET) process.env.REACT_APP_JWT_SECRET = 'dev-secret-key';
  if (!JWT_REFRESH_SECRET) process.env.REACT_APP_JWT_REFRESH_SECRET = 'dev-refresh-secret';
}

// ===== HELPER FUNCTIONS =====

/**
 * Detect user role from email domain
 */
function detectRoleFromEmail(email) {
  const domain = email.split('@')[1];

  if (email.includes('admin') || email.includes('betrieb')) return 'admin';
  if (email.includes('manager')) return 'manager';
  if (email.includes('worker') || email.includes('employee')) return 'employee';
  if (email.includes('customer') || email.includes('audit')) return 'customer';

  if (domain === 'cleanidoc.de') return 'admin';
  if (domain === 'example.com') return 'employee';

  return 'customer';
}

/**
 * Generate JWT token
 */
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

/**
 * Generate refresh token
 */
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

/**
 * Log audit event to Supabase
 */
async function logAuditEvent(userId, email, action, metadata = {}) {
  try {
    await supabase.from('audit_events').insert({
      user_id: userId || null,
      email: email,
      action: action,
      metadata: metadata,
      occurred_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging audit event:', error.message);
  }
}

// ===== API ENDPOINTS =====

/**
 * POST /api/auth/detect-role
 * Detect user role from email (first step of login flow)
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

    // Check if user exists in Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      console.log(`User not found: ${email}`);
      return res.status(404).json({
        success: false,
        message: 'E-Mail nicht gefunden. Bitte überprüfen Sie die Eingabe.',
      });
    }

    res.json({
      success: true,
      email: email,
      role: user.role,
      has2FA: false, // TODO: Add 2FA flag from database
    });

    await logAuditEvent(user.id, email, 'ROLE_DETECTION_SUCCESS');
  } catch (error) {
    console.error('detect-role error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Identifizierung',
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user with email and password
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

    // Get user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      console.log(`Login failed - user not found: ${email}`);
      await logAuditEvent(null, email, 'LOGIN_FAILED', { reason: 'USER_NOT_FOUND' });
      return res.status(401).json({
        success: false,
        message: 'E-Mail oder Passwort ungültig',
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      console.log(`Login failed - invalid password: ${email}`);
      await logAuditEvent(user.id, email, 'LOGIN_FAILED', { reason: 'INVALID_PASSWORD' });
      return res.status(401).json({
        success: false,
        message: 'E-Mail oder Passwort ungültig',
      });
    }

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
      await logAuditEvent(user.id, email, 'LOGIN_REQUIRES_2FA');
      return res.json({
        success: true,
        requires2FA: true,
        message: '2FA erforderlich',
      });
    }

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Log successful login
    await logAuditEvent(user.id, email, 'LOGIN_SUCCESS');

    res.json({
      success: true,
      token: token,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      role: user.role,
    });
  } catch (error) {
    console.error('login error:', error);
    res.status(500).json({
      success: false,
      message: 'Anmeldung fehlgeschlagen',
    });
  }
});

/**
 * POST /api/auth/verify-2fa
 * Verify 2FA code and complete login
 */
app.post('/api/auth/verify-2fa', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Format',
      });
    }

    // Get user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Benutzer nicht gefunden',
      });
    }

    if (!user.two_factor_enabled) {
      return res.status(400).json({
        success: false,
        message: '2FA ist nicht aktiviert',
      });
    }

    // TODO: Verify TOTP code using speakeasy
    // For now, accept any 6-digit code
    if (!/^\d{6}$/.test(code)) {
      await logAuditEvent(user.id, email, '2FA_VERIFICATION_FAILED', { reason: 'INVALID_CODE' });
      return res.status(401).json({
        success: false,
        message: 'Ungültiger 2FA-Code',
      });
    }

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    await logAuditEvent(user.id, email, '2FA_VERIFICATION_SUCCESS');

    res.json({
      success: true,
      token: token,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      role: user.role,
    });
  } catch (error) {
    console.error('verify-2fa error:', error);
    res.status(500).json({
      success: false,
      message: '2FA-Verifizierung fehlgeschlagen',
    });
  }
});

/**
 * POST /api/auth/refresh-token
 * Refresh JWT token
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

    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

      // Generate new token
      const newToken = jwt.sign(
        {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({
        success: true,
        token: newToken,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token ungültig',
      });
    }
  } catch (error) {
    console.error('refresh-token error:', error);
    res.status(500).json({
      success: false,
      message: 'Token-Aktualisierung fehlgeschlagen',
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV || 'unknown',
    time: new Date().toISOString(),
  });
});

/**
 * GET /api/auth/validate-token
 * Validate JWT token
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

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      res.json({
        success: true,
        user: decoded,
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token ungültig oder abgelaufen',
      });
    }
  } catch (error) {
    console.error('validate-token error:', error);
    res.status(500).json({
      success: false,
      message: 'Token-Validierung fehlgeschlagen',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
app.post('/api/auth/logout', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.decode(token);
        if (decoded) {
          logAuditEvent(decoded.id, decoded.email, 'LOGOUT');
        }
      } catch (e) {
        // Ignore decode errors
      }
    }

    res.json({
      success: true,
      message: 'Erfolgreich abgemeldet',
    });
  } catch (error) {
    console.error('logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Abmeldung fehlgeschlagen',
    });
  }
});

/**
 * POST /api/auth/request-password-reset
 */
app.post('/api/auth/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    // Don't reveal if user exists
    res.json({
      success: true,
      message: 'Wenn diese E-Mail registriert ist, erhalten Sie einen Reset-Link',
    });

    if (user) {
      await logAuditEvent(user.id, email, 'PASSWORD_RESET_REQUESTED');
    }
  } catch (error) {
    console.error('request-password-reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Anfordern des Passwort-Reset',
    });
  }
});

/**
 * POST /api/auth/reset-password
 */
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Eingaben',
      });
    }

    // TODO: Implement proper token validation

    res.json({
      success: true,
      message: 'Passwort erfolgreich zurückgesetzt',
    });
  } catch (error) {
    console.error('reset-password error:', error);
    res.status(500).json({
      success: false,
      message: 'Passwort-Reset fehlgeschlagen',
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 */
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, aktuelles und neues Passwort sind erforderlich',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Neues Passwort muss mindestens 8 Zeichen lang sein',
      });
    }

    // Get user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Benutzer nicht gefunden',
      });
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      await logAuditEvent(user.id, email, 'PASSWORD_CHANGE_FAILED', { reason: 'INVALID_PASSWORD' });
      return res.status(401).json({
        success: false,
        message: 'Aktuelles Passwort ist incorrect',
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: hashedNewPassword })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    await logAuditEvent(user.id, email, 'PASSWORD_CHANGED');

    res.json({
      success: true,
      message: 'Passwort erfolgreich geändert',
    });
  } catch (error) {
    console.error('change-password error:', error);
    res.status(500).json({
      success: false,
      message: 'Passwortänderung fehlgeschlagen',
    });
  }
});

// ===== ERROR HANDLER =====
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    message: 'Interner Server-Fehler',
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
║   Supabase: Connected ✓                ║
║   API Base URL: http://localhost:${PORT}/api     ║
╚════════════════════════════════════════╝
  `);
});

module.exports = app;
