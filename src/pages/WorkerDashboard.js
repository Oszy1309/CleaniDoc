import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../App';
import { LogOut, CheckCircle, Clock } from 'lucide-react';
import WorkerLogDetail from '../components/WorkerLogDetail';
import './WorkerDashboard.css';

function WorkerDashboard() {
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [myLogs, setMyLogs] = useState([]);
  const [nextLogs, setNextLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchWorkerAndLogs = useCallback(async () => {
    try {
      setLoading(true);

      // Hole den aktuellen User
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error('Nicht angemeldet');

      // Hole den Worker
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (workerError) throw workerError;
      setWorker(workerData);

      // Hole meine Logs (mir zugewiesen)
      const { data: myLogsData, error: myLogsError } = await supabase
        .from('cleaning_logs')
        .select(`
          *,
          customers:customer_id(id, name),
          areas:area_id(id, name),
          cleaning_plans:cleaning_plan_id(id, name)
        `)
        .eq('assigned_worker_id', workerData.id)
        .order('scheduled_date', { ascending: true });

      if (myLogsError) throw myLogsError;
      setMyLogs(myLogsData || []);

      // Hole nächste Logs (für Kunden wo mein Log completed ist)
      const completedLogCustomers = myLogsData
        .filter(log => log.status === 'completed')
        .map(log => log.customer_id);

      if (completedLogCustomers.length > 0) {
        const { data: nextLogsData, error: nextLogsError } = await supabase
          .from('cleaning_logs')
          .select(`
            *,
            customers:customer_id(id, name),
            areas:area_id(id, name),
            cleaning_plans:cleaning_plan_id(id, name)
          `)
          .in('customer_id', completedLogCustomers)
          .eq('status', 'pending')
          .order('scheduled_date', { ascending: true });

        if (nextLogsError) throw nextLogsError;
        setNextLogs(nextLogsData || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkerAndLogs();
  }, [fetchWorkerAndLogs]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/worker-login');
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  if (loading) {
    return <div className="loading">Lädt Daten...</div>;
  }

  if (selectedLog) {
    return (
      <WorkerLogDetail
        logId={selectedLog.id}
        onBack={() => {
          setSelectedLog(null);
          fetchWorkerAndLogs();
        }}
      />
    );
  }

  return (
    <div className="worker-dashboard">
      <div className="worker-header">
        <div className="worker-info">
          <h1>Willkommen, {worker?.name}!</h1>
          <p className="subtitle">Deine Aufgaben für heute</p>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          <LogOut size={18} /> Abmelden
        </button>
      </div>

      <div className="worker-content">
        {/* Meine Logs */}
        <section className="logs-section">
          <div className="section-header">
            <h2>Meine Aufgaben</h2>
            <span className="badge">{myLogs.length}</span>
          </div>

          {myLogs.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={48} />
              <p>Keine Aufgaben zugewiesen</p>
            </div>
          ) : (
            <div className="logs-grid">
              {myLogs.map((log) => (
                <div
                  key={log.id}
                  className="log-card"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="log-card-header">
                    <h3>{log.customers?.name}</h3>
                    <span className={`status-badge ${log.status}`}>
                      {log.status === 'completed' ? '✓ Erledigt' : '⏳ In Bearbeitung'}
                    </span>
                  </div>
                  <p className="area">{log.areas?.name}</p>
                  <p className="plan">{log.cleaning_plans?.name}</p>
                  <p className="date">{log.scheduled_date}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Nächste Logs */}
        {nextLogs.length > 0 && (
          <section className="logs-section next-logs">
            <div className="section-header">
              <h2>Nächste Aufgaben im gleichen Auftrag</h2>
              <span className="badge">{nextLogs.length}</span>
            </div>

            <div className="logs-grid">
              {nextLogs.map((log) => (
                <div key={log.id} className="log-card next">
                  <div className="log-card-header">
                    <h3>{log.customers?.name}</h3>
                    <span className="status-badge pending">
                      ⏸ Ausstehend
                    </span>
                  </div>
                  <p className="area">{log.areas?.name}</p>
                  <p className="plan">{log.cleaning_plans?.name}</p>
                  <p className="date">{log.scheduled_date}</p>
                  <p className="hint">Warte auf anderen Arbeiter</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default WorkerDashboard;
