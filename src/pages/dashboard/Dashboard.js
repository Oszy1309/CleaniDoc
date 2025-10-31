import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Users,
  FileCheck,
  Calendar,
  CheckCircle,
  UserPlus,
  ArrowRight,
  Activity,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import '../../styles/ProfessionalDashboard.css';
import StatCard from '../../components/dashboard/StatCard';
import ActivityItem from '../../components/dashboard/ActivityItem';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        { data: recentLogs },
      ] = await Promise.all([
        // Aktive Kunden zählen
        supabase.from('customers').select('*', { count: 'exact', head: true }),

        // Gesamte Protokolle zählen
        supabase.from('cleaning_logs').select('*', { count: 'exact', head: true }),

        // Heute abgeschlossene Protokolle
        supabase
          .from('cleaning_logs')
          .select('*', { count: 'exact', head: true })
          .eq('log_date', new Date().toISOString().split('T')[0])
          .eq('status', 'completed'),

        // Ausstehende Protokolle
        supabase
          .from('cleaning_logs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),

        // Aktive Workers
        supabase.from('workers').select('*', { count: 'exact', head: true }),

        // Reinigungspläne
        supabase.from('cleaning_plans').select('*', { count: 'exact', head: true }),

        // Letzte 5 Protokolle für Activity Feed
        supabase
          .from('cleaning_logs')
          .select(
            `
            id,
            log_date,
            status,
            created_at,
            customers(name),
            workers(first_name, last_name)
          `
          )
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      // Berechne echte Completion Rate
      const completionRate =
        protocolCount > 0 ? Math.round(((protocolCount - pendingCount) / protocolCount) * 100) : 0;

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
      const realActivity =
        recentLogs?.map(log => ({
          id: log.id,
          type: log.status === 'completed' ? 'completed' : 'pending',
          message: `${log.status === 'completed' ? 'Abgeschlossen' : 'Erstellt'}: ${log.customers?.name || 'Unbekannter Kunde'}`,
          time: formatTimeAgo(log.created_at),
          user: log.workers ? `${log.workers.first_name} ${log.workers.last_name}` : 'System',
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

  const formatTimeAgo = dateString => {
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

  const getActivityIcon = type => {
    const icons = {
      completed: CheckCircle,
      pending: Clock,
      customer: UserPlus,
      plan: Calendar,
    };
    return icons[type] || Activity;
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
    <div className="dashboard-main">
      {/* Header */}
      <section className="dashboard-header">
        <div className="card__header">
          <div>
            <h1 className="card__title">Dashboard</h1>
            <p className="text-sm text-muted">
              Übersicht Ihrer Reinigungsaktivitäten und wichtigsten Kennzahlen
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="dashboard-body">
        {/* Stats Grid */}
        <div className="grid grid--auto">
          <StatCard
            label="Aktive Kunden"
            value={stats.totalCustomers}
            unit="Kunden"
            description="Im System registriert"
            icon={Users}
            isLoading={loading}
            onClick={() => handleCardClick('/customers')}
          />

          <StatCard
            label="Protokolle Gesamt"
            value={stats.totalProtocols}
            unit="Protokolle"
            description="Alle erstellten Einträge"
            icon={FileCheck}
            isLoading={loading}
            onClick={() => handleCardClick('/protocols')}
          />

          <StatCard
            label="Heute Abgeschlossen"
            value={stats.completedToday}
            unit="Aufgaben"
            description="Heute fertiggestellt"
            icon={CheckCircle}
            variant="success"
            isLoading={loading}
            onClick={() => handleCardClick('/cleaning-logs')}
          />

          <StatCard
            label="Ausstehende Aufgaben"
            value={stats.pendingTasks}
            unit="Offen"
            description="Noch zu erledigen"
            icon={AlertTriangle}
            variant="warning"
            isLoading={loading}
            onClick={() => handleCardClick('/cleaning-logs')}
          />

          <StatCard
            label="Aktive Mitarbeiter"
            value={stats.activeWorkers}
            unit="Mitarbeiter"
            description="Im System aktiv"
            icon={Users}
            isLoading={loading}
            onClick={() => handleCardClick('/workers')}
          />

          <StatCard
            label="Reinigungspläne"
            value={stats.cleaningPlans}
            unit="Pläne"
            description="Erstellte Pläne"
            icon={Calendar}
            isLoading={loading}
            onClick={() => handleCardClick('/cleaning-plans')}
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid--cols-2" style={{ marginTop: 'var(--spacing-8)' }}>
          {/* Activities Card */}
          <div className="card">
            <div className="card__header">
              <h2 className="card__title">Letzte Aktivitäten</h2>
            </div>
            <div className="card__body">
              {recentActivity.length > 0 ? (
                <ul className="list">
                  {recentActivity.map(activity => (
                    <ActivityItem
                      key={activity.id}
                      icon={getActivityIcon(activity.type)}
                      title={activity.message}
                      subtitle={activity.user}
                      time={activity.time}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Keine Aktivitäten</p>
              )}
            </div>
            <div className="card__footer">
              <button
                className="btn btn--secondary btn--sm btn--block"
                onClick={() => navigate('/protocols')}
              >
                Alle Protokolle anzeigen
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Performance Card */}
          <div className="card">
            <div className="card__header">
              <h2 className="card__title">Performance</h2>
            </div>
            <div className="card__body" style={{ padding: 'var(--spacing-6)' }}>
              <div style={{ marginBottom: 'var(--spacing-4)' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--spacing-2)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-semibold)',
                    }}
                  >
                    Abschlussrate
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-primary-600)',
                    }}
                  >
                    {stats.completionRate}%
                  </span>
                </div>
                <div
                  style={{
                    height: '8px',
                    background: 'var(--color-neutral-200)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${stats.completionRate}%`,
                      background:
                        'linear-gradient(90deg, var(--color-primary-600), var(--color-primary-700))',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 'var(--spacing-4)',
                  marginTop: 'var(--spacing-6)',
                  paddingTop: 'var(--spacing-6)',
                  borderTop: '1px solid var(--color-neutral-200)',
                }}
              >
                <div>
                  <p className="text-xs text-muted">Gesamt</p>
                  <p
                    style={{
                      fontSize: 'var(--font-size-2xl)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-neutral-950)',
                      marginTop: 'var(--spacing-1)',
                    }}
                  >
                    {stats.totalProtocols}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Ausstehend</p>
                  <p
                    style={{
                      fontSize: 'var(--font-size-2xl)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-warning)',
                      marginTop: 'var(--spacing-1)',
                    }}
                  >
                    {stats.pendingTasks}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
