import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import './CustomerDashboard.css';

function CustomerDashboard({ user, onLogout }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.customerData?.id) {
      fetchCustomerLogs();
    }
  }, [user]);

  const fetchCustomerLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cleaning_logs')
        .select(
          `
          *,
          areas:areas(name),
          workers:workers(first_name, last_name)
        `
        )
        .eq('customer_id', user.customerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = status => {
    const labels = {
      pending: 'Ausstehend',
      in_progress: 'In Bearbeitung',
      completed: 'Erledigt',
    };
    return labels[status] || status;
  };

  const getStatusClass = status => {
    return `status-${status}`;
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="customer-dashboard">
        <div className="loading">Lade Daten...</div>
      </div>
    );
  }

  return (
    <div className="customer-dashboard">
      <header className="customer-header">
        <div className="header-content">
          <h1>Willkommen, {user.customerData.name}</h1>
          <button onClick={onLogout} className="logout-btn">
            Abmelden
          </button>
        </div>
      </header>

      <main className="customer-main">
        <div className="dashboard-section">
          <h2>Ihre Reinigungsprotokolle</h2>

          {logs.length === 0 ? (
            <div className="empty-state">
              <p>Noch keine Reinigungsprotokolle vorhanden.</p>
            </div>
          ) : (
            <div className="logs-grid">
              {logs.map(log => (
                <div key={log.id} className="log-card">
                  <div className="log-header">
                    <h3>{log.areas?.name}</h3>
                    <span className={`status-badge ${getStatusClass(log.status)}`}>
                      {getStatusLabel(log.status)}
                    </span>
                  </div>

                  <div className="log-details">
                    <p>
                      <strong>Datum:</strong> {formatDate(log.created_at)}
                    </p>
                    {log.workers && (
                      <p>
                        <strong>Mitarbeiter:</strong> {log.workers.first_name}{' '}
                        {log.workers.last_name}
                      </p>
                    )}
                    {log.notes && (
                      <p>
                        <strong>Notizen:</strong> {log.notes}
                      </p>
                    )}
                  </div>

                  {log.status === 'completed' && log.signature && (
                    <div className="log-signature">
                      <p>
                        <strong>Unterschrift vorhanden</strong> ✓
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default CustomerDashboard;
