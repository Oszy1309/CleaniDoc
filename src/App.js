import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// Supabase client moved to lib/supabase.js
import './App.css';
import { supabase } from './lib/supabase';
import ComplianceLogin from './pages/auth/ComplianceLogin';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import Dashboard from './pages/dashboard/Dashboard';
import Customers from './pages/dashboard/Customers';
import CleaningPlans from './pages/dashboard/CleaningPlans';
import Protocols from './pages/dashboard/Protocols';
import ProfessionalHeader from './components/layout/ProfessionalHeader';
import ModernSidebar from './components/layout/ModernSidebar';
import CustomerDetail from './pages/dashboard/CustomerDetail';
import CleaningLogsPage from './pages/dashboard/CleaningLogsPage';
import WorkersPage from './pages/dashboard/WorkersPage';
import WorkerDashboard from './pages/dashboard/WorkerDashboard';
import CustomerDashboard from './pages/dashboard/CustomerDashboard';
import Profile from './pages/settings/Profile';
import AccountSettings from './pages/settings/AccountSettings';
import SystemSettings from './pages/settings/SystemSettings';
import NotificationsPage from './pages/settings/NotificationsPage';
import ExportArchive from './pages/exports/ExportArchive';

// Import CSS for new components
import './components/layout/ProfessionalHeader.css';
import './components/layout/ModernSidebar.css';

function App() {
  const { user, role, loading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewAsRole, setViewAsRole] = useState(null); // Admin can view as worker/customer

  const handleLogout = async () => {
    setSidebarCollapsed(false);
    await logout();
  };

  const handleSidebarToggle = collapsed => {
    setSidebarCollapsed(collapsed);
  };

  const handleViewAs = viewRole => {
    if (viewRole === 'employee' || viewRole === 'customer') {
      setViewAsRole(viewRole);
    } else {
      setViewAsRole(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Lädt...</p>
      </div>
    );
  }

  return (
    <>
      {!user ? (
        // LOGIN FLOW - NEW ENTERPRISE LOGIN SYSTEM
        <Routes>
          <Route path="/" element={<ComplianceLogin />} />
          <Route path="/login" element={<ComplianceLogin />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      ) : viewAsRole === 'employee' ? (
        // Admin viewing as Employee/Worker
        <Routes>
          <Route
            path="/"
            element={<WorkerDashboard isPreview={true} onBackToAdmin={() => setViewAsRole(null)} />}
          />
          <Route
            path="/worker-dashboard"
            element={<WorkerDashboard isPreview={true} onBackToAdmin={() => setViewAsRole(null)} />}
          />
          <Route path="*" element={<Navigate to="/worker-dashboard" />} />
        </Routes>
      ) : viewAsRole === 'customer' ? (
        // Admin viewing as Customer
        <Routes>
          <Route
            path="/"
            element={
              <CustomerDashboard
                user={user}
                onLogout={() => setViewAsRole(null)}
                isPreview={true}
              />
            }
          />
          <Route
            path="/customer-dashboard"
            element={
              <CustomerDashboard
                user={user}
                onLogout={() => setViewAsRole(null)}
                isPreview={true}
              />
            }
          />
          <Route path="*" element={<Navigate to="/customer-dashboard" />} />
        </Routes>
      ) : role === 'customer' ? (
        // CUSTOMER PORTAL
        <Routes>
          <Route path="/" element={<CustomerDashboard user={user} onLogout={handleLogout} />} />
          <Route
            path="/customer-dashboard"
            element={<CustomerDashboard user={user} onLogout={handleLogout} />}
          />
          <Route path="*" element={<Navigate to="/customer-dashboard" />} />
        </Routes>
      ) : role === 'employee' ? (
        // EMPLOYEE/WORKER DASHBOARD
        <Routes>
          <Route path="/" element={<WorkerDashboard />} />
          <Route path="/worker-dashboard" element={<WorkerDashboard />} />
          <Route path="*" element={<Navigate to="/worker-dashboard" />} />
        </Routes>
      ) : (
        // ADMIN AREA - Default for admin and manager roles
        <div className="app-container">
          <ModernSidebar onLogout={handleLogout} userRole={role} onToggle={handleSidebarToggle} />

          <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <ProfessionalHeader
              onLogout={handleLogout}
              userEmail={user?.email}
              userRole={role}
              onViewAs={handleViewAs}
              viewAsRole={viewAsRole}
            />

            <main className="app-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:customerId" element={<CustomerDetail />} />
                <Route path="/cleaning-plans" element={<CleaningPlans />} />
                <Route path="/cleaning-logs" element={<CleaningLogsPage />} />
                <Route path="/protocols" element={<Protocols />} />
                <Route path="/workers" element={<WorkersPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/account-settings" element={<AccountSettings />} />
                <Route path="/system-settings" element={<SystemSettings />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/exports" element={<ExportArchive />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
