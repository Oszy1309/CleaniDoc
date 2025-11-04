import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings, LogOut, User, ChevronDown, Eye } from 'lucide-react';
// import { EnhancedNotificationsDropdown, EnhancedSettingsDropdown, EnhancedUserDropdown } from './EnhancedHeaderDropdowns';

function ProfessionalHeader({ onLogout, userEmail, userRole, onViewAs, viewAsRole }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showViewAs, setShowViewAs] = useState(false);
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = event => {
      if (!event.target.closest('.header__dropdown')) {
        setShowNotifications(false);
        setShowSettings(false);
        setShowUserMenu(false);
        setShowViewAs(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const getRoleDisplayName = role => {
    const roleMap = {
      admin: 'Administrator',
      manager: 'Manager',
      worker: 'Mitarbeiter',
      supervisor: 'Supervisor',
    };
    return roleMap[role] || 'Mitarbeiter';
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
      <header className="header">
        <div className="header__left">
          <h2 className="header__title" onClick={() => navigate('/')} title="Zum Dashboard">
            Dashboard
          </h2>
        </div>

        <div className="header__right">
          {/* BENACHRICHTIGUNGS-BUTTON */}
          <div className="header__dropdown">
            <button
              className={`header__icon-btn ${showNotifications ? 'header__icon-btn--active' : ''}`}
              onClick={() => setShowNotifications(!showNotifications)}
              title={`${notifications.length} ungelesene Benachrichtigungen`}
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="header__notification-badge">
                  {notifications.length > 99 ? '99+' : notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="dropdown dropdown--notifications">
                <div className="dropdown__header">
                  <h3 className="dropdown__title">Benachrichtigungen</h3>
                  <span className="dropdown__subtitle">{notifications.length} ungelesen</span>
                </div>
                <div className="dropdown__content">
                  {notifications.length === 0 ? (
                    <div className="notification--empty">
                      <Bell size={48} className="notification--empty__icon" />
                      <p className="notification--empty__text">Keine neuen Benachrichtigungen</p>
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div key={notification.id} className="notification">
                        <div className="notification__icon notification__icon--info">
                          <Bell size={16} />
                        </div>
                        <div className="notification__content">
                          <h4 className="notification__title">{notification.title}</h4>
                          <p className="notification__message">{notification.message}</p>
                          <span className="notification__time">
                            {new Date(notification.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="dropdown__footer">
                    <button className="dropdown__footer-btn" onClick={clearNotifications}>
                      Alle als gelesen markieren
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* VIEW AS BUTTON */}
          {onViewAs && (
            <div className="header__dropdown">
              <button
                className={`header__icon-btn ${viewAsRole ? 'header__icon-btn--active' : ''}`}
                onClick={() => setShowViewAs(!showViewAs)}
                title={viewAsRole ? `Zeige als: ${viewAsRole}` : 'Als andere Rolle ansehen'}
              >
                <Eye size={20} />
                {viewAsRole && <span className="header__view-as-badge">{viewAsRole.charAt(0).toUpperCase()}</span>}
              </button>

              {showViewAs && (
                <div className="dropdown">
                  <div className="dropdown__header">
                    <h3 className="dropdown__title">Ansicht wechseln</h3>
                  </div>
                  <div className="dropdown__content">
                    <button
                      className={`dropdown__item ${viewAsRole === null ? 'dropdown__item--active' : ''}`}
                      onClick={() => {
                        onViewAs(null);
                        setShowViewAs(false);
                      }}
                    >
                      <User size={16} />
                      <span>Admin-Ansicht</span>
                    </button>
                    <button
                      className={`dropdown__item ${viewAsRole === 'worker' ? 'dropdown__item--active' : ''}`}
                      onClick={() => {
                        onViewAs('worker');
                        setShowViewAs(false);
                      }}
                    >
                      <Eye size={16} />
                      <span>Mitarbeiter-Ansicht</span>
                    </button>
                    <button
                      className={`dropdown__item ${viewAsRole === 'customer' ? 'dropdown__item--active' : ''}`}
                      onClick={() => {
                        onViewAs('customer');
                        setShowViewAs(false);
                      }}
                    >
                      <Eye size={16} />
                      <span>Kunden-Ansicht</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EINSTELLUNGEN-BUTTON */}
          <div className="header__dropdown">
            <button
              className={`header__icon-btn ${showSettings ? 'header__icon-btn--active' : ''}`}
              onClick={() => setShowSettings(!showSettings)}
              title="Einstellungen"
            >
              <Settings size={20} />
            </button>

            {showSettings && (
              <div className="dropdown">
                <div className="dropdown__header">
                  <h3 className="dropdown__title">Einstellungen</h3>
                </div>
                <div className="dropdown__content">
                  <button
                    className="dropdown__item"
                    onClick={() => {
                      setShowSettings(false);
                      navigate('/profile');
                    }}
                  >
                    <User size={16} />
                    <span>Profil bearbeiten</span>
                  </button>
                  <button
                    className="dropdown__item"
                    onClick={() => {
                      setShowSettings(false);
                      navigate('/notifications');
                    }}
                  >
                    <Bell size={16} />
                    <span>Benachrichtigungen</span>
                  </button>
                  <button
                    className="dropdown__item"
                    onClick={() => {
                      setShowSettings(false);
                      navigate('/system-settings');
                    }}
                  >
                    <Settings size={16} />
                    <span>Systemeinstellungen</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="header__divider"></div>

          {/* USER MENU */}
          <div className="header__dropdown">
            <button className="header__user-menu" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="header__user-avatar">{getUserInitials()}</div>
              <div className="header__user-info">
                <span className="header__user-name">
                  {userProfile?.first_name} {userProfile?.last_name}
                </span>
                <span
                  className={`header__user-role header__user-role--${userProfile?.role || 'worker'}`}
                >
                  {getRoleDisplayName(userProfile?.role)}
                </span>
              </div>
              <ChevronDown size={16} />
            </button>

            {showUserMenu && (
              <div className="dropdown dropdown--user">
                <div className="dropdown__user-header">
                  <div className="dropdown__user-avatar">{getUserInitials()}</div>
                  <div className="dropdown__user-details">
                    <h3 className="dropdown__user-name">
                      {userProfile?.first_name} {userProfile?.last_name}
                    </h3>
                    <p className="dropdown__user-email">{userProfile?.email}</p>
                    <span
                      className={`header__user-role header__user-role--${userProfile?.role || 'worker'}`}
                    >
                      {getRoleDisplayName(userProfile?.role)}
                    </span>
                  </div>
                </div>
                <div className="dropdown__content">
                  <button
                    className="dropdown__item"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/profile');
                    }}
                  >
                    <User size={16} />
                    <span>Mein Profil</span>
                  </button>
                  <button
                    className="dropdown__item"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/account-settings');
                    }}
                  >
                    <Settings size={16} />
                    <span>Kontoeinstellungen</span>
                  </button>
                  <button className="dropdown__item dropdown__item--danger" onClick={onLogout}>
                    <LogOut size={16} />
                    <span>Abmelden</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

export default ProfessionalHeader;
