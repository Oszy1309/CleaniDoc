/**
 * Cleaning Step Form mit Photo Upload Integration
 * Zeigt wie Fotos zu Reinigungsschritten hinzugefügt werden
 */

import React, { useState, useEffect } from 'react';
import { Check, Clock, AlertTriangle, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PhotoUpload from './PhotoUpload';
import './CleaningStepForm.css';

function CleaningStepForm({ log, step, stepIndex, onStepUpdate, onStepComplete, tenantId }) {
  const [stepData, setStepData] = useState({
    status: step.status || 'pending',
    completed_at: step.completed_at || null,
    notes: step.notes || '',
    chemical_used: step.chemical_used || step.chemical || '',
    dwell_time_actual: step.dwell_time_actual || '',
    worker_signature: step.worker_signature || '',
    photos: [],
  });

  const [loading, setLoading] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  useEffect(() => {
    loadStepPhotos();
  }, []);

  /**
   * Fotos für diesen Step laden
   */
  const loadStepPhotos = async () => {
    try {
      const { data: photos, error } = await supabase
        .from('step_photos')
        .select('*')
        .eq('log_id', log.id)
        .eq('step_id', step.id)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;

      setStepData(prev => ({
        ...prev,
        photos: photos || [],
      }));
    } catch (error) {
      console.error('Error loading step photos:', error);
    }
  };

  /**
   * Step Status aktualisieren
   */
  const handleStatusChange = async newStatus => {
    try {
      setLoading(true);

      const updatedStep = {
        ...stepData,
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      };

      setStepData(updatedStep);

      if (onStepUpdate) {
        onStepUpdate(stepIndex, updatedStep);
      }

      if (newStatus === 'completed' && onStepComplete) {
        onStepComplete(stepIndex, updatedStep);
      }
    } catch (error) {
      console.error('Error updating step status:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step Notes/Daten aktualisieren
   */
  const handleFieldUpdate = (field, value) => {
    const updatedStep = {
      ...stepData,
      [field]: value,
    };

    setStepData(updatedStep);

    if (onStepUpdate) {
      onStepUpdate(stepIndex, updatedStep);
    }
  };

  /**
   * Fotos aktualisiert - Callback von PhotoUpload
   */
  const handlePhotosUpdate = updatedPhotos => {
    setStepData(prev => ({
      ...prev,
      photos: updatedPhotos,
    }));
  };

  /**
   * Step Status Icon
   */
  const getStatusIcon = () => {
    switch (stepData.status) {
      case 'completed':
        return <Check size={20} className="text-success" />;
      case 'in_progress':
        return <Clock size={20} className="text-warning" />;
      case 'failed':
        return <AlertTriangle size={20} className="text-error" />;
      default:
        return <Clock size={20} className="text-muted" />;
    }
  };

  /**
   * Step Status Klassen
   */
  const getStatusClass = () => {
    return `cleaning-step-form cleaning-step-form--${stepData.status}`;
  };

  return (
    <div className={getStatusClass()}>
      {/* Step Header */}
      <div className="cleaning-step-form__header">
        <div className="cleaning-step-form__title">
          {getStatusIcon()}
          <h4>
            Schritt {stepIndex + 1}: {step.name || step.description}
          </h4>
        </div>

        <div className="cleaning-step-form__actions">
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={() => setShowPhotoUpload(!showPhotoUpload)}
          >
            <Camera size={16} />
            Fotos ({stepData.photos.length})
          </button>
        </div>
      </div>

      {/* Step Details */}
      <div className="cleaning-step-form__content">
        {/* Grundinformationen */}
        <div className="cleaning-step-form__info">
          {step.chemical && (
            <div className="cleaning-step-form__field">
              <label>Reinigungsmittel:</label>
              <input
                type="text"
                value={stepData.chemical_used}
                onChange={e => handleFieldUpdate('chemical_used', e.target.value)}
                placeholder={step.chemical}
                className="form-input"
              />
            </div>
          )}

          {step.dwell_time && (
            <div className="cleaning-step-form__field">
              <label>Einwirkzeit (Minuten):</label>
              <input
                type="number"
                value={stepData.dwell_time_actual}
                onChange={e => handleFieldUpdate('dwell_time_actual', e.target.value)}
                placeholder={`Empfohlen: ${step.dwell_time}`}
                min="0"
                className="form-input"
              />
            </div>
          )}
        </div>

        {/* Notizen */}
        <div className="cleaning-step-form__field">
          <label>Notizen/Beobachtungen:</label>
          <textarea
            value={stepData.notes}
            onChange={e => handleFieldUpdate('notes', e.target.value)}
            placeholder="Besonderheiten, Probleme, Ergebnisse..."
            rows={3}
            className="form-textarea"
          />
        </div>

        {/* Photo Upload - Konditionell angezeigt */}
        {showPhotoUpload && (
          <PhotoUpload
            logId={log.id}
            stepId={step.id}
            tenantId={tenantId}
            existingPhotos={stepData.photos}
            onPhotosUpdate={handlePhotosUpdate}
            maxPhotos={5}
            maxSizeMB={10}
          />
        )}

        {/* Status Controls */}
        <div className="cleaning-step-form__status">
          <label>Status:</label>
          <div className="cleaning-step-form__status-buttons">
            <button
              type="button"
              className={`btn btn--sm ${stepData.status === 'pending' ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => handleStatusChange('pending')}
              disabled={loading}
            >
              Ausstehend
            </button>

            <button
              type="button"
              className={`btn btn--sm ${stepData.status === 'in_progress' ? 'btn--warning' : 'btn--secondary'}`}
              onClick={() => handleStatusChange('in_progress')}
              disabled={loading}
            >
              In Bearbeitung
            </button>

            <button
              type="button"
              className={`btn btn--sm ${stepData.status === 'completed' ? 'btn--success' : 'btn--secondary'}`}
              onClick={() => handleStatusChange('completed')}
              disabled={loading}
            >
              <Check size={16} />
              Abgeschlossen
            </button>

            <button
              type="button"
              className={`btn btn--sm ${stepData.status === 'failed' ? 'btn--error' : 'btn--secondary'}`}
              onClick={() => handleStatusChange('failed')}
              disabled={loading}
            >
              <AlertTriangle size={16} />
              Problem
            </button>
          </div>
        </div>

        {/* Completion Info */}
        {stepData.status === 'completed' && stepData.completed_at && (
          <div className="cleaning-step-form__completion">
            ✅ Abgeschlossen am {new Date(stepData.completed_at).toLocaleString('de-DE')}
          </div>
        )}
      </div>

      {/* Photo Summary */}
      {stepData.photos.length > 0 && !showPhotoUpload && (
        <div className="cleaning-step-form__photo-summary">
          <span>
            📷 {stepData.photos.length} Foto{stepData.photos.length !== 1 ? 's' : ''} dokumentiert
          </span>
          <button
            type="button"
            className="btn btn--link btn--sm"
            onClick={() => setShowPhotoUpload(true)}
          >
            Anzeigen
          </button>
        </div>
      )}
    </div>
  );
}

export default CleaningStepForm;
