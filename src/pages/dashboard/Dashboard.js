import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  BarChart3,
  Users,
  FileCheck,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Plus,
  Calendar,
  CheckCircle,
  UserPlus,
  FileText,
  ArrowRight,
  Activity,
  Star,
  Target,
} from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProtocols: 0,
    completedToday: 0,
    incidents: 0,
    weeklyCompletion: 0,
    monthlyRevenue: 0,
    activeWorkers: 0,
    customerSatisfaction: 0,
  });
  const [trends, setTrends] = useState({
    customers: { change: 0, direction: 'up' },
    protocols: { change: 0, direction: 'up' },
    completion: { change: 0, direction: 'up' },
    incidents: { change: 0, direction: 'down' },
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [chartData] = useState({
    weeklyStats: [
      { day: 'Mo', completed: 85, scheduled: 100 },
      { day: 'Di', completed: 92, scheduled: 105 },
      { day: 'Mi', completed: 78, scheduled: 95 },
      { day: 'Do', completed: 95, scheduled: 110 },
      { day: 'Fr', completed: 88, scheduled: 100 },
      { day: 'Sa', completed: 70, scheduled: 80 },
      { day: 'So', completed: 45, scheduled: 60 },
    ],
    monthlyRevenue: [
      { month: 'Jan', value: 12500 },
      { month: 'Feb', value: 13200 },
      { month: 'Mar', value: 14800 },
      { month: 'Apr', value: 15420 },
    ],
    customerSatisfaction: [
      { rating: 5, count: 45, percentage: 75 },
      { rating: 4, count: 12, percentage: 20 },
      { rating: 3, count: 2, percentage: 3 },
      { rating: 2, count: 1, percentage: 2 },
      { rating: 1, count: 0, percentage: 0 },
    ],
  });
  const [quickActions] = useState([
    { id: 1, title: 'Neuen Kunden hinzufügen', icon: UserPlus, route: '/customers', color: 'blue' },
    {
      id: 2,
      title: 'Reinigungsplan erstellen',
      icon: FileText,
      route: '/cleaning-plans',
      color: 'green',
    },
    { id: 3, title: 'Protokoll ansehen', icon: FileCheck, route: '/protocols', color: 'purple' },
    { id: 4, title: 'Arbeiter verwalten', icon: Users, route: '/workers', color: 'orange' },
  ]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('heute');

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

      // Workers zählen
      const { count: workerCount } = await supabase
        .from('workers')
        .select('*', { count: 'exact', head: true });

      // Mock enhanced data (in real app, calculate from database)
      const mockStats = {
        totalCustomers: customerCount || 42,
        totalProtocols: protocolCount || 156,
        completedToday: completedCount || 8,
        incidents: incidentCount || 2,
        weeklyCompletion: 94,
        monthlyRevenue: 15420,
        activeWorkers: workerCount || 12,
        customerSatisfaction: 4.8,
      };

      // Mock trends (in real app, calculate from historical data)
      const mockTrends = {
        customers: { change: 12, direction: 'up' },
        protocols: { change: 8, direction: 'up' },
        completion: { change: 5, direction: 'up' },
        incidents: { change: -15, direction: 'down' },
      };

      // Mock recent activity
      const mockActivity = [
        {
          id: 1,
          type: 'protocol',
          message: 'Reinigungsprotokoll für Hotel Schmidt abgeschlossen',
          time: '2 min ago',
          user: 'Max Müller',
        },
        {
          id: 2,
          type: 'customer',
          message: 'Neuer Kunde "Café Zentral" hinzugefügt',
          time: '15 min ago',
          user: 'Admin',
        },
        {
          id: 3,
          type: 'incident',
          message: 'Incident #124 wurde gelöst',
          time: '1 h ago',
          user: 'Anna Schmidt',
        },
        {
          id: 4,
          type: 'plan',
          message: 'Reinigungsplan für nächste Woche erstellt',
          time: '2 h ago',
          user: 'Admin',
        },
        {
          id: 5,
          type: 'review',
          message: '5-Stern Bewertung von Kunde Müller erhalten',
          time: '3 h ago',
          user: 'System',
        },
      ];

      setStats(mockStats);
      setTrends(mockTrends);
      setRecentActivity(mockActivity);

      // Mock chart data would be set here in real app
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
      // Fallback to mock data
      setStats({
        totalCustomers: 42,
        totalProtocols: 156,
        completedToday: 8,
        incidents: 2,
        weeklyCompletion: 94,
        monthlyRevenue: 15420,
        activeWorkers: 12,
        customerSatisfaction: 4.8,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = route => {
    navigate(route);
  };

  const handleQuickAction = action => {
    navigate(action.route);
  };

  const getTrendIcon = direction => {
    return direction === 'up' ? TrendingUp : TrendingDown;
  };

  const getTrendColor = direction => {
    return direction === 'up' ? 'trend-positive' : 'trend-negative';
  };

  const formatNumber = num => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const getActivityIcon = type => {
    const icons = {
      protocol: CheckCircle,
      customer: UserPlus,
      incident: AlertCircle,
      plan: Calendar,
      review: Star,
    };
    return icons[type] || Activity;
  };

  const getActivityColor = type => {
    const colors = {
      protocol: 'green',
      customer: 'blue',
      incident: 'red',
      plan: 'purple',
      review: 'orange',
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
          <p className="dashboard-subtitle">
            Willkommen zurück! Hier ist eine Übersicht Ihrer wichtigsten Metriken.
          </p>
        </div>
        <div className="header-actions">
          <div className="time-range-selector">
            <button
              className={`time-btn ${selectedTimeRange === 'heute' ? 'active' : ''}`}
              onClick={() => setSelectedTimeRange('heute')}
            >
              Heute
            </button>
            <button
              className={`time-btn ${selectedTimeRange === 'woche' ? 'active' : ''}`}
              onClick={() => setSelectedTimeRange('woche')}
            >
              Diese Woche
            </button>
            <button
              className={`time-btn ${selectedTimeRange === 'monat' ? 'active' : ''}`}
              onClick={() => setSelectedTimeRange('monat')}
            >
              Dieser Monat
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="enhanced-stats-grid">
        <div
          className="stat-card modern-card clickable"
          onClick={() => handleCardClick('/customers')}
        >
          <div className="card-header">
            <div className="stat-icon customers">
              <Users size={24} />
            </div>
            <div className="trend-indicator">
              {React.createElement(getTrendIcon(trends.customers.direction), {
                size: 16,
                className: getTrendColor(trends.customers.direction),
              })}
              <span className={getTrendColor(trends.customers.direction)}>
                {trends.customers.change}%
              </span>
            </div>
          </div>
          <div className="card-content">
            <h3 className="stat-value">{formatNumber(stats.totalCustomers)}</h3>
            <p className="stat-label">Aktive Kunden</p>
            <p className="stat-description">+{trends.customers.change}% vs. letzter Monat</p>
          </div>
        </div>

        <div
          className="stat-card modern-card clickable"
          onClick={() => handleCardClick('/protocols')}
        >
          <div className="card-header">
            <div className="stat-icon protocols">
              <FileCheck size={24} />
            </div>
            <div className="trend-indicator">
              {React.createElement(getTrendIcon(trends.protocols.direction), {
                size: 16,
                className: getTrendColor(trends.protocols.direction),
              })}
              <span className={getTrendColor(trends.protocols.direction)}>
                {trends.protocols.change}%
              </span>
            </div>
          </div>
          <div className="card-content">
            <h3 className="stat-value">{formatNumber(stats.totalProtocols)}</h3>
            <p className="stat-label">Protokolle gesamt</p>
            <p className="stat-description">+{trends.protocols.change}% vs. letzter Monat</p>
          </div>
        </div>

        <div
          className="stat-card modern-card clickable"
          onClick={() => handleCardClick('/cleaning-logs')}
        >
          <div className="card-header">
            <div className="stat-icon completed">
              <CheckCircle size={24} />
            </div>
            <div className="trend-indicator">
              {React.createElement(getTrendIcon(trends.completion.direction), {
                size: 16,
                className: getTrendColor(trends.completion.direction),
              })}
              <span className={getTrendColor(trends.completion.direction)}>
                {trends.completion.change}%
              </span>
            </div>
          </div>
          <div className="card-content">
            <h3 className="stat-value">{stats.completedToday}</h3>
            <p className="stat-label">Heute abgeschlossen</p>
            <p className="stat-description">{stats.weeklyCompletion}% Wochenfortschritt</p>
          </div>
        </div>

        <div
          className="stat-card modern-card clickable"
          onClick={() => handleCardClick('/protocols')}
        >
          <div className="card-header">
            <div className="stat-icon incidents">
              <AlertCircle size={24} />
            </div>
            <div className="trend-indicator">
              {React.createElement(getTrendIcon(trends.incidents.direction), {
                size: 16,
                className: getTrendColor(trends.incidents.direction),
              })}
              <span className={getTrendColor(trends.incidents.direction)}>
                {Math.abs(trends.incidents.change)}%
              </span>
            </div>
          </div>
          <div className="card-content">
            <h3 className="stat-value">{stats.incidents}</h3>
            <p className="stat-label">Offene Incidents</p>
            <p className="stat-description">
              -{Math.abs(trends.incidents.change)}% vs. letzter Monat
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard Grid Layout */}
      <div className="dashboard-grid">
        {/* Quick Actions Panel */}
        <div className="dashboard-widget quick-actions-widget">
          <div className="widget-header">
            <h3 className="widget-title">Schnellaktionen</h3>
            <Plus size={20} className="widget-icon" />
          </div>
          <div className="quick-actions-grid">
            {quickActions.map(action => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.id}
                  className={`quick-action-btn ${action.color}`}
                  onClick={() => handleQuickAction(action)}
                >
                  <IconComponent size={20} />
                  <span>{action.title}</span>
                  <ArrowRight size={16} className="action-arrow" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="dashboard-widget activity-widget">
          <div className="widget-header">
            <h3 className="widget-title">Letzte Aktivitäten</h3>
            <Activity size={20} className="widget-icon" />
          </div>
          <div className="activity-feed">
            {recentActivity.map(activity => {
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
            })}
          </div>
          <button className="view-all-btn">
            Alle Aktivitäten anzeigen
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Weekly Performance Chart */}
        <div className="dashboard-widget chart-widget">
          <div className="widget-header">
            <h3 className="widget-title">Wöchentliche Performance</h3>
            <BarChart3 size={20} className="widget-icon" />
          </div>
          <div className="chart-container">
            <div className="bar-chart">
              {chartData.weeklyStats.map((day, index) => (
                <div key={day.day} className="bar-group">
                  <div className="bars">
                    <div
                      className="bar scheduled"
                      style={{ height: `${(day.scheduled / 110) * 100}%` }}
                      title={`Geplant: ${day.scheduled}`}
                    ></div>
                    <div
                      className="bar completed"
                      style={{ height: `${(day.completed / 110) * 100}%` }}
                      title={`Abgeschlossen: ${day.completed}`}
                    ></div>
                  </div>
                  <span className="bar-label">{day.day}</span>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-color scheduled"></div>
                <span>Geplant</span>
              </div>
              <div className="legend-item">
                <div className="legend-color completed"></div>
                <span>Abgeschlossen</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <div className="dashboard-widget chart-widget">
          <div className="widget-header">
            <h3 className="widget-title">Umsatz Entwicklung</h3>
            <TrendingUp size={20} className="widget-icon" />
          </div>
          <div className="chart-container">
            <div className="line-chart">
              <svg viewBox="0 0 300 120" className="revenue-chart">
                <defs>
                  <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0.05)" />
                  </linearGradient>
                </defs>
                <path
                  d="M 30 90 Q 100 85 150 70 T 270 50"
                  stroke="#3B82F6"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 30 90 Q 100 85 150 70 T 270 50 L 270 100 L 30 100 Z"
                  fill="url(#revenueGradient)"
                />
                {chartData.monthlyRevenue.map((point, index) => (
                  <circle
                    key={point.month}
                    cx={30 + index * 80}
                    cy={100 - point.value / 200}
                    r="4"
                    fill="#3B82F6"
                    className="chart-point"
                  />
                ))}
              </svg>
              <div className="chart-labels">
                {chartData.monthlyRevenue.map(point => (
                  <span key={point.month} className="chart-label">
                    {point.month}
                  </span>
                ))}
              </div>
            </div>
            <div className="revenue-summary">
              <div className="revenue-stat">
                <span className="revenue-value">€{stats.monthlyRevenue.toLocaleString()}</span>
                <span className="revenue-label">Aktueller Monat</span>
              </div>
              <div className="revenue-trend">
                <TrendingUp size={16} className="trend-positive" />
                <span className="trend-positive">+12% vs. Vormonat</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Satisfaction Widget */}
        <div className="dashboard-widget satisfaction-widget">
          <div className="widget-header">
            <h3 className="widget-title">Kundenzufriedenheit</h3>
            <Star size={20} className="widget-icon" />
          </div>
          <div className="satisfaction-content">
            <div className="satisfaction-score">
              <div className="score-circle">
                <svg viewBox="0 0 100 100" className="progress-ring">
                  <circle cx="50" cy="50" r="40" stroke="#E2E8F0" strokeWidth="8" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#F59E0B"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${stats.customerSatisfaction * 50.24} 251.2`}
                    className="progress-circle"
                  />
                </svg>
                <div className="score-text">
                  <span className="score-number">{stats.customerSatisfaction}</span>
                  <span className="score-max">/5</span>
                </div>
              </div>
            </div>
            <div className="satisfaction-breakdown">
              {chartData.customerSatisfaction.map(item => (
                <div key={item.rating} className="rating-bar">
                  <div className="rating-info">
                    <span className="rating-stars">
                      {Array.from({ length: item.rating }, (_, i) => (
                        <Star key={i} size={12} fill="currentColor" />
                      ))}
                    </span>
                    <span className="rating-count">{item.count}</span>
                  </div>
                  <div className="rating-progress">
                    <div className="rating-fill" style={{ width: `${item.percentage}%` }}></div>
                  </div>
                  <span className="rating-percentage">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="dashboard-widget performance-widget">
          <div className="widget-header">
            <h3 className="widget-title">Performance KPIs</h3>
            <Target size={20} className="widget-icon" />
          </div>
          <div className="performance-metrics">
            <div className="metric-item">
              <div className="metric-icon revenue">
                <BarChart3 size={20} />
              </div>
              <div className="metric-content">
                <h4>€{stats.monthlyRevenue.toLocaleString()}</h4>
                <p>Monatsumsatz</p>
                <div className="metric-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '78%' }}></div>
                  </div>
                  <span className="progress-text">78% des Ziels</span>
                </div>
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-icon workers">
                <Users size={20} />
              </div>
              <div className="metric-content">
                <h4>{stats.activeWorkers}</h4>
                <p>Aktive Mitarbeiter</p>
                <div className="metric-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '92%' }}></div>
                  </div>
                  <span className="progress-text">92% Auslastung</span>
                </div>
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-icon satisfaction">
                <Star size={20} />
              </div>
              <div className="metric-content">
                <h4>{stats.customerSatisfaction}/5</h4>
                <p>Kundenzufriedenheit</p>
                <div className="metric-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '96%' }}></div>
                  </div>
                  <span className="progress-text">Ausgezeichnet</span>
                </div>
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-icon completion">
                <CheckCircle size={20} />
              </div>
              <div className="metric-content">
                <h4>{stats.weeklyCompletion}%</h4>
                <p>Abschlussrate</p>
                <div className="metric-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '94%' }}></div>
                  </div>
                  <span className="progress-text">Über Ziel</span>
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
