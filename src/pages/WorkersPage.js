import React, { useState, useEffect } from 'react';
import { EnhancedWorkerCard, NewWorkerButton, DeleteWorkerModal } from '../components/EnhancedWorkerComponents';
import { supabase } from '../App';
import '../components/EnhancedWorkerComponents.css';

function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);

  // Arbeiter aus Datenbank laden
  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('workers') // Deine Tabelle
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkers(data || []);
    } catch (error) {
      console.error('Error loading workers:', error);
      // Fallback: Mock-Daten anzeigen
      setWorkers([
        { id: 1, name: 'Max Müller', email: 'max@beispiel.de', phone: '+49173534721', active: true },
        { id: 2, name: 'Anna Schmidt', email: 'anna@beispiel.de', phone: '+49123456789', active: true }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorker = async (workerData) => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .insert([workerData])
        .select()
        .single();

      if (error) throw error;
      setWorkers(prev => [data, ...prev]);

      // Erfolgs-Benachrichtigung
      showNotification('Arbeiter erfolgreich erstellt', 'success');
    } catch (error) {
      console.error('Error creating worker:', error);
      showNotification('Fehler beim Erstellen', 'error');
    }
  };

  const handleEditWorker = async (workerId, workerData) => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .update(workerData)
        .eq('id', workerId)
        .select()
        .single();

      if (error) throw error;
      setWorkers(prev => prev.map(w => w.id === workerId ? data : w));

      showNotification('Arbeiter erfolgreich bearbeitet', 'success');
    } catch (error) {
      console.error('Error updating worker:', error);
      showNotification('Fehler beim Bearbeiten', 'error');
    }
  };

  const handleDeleteWorker = async (workerId) => {
    try {
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', workerId);

      if (error) throw error;
      setWorkers(prev => prev.filter(w => w.id !== workerId));
      setShowDeleteModal(false);
      setWorkerToDelete(null);

      showNotification('Arbeiter erfolgreich gelöscht', 'success');
    } catch (error) {
      console.error('Error deleting worker:', error);
      showNotification('Fehler beim Löschen', 'error');
    }
  };

  const confirmDelete = (worker) => {
    setWorkerToDelete(worker);
    setShowDeleteModal(true);
  };

  const showNotification = (message, type) => {
    // Toast-Notification (implementieren mit react-hot-toast oder ähnlich)
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  if (loading) {
    return <div className="loading-screen"><div className="loading-spinner"></div><p>Lade Arbeiter...</p></div>;
  }

  return (
    <div className="worker-management">
      <div className="page-header">
        <h1>Arbeiter-Verwaltung</h1>
        <NewWorkerButton onCreateWorker={handleCreateWorker} />
      </div>

      <div className="workers-grid">
        {workers.map(worker => (
          <EnhancedWorkerCard
            key={worker.id}
            worker={worker}
            onEdit={handleEditWorker}
            onDelete={confirmDelete}
          />
        ))}
      </div>

      {showDeleteModal && workerToDelete && (
        <DeleteWorkerModal
          worker={workerToDelete}
          onConfirm={() => handleDeleteWorker(workerToDelete.id)}
          onCancel={() => {
            setShowDeleteModal(false);
            setWorkerToDelete(null);
          }}
          loading={false}
        />
      )}
    </div>
  );
}

export default WorkersPage;