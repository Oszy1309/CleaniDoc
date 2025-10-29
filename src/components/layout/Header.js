import React, { useState, useEffect } from 'react';
import { Bell, Settings, LogOut, User, ChevronDown } from 'lucide-react';

function ProfessionalHeader({ onLogout, userEmail, userRole }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Echte Benachrichtigungen simulieren (später durch Supabase ersetzen)
  useEffect(() => {
    // Mock-Daten für Demo
    const mockNotifications = [
      {
        id: 1,
        title: 'Neuer Reinigungsplan',
        message: 'Plan für Kunde XYZ erstellt',
        created_at: new Date(),
      },
      {
        id: 2,
        title: 'Tagesprotokoll ausstehend',
        message: 'Protokoll für heute noch nicht vollständig',
        created_at: new Date(),
      },
    ];

    // Nur Benachrichtigungen zeigen wenn es welche gibt
    setNotifications(mockNotifications.slice(0, Math.floor(Math.random() * 3)));

    // User Profile aus Email ableiten
    const emailName = userEmail?.split('@')[0] || 'Benutzer';
    const names = emailName.split('.');
    setUserProfile({
      first_name: names[0] || emailName,
      last_name: names[1] || '',
      role: userRole || 'Mitarbeiter',
      email: userEmail,
    });
  }, [userEmail, userRole]);

  const getRoleDisplayName = role => {
    const roleMap = {
      admin: 'Administrator',
      manager: 'Manager',
      worker: 'Mitarbeiter',
      supervisor: 'Supervisor',
    };
    return roleMap[role] || 'Mitarbeiter';
  };

  const getRoleBadgeClass = role => {
    const classMap = {
      admin: 'role-badge-admin',
      manager: 'role-badge-manager',
      worker: 'role-badge-worker',
      supervisor: 'role-badge-supervisor',
    };
    return classMap[role] || 'role-badge-worker';
  };

  const getUserInitials = () => {
    if (!userProfile) return '?';
    const first = userProfile.first_name?.charAt(0)?.toUpperCase() || '';
    const last = userProfile.last_name?.charAt(0)?.toUpperCase() || '';
    return first + last || userEmail?.charAt(0)?.toUpperCase() || '?';
  };

  const clearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  return (
    <>
      <header className="professional-header">
        <div className="header-left">
          <h2 className="header-title">Dashboard</h2>
        </div>

        <div className="header-right">
          {/* FUNKTIONALER BENACHRICHTIGUNGS-BUTTON */}
          <div className="header-dropdown">
            <button
              className={`header-icon-btn ${notifications.length > 0 ? 'has-notifications' : ''}`}
              onClick={() => setShowNotifications(!showNotifications)}
              title={`${notifications.length} ungelesene Benachrichtigungen`}
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="notification-badge">
                  {notifications.length > 99 ? '99+' : notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="dropdown-menu notifications-dropdown">
                <div className="dropdown-header">
                  <h3>Benachrichtigungen</h3>
                  <span className="notification-count">{notifications.length} ungelesen</span>
                </div>
                <div className="dropdown-content">
                  {notifications.length === 0 ? (
                    <div className="empty-notifications">
                      <Bell size={48} className="empty-icon" />
                      <p>Keine neuen Benachrichtigungen</p>
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div key={notification.id} className="notification-item">
                        <div className="notification-content">
                          <h4>{notification.title}</h4>
                          <p>{notification.message}</p>
                          <span className="notification-time">
                            {new Date(notification.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="dropdown-footer">
                    <button className="btn-text" onClick={clearNotifications}>
                      Alle als gelesen markieren
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FUNKTIONALER EINSTELLUNGEN-BUTTON */}
          <div className="header-dropdown">
            <button
              className="header-icon-btn"
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
                <div className="dropdown-content">
                  <button className="dropdown-item">
                    <User size={16} />
                    <span>Profil bearbeiten</span>
                  </button>
                  <button className="dropdown-item">
                    <Bell size={16} />
                    <span>Benachrichtigungen</span>
                  </button>
                  <button className="dropdown-item">
                    <Settings size={16} />
                    <span>Systemeinstellungen</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="header-divider"></div>

          {/* USER MENU MIT ECHTER ROLLE */}
          <div className="header-dropdown">
            <button className="user-menu-trigger" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="user-avatar">{getUserInitials()}</div>
              <div className="user-info">
                <span className="user-name">
                  {userProfile?.first_name} {userProfile?.last_name}
                </span>
                <span className={`role-badge ${getRoleBadgeClass(userProfile?.role)}`}>
                  {getRoleDisplayName(userProfile?.role)}
                </span>
              </div>
              <ChevronDown size={16} />
            </button>

            {showUserMenu && (
              <div className="dropdown-menu user-dropdown">
                <div className="dropdown-header">
                  <div className="user-avatar-large">{getUserInitials()}</div>
                  <div className="user-details">
                    <h3>
                      {userProfile?.first_name} {userProfile?.last_name}
                    </h3>
                    <p>{userProfile?.email}</p>
                    <span className={`role-badge ${getRoleBadgeClass(userProfile?.role)}`}>
                      {getRoleDisplayName(userProfile?.role)}
                    </span>
                  </div>
                </div>
                <div className="dropdown-content">
                  <button className="dropdown-item">
                    <User size={16} />
                    <span>Mein Profil</span>
                  </button>
                  <button className="dropdown-item">
                    <Settings size={16} />
                    <span>Kontoeinstellungen</span>
                  </button>
                </div>
                <div className="dropdown-footer">
                  <button className="dropdown-item logout" onClick={onLogout}>
                    <LogOut size={16} />
                    <span>Abmelden</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* OVERLAY ZUM SCHLIESSEN DER DROPDOWNS */}
      {(showNotifications || showSettings || showUserMenu) && (
        <div
          className="dropdown-overlay"
          onClick={() => {
            setShowNotifications(false);
            setShowSettings(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </>
  );
}

export default ProfessionalHeader;
