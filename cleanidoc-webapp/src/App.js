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
import DailyReportPage from './pages/DailyReportPage';

// Supabase Client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Validierung der Umgebungsvariablen
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Fehlende Supabase-Konfiguration!');
  console.error('REACT_APP_SUPABASE_URL:', supabaseUrl);
  console.error('REACT_APP_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'vorhanden' : 'fehlt');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check ob Benutzer bereits eingeloggt ist
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    }).catch((error) => {
      console.error('Fehler beim Laden der Session:', error);
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

  // Prüfe ob Umgebungsvariablen fehlen
  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <h1 style={{ color: '#d32f2f' }}>⚠️ Konfigurationsfehler</h1>
        <p style={{ maxWidth: '600px', marginBottom: '20px' }}>
          Die Supabase-Umgebungsvariablen sind nicht konfiguriert.
        </p>
        <div style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'left',
          maxWidth: '600px'
        }}>
          <h3>So beheben Sie das Problem:</h3>
          <ol>
            <li>Erstellen Sie eine <code>.env</code> Datei im Projektverzeichnis</li>
            <li>Kopieren Sie die Vorlage aus <code>.env.example</code></li>
            <li>Tragen Sie Ihre Supabase-Credentials ein:
              <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', marginTop: '10px' }}>
{`REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here`}
              </pre>
            </li>
            <li>Starten Sie den Entwicklungsserver neu</li>
          </ol>
          <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
            Ihre Supabase-Credentials finden Sie im{' '}
            <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer">
              Supabase Dashboard
            </a>{' '}
            unter Settings → API
          </p>
        </div>
      </div>
    );
  }

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
                  <Route path="/daily-report" element={<DailyReportPage />} />
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
