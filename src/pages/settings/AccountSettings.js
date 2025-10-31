import React, { useState, useEffect } from 'react';
import { Shield, Key, Bell, Database, Trash2, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './AccountSettings.css';

function AccountSettings() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    email_notifications: true,
    desktop_notifications: false,
    weekly_reports: true,
    system_alerts: true,
    auto_logout: 30,
    two_factor_enabled: false,
  });
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadUserAndSettings();
  }, []);

  const loadUserAndSettings = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      // Lade Benutzereinstellungen aus der Datenbank (falls vorhanden)
      if (user) {
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (userSettings) {
          setSettings(prev => ({
            ...prev,
            ...userSettings.settings,
          }));
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordChange(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Speichere Einstellungen in der Datenbank
      const { error } = await supabase.from('user_settings').upsert({
        user_id: user.id,
        settings: settings,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setMessage('Einstellungen erfolgreich gespeichert');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setMessage('Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async e => {
    e.preventDefault();

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      setMessage('Passwörter stimmen nicht überein');
      return;
    }

    if (passwordChange.newPassword.length < 6) {
      setMessage('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.auth.updateUser({
        password: passwordChange.newPassword,
      });

      if (error) throw error;

      setMessage('Passwort erfolgreich geändert');
      setPasswordChange({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Fehler beim Ändern des Passworts:', error);
      setMessage('Fehler beim Ändern des Passworts');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    try {
      setSaving(true);

      // Hier würde normalerweise die Konto-Löschung implementiert
      // Da dies eine kritische Operation ist, sollte sie sorgfältig implementiert werden
      setMessage('Konto-Löschung ist noch nicht implementiert');
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Fehler beim Löschen des Kontos:', error);
      setMessage('Fehler beim Löschen des Kontos');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>Einstellungen werden geladen...</p>
      </div>
    );
  }

  return (
    <div className="account-settings-page">
      <div className="settings-header">
        <h1>Kontoeinstellungen</h1>
        <p>Verwalten Sie Ihre Sicherheits- und Benachrichtigungseinstellungen</p>
      </div>

      {message && (
        <div className={`message ${message.includes('Fehler') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="settings-content">
        {/* Sicherheitseinstellungen */}
        <div className="settings-section">
          <div className="section-header">
            <h2>
              <Shield size={20} />
              Sicherheit
            </h2>
          </div>

          <div className="settings-card">
            <h3>Passwort ändern</h3>
            <p>Ändern Sie Ihr aktuelles Passwort</p>

            <form onSubmit={changePassword} className="password-form">
              <div className="form-group">
                <label>Aktuelles Passwort</label>
                <input
                  type="password"
                  value={passwordChange.currentPassword}
                  onChange={e => handlePasswordChange('currentPassword', e.target.value)}
                  placeholder="Aktuelles Passwort eingeben"
                />
              </div>

              <div className="form-group">
                <label>Neues Passwort</label>
                <input
                  type="password"
                  value={passwordChange.newPassword}
                  onChange={e => handlePasswordChange('newPassword', e.target.value)}
                  placeholder="Neues Passwort eingeben"
                />
              </div>

              <div className="form-group">
                <label>Passwort bestätigen</label>
                <input
                  type="password"
                  value={passwordChange.confirmPassword}
                  onChange={e => handlePasswordChange('confirmPassword', e.target.value)}
                  placeholder="Neues Passwort wiederholen"
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Key size={16} />
                Passwort ändern
              </button>
            </form>
          </div>

          <div className="settings-card">
            <h3>Zwei-Faktor-Authentifizierung</h3>
            <p>Erhöhen Sie die Sicherheit Ihres Kontos</p>

            <div className="setting-toggle">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.two_factor_enabled}
                  onChange={e => handleSettingChange('two_factor_enabled', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
              <span>Zwei-Faktor-Authentifizierung aktivieren</span>
            </div>
          </div>
        </div>

        {/* Benachrichtigungseinstellungen */}
        <div className="settings-section">
          <div className="section-header">
            <h2>
              <Bell size={20} />
              Benachrichtigungen
            </h2>
          </div>

          <div className="settings-card">
            <h3>E-Mail-Benachrichtigungen</h3>
            <p>Wählen Sie, welche E-Mail-Benachrichtigungen Sie erhalten möchten</p>

            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-name">E-Mail-Benachrichtigungen</span>
                  <span className="setting-desc">Allgemeine E-Mail-Benachrichtigungen</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.email_notifications}
                    onChange={e => handleSettingChange('email_notifications', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-name">Desktop-Benachrichtigungen</span>
                  <span className="setting-desc">Browser-Benachrichtigungen</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.desktop_notifications}
                    onChange={e => handleSettingChange('desktop_notifications', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-name">Wöchentliche Berichte</span>
                  <span className="setting-desc">Zusammenfassung Ihrer Aktivitäten</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.weekly_reports}
                    onChange={e => handleSettingChange('weekly_reports', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-name">System-Warnungen</span>
                  <span className="setting-desc">Wichtige System-Nachrichten</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.system_alerts}
                    onChange={e => handleSettingChange('system_alerts', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Datenschutz & Daten */}
        <div className="settings-section">
          <div className="section-header">
            <h2>
              <Database size={20} />
              Datenschutz & Daten
            </h2>
          </div>

          <div className="settings-card">
            <h3>Automatische Abmeldung</h3>
            <p>Automatische Abmeldung nach Inaktivität</p>

            <div className="form-group">
              <label>Abmeldung nach (Minuten)</label>
              <select
                value={settings.auto_logout}
                onChange={e => handleSettingChange('auto_logout', parseInt(e.target.value))}
              >
                <option value={15}>15 Minuten</option>
                <option value={30}>30 Minuten</option>
                <option value={60}>1 Stunde</option>
                <option value={120}>2 Stunden</option>
                <option value={0}>Nie</option>
              </select>
            </div>
          </div>

          <div className="settings-card danger-zone">
            <h3>
              <AlertTriangle size={20} />
              Gefahrenzone
            </h3>
            <p>Irreversible Aktionen</p>

            <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={16} />
              Konto löschen
            </button>
          </div>
        </div>

        {/* Speichern Button */}
        <div className="settings-actions">
          <button className="btn btn-primary btn-large" onClick={saveSettings} disabled={saving}>
            <Save size={16} />
            {saving ? 'Speichert...' : 'Einstellungen speichern'}
          </button>
        </div>
      </div>

      {/* Lösch-Bestätigung Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Konto löschen</h3>
            <p>
              Sind Sie sicher, dass Sie Ihr Konto löschen möchten? Diese Aktion kann nicht
              rückgängig gemacht werden.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Abbrechen
              </button>
              <button className="btn btn-danger" onClick={deleteAccount} disabled={saving}>
                <Trash2 size={16} />
                Endgültig löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountSettings;
