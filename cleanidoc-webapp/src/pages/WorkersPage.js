import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import WorkerModal from '../components/WorkerModal';
import './WorkersPage.css';

function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setWorkers(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Arbeiter:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorker = async (workerId) => {
    if (window.confirm('Arbeiter wirklich löschen?')) {
      try {
        // Delete worker_customers zuerst
        await supabase
          .from('worker_customers')
          .delete()
          .eq('worker_id', workerId);

        // Dann den Worker
        const { error } = await supabase
          .from('workers')
          .delete()
          .eq('id', workerId);

        if (error) throw error;
        fetchWorkers();
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
      }
    }
  };

  const handleSaveWorker = async (workerData) => {
    try {
      const { customers, user_id, ...workerInfo } = workerData;

      if (editingWorker) {
        // Update Worker
        const { error } = await supabase
          .from('workers')
          .update(workerInfo)
          .eq('id', editingWorker.id);

        if (error) throw error;

        // Update Worker-Customers
        await supabase
          .from('worker_customers')
          .delete()
          .eq('worker_id', editingWorker.id);

        if (customers && customers.length > 0) {
          const assignmentsToInsert = customers.map(customerId => ({
            worker_id: editingWorker.id,
            customer_id: customerId,
          }));

          const { error: assignError } = await supabase
            .from('worker_customers')
            .insert(assignmentsToInsert);

          if (assignError) throw assignError;
        }
      } else {
        // Insert Worker mit user_id
        const { data: newWorker, error: workerError } = await supabase
          .from('workers')
          .insert([{
            ...workerInfo,
            user_id: user_id,
          }])
          .select();

        if (workerError) throw workerError;
        const workerId = newWorker[0].id;

        // Insert Worker-Customers
        if (customers && customers.length > 0) {
          const assignmentsToInsert = customers.map(customerId => ({
            worker_id: workerId,
            customer_id: customerId,
          }));

          const { error: assignError } = await supabase
            .from('worker_customers')
            .insert(assignmentsToInsert);

          if (assignError) throw assignError;
        }
      }

      setEditingWorker(null);
      setShowModal(false);
      fetchWorkers();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Lädt Arbeiter...</div>;
  }

  return (
    <div className="workers-page">
      <div className="page-header">
        <h1>Arbeiter-Verwaltung</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setEditingWorker(null);
            setShowModal(true);
          }}
        >
          <Plus size={18} /> Neuer Arbeiter
        </button>
      </div>

      <div className="workers-list">
        {workers.length === 0 ? (
          <p className="empty-state">Noch keine Arbeiter erstellt.</p>
        ) : (
          workers.map((worker) => (
            <div key={worker.id} className="worker-card">
              <div className="worker-info">
                <h3>{worker.name}</h3>
                <p className="email">{worker.email}</p>
                {worker.phone && <p className="phone">{worker.phone}</p>}
                <span className={`status-badge ${worker.status}`}>
                  {worker.status === 'active' ? '✓ Aktiv' : '✗ Inaktiv'}
                </span>
              </div>

              <div className="worker-actions">
                <button
                  className="btn-icon"
                  onClick={() => {
                    setEditingWorker(worker);
                    setShowModal(true);
                  }}
                >
                  <Edit2 size={18} />
                </button>
                <button
                  className="btn-icon delete"
                  onClick={() => handleDeleteWorker(worker.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <WorkerModal
          onClose={() => {
            setShowModal(false);
            setEditingWorker(null);
          }}
          onSave={handleSaveWorker}
          existingWorker={editingWorker}
        />
      )}
    </div>
  );
}

export default WorkersPage;
