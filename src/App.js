import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Supabase client moved to lib/supabase.js
import './App.css';
import { supabase } from './lib/supabase';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import Customers from './pages/dashboard/Customers';
import CleaningPlans from './pages/dashboard/CleaningPlans';
import Protocols from './pages/dashboard/Protocols';
import ProfessionalHeader from './components/layout/ProfessionalHeader';
import ModernSidebar from './components/layout/ModernSidebar';
import CustomerDetail from './pages/dashboard/CustomerDetail';
import CleaningLogsPage from './pages/dashboard/CleaningLogsPage';
import WorkersPage from './pages/dashboard/WorkersPage';
import WorkerLogin from './pages/auth/WorkerLogin';
import WorkerDashboard from './pages/dashboard/WorkerDashboard';
import CustomerLogin from './pages/auth/CustomerLogin';
import CustomerDashboard from './pages/dashboard/CustomerDashboard';

// Import CSS for new components
import './components/layout/ProfessionalHeader.css';
import './components/layout/ModernSidebar.css';

// Supabase Client

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('admin'); // Default role for admin area
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Check ob Benutzer bereits eingeloggt ist
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUserRole(session.user);
      }
      setLoading(false);
    });

    // Listen auf Auth-Änderungen
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadUserRole(session.user);
      } else {
        setUser(null);
        setUserRole('admin');
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const loadUserRole = async user => {
    try {
      // Wenn Custom User Properties vorhanden sind, verwende diese
      if (user.isCustomer) {
        setUserRole('customer');
        return;
      }
      if (user.isWorker) {
        setUserRole('worker');
        return;
      }

      // Versuche user_profiles Tabelle zu laden
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('email', user.email)
        .single();

      if (!error && profile) {
        setUserRole(profile.role);
      } else {
        // Fallback: Rolle basierend auf Email ermitteln
        const role = determineRoleFromEmail(user.email);
        setUserRole(role);

        // Optional: Profil in DB erstellen für zukünftige Nutzung
        createUserProfileIfNotExists(user.email, role);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole('admin'); // Safe default für admin area
    }
  };

  const determineRoleFromEmail = email => {
    // Intelligente Rolle-Ermittlung basierend auf Email-Patterns
    const emailLower = email.toLowerCase();

    if (emailLower.includes('admin') || emailLower.includes('administrator')) {
      return 'admin';
    }
    if (emailLower.includes('manager') || emailLower.includes('mgr')) {
      return 'manager';
    }
    if (emailLower.includes('supervisor') || emailLower.includes('super')) {
      return 'supervisor';
    }
    if (emailLower.includes('worker') || emailLower.includes('employee')) {
      return 'worker';
    }

    // Default: Wenn im Admin-Bereich, dann admin
    return 'admin';
  };

  const createUserProfileIfNotExists = async (email, role) => {
    try {
      const emailName = email.split('@')[0];
      const names = emailName.split('.');

      await supabase.from('user_profiles').upsert(
        {
          email: email,
          first_name: names[0] || emailName,
          last_name: names[1] || '',
          role: role,
        },
        {
          onConflict: 'email',
        }
      );
    } catch (error) {
      // Ignoriere Fehler - Tabelle existiert möglicherweise noch nicht
      console.log('User profiles table not available yet');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserRole('admin');
      setSidebarCollapsed(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSidebarToggle = collapsed => {
    setSidebarCollapsed(collapsed);
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
    <Router>
      {!user ? (
        <Routes>
          <Route path="/" element={<Login setUser={setUser} />} />
          <Route path="/worker-login" element={<WorkerLogin setUser={setUser} />} />
          <Route path="/customer-login" element={<CustomerLogin setUser={setUser} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      ) : user.isCustomer ? (
        <Routes>
          <Route path="/" element={<CustomerDashboard user={user} onLogout={handleLogout} />} />
          <Route
            path="/customer-dashboard"
            element={<CustomerDashboard user={user} onLogout={handleLogout} />}
          />
          <Route path="*" element={<Navigate to="/customer-dashboard" />} />
        </Routes>
      ) : user.isWorker ? (
        <Routes>
          <Route path="/" element={<WorkerDashboard />} />
          <Route path="/worker-dashboard" element={<WorkerDashboard />} />
          <Route path="*" element={<Navigate to="/worker-dashboard" />} />
        </Routes>
      ) : (
        // ADMIN AREA MIT NEUEN KOMPONENTEN
        <div className="app-container">
          <ModernSidebar
            onLogout={handleLogout}
            userRole={userRole}
            onToggle={handleSidebarToggle}
          />

          <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <ProfessionalHeader
              onLogout={handleLogout}
              userEmail={user.email}
              userRole={userRole}
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
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;
