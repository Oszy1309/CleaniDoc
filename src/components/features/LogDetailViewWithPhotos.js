/**
 * Enhanced LogDetailView mit Photo Upload Integration
 * Erweitert die bestehende LogDetailView um Foto-Funktionalität
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Save, Download, Camera, Image } from 'lucide-react';
import SignatureCanvas from '../ui/SignatureCanvas';
import PhotoUpload from '../protocol/PhotoUpload';
import { runStepPhotosMigration, checkStepPhotosTable } from '../../utils/runMigration';
import './LogDetailView.css';

function LogDetailViewWithPhotos({ logId, onBack }) {
  const [log, setLog] = useState(null);
  const [logSteps, setLogSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState(new Set());
  const [stepPhotos, setStepPhotos] = useState({});
  const [migrationStatus, setMigrationStatus] = useState({ checked: false, exists: false });

  // Check/Run Migration on component mount
  useEffect(() => {
    checkAndRunMigration();
  }, []);

  const checkAndRunMigration = async () => {
    try {
      const tableCheck = await checkStepPhotosTable();

      if (!tableCheck.exists) {
        console.log('🔧 step_photos table not found, running migration...');
        const migrationResult = await runStepPhotosMigration();

        if (migrationResult.success) {
          setMigrationStatus({ checked: true, exists: true });
        } else {
          console.error('Migration failed:', migrationResult.error);
          setMigrationStatus({ checked: true, exists: false, error: migrationResult.error });
        }
      } else {
        setMigrationStatus({ checked: true, exists: true });
      }
    } catch (error) {
      console.error('Migration check failed:', error);
      setMigrationStatus({ checked: true, exists: false, error: error.message });
    }
  };

  const fetchLogDetails = useCallback(async () => {
    try {
      setLoading(true);

      // Hole den Log
      const { data: logData, error: logError } = await supabase
        .from('cleaning_logs')
        .select(
          `
          *,
          customers:customer_id(id, name),
          areas:area_id(id, name),
          cleaning_plans:cleaning_plan_id(id, name, description)
        `
        )
        .eq('id', logId)
        .single();

      if (logError) throw logError;
      setLog(logData);

      // Hole die Log Steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('cleaning_log_steps')
        .select('*')
        .eq('cleaning_log_id', logId)
        .order('step_number', { ascending: true });

      if (stepsError) throw stepsError;
      setLogSteps(stepsData || []);

      // Lade Fotos für alle Steps (falls Tabelle existiert)
      if (migrationStatus.exists) {
        await loadAllStepPhotos(stepsData || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Logs:', error);
    } finally {
      setLoading(false);
    }
  }, [logId, migrationStatus.exists]);

  useEffect(() => {
    if (migrationStatus.checked) {
      fetchLogDetails();
    }
  }, [fetchLogDetails, migrationStatus.checked]);

  const loadAllStepPhotos = async steps => {
    if (!migrationStatus.exists) return;

    try {
      const { data: photos, error } = await supabase
        .from('step_photos')
        .select('*')
        .eq('log_id', logId)
        .order('uploaded_at', { ascending: true });

      if (error) {
        console.warn('Could not load step photos:', error);
        return;
      }

      // Gruppiere Fotos nach step_id
      const photosGrouped = {};
      photos?.forEach(photo => {
        if (!photosGrouped[photo.step_id]) {
          photosGrouped[photo.step_id] = [];
        }
        photosGrouped[photo.step_id].push(photo);
      });

      setStepPhotos(photosGrouped);
    } catch (error) {
      console.warn('Error loading step photos:', error);
    }
  };

  const handleStepChange = async (stepIndex, field, value) => {
    try {
      const step = logSteps[stepIndex];
      const updatedStep = { ...step, [field]: value };

      // Bei completed change auch timestamp setzen
      if (field === 'completed' && value) {
        updatedStep.completed_at = new Date().toISOString();
      } else if (field === 'completed' && !value) {
        updatedStep.completed_at = null;
      }

      // Update in DB
      const { error } = await supabase
        .from('cleaning_log_steps')
        .update(updatedStep)
        .eq('id', step.id);

      if (error) throw error;

      // Update local state
      const newSteps = [...logSteps];
      newSteps[stepIndex] = updatedStep;
      setLogSteps(newSteps);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler: ' + error.message);
    }
  };

  const handleSignature = async signatureDataUrl => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('cleaning_logs')
        .update({
          signature: signatureDataUrl,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', logId);

      if (error) throw error;

      alert('Protokoll unterzeichnet!');
      setShowSignature(false);
      fetchLogDetails();
    } catch (error) {
      console.error('Fehler beim Speichern der Unterschrift:', error);
      alert('Fehler: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStepExpansion = stepId => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const handleStepPhotosUpdate = (stepId, photos) => {
    setStepPhotos(prev => ({
      ...prev,
      [stepId]: photos,
    }));
  };

  const getTenantId = () => {
    // Extract tenant ID from log or use fallback
    return log?.tenant_id || 'default-tenant';
  };

  if (loading) {
    return <div className="loading">Lädt Protokoll...</div>;
  }

  if (!log) {
    return <div>Protokoll nicht gefunden</div>;
  }

  // Migration Error Display
  if (migrationStatus.checked && !migrationStatus.exists) {
    return (
      <div className="migration-error">
        <h3>⚠️ Database Setup erforderlich</h3>
        <p>Die step_photos Tabelle konnte nicht erstellt werden.</p>
        <p>Fehler: {migrationStatus.error}</p>
        <button onClick={checkAndRunMigration} className="btn-primary">
          Migration erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="log-detail-view">
      <button className="btn-back" onClick={onBack}>
        <ArrowLeft size={20} /> Zurück
      </button>

      <div className="log-detail-header">
        <div className="log-detail-title">
          <h1>{log.customers?.name}</h1>
          <p className="subtitle">
            {log.areas?.name} - {log.scheduled_date}
          </p>
        </div>
        <div className="log-detail-actions">
          <button className="btn-secondary" disabled>
            <Download size={18} /> PDF
          </button>
        </div>
      </div>

      <div className="log-detail-content">
        <div className="plan-info">
          <h2>{log.cleaning_plans?.name}</h2>
          {log.cleaning_plans?.description && <p>{log.cleaning_plans.description}</p>}
        </div>

        <div className="steps-section">
          <h3>Reinigungsschritte</h3>
          <div className="steps-list">
            {logSteps.map((step, index) => {
              const stepId = step.id || `step-${index}`;
              const isExpanded = expandedSteps.has(stepId);
              const photos = stepPhotos[stepId] || [];

              return (
                <div key={stepId} className={`step-item ${isExpanded ? 'expanded' : ''}`}>
                  <div className="step-main">
                    <div className="step-checkbox">
                      <input
                        type="checkbox"
                        checked={step.completed || false}
                        onChange={e => handleStepChange(index, 'completed', e.target.checked)}
                      />
                    </div>

                    <div className="step-details">
                      <h4>{step.step_name}</h4>
                      {step.cleaning_agent && (
                        <p className="agent">Mittel: {step.cleaning_agent}</p>
                      )}
                      {step.dwell_time_minutes > 0 && (
                        <p className="dwell">Einwirkzeit: {step.dwell_time_minutes} min</p>
                      )}
                    </div>

                    <div className="step-inputs">
                      <input
                        type="time"
                        value={step.completed_at ? step.completed_at.substring(11, 16) : ''}
                        onChange={e => handleStepChange(index, 'completed_at', e.target.value)}
                        placeholder="Zeit"
                        disabled={!step.completed}
                      />
                      <textarea
                        value={step.worker_notes || ''}
                        onChange={e => handleStepChange(index, 'worker_notes', e.target.value)}
                        placeholder="Notizen"
                        rows="2"
                      />
                    </div>

                    <div className="step-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => toggleStepExpansion(stepId)}
                        title={`Fotos ${isExpanded ? 'ausblenden' : 'anzeigen'}`}
                      >
                        <Camera size={18} />
                        {photos.length > 0 && <span className="photo-count">{photos.length}</span>}
                      </button>
                    </div>
                  </div>

                  {/* Photo Upload Section - nur anzeigen wenn erweitert und Migration OK */}
                  {isExpanded && migrationStatus.exists && (
                    <div className="step-photos">
                      <PhotoUpload
                        logId={logId}
                        stepId={stepId}
                        tenantId={getTenantId()}
                        existingPhotos={photos}
                        onPhotosUpdate={photos => handleStepPhotosUpdate(stepId, photos)}
                        maxPhotos={5}
                        maxSizeMB={10}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Signature Section */}
        <div className="signature-section">
          <div className="section-header">
            <h3>Unterschrift</h3>
            {!log.signature && (
              <button
                className="btn-primary"
                onClick={() => setShowSignature(!showSignature)}
                disabled={saving}
              >
                <Save size={18} /> {showSignature ? 'Abbrechen' : 'Unterschreiben'}
              </button>
            )}
          </div>

          {showSignature && !log.signature && (
            <div className="signature-canvas-container">
              <SignatureCanvas onSign={handleSignature} onCancel={() => setShowSignature(false)} />
            </div>
          )}

          {log.signature && (
            <div className="existing-signature">
              <img src={log.signature} alt="Unterschrift" />
              <p>Protokoll abgeschlossen am {new Date(log.completed_at).toLocaleString('de-DE')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LogDetailViewWithPhotos;
