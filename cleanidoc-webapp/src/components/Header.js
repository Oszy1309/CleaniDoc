import React, { useState, useEffect } from 'react';
import { Bell, Settings, LogOut, X, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../App';
import './Header.css';

function Header({ onLogout, userRole = 'admin' }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      // Simuliere Benachrichtigungen basierend auf Incidents und neuen Logs
      const { data: incidents } = await supabase
        .from('incidents')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentLogs } = await supabase
        .from('cleaning_logs')
        .select('*, customers(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(3);

      const mockNotifications = [
        ...(incidents || []).map(incident => ({
          id: `incident-${incident.id}`,
          type: 'warning',
          title: 'Neuer Incident',
          message: incident.description || 'Vorfall erfordert Aufmerksamkeit',
          timestamp: new Date(incident.created_at),
          read: false
        })),
        ...(recentLogs || []).map(log => ({
          id: `log-${log.id}`,
          type: 'info',
          title: 'Neue Reinigungsaufgabe',
          message: `${log.customers?.name || 'Kunde'} - Aufgabe ausstehend`,
          timestamp: new Date(log.created_at),
          read: false
        })),
        {
          id: 'system-1',
          type: 'success',
          title: 'System-Update',
          message: 'Dashboard erfolgreich aktualisiert',
          timestamp: new Date(Date.now() - 60000 * 30),
          read: false
        }
      ];

      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Fehler beim Laden der Benachrichtigungen:', error);
    }
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertCircle size={16} className="text-warning" />;
      case 'success': return <Check size={16} className="text-success" />;
      default: return <Bell size={16} className="text-info" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'Jetzt';
  };

  return (
    <header className="header">
      <div className="header-left">
        <h2 className="header-title">Dashboard</h2>
      </div>

      <div className="header-right">
        {/* Notifications */}
        <div className="header-dropdown">
          <button
            className={`header-icon-btn ${showNotifications ? 'active' : ''}`}
            onClick={() => setShowNotifications(!showNotifications)}
            title="Benachrichtigungen"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="dropdown-menu notifications-dropdown">
              <div className="dropdown-header">
                <h3>Benachrichtigungen</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="btn-text">
                    Alle als gelesen markieren
                  </button>
                )}
              </div>

              <div className="notifications-list">
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`notification-item ${!notification.read ? 'unread' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="notification-icon">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="notification-content">
                        <h4>{notification.title}</h4>
                        <p>{notification.message}</p>
                        <span className="notification-time">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                      {!notification.read && <div className="unread-dot"></div>}
                    </div>
                  ))
                ) : (
                  <div className="no-notifications">
                    <Bell size={24} />
                    <p>Keine Benachrichtigungen</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="header-dropdown">
          <button
            className={`header-icon-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="Einstellungen"
          >
            <Settings size={20} />
          </button>

          {showSettings && (
            <div className="dropdown-menu settings-dropdown">
              <div className="dropdown-header">
                <h3>Einstellungen</h3>
              </div>

              <div className="settings-list">
                <button className="setting-item">
                  <span>Profil bearbeiten</span>
                </button>
                <button className="setting-item">
                  <span>Benachrichtigungen</span>
                </button>
                <button className="setting-item">
                  <span>Design anpassen</span>
                </button>
                <div className="setting-divider"></div>
                <button className="setting-item">
                  <span>Hilfe & Support</span>
                </button>
                <button className="setting-item">
                  <span>Über CleaniDoc</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="header-divider"></div>

        <button className="header-icon-btn logout" onClick={onLogout} title="Abmelden">
          <LogOut size={20} />
        </button>
      </div>

      {/* Click outside to close dropdowns */}
      {(showNotifications || showSettings) && (
        <div
          className="dropdown-overlay"
          onClick={() => {
            setShowNotifications(false);
            setShowSettings(false);
          }}
        />
      )}
    </header>
  );
}

export default Header;
