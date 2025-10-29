import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LogIn, AlertCircle } from 'lucide-react';
import PasswordReset from '../../components/forms/PasswordReset';
import './CustomerLogin.css';

function CustomerLogin({ setUser }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const handleChange = e => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Check if user is a customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (customerError || !customerData) {
        await supabase.auth.signOut();
        throw new Error('Dieser Account ist kein Kundenkonto');
      }

      // Set customer flag
      setUser({
        ...data.user,
        isCustomer: true,
        customerData: customerData,
      });
    } catch (error) {
      console.error('Customer Login Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (showPasswordReset) {
    return <PasswordReset onBack={() => setShowPasswordReset(false)} userType="customer" />;
  }

  return (
    <div className="modern-customer-login-page">
      {/* Dynamic Background */}
      <div className="customer-login-background">
        <div className="bg-shapes">
          <div className="shape customer-shape-1"></div>
          <div className="shape customer-shape-2"></div>
          <div className="shape customer-shape-3"></div>
        </div>
        <div className="bg-grid"></div>
      </div>

      {/* Main Container */}
      <div className="login-main-container">
        {/* Left Side - Branding */}
        <div className="customer-branding-section">
          <div className="brand-content">
            <div className="brand-logo">
              <svg viewBox="0 0 120 120" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="customerLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="50%" stopColor="#D97706" />
                    <stop offset="100%" stopColor="#B45309" />
                  </linearGradient>
                  <filter id="customerGlow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <circle cx="60" cy="60" r="55" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
                <g filter="url(#customerGlow)">
                  <circle cx="60" cy="60" r="35" fill="url(#customerLogoGradient)" opacity="0.9"/>
                  <path d="M45 50 L55 60 L75 40" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="60" cy="75" r="6" fill="rgba(255,255,255,0.4)"/>
                </g>
              </svg>
            </div>
            <h1 className="brand-title">CleaniDoc</h1>
            <p className="brand-subtitle">Customer Portal</p>
            <div className="brand-features">
              <div className="feature-item">
                <div className="feature-icon">📋</div>
                <span>View Reports</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🔍</div>
                <span>Track Progress</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">✨</div>
                <span>Quality Assurance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-section">
          <div className="login-glass-card customer-glass-card">
            <div className="login-header">
              <h2>Customer Portal</h2>
              <p>Willkommen! Verfolgen Sie Ihre Reinigungsprotokolle und Berichte.</p>
            </div>

            <form onSubmit={handleSubmit} className="modern-login-form">
              <div className="input-group">
                <label htmlFor="email">Email-Adresse</label>
                <div className="input-wrapper">
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="kunde@cleanidoc.de"
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                  <div className="input-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
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
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••••••"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <div className="input-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <circle cx="12" cy="16" r="1"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
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

              <button type="submit" className="modern-customer-login-btn" disabled={loading}>
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
                  className="forgot-link customer-forgot-link"
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
                <a href="/" className="alt-login-btn customer-alt-btn">
                  <div className="alt-icon">👑</div>
                  <span>Admin Login</span>
                </a>
                <a href="/worker-login" className="alt-login-btn customer-alt-btn">
                  <div className="alt-icon">👷</div>
                  <span>Mitarbeiter</span>
                </a>
              </div>
            </form>
          </div>

          <div className="login-footer-info">
            <p>👤 Für Kunden | 📊 Berichte & Protokolle | 🔒 Sicher & Transparent</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerLogin;
