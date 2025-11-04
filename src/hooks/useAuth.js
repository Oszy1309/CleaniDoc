/**
 * useAuth Hook - Central Auth State Management (Enterprise Edition)
 * Provides authentication context throughout the app with 2FA support
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // ===== INITIALIZE AUTH STATE =====
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if token exists
        const token = authService.getToken();
        const storedRole = authService.getRole();

        if (!token) {
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }

        // Validate token
        try {
          const userData = await authService.validateToken(token);
          setUser(userData);
          setRole(storedRole);
        } catch (error) {
          // Token invalid - try to refresh
          try {
            await authService.refreshToken();
            const userData = authService.getCurrentUser();
            const refreshedRole = authService.getRole();
            setUser(userData);
            setRole(refreshedRole);
          } catch (refreshError) {
            // Refresh failed - logout
            await logout();
          }
        }
      } catch (err) {
        setError(err.message);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // ===== LOGIN =====
  const login = useCallback(async (email, password, detectedRole, rememberMe = false) => {
    try {
      setLoading(true);
      setError(null);

      const result = await authService.login(email, password, detectedRole, rememberMe);

      if (result.requires2FA) {
        setLoading(false);
        return {
          success: false,
          requires2FA: true,
          message: 'Please verify with 2FA',
        };
      }

      // Login successful - update user state
      console.log('✅ Login successful, setting user:', result.user);
      setUser(result.user);
      setRole(result.role);
      setLoading(false);

      return {
        success: true,
        user: result.user,
        role: result.role,
        token: result.token,
      };
    } catch (err) {
      const errorMsg = err.message || 'Login failed';
      setError(errorMsg);
      setLoading(false);
      console.error('Login error:', errorMsg);
      return {
        success: false,
        message: errorMsg,
      };
    }
  }, []);

  // ===== VERIFY 2FA =====
  const verify2FA = useCallback(async (email, code) => {
    try {
      setLoading(true);
      setError(null);

      const result = await authService.verify2FA(email, code);

      setUser(result.user);
      setRole(result.role);

      return {
        success: true,
        user: result.user,
        role: result.role,
      };
    } catch (err) {
      const errorMsg = err.message || '2FA verification failed';
      setError(errorMsg);
      return {
        success: false,
        message: errorMsg,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== LOGOUT =====
  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
      setRole(null);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      // Force logout anyway
      setUser(null);
      setRole(null);
      navigate('/login');
    }
  }, [navigate]);

  // ===== HAS ROLE =====
  const hasRole = useCallback(
    requiredRoles => {
      if (!role) return false;
      if (typeof requiredRoles === 'string') {
        return role === requiredRoles;
      }
      return Array.isArray(requiredRoles) && requiredRoles.includes(role);
    },
    [role]
  );

  // ===== IS AUTHENTICATED =====
  const isAuthenticated = !!authService.getToken();

  // Legacy support
  const signIn = login;
  const signOut = logout;
  const checkUser = () => {
    setUser(authService.getCurrentUser());
    setRole(authService.getRole());
  };

  return {
    user,
    role,
    loading,
    error,
    login,
    signIn,
    verify2FA,
    logout,
    signOut,
    checkUser,
    hasRole,
    isAuthenticated,
    setError,
  };
};

export default useAuth;
