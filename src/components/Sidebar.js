import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Users, FileText, ClipboardList, CheckSquare, 
  LogOut, ChevronDown 
} from 'lucide-react';
import { supabase } from '../App';
import './Sidebar.css';

function Sidebar() {
  const location = useLocation();
  const [expanded, setExpanded] = React.useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/customers', icon: Users, label: 'Kunden' },
    { path: '/cleaning-plans', icon: FileText, label: 'Reinigungspläne' },
    { path: '/cleaning-logs', icon: ClipboardList, label: 'Tagesplan' },
    { path: '/workers', icon: Users, label: 'Arbeiter' },
    { path: '/protocols', icon: CheckSquare, label: 'Protokolle' },
  ];

  return (
    <aside className={`sidebar ${expanded ? 'expanded' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <svg viewBox="0 0 100 100" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
          <path d="M 50 20 C 65 30 70 45 70 55 C 70 70 62 80 50 80 C 38 80 30 70 30 55 C 30 45 35 30 50 20 Z" 
                fill="url(#logoGradient)" opacity="0.9"/>
          <circle cx="45" cy="35" r="6" fill="white" opacity="0.6"/>
          <line x1="50" y1="70" x2="50" y2="78" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <div className="logo-text">
          <h3>CleaniDoc</h3>
          <p>Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="btn-logout-sidebar">
          <LogOut size={20} />
          <span>Abmelden</span>
        </button>
      </div>

      {/* Toggle Button */}
      <button 
        className="sidebar-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronDown size={20} />
      </button>
    </aside>
  );
}

export default Sidebar;
