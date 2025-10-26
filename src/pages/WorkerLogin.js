import React, { useState } from 'react';
import { supabase } from '../App';
import { LogIn, AlertCircle } from 'lucide-react';
import PasswordReset from '../components/PasswordReset';
import './WorkerLogin.css';

function WorkerLogin({ setUser })  {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Prüfe ob es ein Worker ist
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', data.user.id)
        .single();

      if (workerError || !worker) {
        await supabase.auth.signOut();
        throw new Error('Kein Worker-Account gefunden');
      }

      // Setze User mit Worker-Flag
      setUser({ ...data.user, isWorker: true });
    } catch (err) {
      setError(err.message || 'Login fehlgeschlagen');
      console.error('Login Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (showPasswordReset) {
    return (
      <PasswordReset
        onBack={() => setShowPasswordReset(false)}
        userType="worker"
      />
    );
  }

  return (
    <div className="worker-login-page">
      {/* Background Gradient */}
      <div className="login-bg-gradient"></div>

      {/* Content */}
      <div className="login-container">
        {/* Logo Section */}
        <div className="login-logo-section">
          <svg viewBox="0 0 100 100" width="80" height="80" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="workerLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e40af" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2"/>
            <path d="M 50 20 C 65 30 70 45 70 55 C 70 70 62 80 50 80 C 38 80 30 70 30 55 C 30 45 35 30 50 20 Z" 
                  fill="url(#workerLogoGradient)" opacity="0.9"/>
            <circle cx="45" cy="35" r="6" fill="white" opacity="0.6"/>
            <line x1="50" y1="70" x2="50" y2="78" stroke="#d97706" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <h1>CleaniDoc</h1>
          <p>Worker Portal</p>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <div className="login-card-header">
            <h2>Arbeiter Login</h2>
            <p>Melden Sie sich mit Ihren Anmeldedaten an</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email">Email-Adresse</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="max@beispiel.de"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password">Passwort</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn-login"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Wird angemeldet...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Anmelden
                </>
              )}
            </button>

            {/* Forgot Password Link */}
            <div className="forgot-password">
              <button
                type="button"
                onClick={() => setShowPasswordReset(true)}
                className="forgot-password-link"
              >
                Passwort vergessen?
              </button>
            </div>

            {/* Divider */}
            <div className="login-divider">
              <span>oder</span>
            </div>

            {/* Footer Links */}
            <div className="login-footer">
              <p>Admin-Login?</p>
              <a href="/">Hier anmelden</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default WorkerLogin;
