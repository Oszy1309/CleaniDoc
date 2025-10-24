import './styles/global-design-system.css';
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import './App.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CleaningPlans from './pages/CleaningPlans';
import Protocols from './pages/Protocols';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CustomerDetail from './pages/CustomerDetail';
import CleaningLogsPage from './pages/CleaningLogsPage';
import WorkersPage from './pages/WorkersPage';
import WorkerLogin from './pages/WorkerLogin';
import WorkerDashboard from './pages/WorkerDashboard';

// Supabase Client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check ob Benutzer bereits eingeloggt ist
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Listen auf Auth-Änderungen
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Lädt...</div>;
  }

  return (
    <Router>
      {!user ? (
        <Routes>
          <Route path="/" element={<Login setUser={setUser} />} />
          <Route path="/worker-login" element={<WorkerLogin setUser={setUser} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      ) : user.isWorker ? (
        <Routes>
          <Route path="/" element={<WorkerDashboard />} />
          <Route path="/worker-dashboard" element={<WorkerDashboard />} />
          <Route path="*" element={<Navigate to="/worker-dashboard" />} />
        </Routes>
      ) : (
        <div className="app-container">
          <Sidebar />
          <div className="app-main">
            <Header onLogout={handleLogout} />
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
