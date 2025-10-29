import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { BarChart3, Users, FileCheck, AlertCircle } from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProtocols: 0,
    completedToday: 0,
    incidents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Kunden zählen
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Protokolle zählen
      const { count: protocolCount } = await supabase
        .from('cleaning_logs')
        .select('*', { count: 'exact', head: true });

      // Heute abgeschlossene Protokolle
      const today = new Date().toISOString().split('T')[0];
      const { count: completedCount } = await supabase
        .from('cleaning_logs')
        .select('*', { count: 'exact', head: true })
        .eq('log_date', today)
        .eq('status', 'completed');

      // Incidents zählen
      const { count: incidentCount } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);

      setStats({
        totalCustomers: customerCount || 0,
        totalProtocols: protocolCount || 0,
        completedToday: completedCount || 0,
        incidents: incidentCount || 0,
      });
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = route => {
    navigate(route);
  };

  if (loading) {
    return <div className="loading">Lädt Dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card clickable" onClick={() => handleCardClick('/customers')}>
          <div className="stat-icon customers">
            <Users size={32} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Kunden</p>
            <p className="stat-value">{stats.totalCustomers}</p>
          </div>
        </div>

        <div className="stat-card clickable" onClick={() => handleCardClick('/protocols')}>
          <div className="stat-icon protocols">
            <FileCheck size={32} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Protokolle insgesamt</p>
            <p className="stat-value">{stats.totalProtocols}</p>
          </div>
        </div>

        <div className="stat-card clickable" onClick={() => handleCardClick('/cleaning-logs')}>
          <div className="stat-icon completed">
            <BarChart3 size={32} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Heute abgeschlossen</p>
            <p className="stat-value">{stats.completedToday}</p>
          </div>
        </div>

        <div className="stat-card clickable" onClick={() => handleCardClick('/protocols')}>
          <div className="stat-icon incidents">
            <AlertCircle size={32} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Offene Incidents</p>
            <p className="stat-value">{stats.incidents}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Willkommen!</h2>
        <p>Nutze die Navigation, um auf Kunden, Reinigungspläne und Protokolle zuzugreifen.</p>
      </div>
    </div>
  );
}

export default Dashboard;
