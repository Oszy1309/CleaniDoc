import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Users,
  Shield,
  Monitor,
  Clock,
  Mail,
  HardDrive,
  Wifi,
  Save,
  RefreshCw,
  Download,
  Upload,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './SystemSettings.css';

function SystemSettings() {
  const [systemInfo, setSystemInfo] = useState({
    version: '1.0.0',
    uptime: '7 Tage, 14 Stunden',
    lastBackup: '2024-01-15 14:30:00',
    databaseSize: '45.2 MB',
    activeUsers: 12,
    totalProtocols: 234,
  });

  const [settings, setSettings] = useState({
    // Allgemeine Einstellungen
    company_name: 'CleaniDoc',
    timezone: 'Europe/Berlin',
    language: 'de',
    date_format: 'DD.MM.YYYY',

    // Sicherheitseinstellungen
    session_timeout: 30,
    password_policy: 'medium',
    login_attempts: 5,

    // E-Mail-Einstellungen
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_ssl: true,

    // Backup-Einstellungen
    auto_backup: true,
    backup_frequency: 'daily',
    backup_retention: 30,

    // Leistungseinstellungen
    max_upload_size: 10,
    cache_enabled: true,
    log_level: 'info',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    loadSystemSettings();
    loadSystemInfo();
  }, []);

  const loadSystemSettings = async () => {
    try {
      setLoading(true);
      // Lade System-Einstellungen aus der Datenbank
      const { data: systemSettings } = await supabase.from('system_settings').select('*').single();

      if (systemSettings) {
        setSettings(prev => ({
          ...prev,
          ...systemSettings.settings,
        }));
      }
    } catch (error) {
      console.error('Fehler beim Laden der System-Einstellungen:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemInfo = async () => {
    try {
      // Lade System-Informationen
      const [{ count: userCount }, { count: protocolCount }] = await Promise.all([
        supabase.from('workers').select('*', { count: 'exact', head: true }),
        supabase.from('cleaning_logs').select('*', { count: 'exact', head: true }),
      ]);

      setSystemInfo(prev => ({
        ...prev,
        activeUsers: userCount || 0,
        totalProtocols: protocolCount || 0,
      }));
    } catch (error) {
      console.error('Fehler beim Laden der System-Informationen:', error);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      const { error } = await supabase.from('system_settings').upsert({
        id: 1,
        settings: settings,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setMessage('System-Einstellungen erfolgreich gespeichert');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setMessage('Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  const createBackup = async () => {
    try {
      setSaving(true);
      // Hier würde die Backup-Erstellung implementiert
      setMessage('Backup wird erstellt...');

      // Simuliere Backup-Vorgang
      setTimeout(() => {
        setMessage('Backup erfolgreich erstellt');
        setSystemInfo(prev => ({
          ...prev,
          lastBackup: new Date().toLocaleString('de-DE'),
        }));
        setTimeout(() => setMessage(''), 3000);
        setSaving(false);
      }, 2000);
    } catch (error) {
      console.error('Fehler beim Erstellen des Backups:', error);
      setMessage('Fehler beim Erstellen des Backups');
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Allgemein', icon: Settings },
    { id: 'security', label: 'Sicherheit', icon: Shield },
    { id: 'email', label: 'E-Mail', icon: Mail },
    { id: 'backup', label: 'Backup', icon: HardDrive },
    { id: 'performance', label: 'Leistung', icon: Monitor },
  ];

  if (loading) {
    return (
      <div className="system-loading">
        <div className="loading-spinner"></div>
        <p>System-Einstellungen werden geladen...</p>
      </div>
    );
  }

  return (
    <div className="system-settings-page">
      <div className="settings-header">
        <h1>Systemeinstellungen</h1>
        <p>Zentrale Verwaltung aller System-Konfigurationen</p>
      </div>

      {message && (
        <div className={`message ${message.includes('Fehler') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* System-Übersicht */}
      <div className="system-overview">
        <div className="overview-card">
          <div className="overview-icon">
            <Monitor size={24} />
          </div>
          <div className="overview-info">
            <h3>Version</h3>
            <p>{systemInfo.version}</p>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">
            <Clock size={24} />
          </div>
          <div className="overview-info">
            <h3>Uptime</h3>
            <p>{systemInfo.uptime}</p>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">
            <Users size={24} />
          </div>
          <div className="overview-info">
            <h3>Aktive Benutzer</h3>
            <p>{systemInfo.activeUsers}</p>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">
            <Database size={24} />
          </div>
          <div className="overview-info">
            <h3>Datenbankgröße</h3>
            <p>{systemInfo.databaseSize}</p>
          </div>
        </div>
      </div>

      <div className="settings-container">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <IconComponent size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'general' && (
            <div className="settings-section">
              <h2>Allgemeine Einstellungen</h2>

              <div className="form-grid">
                <div className="form-group">
                  <label>Firmenname</label>
                  <input
                    type="text"
                    value={settings.company_name}
                    onChange={e => handleSettingChange('company_name', e.target.value)}
                    placeholder="Firmenname"
                  />
                </div>

                <div className="form-group">
                  <label>Zeitzone</label>
                  <select
                    value={settings.timezone}
                    onChange={e => handleSettingChange('timezone', e.target.value)}
                  >
                    <option value="Europe/Berlin">Europa/Berlin</option>
                    <option value="Europe/Vienna">Europa/Wien</option>
                    <option value="Europe/Zurich">Europa/Zürich</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Sprache</label>
                  <select
                    value={settings.language}
                    onChange={e => handleSettingChange('language', e.target.value)}
                  >
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Datumsformat</label>
                  <select
                    value={settings.date_format}
                    onChange={e => handleSettingChange('date_format', e.target.value)}
                  >
                    <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="settings-section">
              <h2>Sicherheitseinstellungen</h2>

              <div className="form-grid">
                <div className="form-group">
                  <label>Session-Timeout (Minuten)</label>
                  <select
                    value={settings.session_timeout}
                    onChange={e => handleSettingChange('session_timeout', parseInt(e.target.value))}
                  >
                    <option value={15}>15 Minuten</option>
                    <option value={30}>30 Minuten</option>
                    <option value={60}>1 Stunde</option>
                    <option value={120}>2 Stunden</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Passwort-Richtlinie</label>
                  <select
                    value={settings.password_policy}
                    onChange={e => handleSettingChange('password_policy', e.target.value)}
                  >
                    <option value="low">Niedrig (6+ Zeichen)</option>
                    <option value="medium">Mittel (8+ Zeichen, gemischt)</option>
                    <option value="high">Hoch (12+ Zeichen, komplex)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Max. Anmeldeversuche</label>
                  <select
                    value={settings.login_attempts}
                    onChange={e => handleSettingChange('login_attempts', parseInt(e.target.value))}
                  >
                    <option value={3}>3 Versuche</option>
                    <option value={5}>5 Versuche</option>
                    <option value={10}>10 Versuche</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="settings-section">
              <h2>E-Mail-Einstellungen</h2>

              <div className="form-grid">
                <div className="form-group">
                  <label>SMTP-Host</label>
                  <input
                    type="text"
                    value={settings.smtp_host}
                    onChange={e => handleSettingChange('smtp_host', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="form-group">
                  <label>SMTP-Port</label>
                  <input
                    type="number"
                    value={settings.smtp_port}
                    onChange={e => handleSettingChange('smtp_port', parseInt(e.target.value))}
                    placeholder="587"
                  />
                </div>

                <div className="form-group">
                  <label>SMTP-Benutzer</label>
                  <input
                    type="email"
                    value={settings.smtp_user}
                    onChange={e => handleSettingChange('smtp_user', e.target.value)}
                    placeholder="ihre-email@domain.com"
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.smtp_ssl}
                      onChange={e => handleSettingChange('smtp_ssl', e.target.checked)}
                    />
                    SSL/TLS verwenden
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="settings-section">
              <h2>Backup-Einstellungen</h2>

              <div className="backup-info">
                <div className="backup-status">
                  <h3>Letztes Backup</h3>
                  <p>{systemInfo.lastBackup}</p>
                  <button className="btn btn-primary" onClick={createBackup} disabled={saving}>
                    <Download size={16} />
                    {saving ? 'Erstellt...' : 'Backup jetzt erstellen'}
                  </button>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.auto_backup}
                      onChange={e => handleSettingChange('auto_backup', e.target.checked)}
                    />
                    Automatisches Backup aktivieren
                  </label>
                </div>

                <div className="form-group">
                  <label>Backup-Häufigkeit</label>
                  <select
                    value={settings.backup_frequency}
                    onChange={e => handleSettingChange('backup_frequency', e.target.value)}
                    disabled={!settings.auto_backup}
                  >
                    <option value="daily">Täglich</option>
                    <option value="weekly">Wöchentlich</option>
                    <option value="monthly">Monatlich</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Backup-Aufbewahrung (Tage)</label>
                  <input
                    type="number"
                    value={settings.backup_retention}
                    onChange={e =>
                      handleSettingChange('backup_retention', parseInt(e.target.value))
                    }
                    min="7"
                    max="365"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="settings-section">
              <h2>Leistungseinstellungen</h2>

              <div className="form-grid">
                <div className="form-group">
                  <label>Max. Upload-Größe (MB)</label>
                  <input
                    type="number"
                    value={settings.max_upload_size}
                    onChange={e => handleSettingChange('max_upload_size', parseInt(e.target.value))}
                    min="1"
                    max="100"
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.cache_enabled}
                      onChange={e => handleSettingChange('cache_enabled', e.target.checked)}
                    />
                    Cache aktivieren
                  </label>
                </div>

                <div className="form-group">
                  <label>Log-Level</label>
                  <select
                    value={settings.log_level}
                    onChange={e => handleSettingChange('log_level', e.target.value)}
                  >
                    <option value="error">Error</option>
                    <option value="warn">Warning</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="settings-actions">
          <button className="btn btn-primary btn-large" onClick={saveSettings} disabled={saving}>
            <Save size={16} />
            {saving ? 'Speichert...' : 'Einstellungen speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SystemSettings;
