import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Copy,
  Clock,
  CheckCircle,
  Users,
  Calendar,
  TrendingUp,
  FileText,
  AlertCircle
} from 'lucide-react';
import './CleaningPlanDetail.css';

function CleaningPlanDetail({ plan, onBack, onEdit, onDelete, onDuplicate }) {
  const [usageStats, setUsageStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlanAnalytics();
  }, [plan.id]);

  const fetchPlanAnalytics = async () => {
    try {
      setLoading(true);

      // Hole detaillierte Nutzungsstatistiken
      const { data: logs, error: logsError } = await supabase
        .from('cleaning_logs')
        .select(`
          *,
          customers:customer_id(name),
          areas:area_id(name),
          workers:assigned_worker_id(name)
        `)
        .eq('cleaning_plan_id', plan.id)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Berechne Statistiken
      const stats = {
        totalUsage: logs.length,
        completedLogs: logs.filter(log => log.status === 'completed').length,
        inProgressLogs: logs.filter(log => log.status === 'in_progress').length,
        pendingLogs: logs.filter(log => log.status === 'pending').length,
        averageCompletionTime: calculateAverageCompletionTime(logs.filter(log => log.status === 'completed')),
        mostUsedBy: getMostUsedBy(logs),
        usageByMonth: getUsageByMonth(logs),
        customerUsage: getCustomerUsage(logs)
      };

      setUsageStats(stats);
      setRecentLogs(logs.slice(0, 10)); // Neueste 10 Logs

    } catch (error) {
      console.error('Fehler beim Laden der Analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAverageCompletionTime = (completedLogs) => {
    if (completedLogs.length === 0) return null;

    const totalMinutes = completedLogs.reduce((sum, log) => {
      if (log.created_at && log.completed_at) {
        const start = new Date(log.created_at);
        const end = new Date(log.completed_at);
        return sum + Math.round((end - start) / (1000 * 60));
      }
      return sum;
    }, 0);

    return Math.round(totalMinutes / completedLogs.length);
  };

  const getMostUsedBy = (logs) => {
    const workerUsage = {};
    logs.forEach(log => {
      if (log.workers?.name) {
        workerUsage[log.workers.name] = (workerUsage[log.workers.name] || 0) + 1;
      }
    });

    const sortedWorkers = Object.entries(workerUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    return sortedWorkers;
  };

  const getUsageByMonth = (logs) => {
    const monthUsage = {};
    logs.forEach(log => {
      const month = new Date(log.created_at).toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'short'
      });
      monthUsage[month] = (monthUsage[month] || 0) + 1;
    });

    return Object.entries(monthUsage)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(-6); // Letzte 6 Monate
  };

  const getCustomerUsage = (logs) => {
    const customerUsage = {};
    logs.forEach(log => {
      if (log.customers?.name) {
        customerUsage[log.customers.name] = (customerUsage[log.customers.name] || 0) + 1;
      }
    });

    return Object.entries(customerUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'easy': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getDifficultyLabel = (level) => {
    switch (level) {
      case 'easy': return 'Einfach';
      case 'medium': return 'Mittel';
      case 'hard': return 'Schwer';
      default: return 'Unbekannt';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Abgeschlossen';
      case 'in_progress': return 'In Bearbeitung';
      case 'pending': return 'Ausstehend';
      default: return status;
    }
  };

  if (loading) {
    return <div className="loading">Lädt Plandetails...</div>;
  }

  return (
    <div className="cleaning-plan-detail">
      <div className="detail-header">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={20} /> Zurück zur Übersicht
        </button>

        <div className="header-actions">
          <button className="btn-secondary" onClick={() => onDuplicate(plan)}>
            <Copy size={16} /> Duplizieren
          </button>
          <button className="btn-secondary" onClick={() => onEdit(plan)}>
            <Edit2 size={16} /> Bearbeiten
          </button>
          <button className="btn-danger" onClick={() => onDelete(plan.id)}>
            <Trash2 size={16} /> Löschen
          </button>
        </div>
      </div>

      <div className="detail-content">
        <div className="plan-overview">
          <div className="plan-header-info">
            <div className="plan-title-section">
              <h1>{plan.name}</h1>
              {plan.category && (
                <span className="category-badge">{plan.category}</span>
              )}
            </div>

            <div className="plan-metadata">
              {plan.estimated_duration && (
                <div className="metadata-item">
                  <Clock size={16} />
                  <span>{plan.estimated_duration} min</span>
                </div>
              )}

              {plan.difficulty_level && (
                <div className="metadata-item">
                  <div
                    className="difficulty-indicator"
                    style={{ backgroundColor: getDifficultyColor(plan.difficulty_level) }}
                  />
                  <span>{getDifficultyLabel(plan.difficulty_level)}</span>
                </div>
              )}

              {plan.checklist && (
                <div className="metadata-item">
                  <CheckCircle size={16} />
                  <span>{plan.checklist.length} Schritte</span>
                </div>
              )}

              {usageStats && (
                <div className="metadata-item">
                  <TrendingUp size={16} />
                  <span>{usageStats.totalUsage} Verwendungen</span>
                </div>
              )}
            </div>

            {plan.description && (
              <p className="plan-description">{plan.description}</p>
            )}
          </div>

          {usageStats && (
            <div className="usage-stats">
              <div className="stat-card">
                <div className="stat-value">{usageStats.totalUsage}</div>
                <div className="stat-label">Gesamt verwendet</div>
              </div>
              <div className="stat-card success">
                <div className="stat-value">{usageStats.completedLogs}</div>
                <div className="stat-label">Abgeschlossen</div>
              </div>
              <div className="stat-card warning">
                <div className="stat-value">{usageStats.inProgressLogs}</div>
                <div className="stat-label">In Bearbeitung</div>
              </div>
              <div className="stat-card info">
                <div className="stat-value">{usageStats.pendingLogs}</div>
                <div className="stat-label">Ausstehend</div>
              </div>
              {usageStats.averageCompletionTime && (
                <div className="stat-card">
                  <div className="stat-value">{usageStats.averageCompletionTime}</div>
                  <div className="stat-label">Ø Dauer (min)</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="detail-sections">
          <div className="detail-section">
            <h2>Reinigungsschritte</h2>
            <div className="checklist-preview">
              {plan.checklist && plan.checklist.length > 0 ? (
                plan.checklist.map((step, index) => (
                  <div key={index} className="step-preview">
                    <div className="step-number">{index + 1}</div>
                    <div className="step-content">
                      <h4>{step.step}</h4>
                      <div className="step-details">
                        {step.agent && (
                          <span className="step-agent">Mittel: {step.agent}</span>
                        )}
                        {step.dwell_time && (
                          <span className="step-time">Einwirkzeit: {step.dwell_time} min</span>
                        )}
                      </div>
                      {step.notes && (
                        <p className="step-notes">{step.notes}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <AlertCircle size={24} />
                  <p>Keine Reinigungsschritte definiert</p>
                </div>
              )}
            </div>
          </div>

          {plan.required_tools && plan.required_tools.length > 0 && (
            <div className="detail-section">
              <h2>Benötigte Werkzeuge</h2>
              <div className="tools-grid">
                {plan.required_tools.map((tool, index) => (
                  <div key={index} className="tool-item">{tool}</div>
                ))}
              </div>
            </div>
          )}

          {usageStats && (
            <>
              {usageStats.mostUsedBy.length > 0 && (
                <div className="detail-section">
                  <h2>Häufigste Benutzer</h2>
                  <div className="user-stats">
                    {usageStats.mostUsedBy.map(([worker, count]) => (
                      <div key={worker} className="user-stat">
                        <Users size={16} />
                        <span className="user-name">{worker}</span>
                        <span className="user-count">{count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {usageStats.customerUsage.length > 0 && (
                <div className="detail-section">
                  <h2>Nutzung nach Kunden</h2>
                  <div className="customer-stats">
                    {usageStats.customerUsage.map(([customer, count]) => (
                      <div key={customer} className="customer-stat">
                        <span className="customer-name">{customer}</span>
                        <span className="customer-count">{count} Einsätze</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recentLogs.length > 0 && (
                <div className="detail-section">
                  <h2>Letzte Verwendungen</h2>
                  <div className="recent-logs">
                    {recentLogs.map((log) => (
                      <div key={log.id} className="log-item">
                        <div className="log-info">
                          <span className="log-customer">{log.customers?.name || 'Unbekannt'}</span>
                          <span className="log-area">{log.areas?.name || 'Unbekannt'}</span>
                          <span className="log-date">
                            {new Date(log.created_at).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                        <span className={`log-status ${log.status}`}>
                          {getStatusLabel(log.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CleaningPlanDetail;