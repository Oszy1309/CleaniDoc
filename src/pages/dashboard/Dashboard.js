import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Users,
  FileCheck,
  Calendar,
  CheckCircle,
  UserPlus,
  FileText,
  ArrowRight,
  Activity,
  Clock,
  AlertTriangle
} from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProtocols: 0,
    completedToday: 0,
    pendingTasks: 0,
    activeWorkers: 0,
    cleaningPlans: 0,
    completionRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRealStats();
  }, []);

  const fetchRealStats = async () => {
    try {
      setLoading(true);

      // Parallele Abfragen für bessere Performance
      const [
        { count: customerCount },
        { count: protocolCount },
        { count: completedTodayCount },
        { count: pendingCount },
        { count: workerCount },
        { count: planCount },
        { data: recentLogs }
      ] = await Promise.all([
        // Aktive Kunden zählen
        supabase.from('customers').select('*', { count: 'exact', head: true }),

        // Gesamte Protokolle zählen
        supabase.from('cleaning_logs').select('*', { count: 'exact', head: true }),

        // Heute abgeschlossene Protokolle
        supabase.from('cleaning_logs').select('*', { count: 'exact', head: true })
          .eq('log_date', new Date().toISOString().split('T')[0])
          .eq('status', 'completed'),

        // Ausstehende Protokolle
        supabase.from('cleaning_logs').select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),

        // Aktive Workers
        supabase.from('workers').select('*', { count: 'exact', head: true }),

        // Reinigungspläne
        supabase.from('cleaning_plans').select('*', { count: 'exact', head: true }),

        // Letzte 5 Protokolle für Activity Feed
        supabase.from('cleaning_logs')
          .select(`
            id,
            log_date,
            status,
            created_at,
            customers(name),
            workers(first_name, last_name)
          `)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // Berechne echte Completion Rate
      const completionRate = protocolCount > 0 ? Math.round(((protocolCount - pendingCount) / protocolCount) * 100) : 0;

      const realStats = {
        totalCustomers: customerCount || 0,
        totalProtocols: protocolCount || 0,
        completedToday: completedTodayCount || 0,
        pendingTasks: pendingCount || 0,
        activeWorkers: workerCount || 0,
        cleaningPlans: planCount || 0,
        completionRate: completionRate,
      };

      // Echte Activity aus Recent Logs
      const realActivity = recentLogs?.map((log) => ({
        id: log.id,
        type: log.status === 'completed' ? 'completed' : 'pending',
        message: `${log.status === 'completed' ? 'Abgeschlossen' : 'Erstellt'}: ${log.customers?.name || 'Unbekannter Kunde'}`,
        time: formatTimeAgo(log.created_at),
        user: log.workers ? `${log.workers.first_name} ${log.workers.last_name}` : 'System'
      })) || [];

      setStats(realStats);
      setRecentActivity(realActivity);

    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
      // Fallback wenn Datenbank nicht erreichbar
      setStats({
        totalCustomers: 0,
        totalProtocols: 0,
        completedToday: 0,
        pendingTasks: 0,
        activeWorkers: 0,
        cleaningPlans: 0,
        completionRate: 0,
      });
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Gerade eben';
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} h`;
    return `${Math.floor(diffInMinutes / 1440)} T`;
  };

  const handleCardClick = route => {
    navigate(route);
  };

  const getActivityIcon = (type) => {
    const icons = {
      completed: CheckCircle,
      pending: Clock,
      customer: UserPlus,
      plan: Calendar,
    };
    return icons[type] || Activity;
  };

  const getActivityColor = (type) => {
    const colors = {
      completed: 'green',
      pending: 'orange',
      customer: 'blue',
      plan: 'purple',
    };
    return colors[type] || 'gray';
  };

  if (loading) {
    return (
      <div className="modern-loading">
        <div className="loading-spinner"></div>
        <p>Dashboard wird geladen...</p>
      </div>
    );
  }

  return (
    <div className="modern-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Übersicht Ihrer Reinigungsaktivitäten und wichtigsten Kennzahlen.</p>
        </div>
      </div>

      {/* Real Stats Grid */}
      <div className="enhanced-stats-grid">
        <div className="stat-card modern-card clickable" onClick={() => handleCardClick('/customers')}>
          <div className="card-header">
            <div className="stat-icon customers">
              <Users size={24} />
            </div>
          </div>
          <div className="card-content">
            <h3 className="stat-value">{stats.totalCustomers}</h3>
            <p className="stat-label">Aktive Kunden</p>
            <p className="stat-description">Registrierte Kunden im System</p>
          </div>
        </div>

        <div className="stat-card modern-card clickable" onClick={() => handleCardClick('/protocols')}>
          <div className="card-header">
            <div className="stat-icon protocols">
              <FileCheck size={24} />
            </div>
          </div>
          <div className="card-content">
            <h3 className="stat-value">{stats.totalProtocols}</h3>
            <p className="stat-label">Protokolle gesamt</p>
            <p className="stat-description">Alle erstellten Reinigungsprotokolle</p>
          </div>
        </div>

        <div className="stat-card modern-card clickable" onClick={() => handleCardClick('/cleaning-logs')}>
          <div className="card-header">
            <div className="stat-icon completed">
              <CheckCircle size={24} />
            </div>
          </div>
          <div className="card-content">
            <h3 className="stat-value">{stats.completedToday}</h3>
            <p className="stat-label">Heute abgeschlossen</p>
            <p className="stat-description">Abgeschlossene Aufgaben heute</p>
          </div>
        </div>

        <div className="stat-card modern-card clickable" onClick={() => handleCardClick('/cleaning-logs')}>
          <div className="card-header">
            <div className="stat-icon pending">
              <AlertTriangle size={24} />
            </div>
          </div>
          <div className="card-content">
            <h3 className="stat-value">{stats.pendingTasks}</h3>
            <p className="stat-label">Ausstehende Aufgaben</p>
            <p className="stat-description">Noch zu erledigende Protokolle</p>
          </div>
        </div>

        <div className="stat-card modern-card clickable" onClick={() => handleCardClick('/workers')}>
          <div className="card-header">
            <div className="stat-icon workers">
              <Users size={24} />
            </div>
          </div>
          <div className="card-content">
            <h3 className="stat-value">{stats.activeWorkers}</h3>
            <p className="stat-label">Aktive Mitarbeiter</p>
            <p className="stat-description">Registrierte Arbeiter im System</p>
          </div>
        </div>

        <div className="stat-card modern-card clickable" onClick={() => handleCardClick('/cleaning-plans')}>
          <div className="card-header">
            <div className="stat-icon plans">
              <Calendar size={24} />
            </div>
          </div>
          <div className="card-content">
            <h3 className="stat-value">{stats.cleaningPlans}</h3>
            <p className="stat-label">Reinigungspläne</p>
            <p className="stat-description">Erstellte Reinigungspläne</p>
          </div>
        </div>
      </div>

      {/* Dashboard Grid Layout */}
      <div className="dashboard-grid">
        {/* Quick Actions Panel */}
        <div className="dashboard-widget quick-actions-widget">
          <div className="widget-header">
            <h3 className="widget-title">Schnellaktionen</h3>
          </div>
          <div className="quick-actions-grid">
            <button
              className="quick-action-btn blue"
              onClick={() => navigate('/customers')}
            >
              <UserPlus size={20} />
              <span>Neuen Kunden hinzufügen</span>
              <ArrowRight size={16} className="action-arrow" />
            </button>
            <button
              className="quick-action-btn green"
              onClick={() => navigate('/cleaning-plans')}
            >
              <FileText size={20} />
              <span>Reinigungsplan erstellen</span>
              <ArrowRight size={16} className="action-arrow" />
            </button>
            <button
              className="quick-action-btn purple"
              onClick={() => navigate('/protocols')}
            >
              <FileCheck size={20} />
              <span>Protokoll ansehen</span>
              <ArrowRight size={16} className="action-arrow" />
            </button>
            <button
              className="quick-action-btn orange"
              onClick={() => navigate('/workers')}
            >
              <Users size={20} />
              <span>Arbeiter verwalten</span>
              <ArrowRight size={16} className="action-arrow" />
            </button>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="dashboard-widget activity-widget">
          <div className="widget-header">
            <h3 className="widget-title">Letzte Aktivitäten</h3>
            <Activity size={20} className="widget-icon" />
          </div>
          <div className="activity-feed">
            {recentActivity.length > 0 ? (
              recentActivity.map(activity => {
                const IconComponent = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="activity-item">
                    <div className={`activity-icon ${getActivityColor(activity.type)}`}>
                      <IconComponent size={16} />
                    </div>
                    <div className="activity-content">
                      <p className="activity-message">{activity.message}</p>
                      <div className="activity-meta">
                        <span className="activity-user">{activity.user}</span>
                        <span className="activity-time">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-activity">
                <p>Keine aktuellen Aktivitäten</p>
              </div>
            )}
          </div>
          <button className="view-all-btn" onClick={() => navigate('/protocols')}>
            Alle Protokolle anzeigen
            <ArrowRight size={16} />
          </button>
        </div>

        {/* System Overview */}
        <div className="dashboard-widget overview-widget">
          <div className="widget-header">
            <h3 className="widget-title">System Übersicht</h3>
          </div>
          <div className="overview-content">
            <div className="overview-item">
              <div className="overview-stat">
                <span className="overview-number">{stats.completionRate}%</span>
                <span className="overview-label">Abschlussrate</span>
              </div>
              <div className="overview-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{width: `${stats.completionRate}%`}}
                  ></div>
                </div>
              </div>
            </div>

            <div className="overview-summary">
              <p>
                <strong>{stats.totalProtocols}</strong> Protokolle erstellt<br/>
                <strong>{stats.pendingTasks}</strong> noch offen<br/>
                <strong>{stats.completedToday}</strong> heute abgeschlossen
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;