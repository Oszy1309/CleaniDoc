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
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ===== ENVIRONMENT VARIABLES =====
const JWT_SECRET = process.env.REACT_APP_JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET =
  process.env.REACT_APP_JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
const TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

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

// ===== MOCK DATABASE (Replace with real database calls) =====
const mockUsers = {
  'admin@cleanidoc.de': {
    id: uuidv4(),
    email: 'admin@cleanidoc.de',
    password: '$2b$10$SALT.HASH', // bcrypt hash of 'password123'
    role: 'admin',
    twoFactorEnabled: false,
    twoFactorSecret: null,
  },
  'worker@cleanidoc.de': {
    id: uuidv4(),
    email: 'worker@cleanidoc.de',
    password: '$2b$10$SALT.HASH',
    role: 'employee',
    twoFactorEnabled: false,
    twoFactorSecret: null,
  },
  'customer@cleanidoc.de': {
    id: uuidv4(),
    email: 'customer@cleanidoc.de',
    password: '$2b$10$SALT.HASH',
    role: 'customer',
    twoFactorEnabled: false,
    twoFactorSecret: null,
  },
};

// ===== HELPER FUNCTIONS =====

/**
 * Detect user role from email domain
 * In production, query from database
 */
function detectRoleFromEmail(email) {
  const domain = email.split('@')[1];

  // Role detection rules by domain
  const roleRules = {
    'admin@cleanidoc.de': 'admin',
    'betrieb@cleanidoc.de': 'admin',
    'manager@cleanidoc.de': 'manager',
    'worker@cleanidoc.de': 'employee',
    'worker@example.com': 'employee',
    'customer@cleanidoc.de': 'customer',
    'audit@example.com': 'customer',
  };

  // Check exact email first
  if (roleRules[email.toLowerCase()]) {
    return roleRules[email.toLowerCase()];
  }

  // Check domain patterns
  if (domain === 'cleanidoc.de') {
    return 'admin';
  }
  if (domain === 'example.com') {
    return 'employee';
  }

  // Default
  return 'customer';
}

/**
 * Verify password (In production, use bcrypt.compare)
 */
function verifyPassword(plainPassword, hashedPassword) {
  // For demo, accept test passwords
  return plainPassword === 'password123' || plainPassword.length >= 8;
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
  } catch (error) {
    throw new Error('Token invalid or expired');
  }
}

/**
 * Log audit event (Mock - replace with real logging)
 */
async function logAuditEvent(userId, email, action, metadata = {}) {
  console.log(`[AUDIT] ${action} - User: ${email} - ${new Date().toISOString()}`, metadata);
  // In production: Insert into audit_events table
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

      // Check if user exists
      const user = mockUsers[email.toLowerCase()];
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'E-Mail nicht gefunden. Bitte überprüfen Sie die Eingabe.',
        });
      }

      // Return detected role
      const role = detectRoleFromEmail(email);

      res.json({
        success: true,
        email: email,
        role: role,
        has2FA: user.twoFactorEnabled,
      });

      logAuditEvent(user.id, email, 'ROLE_DETECTION_INITIATED');
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

      const { email, password, rememberMe } = req.body;

      // Find user
      const user = mockUsers[email.toLowerCase()];
      if (!user) {
        logAuditEvent(null, email, 'LOGIN_FAILED', { reason: 'USER_NOT_FOUND' });
        return res.status(401).json({
          success: false,
          message: 'E-Mail oder Passwort ungültig',
        });
      }

      // Verify password
      if (!verifyPassword(password, user.password)) {
        logAuditEvent(user.id, email, 'LOGIN_FAILED', { reason: 'INVALID_PASSWORD' });
        return res.status(401).json({
          success: false,
          message: 'E-Mail oder Passwort ungültig',
        });
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        logAuditEvent(user.id, email, 'LOGIN_REQUIRES_2FA');
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
      logAuditEvent(user.id, email, 'LOGIN_SUCCESSFUL', { rememberMe });

      // Return user data and tokens
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

      // Find user
      const user = mockUsers[email.toLowerCase()];
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

      // In production, verify TOTP code using speakeasy
      // For now, accept any 6-digit code for testing
      if (code.length !== 6 || !/^\d+$/.test(code)) {
        logAuditEvent(user.id, email, '2FA_VERIFICATION_FAILED', { reason: 'INVALID_CODE' });
        return res.status(401).json({
          success: false,
          message: 'Ungültiger 2FA-Code',
        });
      }

      // Generate tokens
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      logAuditEvent(user.id, email, '2FA_VERIFICATION_SUCCESS');

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
  }
);

/**
 * POST /api/auth/refresh-token
 * Refresh JWT token using refresh token
 */
router.post('/refresh-token', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token erforderlich',
      });
    }

    const refreshToken = authHeader.substring(7);

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Find user
    let user = null;
    for (const u of Object.values(mockUsers)) {
      if (u.id === decoded.id) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Benutzer nicht gefunden',
      });
    }

    // Generate new token
    const newToken = generateToken(user);

    res.json({
      success: true,
      token: newToken,
    });

    logAuditEvent(user.id, user.email, 'TOKEN_REFRESHED');
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
router.post('/logout', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.decode(token);
      if (decoded) {
        logAuditEvent(decoded.id, decoded.email, 'LOGOUT');
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
      const user = mockUsers[email.toLowerCase()];

      // Don't reveal if user exists
      res.json({
        success: true,
        message: 'Wenn diese E-Mail registriert ist, erhalten Sie einen Reset-Link',
      });

      if (user) {
        logAuditEvent(user.id, email, 'PASSWORD_RESET_REQUESTED');
        // In production: Send password reset email
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

      // In production: Verify reset token and update password
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
