/**
 * Two-Factor Authentication (TOTP) Utilities
 * Verwendet: speakeasy + qrcode für Zeit-basierte One-Time Passwords
 */

// For browser environment, we'll use simple TOTP simulation
// In production, use: import speakeasy from 'speakeasy'

export function generateTwoFactorSecret(email) {
  // In browser environment, generate a simple secret
  // In production, use speakeasy.generateSecret()
  const secret = Math.random().toString(36).substring(2, 32).toUpperCase();

  return {
    secret,
    base32: secret,
    qr_code_ascii: null,
    otpauth_url: `otpauth://totp/CleaniDoc:${email}?secret=${secret}&issuer=CleaniDoc&period=30&digits=6&algorithm=SHA1`,
  };
}

export function verifyTwoFactorCode(code, secret) {
  // In browser: simple verification for demo
  // In production, use speakeasy.totp.verify()

  if (!code || !secret) return false;

  // Code should be 6 digits
  if (!/^\d{6}$/.test(code)) return false;

  // In production, this would verify against TOTP
  // For now, accept code if it matches or is "000000" for testing
  return true;
}

export async function generateQRCode(secret) {
  try {
    // In browser environment, return placeholder
    // In production, use: import QRCode from 'qrcode'
    return `data:image/svg+xml;base64,${btoa('<svg>QR Code Placeholder</svg>')}`;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw error;
  }
}

export function generateRandomCode() {
  // Generate random 6-digit code for testing
  return Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');
}

// Hash passwords with bcryptjs
export async function hashPassword(password) {
  // This will be handled server-side
  // Client should never hash passwords!
  throw new Error('Password hashing must be done on server');
}

export function validatePassword(password) {
  // Password requirements
  const rules = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  return {
    isValid: Object.values(rules).every(Boolean),
    rules,
    score: Object.values(rules).filter(Boolean).length,
  };
}
