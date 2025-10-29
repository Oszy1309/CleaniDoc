import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LogIn, AlertCircle } from 'lucide-react';
import PasswordReset from '../../components/forms/PasswordReset';
import './WorkerLogin.css';

function WorkerLogin({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const handleLogin = async e => {
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
    return <PasswordReset onBack={() => setShowPasswordReset(false)} userType="worker" />;
  }

  return (
    <div className="modern-worker-login-page">
      {/* Dynamic Background */}
      <div className="worker-login-background">
        <div className="bg-shapes">
          <div className="shape worker-shape-1"></div>
          <div className="shape worker-shape-2"></div>
          <div className="shape worker-shape-3"></div>
        </div>
        <div className="bg-grid"></div>
      </div>

      {/* Main Container */}
      <div className="login-main-container">
        {/* Left Side - Branding */}
        <div className="worker-branding-section">
          <div className="brand-content">
            <div className="brand-logo">
              <svg
                viewBox="0 0 120 120"
                width="100"
                height="100"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="workerLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="50%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                  <filter id="workerGlow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <circle
                  cx="60"
                  cy="60"
                  r="55"
                  fill="rgba(255,255,255,0.1)"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2"
                />
                <g filter="url(#workerGlow)">
                  <path
                    d="M35 40 L60 30 L85 40 L80 70 L60 85 L40 70 Z"
                    fill="url(#workerLogoGradient)"
                    opacity="0.9"
                  />
                  <rect x="50" y="45" width="20" height="15" rx="3" fill="rgba(255,255,255,0.3)" />
                  <circle cx="60" cy="68" r="8" fill="#F59E0B" />
                  <path
                    d="M55 68 L58 71 L65 64"
                    stroke="white"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>
              </svg>
            </div>
            <h1 className="brand-title">CleaniDoc</h1>
            <p className="brand-subtitle">Worker Portal</p>
            <div className="brand-features">
              <div className="feature-item">
                <div className="feature-icon">🎯</div>
                <span>Task Management</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">⏰</div>
                <span>Real-time Updates</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📱</div>
                <span>Mobile Optimized</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-section">
          <div className="login-glass-card worker-glass-card">
            <div className="login-header">
              <h2>Worker Dashboard</h2>
              <p>Willkommen! Melden Sie sich an, um Ihre Aufgaben zu verwalten.</p>
            </div>

            <form onSubmit={handleLogin} className="modern-login-form">
              <div className="input-group">
                <label htmlFor="email">Email-Adresse</label>
                <div className="input-wrapper">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="worker@cleanidoc.de"
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                  <div className="input-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">Passwort</label>
                <div className="input-wrapper">
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <div className="input-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <circle cx="12" cy="16" r="1" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                </div>
              </div>

              {error && (
                <div className="modern-error-alert">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="modern-worker-login-btn" disabled={loading}>
                {loading ? (
                  <>
                    <div className="modern-spinner"></div>
                    <span>Wird angemeldet...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    <span>Anmelden</span>
                  </>
                )}
              </button>

              <div className="login-options">
                <button
                  type="button"
                  onClick={() => setShowPasswordReset(true)}
                  className="forgot-link worker-forgot-link"
                >
                  Passwort vergessen?
                </button>
              </div>

              <div className="login-divider">
                <div className="divider-line"></div>
                <span className="divider-text">Andere Optionen</span>
                <div className="divider-line"></div>
              </div>

              <div className="alternative-logins">
                <a href="/" className="alt-login-btn worker-alt-btn">
                  <div className="alt-icon">👑</div>
                  <span>Admin Login</span>
                </a>
                <a href="/customer-login" className="alt-login-btn worker-alt-btn">
                  <div className="alt-icon">👤</div>
                  <span>Kunde</span>
                </a>
              </div>
            </form>
          </div>

          <div className="login-footer-info">
            <p>💪 Für Mitarbeiter | 📋 Task-Management | 🚀 Mobile-First</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkerLogin;
