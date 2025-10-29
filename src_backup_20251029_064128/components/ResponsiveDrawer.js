import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, Users, FileText, ClipboardList, CheckSquare,
  LogOut, Menu, X
} from 'lucide-react';
import './ResponsiveDrawer.css';

function ResponsiveDrawer({ onLogout, userRole = 'admin' }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsOpen(false); // Close mobile drawer on desktop
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close drawer when navigating on mobile
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && isMobile && !event.target.closest('.drawer-content, .drawer-toggle')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen, isMobile]);

  const isActive = (path) => location.pathname === path;

  // Navigation items based on role
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

  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      {isMobile && (
        <button
          className="drawer-toggle"
          onClick={toggleDrawer}
          aria-label="Toggle navigation"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Backdrop for mobile */}
      {isMobile && isOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Content */}
      <aside className={`responsive-drawer ${isMobile ? 'drawer-mobile' : 'drawer-desktop'} ${isOpen ? 'drawer-open' : ''}`}>
        <div className="drawer-content">
          {/* Header */}
          <div className="drawer-header">
            <div className="drawer-logo">
              <svg width="40" height="40" viewBox="0 0 80 80" className="logo-icon">
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e40af" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </linearGradient>
                </defs>
                <circle cx="40" cy="40" r="35" fill="url(#logoGradient)" />
                <path d="M30 25 L50 25 L50 35 L40 35 L40 45 L50 45 L50 55 L30 55 L30 45 L35 45 L35 35 L30 35 Z" fill="white" />
              </svg>
              <span className="logo-text">CleaniDoc</span>
            </div>

            {/* Close button for mobile */}
            {isMobile && (
              <button
                className="drawer-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close navigation"
              >
                <X size={24} />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="drawer-nav">
            <ul className="nav-list">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path} className="nav-item">
                    <Link
                      to={item.path}
                      className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                    >
                      <Icon size={20} className="nav-icon" />
                      <span className="nav-label">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="drawer-footer">
            <button
              onClick={onLogout}
              className="logout-button"
            >
              <LogOut size={20} className="logout-icon" />
              <span className="logout-text">Abmelden</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default ResponsiveDrawer;