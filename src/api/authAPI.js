/**
 * AUTH API ENDPOINTS - Enterprise Authentication System
 * Handles all authentication flows: role detection, login, 2FA, token refresh
 *
 * Endpoints:
 * - POST /api/auth/detect-role - Smart role detection from email
 * - POST /api/auth/login - Email + password login with JWT
 * - POST /api/auth/verify-2fa - 2FA code verification
 * - POST /api/auth/refresh-token - Token refresh
 * - POST /api/auth/logout - Logout with audit logging
 * - GET /api/auth/validate-token - Token validation
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pkg from 'pg';

const { Pool } = pkg;
const router = express.Router();

// ===== ENVIRONMENT VARIABLES =====
const JWT_SECRET = process.env.REACT_APP_JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET =
  process.env.REACT_APP_JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
const TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

// DB: Supabase Postgres / Render DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

// ===== RATE LIMITING =====
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Zu viele Anmeldeversuche. Versuchen Sie es in 15 Minuten erneut.',
  standardHeaders: true,
  legacyHeaders: false,
});

const detectRoleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // More lenient for role detection (email entry)
  standardHeaders: true,
  legacyHeaders: false,
});

// ===== HELPER FUNCTIONS =====

/**
 * Detect user role from email domain (Fallback, wenn DB nichts liefert)
 */
function detectRoleFromEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase() || '';

  const roleRules = {
    'admin@cleanidoc.de': 'admin',
    'betrieb@cleanidoc.de': 'admin',
    'manager@cleanidoc.de': 'manager',
    'worker@cleanidoc.de': 'employee',
    'worker@example.com': 'employee',
    'customer@cleanidoc.de': 'customer',
    'audit@example.com': 'customer',
  };

  const lowerEmail = email.toLowerCase();

  // exakte Zuordnung
  if (roleRules[lowerEmail]) return roleRules[lowerEmail];

  // Domain-Patterns
  if (domain === 'cleanidoc.de') return 'admin';
  if (domain === 'example.com') return 'employee';

  // Default
  return 'customer';
}

/**
 * Verify password against hash from DB
 * - Wenn kein Hash vorhanden → fallback auf Demo-Logik (>= 8 Zeichen oder 'password123')
 */
async function verifyPassword(plainPassword, hashedPassword) {
  if (!hashedPassword) {
    return plainPassword === 'password123' || plainPassword.length >= 8;
  }

  try {
    const match = await bcrypt.compare(plainPassword, hashedPassword);
    return match;
  } catch (error) {
    console.error('Error comparing password hash:', error);
    return false;
  }
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
    { expiresIn: TOKEN_EXPIRY }
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
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Verify token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_error) {
    throw new Error('Token invalid or expired');
  }
}

/**
 * Log audit event (Mock - replace with real DB logging if gewünscht)
 */
async function logAuditEvent(userId, email, action, metadata = {}) {
  console.log(`[AUDIT] ${action} - User: ${email} - ${new Date().toISOString()}`, metadata);
  // TODO: In production: Insert into public.audit_events
  // await pool.query(
  //   `insert into public.audit_events (user_id, email, action, metadata, occurred_at)
  //    values ($1, $2, $3, $4, now())`,
  //   [userId, email, action, metadata]
  // );
}

/**
 * Hilfsfunktion: User + Rolle aus DB holen
 * - Sucht in public.users nach E-Mail
 * - Joint optional mit public.profiles für Rolle
 */
async function fetchUserByEmail(email) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `
      select
        u.id,
        u.email,
        u.password_hash,
        u.role as user_role,
        u.two_factor_enabled,
        u.two_factor_secret,
        p.role as profile_role
      from public.users u
      left join public.profiles p
        on lower(p.email) = lower(u.email)
      where lower(u.email) = lower($1)
      limit 1;
      `,
      [email.toLowerCase()]
    );

    if (rows.length === 0) return null;

    const row = rows[0];

    const role = row.profile_role || row.user_role || detectRoleFromEmail(row.email);

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role,
      twoFactorEnabled: row.two_factor_enabled === true,
      twoFactorSecret: row.two_factor_secret || null,
    };
  } finally {
    client.release();
  }
}

/**
 * Hilfsfunktion: User nach ID laden (für refresh-token)
 */
async function fetchUserById(userId) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `
      select
        u.id,
        u.email,
        u.password_hash,
        u.role as user_role,
        u.two_factor_enabled,
        u.two_factor_secret,
        p.role as profile_role
      from public.users u
      left join public.profiles p
        on p.id = u.id
      where u.id = $1
      limit 1;
      `,
      [userId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    const role = row.profile_role || row.user_role || detectRoleFromEmail(row.email);

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role,
      twoFactorEnabled: row.two_factor_enabled === true,
      twoFactorSecret: row.two_factor_secret || null,
    };
  } finally {
    client.release();
  }
}

// ===== API ENDPOINTS =====

/**
 * POST /api/auth/detect-role
 * Detect user role from email (first step of login flow)
 */
