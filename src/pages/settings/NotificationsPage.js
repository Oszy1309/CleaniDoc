import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock, AlertTriangle, Info, Trash2, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './NotificationsPage.css';

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);

      // Mock-Daten für Demo - in echter App würden diese aus der Datenbank kommen
      const mockNotifications = [
        {
          id: 1,
          title: 'Neuer Reinigungsplan erstellt',
          message: 'Ein neuer Reinigungsplan für Kunde ABC GmbH wurde erstellt.',
          type: 'info',
          read: false,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          action_url: '/cleaning-plans',
        },
        {
          id: 2,
          title: 'Protokoll ausstehend',
          message: 'Das Tagesprotokoll für heute ist noch nicht vollständig.',
          type: 'warning',
          read: false,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          action_url: '/protocols',
        },
        {
          id: 3,
          title: 'Aufgabe abgeschlossen',
          message: 'Reinigung bei XYZ Corp wurde erfolgreich abgeschlossen.',
          type: 'success',
          read: true,
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          action_url: '/cleaning-logs',
        },
        {
          id: 4,
          title: 'System-Update verfügbar',
          message: 'Eine neue Version des Systems ist verfügbar.',
          type: 'info',
          read: true,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          action_url: '/system-settings',
        },
        {
          id: 5,
          title: 'Kritischer Fehler',
          message: 'Ein kritischer Systemfehler wurde erkannt und behoben.',
          type: 'error',
          read: false,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          action_url: null,
        },
      ];

      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Fehler beim Laden der Benachrichtigungen:', error);
      setMessage('Fehler beim Laden der Benachrichtigungen');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async notificationId => {
    try {
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      );

      // Hier würde die Datenbank aktualisiert werden
      setMessage('Benachrichtigung als gelesen markiert');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Fehler beim Markieren als gelesen:', error);
      setMessage('Fehler beim Markieren als gelesen');
    }
  };

  const markAsUnread = async notificationId => {
    try {
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId ? { ...notification, read: false } : notification
        )
      );

      setMessage('Benachrichtigung als ungelesen markiert');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Fehler beim Markieren als ungelesen:', error);
      setMessage('Fehler beim Markieren als ungelesen');
    }
  };

  const deleteNotification = async notificationId => {
    try {
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));

      setMessage('Benachrichtigung gelöscht');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Fehler beim Löschen der Benachrichtigung:', error);
      setMessage('Fehler beim Löschen der Benachrichtigung');
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));

      setMessage('Alle Benachrichtigungen als gelesen markiert');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Fehler beim Markieren aller als gelesen:', error);
      setMessage('Fehler beim Markieren aller als gelesen');
    }
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'read':
        return notifications.filter(n => n.read);
      case 'success':
        return notifications.filter(n => n.type === 'success');
      case 'warning':
        return notifications.filter(n => n.type === 'warning');
      case 'error':
        return notifications.filter(n => n.type === 'error');
      default:
        return notifications;
    }
  };

  const getNotificationIcon = type => {
    const icons = {
      success: CheckCircle,
      warning: AlertTriangle,
      error: AlertTriangle,
      info: Info,
    };
    return icons[type] || Bell;
  };

  const getNotificationColor = type => {
    const colors = {
      success: 'green',
      warning: 'orange',
      error: 'red',
      info: 'blue',
    };
    return colors[type] || 'gray';
  };

  const formatTimeAgo = dateString => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Gerade eben';
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} h`;
    return `${Math.floor(diffInMinutes / 1440)} T`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = getFilteredNotifications();

  if (loading) {
    return (
      <div className="notifications-loading">
        <div className="loading-spinner"></div>
        <p>Benachrichtigungen werden geladen...</p>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div className="header-content">
          <h1>Benachrichtigungen</h1>
          <p>Alle wichtigen Updates und Nachrichten an einem Ort</p>
        </div>
        <div className="header-stats">
          <span className="unread-count">{unreadCount} ungelesen</span>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('Fehler') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="notifications-content">
        <div className="notifications-filters">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Alle ({notifications.length})
            </button>
            <button
              className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Ungelesen ({unreadCount})
            </button>
            <button
              className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
              onClick={() => setFilter('read')}
            >
              Gelesen ({notifications.length - unreadCount})
            </button>
            <button
              className={`filter-btn ${filter === 'success' ? 'active' : ''}`}
              onClick={() => setFilter('success')}
            >
              Erfolg
            </button>
            <button
              className={`filter-btn ${filter === 'warning' ? 'active' : ''}`}
              onClick={() => setFilter('warning')}
            >
              Warnung
            </button>
            <button
              className={`filter-btn ${filter === 'error' ? 'active' : ''}`}
              onClick={() => setFilter('error')}
            >
              Fehler
            </button>
          </div>

          {unreadCount > 0 && (
            <button className="mark-all-read-btn" onClick={markAllAsRead}>
              Alle als gelesen markieren
            </button>
          )}
        </div>

        <div className="notifications-list">
          {filteredNotifications.length === 0 ? (
            <div className="no-notifications">
              <Bell size={48} className="empty-icon" />
              <h3>Keine Benachrichtigungen</h3>
              <p>
                {filter === 'all'
                  ? 'Sie haben derzeit keine Benachrichtigungen.'
                  : `Keine Benachrichtigungen in der Kategorie "${filter}".`}
              </p>
            </div>
          ) : (
            filteredNotifications.map(notification => {
              const IconComponent = getNotificationIcon(notification.type);
              return (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                >
                  <div className={`notification-icon ${getNotificationColor(notification.type)}`}>
                    <IconComponent size={20} />
                  </div>

                  <div className="notification-content">
                    <div className="notification-header">
                      <h3 className="notification-title">{notification.title}</h3>
                      <span className="notification-time">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                    </div>
                    <p className="notification-message">{notification.message}</p>
                    {notification.action_url && (
                      <a href={notification.action_url} className="notification-action">
                        Details anzeigen →
                      </a>
                    )}
                  </div>

                  <div className="notification-actions">
                    {!notification.read ? (
                      <button
                        className="action-btn"
                        onClick={() => markAsRead(notification.id)}
                        title="Als gelesen markieren"
                      >
                        <CheckCircle size={16} />
                      </button>
                    ) : (
                      <button
                        className="action-btn"
                        onClick={() => markAsUnread(notification.id)}
                        title="Als ungelesen markieren"
                      >
                        <Mail size={16} />
                      </button>
                    )}
                    <button
                      className="action-btn delete"
                      onClick={() => deleteNotification(notification.id)}
                      title="Löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationsPage;
