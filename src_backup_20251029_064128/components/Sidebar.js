import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Users, FileText, ClipboardList, CheckSquare, 
  LogOut, ChevronLeft, ChevronRight 
} from 'lucide-react';

function ModernSidebar({ onLogout, userRole = 'admin', onToggle }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path) => location.pathname === path;

  // Navigationsitems basierend auf Rolle filtern
  const getNavItems = () => {
    const allItems = [
      { path: '/', icon: Home, label: 'Dashboard', roles: ['admin', 'manager', 'worker'] },
      { path: '/customers', icon: Users, label: 'Kunden', roles: ['admin', 'manager'] },
      { path: '/cleaning-plans', icon: FileText, label: 'Reinigungspläne', roles: ['admin', 'manager'] },
      { path: '/cleaning-logs', icon: ClipboardList, label: 'Tagesplan', roles: ['admin', 'manager', 'worker'] },
      { path: '/workers', icon: Users, label: 'Arbeiter', roles: ['admin', 'manager'] },
      { path: '/protocols', icon: CheckSquare, label: 'Protokolle', roles: ['admin', 'manager'] },
    ];

    return allItems.filter(item => item.roles.includes(userRole));
  };

  const navItems = getNavItems();

  const handleToggle = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    
    // Callback an parent component
    if (onToggle) {
      onToggle(newCollapsed);
    }
  };

  return (
    <aside className={`modern-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* SIDEBAR HEADER MIT LOGO */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          {/* Logo SVG */}
          <svg width="40" height="40" viewBox="0 0 80 80" className="logo-icon">
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e40af" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
              <linearGradient id="logoAccent" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            
            <circle cx="40" cy="40" r="35" fill="url(#logoGradient)" opacity="0.1"/>
            <circle cx="40" cy="40" r="25" fill="url(#logoGradient)" opacity="0.2"/>
            <circle cx="40" cy="40" r="15" fill="url(#logoGradient)"/>
            <circle cx="40" cy="32" r="4" fill="white" opacity="0.9"/>
            <ellipse cx="40" cy="45" rx="8" ry="3" fill="url(#logoAccent)"/>
          </svg>
          
          {!collapsed && (
            <div className="logo-text">
              <span className="logo-name">CleaniDoc</span>
              <span className="logo-tagline">Smart Cleaning</span>
            </div>
          )}
        </div>

        {/* COLLAPSE BUTTON */}
        <button 
          className="sidebar-toggle"
          onClick={handleToggle}
          title={collapsed ? 'Sidebar erweitern' : 'Sidebar minimieren'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* NAVIGATION */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.path);
            
            return (
              <li key={item.path}>
                <Link 
                  to={item.path} 
                  className={`nav-link ${active ? 'active' : ''}`}
                  title={collapsed ? item.label : ''}
                >
                  <div className="nav-icon">
                    <IconComponent size={20} />
                  </div>
                  {!collapsed && (
                    <span className="nav-label">{item.label}</span>
                  )}
                  {active && <div className="active-indicator" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* SIDEBAR FOOTER */}
      <div className="sidebar-footer">
        <button 
          className="logout-btn"
          onClick={onLogout}
          title={collapsed ? 'Abmelden' : ''}
        >
          <div className="nav-icon">
            <LogOut size={20} />
          </div>
          {!collapsed && <span>Abmelden</span>}
        </button>
      </div>
    </aside>
  );
}

export default ModernSidebar;
