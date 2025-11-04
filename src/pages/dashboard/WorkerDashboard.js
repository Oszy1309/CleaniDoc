import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LogOut, CheckCircle, Clock } from 'lucide-react';
import WorkerLogDetail from '../../components/features/WorkerLogDetail';
import './WorkerDashboard.css';

function WorkerDashboard({ isPreview = false, onBackToAdmin }) {
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
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error('Nicht angemeldet');

      // Hole den Worker
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (workerError) throw workerError;
      setWorker(workerData);

      // Aktuelles Datum für Filterung (nur Datum, ohne Zeit)
      const today = new Date().toISOString().split('T')[0];

      // Hole nur heutige Logs (mir zugewiesen)
      const { data: myLogsData, error: myLogsError } = await supabase
        .from('cleaning_logs')
        .select(
          `
          *,
          customers:customer_id(id, name),
          areas:area_id(id, name),
          cleaning_plans:cleaning_plan_id(id, name, checklist)
        `
        )
        .eq('assigned_worker_id', workerData.id)
        .eq('scheduled_date', today)
        .in('status', ['pending', 'in_progress', 'completed'])
        .order('scheduled_date', { ascending: true });

      if (myLogsError) throw myLogsError;
      setMyLogs(myLogsData || []);

      // Hole verfügbare Logs (unzugewiesen, heute)
      const { data: availableLogsData, error: availableLogsError } = await supabase
        .from('cleaning_logs')
        .select(
          `
          *,
          customers:customer_id(id, name),
          areas:area_id(id, name),
          cleaning_plans:cleaning_plan_id(id, name, checklist)
        `
        )
        .is('assigned_worker_id', null)
        .eq('scheduled_date', today)
        .eq('status', 'pending')
        .order('scheduled_date', { ascending: true });

      if (availableLogsError) throw availableLogsError;
      setNextLogs(availableLogsData || []);
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
    if (isPreview && onBackToAdmin) {
      onBackToAdmin();
      return;
    }
    try {
      await supabase.auth.signOut();
      navigate('/worker-login');
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  const handleClaimTask = async logId => {
    try {
      const { error } = await supabase
        .from('cleaning_logs')
        .update({
          assigned_worker_id: worker.id,
          status: 'in_progress',
        })
        .eq('id', logId);

      if (error) throw error;

      // Aktualisiere die Listen
      await fetchWorkerAndLogs();
    } catch (error) {
      console.error('Fehler beim Übernehmen der Aufgabe:', error);
      alert('Fehler beim Übernehmen der Aufgabe: ' + error.message);
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
              {myLogs.map(log => (
                <div key={log.id} className="log-card" onClick={() => setSelectedLog(log)}>
                  <div className="log-card-header">
                    <h3>{log.customers?.name}</h3>
                    <span className={`status-badge ${log.status}`}>
                      {log.status === 'completed'
                        ? '✓ Erledigt'
                        : log.status === 'in_progress'
                          ? '⏳ In Bearbeitung'
                          : '📋 Ausstehend'}
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
      </div>
    </div>
  );
}

export default WorkerDashboard;
