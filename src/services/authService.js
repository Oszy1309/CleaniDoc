/**
 * Auth Service - Frontend API Client
 * Handles all authentication API calls
 *
 * Environment Variables:
 * - REACT_APP_API_URL: Base URL for API (default: http://localhost:5000)
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const authService = {
  // ===== ROLE DETECTION =====
  async detectRole(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/detect-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      if (!response.ok) {
        throw new Error(`Role detection failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('detectRole error:', error);
      throw error;
    }
  },

  // ===== LOGIN =====
  async login(email, password, role, rememberMe = false) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password,
          role,
          rememberMe,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();

      // Speichere Token und Role
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('userEmail', email.toLowerCase());
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      }

      return data;
    } catch (error) {
      console.error('login error:', error);
      throw error;
    }
  },

  // ===== 2FA VERIFICATION =====
  async verify2FA(email, code) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          code,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '2FA verification failed');
      }

      const data = await response.json();

      // Speichere Token und Role
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userRole', data.role);
      }

      return data;
    } catch (error) {
      console.error('verify2FA error:', error);
      throw error;
    }
  },

  // ===== TOKEN REFRESH =====
  async refreshToken() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token available');

      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      return data;
    } catch (error) {
      console.error('refreshToken error:', error);
      // Token invalid - logout
      authService.logout();
      throw error;
    }
  },

  // ===== LOGOUT =====
  async logout() {
    try {
      const token = localStorage.getItem('authToken');

      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('user');
    }
  },

  // ===== VALIDATE TOKEN =====
  async validateToken(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/validate-token`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token validation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('validateToken error:', error);
      throw error;
    }
  },

  // ===== GET CURRENT USER =====
  getCurrentUser() {
    const userJson = localStorage.getItem('user');
    if (!userJson) return null;

    try {
      return JSON.parse(userJson);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },

  // ===== GET TOKEN =====
  getToken() {
    return localStorage.getItem('authToken');
  },

  // ===== GET ROLE =====
  getRole() {
    return localStorage.getItem('userRole');
  },

  // ===== IS AUTHENTICATED =====
  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  },

  // ===== PASSWORD RESET REQUEST =====
  async requestPasswordReset(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      if (!response.ok) {
        throw new Error('Password reset request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('requestPasswordReset error:', error);
      throw error;
    }
  },

  // ===== RESET PASSWORD =====
  async resetPassword(token, newPassword) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        throw new Error('Password reset failed');
      }

      return await response.json();
    } catch (error) {
      console.error('resetPassword error:', error);
      throw error;
    }
  },
};
