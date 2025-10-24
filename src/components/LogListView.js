import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import { Edit2, Trash2 } from 'lucide-react';
import './LogListView.css';

const STATUS_LABELS = {
  pending: { label: 'Ausstehend', color: '#fbbf24' },
  in_progress: { label: 'In Bearbeitung', color: '#667eea' },
  completed: { label: 'Erledigt', color: '#10b981' },
};

function LogListView({ logs, onSelectLog, onDeleteLog }) {
  const [workersMap, setWorkersMap] = useState({}); // { customerId: [workers] }
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [updatingLogId, setUpdatingLogId] = useState(null);

  useEffect(() => {
    fetchWorkersForCustomers();
  }, [logs]);

  const fetchWorkersForCustomers = async () => {
    try {
      setLoadingWorkers(true);
      const uniqueCustomerIds = [...new Set(logs.map(log => log.customer_id))];

      const workersData = {};

      for (const customerId of uniqueCustomerIds) {
        const { data, error } = await supabase
          .from('worker_customers')
          .select('workers(id, name)')
          .eq('customer_id', customerId);

        if (error) throw error;
        workersData[customerId] = data?.map(wc => wc.workers) || [];
      }

      setWorkersMap(workersData);
    } catch (error) {
      console.error('Fehler beim Laden der Arbeiter:', error);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const handleAssignWorker = async (logId, workerId) => {
    try {
      setUpdatingLogId(logId);
      const { error } = await supabase
        .from('cleaning_logs')
        .update({ assigned_worker_id: workerId || null })
        .eq('id', logId);

      if (error) throw error;
      
      // UI sofort updaten - ändere den Log lokal
      const updatedLog = logs.find(log => log.id === logId);
      if (updatedLog) {
        updatedLog.assigned_worker_id = workerId || null;
      }
    } catch (error) {
      console.error('Fehler beim Zuweisen des Arbeiters:', error);
      alert('Fehler beim Zuweisen: ' + error.message);
    } finally {
      setUpdatingLogId(null);
    }
  };

  const getWorkerName = (workerId) => {
    if (!workerId) return 'Nicht zugewiesen';
    // Suche den Worker in allen Listen
    for (const workers of Object.values(workersMap)) {
      const worker = workers.find(w => w.id === workerId);
      if (worker) return worker.name;
    }
    return 'Arbeiter';
  };

  const getStatusStyle = (status) => {
    const config = STATUS_LABELS[status] || STATUS_LABELS.pending;
    return {
      backgroundColor: config.color + '20',
      color: config.color,
      borderColor: config.color,
    };
  };

  return (
    <div className="log-list-view">
      <div className="logs-grid">
        {logs.map((log) => (
          <div key={log.id} className="log-card">
            <div className="log-header">
              <div className="log-title">
                <h3>{log.customers?.name}</h3>
                <p className="area-name">{log.areas?.name}</p>
              </div>
              <div
                className="log-status-badge"
                style={getStatusStyle(log.status)}
              >
                {STATUS_LABELS[log.status]?.label || log.status}
              </div>
            </div>

            <div className="log-info">
              <p><strong>Plan:</strong> {log.cleaning_plans?.name}</p>
              <p><strong>Datum:</strong> {log.scheduled_date}</p>
              
              <div className="worker-assignment">
                <label>Arbeiter:</label>
                <select
                  value={log.assigned_worker_id || ''}
                  onChange={(e) => handleAssignWorker(log.id, e.target.value || null)}
                  disabled={loadingWorkers || updatingLogId === log.id}
                  className="worker-select"
                >
                  <option value="">-- Nicht zugewiesen --</option>
                  {(workersMap[log.customer_id] || []).map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="log-actions">
              <button
                className="btn-icon edit"
                onClick={() => onSelectLog(log)}
                title="Bearbeiten"
              >
                <Edit2 size={18} />
              </button>
              <button
                className="btn-icon delete"
                onClick={() => onDeleteLog(log.id)}
                title="Löschen"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LogListView;
