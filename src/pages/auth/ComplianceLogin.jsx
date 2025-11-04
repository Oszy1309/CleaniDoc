import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import './ComplianceLogin.css';

/**
 * ENTERPRISE LOGIN SYSTEM FÜR LEBENSMITTEL-INDUSTRIE
 * Smart Role Detection: Email → Auto-Erkennung der Benutzerrolle
 *
 * Rollen:
 * 1. ADMIN/BETREIBER: Fabrik-Verantwortliche (Dashboard, Pläne, Reports)
 * 2. MITARBEITER: Reinigungspersonal (Tagesplan, Fotos, Unterschrift)
 * 3. KUNDE: Externe Auditor/Lebensmittel-Fabrik (Reports, Genehmigungen)
 */

// Backend API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ComplianceLogin() {
  // ===== STATE =====
  const [stage, setStage] = useState('email'); // 'email' | 'password' | '2fa'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'employee' | 'customer'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // ===== HELPER: Email validieren =====
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // ===== STEP 1: Email eingeben & Rolle erkennen =====
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Bitte geben Sie Ihre E-Mail-Adresse ein');
      return;
    }
    if (!validateEmail(email)) {
      setError('Ungültige E-Mail-Adresse');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // API-Call: Email → Rolle auflösen
      const response = await fetch(`${API_BASE_URL}/api/auth/detect-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'E-Mail nicht gefunden. Bitte überprüfen Sie die Eingabe.');
        return;
      }

      // Rolle erkannt → Password-Screen anzeigen
      setUserRole(data.role); // 'admin' | 'employee' | 'customer'
      setStage('password');
    } catch (err) {
      setError('Fehler bei der Identifizierung. Bitte versuchen Sie es später erneut.');
      console.error('Email detection error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ===== STEP 2: Passwort & Login =====
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Bitte geben Sie Ihr Passwort ein');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // API-Call: Login mit Email + Passwort
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role: userRole,
          rememberMe,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Anmeldung fehlgeschlagen. Passwort korrekt?');
        return;
      }

      // 2FA erforderlich?
      if (data.requires2FA) {
        setStage('2fa');
      } else {
        // Direkter Login erfolgreich
        handleLoginSuccess(data);
      }
    } catch (err) {
      setError('Anmeldung fehlgeschlagen. Bitte versuchen Sie es später erneut.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ===== STEP 3: 2FA Verifizierung =====
  const handle2FASubmit = async (e) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) {
      setError('Bitte geben Sie Ihren 2FA-Code ein');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: twoFactorCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Ungültiger 2FA-Code');
        return;
      }

      handleLoginSuccess(data);
    } catch (err) {
      setError('2FA-Verifizierung fehlgeschlagen');
      console.error('2FA error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ===== LOGIN ERFOLGREICH =====
  const handleLoginSuccess = (data) => {
    // Token speichern
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userRole', data.role);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Redirect basierend auf Rolle
    const redirects = {
      admin: '/',
      employee: '/',
      customer: '/',
    };

    window.location.href = redirects[userRole] || '/';
  };

  // ===== BACK BUTTON =====
  const handleBack = () => {
    setStage('email');
    setPassword('');
    setTwoFactorCode('');
    setError('');
    setUserRole(null);
  };

  // ===== ROLE METADATA =====
  const getRoleConfig = () => {
    const configs = {
      admin: {
        title: 'Betriebsleitung',
        subtitle: 'Verwaltungszugang',
        icon: '🏭',
        color: '#0f172a',
        accent: '#2563eb',
        features: ['Vollständiges Dashboard', 'Pläne & Reports', 'Benutzer verwalten', 'Audit-Export'],
      },
      employee: {
        title: 'Schichtplan',
        subtitle: 'Arbeitnehmerzugang',
        icon: '👷',
        color: '#0f172a',
        accent: '#10b981',
        features: ['Tagesplan', 'Fotos hochladen', 'Unterschrift', 'Benachrichtigungen'],
      },
      customer: {
        title: 'Kundenportal',
        subtitle: 'Audit & Reports',
        icon: '📊',
        color: '#0f172a',
        accent: '#f59e0b',
        features: ['Compliance-Status', 'Reports abrufen', 'Genehmigungen', 'Audit-Trail'],
      },
    };
    return configs[userRole] || configs.admin;
  };

  const roleConfig = getRoleConfig();

  // ===== RENDER =====
  return (
    <div className="compliance-login-container">
      {/* HEADER BANNER */}
      <div className="login-header">
        <div className="header-top">
          <div className="header-logo">
            <div className="logo-icon">🏭</div>
            <div className="logo-text">
              <h1>CleaniDoc</h1>
              <p>by MSOB</p>
            </div>
          </div>
          <div className="msob-badge">
            <div className="msob-badge-icon">M</div>
            <div className="msob-badge-text">MSOB</div>
          </div>
        </div>

        <div className="header-content">
          <h2 className="header-title">HACCP-konforme Reinigungsdokumentation</h2>
          <p className="header-subtitle">Enterprise-Lösung für die Lebensmittel-Industrie</p>

          <div className="compliance-badges">
            <span className="badge">ISO 22000</span>
            <span className="badge">HACCP-Ready</span>
            <span className="badge">DSGVO</span>
          </div>
        </div>
      </div>

      {/* MAIN LOGIN BOX */}
      <div className="login-wrapper">
        <div className="login-box" style={{ '--accent-color': roleConfig.accent }}>
          {/* STAGE: EMAIL EINGABE */}
          {stage === 'email' && (
            <div className="login-stage email-stage">
              <div className="stage-header">
                <h2>Anmelden</h2>
                <p>Geben Sie Ihre E-Mail-Adresse ein</p>
              </div>

              <form onSubmit={handleEmailSubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="email">E-Mail-Adresse</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      placeholder="name@example.com"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="error-message">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="btn-submit"
                >
                  {loading ? (
                    <>
                      <Loader size={16} className="spinner" />
                      Wird überprüft...
                    </>
                  ) : (
                    'Weiter'
                  )}
                </button>
              </form>

              <div className="stage-footer">
                <p className="help-text">System erkennt automatisch Ihre Rolle</p>
              </div>
            </div>
          )}

          {/* STAGE: PASSWORD EINGABE */}
          {stage === 'password' && userRole && (
            <div className="login-stage password-stage">
              <button className="btn-back" onClick={handleBack}>
                ← Zurück
              </button>

              <div className="role-indicator">
                <div className="role-icon">{roleConfig.icon}</div>
                <div className="role-text">
                  <h3>{roleConfig.title}</h3>
                  <p>{roleConfig.subtitle}</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="password">Passwort</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      placeholder="••••••••"
                      disabled={loading}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Anmeldedaten merken</span>
                  </label>
                  <a href="/passwort-vergessen" className="forgot-password">
                    Passwort vergessen?
                  </a>
                </div>

                {error && (
                  <div className="error-message">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !password.trim()}
                  className="btn-submit"
                >
                  {loading ? (
                    <>
                      <Loader size={16} className="spinner" />
                      Wird angemeldet...
                    </>
                  ) : (
                    'Anmelden'
                  )}
                </button>
              </form>

              <div className="stage-features">
                <p className="features-label">Ihre Funktionen:</p>
                <ul className="features-list">
                  {roleConfig.features.map((feature, idx) => (
                    <li key={idx}>
                      <CheckCircle2 size={14} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* STAGE: 2FA VERIFIZIERUNG */}
          {stage === '2fa' && (
            <div className="login-stage twofa-stage">
              <button className="btn-back" onClick={handleBack}>
                ← Zurück
              </button>

              <div className="stage-header">
                <h2>Zwei-Faktor-Authentifizierung</h2>
                <p>Geben Sie den Code aus Ihrer Authentifizierungs-App ein</p>
              </div>

              <form onSubmit={handle2FASubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="2fa-code">Authentifizierungscode</label>
                  <input
                    id="2fa-code"
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => {
                      setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setError('');
                    }}
                    placeholder="000000"
                    maxLength="6"
                    disabled={loading}
                    autoFocus
                    className="input-2fa"
                  />
                </div>

                {error && (
                  <div className="error-message">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || twoFactorCode.length !== 6}
                  className="btn-submit"
                >
                  {loading ? (
                    <>
                      <Loader size={16} className="spinner" />
                      Wird verifiziert...
                    </>
                  ) : (
                    'Code verifizieren'
                  )}
                </button>
              </form>

              <div className="twofa-help">
                <p>Code nicht erhalten?</p>
                <a href="/twofa-hilfe">Authentifizierungs-App einrichten</a>
              </div>
            </div>
          )}
        </div>

        {/* COMPLIANCE FOOTER */}
        <div className="login-footer">
          <div className="footer-content">
            <p className="footer-text">
              ✓ Vollständiger Audit-Trail | ✓ Verschlüsselte Datenübertragung | ✓ DSGVO-konform
            </p>
            <div className="footer-links">
              <a href="/datenschutz">Datenschutz</a>
              <span className="separator">•</span>
              <a href="/impressum">Impressum</a>
              <span className="separator">•</span>
              <a href="/support">Enterprise-Support</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComplianceLogin;
