import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import './PasswordReset.css';

function PasswordReset({ onBack, userType = 'admin' }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleResetRequest = async e => {
    e.preventDefault();

    if (!email) {
      setError('Bitte geben Sie Ihre E-Mail-Adresse ein');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password?type=${userType}`,
      });

      if (error) throw error;

      setSent(true);
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.message || 'Fehler beim Senden der E-Mail');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (userType) {
      case 'worker':
        return 'Mitarbeiter - Passwort zurücksetzen';
      case 'customer':
        return 'Kunde - Passwort zurücksetzen';
      default:
        return 'Admin - Passwort zurücksetzen';
    }
  };

  if (sent) {
    return (
      <div className="password-reset-container">
        <div className="password-reset-card">
          <div className="reset-success">
            <CheckCircle size={48} className="success-icon" />
            <h2>E-Mail gesendet!</h2>
            <p>
              Wir haben Ihnen eine E-Mail mit Anweisungen zum Zurücksetzen Ihres Passworts gesendet.
              Bitte überprüfen Sie Ihr Postfach (auch den Spam-Ordner).
            </p>
            <div className="reset-actions">
              <button onClick={onBack} className="btn-secondary">
                <ArrowLeft size={18} />
                Zurück zum Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="password-reset-container">
      <div className="password-reset-card">
        <div className="reset-header">
          <button onClick={onBack} className="back-button">
            <ArrowLeft size={18} />
          </button>
          <h2>{getTitle()}</h2>
          <p>Geben Sie Ihre E-Mail-Adresse ein, um Ihr Passwort zurückzusetzen</p>
        </div>

        <form onSubmit={handleResetRequest} className="reset-form">
          <div className="form-group">
            <label htmlFor="reset-email">E-Mail-Adresse</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ihre@email.de"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          {error && (
            <div className="error-alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn-reset" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Wird gesendet...
              </>
            ) : (
              <>
                <Mail size={18} />
                Reset-E-Mail senden
              </>
            )}
          </button>
        </form>

        <div className="reset-info">
          <p>
            Sie erhalten eine E-Mail mit einem Link zum Zurücksetzen Ihres Passworts. Der Link ist 1
            Stunde gültig.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PasswordReset;
