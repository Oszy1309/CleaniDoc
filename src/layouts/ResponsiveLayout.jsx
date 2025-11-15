/**
 * ResponsiveLayout
 * Adaptive layout system for different roles and screen sizes
 * Mobile-first for workers, Desktop-first for customers
 */

import React, { useState, useEffect } from 'react';
import { useRBAC } from '../hooks/useRBAC';
import '../styles/ResponsiveLayout.css';

/**
 * Hook: Detect screen size and device type
 */
export function useResponsive() {
  const [size, setSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth < 768,
        isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
        isDesktop: window.innerWidth >= 1024,
      };
    }
    return { width: 1024, height: 768, isMobile: false, isTablet: true, isDesktop: false };
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth < 768,
        isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
        isDesktop: window.innerWidth >= 1024,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

/**
 * ResponsiveLayout Component
 * Switches between mobile-first (worker/manager) and desktop-first (customer) layouts
 */
function ResponsiveLayout({ children, header: Header, sidebar: Sidebar, footer: Footer }) {
  const { role } = useRBAC();
  const responsive = useResponsive();

  // Determine layout type based on role
  const isOperational = role === 'worker' || role === 'manager'; // Mobile-first
  const isCustomer = role === 'customer'; // Desktop-first
  const isAdmin = role === 'admin'; // Hybrid (desktop-preferred)

  return (
    <div className={`responsive-layout ${isOperational ? 'mobile-first' : 'desktop-first'}`}>
      {/* Mobile Top Bar (mobile & tablet only) */}
      {responsive.isMobile && <MobileTopBar>{Header}</MobileTopBar>}

      {/* Desktop Header (desktop only) */}
      {(responsive.isTablet || responsive.isDesktop) && Header && (
        <div className="layout-header">{Header}</div>
      )}

      {/* Main Container */}
      <div className="layout-container">
        {/* Sidebar (desktop only for operational, always for desktop-first) */}
        {(responsive.isDesktop || isCustomer) && Sidebar && (
          <aside className="layout-sidebar">{Sidebar}</aside>
        )}

        {/* Main Content */}
        <main className="layout-main">{children}</main>

        {/* Right Sidebar (desktop only - future: notifications, help) */}
        <aside className="layout-sidebar-right"></aside>
      </div>

      {/* Mobile Bottom Navigation (mobile only) */}
      {responsive.isMobile && isOperational && <MobileBottomNav />}

      {/* Footer (desktop only) */}
      {responsive.isDesktop && Footer && <footer className="layout-footer">{Footer}</footer>}
    </div>
  );
}

/**
 * MobileTopBar
 * Compact header for mobile devices
 */
function MobileTopBar({ children }) {
  return (
    <div className="mobile-top-bar">
      <div className="mobile-top-bar-content">{children}</div>
    </div>
  );
}

/**
 * MobileBottomNav
 * Touch-friendly navigation for mobile workers
 */
function MobileBottomNav() {
  const navigate = location => {
    // Navigate to location
    window.location.href = location;
  };

  return (
    <nav className="mobile-bottom-nav">
      <a href="/today" className="nav-item nav-item-active" title="Heute">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36-1.41 1.41L9.5 19l4.96-6.29-1.46-1.42z" />
        </svg>
        <span>Heute</span>
      </a>

      <a href="/shifts" className="nav-item" title="Schichten">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
        </svg>
        <span>Schichten</span>
      </a>

      <a href="/tasks" className="nav-item" title="Tasks">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
        </svg>
        <span>Tasks</span>
      </a>

      <a href="/reports" className="nav-item" title="Reports">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 9.5c0 .83-.67 1.5-1.5 1.5S11 13.33 11 12.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm4 4H6v-2h12v2z" />
        </svg>
        <span>Reports</span>
      </a>

      <button className="nav-item nav-item-menu" title="Menü">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
        </svg>
        <span>Menü</span>
      </button>
    </nav>
  );
}

/**
 * ResponsiveCard Component
 * Flexible card for various content
 */
export function ResponsiveCard({
  title,
  subtitle,
  children,
  actions,
  compact = false,
  featured = false,
  interactive = true,
}) {
  return (
    <div className={`responsive-card ${compact ? 'compact' : ''} ${featured ? 'featured' : ''}`}>
      {(title || subtitle) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      )}

      <div className="card-content">{children}</div>

      {actions && (
        <div className="card-actions">
          {Array.isArray(actions) ? actions.map((action, i) => <span key={i}>{action}</span>) : actions}
        </div>
      )}
    </div>
  );
}

/**
 * ResponsiveGrid Component
 * Auto-fitting grid that respects screen size
 */
export function ResponsiveGrid({ children, columns = 3, gap = 'lg' }) {
  const responsive = useResponsive();

  // Adjust columns based on screen size
  const cols = responsive.isMobile ? 1 : responsive.isTablet ? 2 : columns;

  return (
    <div className={`responsive-grid grid-cols-${cols} gap-${gap}`}>
      {children}
    </div>
  );
}

/**
 * ResponsiveTable Component
 * Scrollable table for mobile with card fallback
 */
export function ResponsiveTable({ columns, data, renderRow }) {
  const responsive = useResponsive();

  if (responsive.isMobile) {
    // Mobile: Card view
    return (
      <div className="responsive-table-cards">
        {data.map((row, i) => (
          <div key={i} className="table-card">
            {renderRow(row)}
          </div>
        ))}
      </div>
    );
  }

  // Tablet+: Horizontal scrollable table
  return (
    <div className="responsive-table-wrapper">
      <table className="responsive-table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>{renderRow(row)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * ResponsiveModal Component
 * Mobile: Full-screen, Desktop: Centered modal
 */
export function ResponsiveModal({ isOpen, onClose, title, children, actions, fullscreen }) {
  const responsive = useResponsive();

  if (!isOpen) return null;

  const isMobileModal = responsive.isMobile || fullscreen;

  return (
    <div className="responsive-modal-overlay" onClick={onClose}>
      <div
        className={`responsive-modal ${isMobileModal ? 'fullscreen' : 'centered'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">{children}</div>

        {actions && (
          <div className="modal-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default ResponsiveLayout;