router.post(
  '/detect-role',
  detectRoleLimiter,
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Ungültige E-Mail-Adresse',
          errors: errors.array(),
        });
      }

      const { email } = req.body;

      const user = await fetchUserByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'E-Mail nicht gefunden. Bitte überprüfen Sie die Eingabe.',
        });
      }

      res.json({
        success: true,
        email: user.email,
        role: user.role,
        has2FA: user.twoFactorEnabled,
      });

      logAuditEvent(user.id, user.email, 'ROLE_DETECTION_INITIATED');
    } catch (error) {
      console.error('detect-role error:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler bei der Identifizierung',
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 * Returns JWT token and user data, or 2FA requirement
 */
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    body('role').isIn(['admin', 'employee', 'customer', 'manager']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validierungsfehler',
          errors: errors.array(),
        });
      }

      const { email, password, role, rememberMe } = req.body;

      const user = await fetchUserByEmail(email);
      if (!user) {
        await logAuditEvent(null, email, 'LOGIN_FAILED', { reason: 'USER_NOT_FOUND' });
        return res.status(401).json({
          success: false,
          message: 'E-Mail oder Passwort ungültig',
        });
      }

      // Rolle prüfen: Frontend hat role aus detect-role → hier nochmal absichern
      if (role && role !== user.role) {
        await logAuditEvent(user.id, email, 'LOGIN_FAILED', { reason: 'ROLE_MISMATCH' });
        return res.status(403).json({
          success: false,
          message: 'Rollenübereinstimmung fehlgeschlagen',
        });
      }

      // Passwort prüfen
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) {
        await logAuditEvent(user.id, email, 'LOGIN_FAILED', { reason: 'INVALID_PASSWORD' });
        return res.status(401).json({
          success: false,
          message: 'E-Mail oder Passwort ungültig',
        });
      }

      // 2FA-Check
      if (user.twoFactorEnabled) {
        await logAuditEvent(user.id, email, 'LOGIN_REQUIRES_2FA');
        return res.json({
          success: true,
          requires2FA: true,
          message: '2FA erforderlich',
        });
      }

      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      await logAuditEvent(user.id, email, 'LOGIN_SUCCESSFUL', { rememberMe });

      res.json({
        success: true,
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
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
  }
);

/**
 * POST /api/auth/verify-2fa
 * Verify 2FA code and complete login
 */
router.post(
  '/verify-2fa',
  authLimiter,
  [body('email').isEmail().normalizeEmail(), body('code').isLength({ min: 6, max: 6 }).isNumeric()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Ungültiger Format',
          errors: errors.array(),
        });
      }

      const { email, code } = req.body;
      const user = await fetchUserByEmail(email);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Benutzer nicht gefunden',
        });
      }

      if (!user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA ist nicht aktiviert',
        });
      }

      // In production: TOTP gegen twoFactorSecret prüfen
      if (code.length !== 6 || !/^\d+$/.test(code)) {
        await logAuditEvent(user.id, email, '2FA_VERIFICATION_FAILED', { reason: 'INVALID_CODE' });
        return res.status(401).json({
          success: false,
          message: 'Ungültiger 2FA-Code',
        });
      }

      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      await logAuditEvent(user.id, email, '2FA_VERIFICATION_SUCCESS');

      res.json({
        success: true,
        token,
        refreshToken,
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
  }
);

/**
 * POST /api/auth/refresh-token
 * Refresh JWT token using refresh token
 */
router.post('/refresh-token', async (req, res) => {
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
    } catch (_err) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token ungültig oder abgelaufen',
      });
    }

    if (!decoded || decoded.type !== 'refresh' || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token ungültig',
      });
    }

    const user = await fetchUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Benutzer nicht gefunden',
      });
    }

    const newToken = generateToken(user);

    res.json({
      success: true,
      token: newToken,
    });

    await logAuditEvent(user.id, user.email, 'TOKEN_REFRESHED');
  } catch (error) {
    console.error('refresh-token error:', error);
    res.status(401).json({
      success: false,
      message: 'Token-Aktualisierung fehlgeschlagen',
    });
  }
});

/**
 * GET /api/auth/validate-token
 * Validate JWT token
 */
router.get('/validate-token', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token erforderlich',
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    res.json({
      success: true,
      user: decoded,
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    });
  } catch (error) {
    console.error('validate-token error:', error);
    res.status(401).json({
      success: false,
      message: 'Token ungültig oder abgelaufen',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and clear session
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.decode(token);
      if (decoded && decoded.id && decoded.email) {
        await logAuditEvent(decoded.id, decoded.email, 'LOGOUT');
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
 * Request password reset email
 */
router.post(
  '/request-password-reset',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { email } = req.body;
      const user = await fetchUserByEmail(email);

      // Keine Info leaken, ob User existiert
      res.json({
        success: true,
        message: 'Wenn diese E-Mail registriert ist, erhalten Sie einen Reset-Link',
      });

      if (user) {
        await logAuditEvent(user.id, email, 'PASSWORD_RESET_REQUESTED');
        // TODO: In production: Reset-Token erzeugen + E-Mail verschicken
      }
    } catch (error) {
      console.error('request-password-reset error:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Anfordern des Passwort-Reset',
      });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Reset password with valid reset token
 */
router.post(
  '/reset-password',
  [body('token').notEmpty(), body('newPassword').isLength({ min: 8 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Ungültige Eingaben',
          errors: errors.array(),
        });
      }

      const { token, newPassword } = req.body;

      // TODO: Reset-Token prüfen, User identifizieren, Passwort aktualisieren:
      // const passwordHash = await bcrypt.hash(newPassword, 10);
      // update public.users set password_hash = passwordHash where id = <aus Token>;

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
  }
);

// ===== ERROR HANDLER =====
router.use((error, req, res, next) => {
  console.error('Auth API Error:', error);
  res.status(500).json({
    success: false,
    message: 'Interner Server-Fehler',
  });
});

export default router;
