import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import WorkerModal from '../forms/WorkerModal';

// Enhanced Worker Card Component
export function EnhancedWorkerCard({ worker, onEdit, onDelete }) {
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <>
      <div className="enhanced-worker-card">
        <div className="worker-header">
          <div className="worker-info">
            <h3 className="worker-name">{worker.name}</h3>
            <span className={`status-badge ${worker.active ? 'active' : 'inactive'}`}>
              {worker.active ? 'Aktiv' : 'Inaktiv'}
            </span>
          </div>
          <div className="worker-actions">
            <button
              className="btn-icon edit"
              onClick={() => setShowEditModal(true)}
              title="Bearbeiten"
            >
              <Edit size={16} />
            </button>
            <button className="btn-icon delete" onClick={() => onDelete(worker)} title="Löschen">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="worker-details">
          <div className="detail-item">
            <span className="label">Email:</span>
            <span className="worker-email">{worker.email}</span>
          </div>
          <div className="detail-item">
            <span className="label">Telefon:</span>
            <span className="worker-phone">{worker.phone}</span>
          </div>
        </div>
      </div>

      {showEditModal && (
        <WorkerModal
          existingWorker={worker}
          onClose={() => setShowEditModal(false)}
          onSave={updatedWorker => {
            onEdit(worker.id, updatedWorker);
            setShowEditModal(false);
          }}
        />
      )}
    </>
  );
}

// New Worker Button Component
export function NewWorkerButton({ onCreateWorker }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button className="btn-primary" onClick={() => setShowModal(true)}>
        <Plus size={20} />
        Neuer Arbeiter
      </button>

      {showModal && (
        <WorkerModal
          onClose={() => setShowModal(false)}
          onSave={workerData => {
            onCreateWorker(workerData);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}

// Delete Worker Modal Component
export function DeleteWorkerModal({ worker, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Arbeiter löschen</h2>
        </div>

        <div className="modal-body">
          <p>
            Sind Sie sicher, dass Sie den Arbeiter <strong>{worker.name}</strong> löschen möchten?
          </p>
          <p className="warning-text">Diese Aktion kann nicht rückgängig gemacht werden.</p>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>
            Abbrechen
          </button>
          <button className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Wird gelöscht...' : 'Löschen'}
          </button>
        </div>
      </div>
    </div>
  );
}
