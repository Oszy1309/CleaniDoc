import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../App';
import { ArrowLeft, Save } from 'lucide-react';
import SignatureCanvas from './SignatureCanvas';
import './WorkerLogDetail.css';

function WorkerLogDetail({ logId, onBack }) {
  const [log, setLog] = useState(null);
  const [logSteps, setLogSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSignature, setShowSignature] = useState(false);

  const fetchLogDetails = useCallback(async () => {
    try {
      setLoading(true);

      const { data: logData, error: logError } = await supabase
        .from('cleaning_logs')
        .select(`
          *,
          customers:customer_id(id, name),
          areas:area_id(id, name),
          cleaning_plans:cleaning_plan_id(id, name, description, checklist)
        `)
        .eq('id', logId)
        .single();

      if (logError) throw logError;
      setLog(logData);

      // Hole existing steps oder erstelle sie aus der Checkliste
      const { data: stepsData, error: stepsError } = await supabase
        .from('cleaning_log_steps')
        .select('*')
        .eq('cleaning_log_id', logId)
        .order('step_number', { ascending: true });

      if (stepsError) throw stepsError;

      // Falls keine Steps existieren, erstelle sie aus der Checkliste
      if ((!stepsData || stepsData.length === 0) && logData.cleaning_plans?.checklist) {
        const checklist = logData.cleaning_plans.checklist;
        const newSteps = checklist.map((item, index) => ({
          id: `temp_${index}`,
          cleaning_log_id: logId,
          step_number: index + 1,
          step_name: item.step || item.name || `Schritt ${index + 1}`,
          cleaning_agent: item.agent || item.cleaning_agent || '',
          dwell_time_minutes: item.dwell_time || item.dwell_time_minutes || 0,
          completed: false,
          worker_notes: ''
        }));

        // Speichere die neuen Schritte in der Datenbank
        try {
          const { data: insertedSteps, error: insertError } = await supabase
            .from('cleaning_log_steps')
            .insert(newSteps.map(step => ({
              cleaning_log_id: step.cleaning_log_id,
              step_number: step.step_number,
              step_name: step.step_name,
              cleaning_agent: step.cleaning_agent,
              dwell_time_minutes: step.dwell_time_minutes,
              completed: step.completed,
              worker_notes: step.worker_notes
            })))
            .select();

          if (insertError) throw insertError;
          setLogSteps(insertedSteps || []);
        } catch (insertError) {
          console.error('Fehler beim Erstellen der Schritte:', insertError);
          setLogSteps(newSteps); // Verwende temporäre Schritte
        }
      } else {
        setLogSteps(stepsData || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Logs:', error);
    } finally {
      setLoading(false);
    }
  }, [logId]);

  useEffect(() => {
    fetchLogDetails();
  }, [fetchLogDetails]);

  const handleStepChange = (stepIndex, field, value) => {
    const updated = [...logSteps];
    updated[stepIndex] = { ...updated[stepIndex], [field]: value };
    setLogSteps(updated);
  };

  const handleSaveSteps = async () => {
    try {
      setSaving(true);

      for (const step of logSteps) {
        const { error } = await supabase
          .from('cleaning_log_steps')
          .update({
            completed: step.completed,
            completed_at: step.completed ? new Date().toISOString() : null,
            worker_notes: step.worker_notes,
          })
          .eq('id', step.id);

        if (error) throw error;
      }

      // Status wird nur bei Unterschrift auf 'completed' gesetzt
      const { error: logError } = await supabase
        .from('cleaning_logs')
        .update({
          status: 'in_progress',
        })
        .eq('id', logId);

      if (logError) throw logError;

      alert('Protokoll gespeichert!');
      // Kein fetchLogDetails() um Steps zu erhalten
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignature = async (signatureDataUrl) => {
    try {
      setSaving(true);

      // Erst die Steps speichern
      await handleSaveSteps();

      // Dann die Unterschrift speichern und als completed markieren
      const { error } = await supabase
        .from('cleaning_logs')
        .update({
          signature: signatureDataUrl,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', logId);

      if (error) throw error;

      alert('Protokoll erfolgreich abgeschlossen und unterzeichnet!');
      setShowSignature(false);
      // Keine fetchLogDetails() mehr nötig - Status bleibt erhalten
    } catch (error) {
      console.error('Fehler beim Speichern der Unterschrift:', error);
      alert('Fehler: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Lädt Protokoll...</div>;
  }

  if (!log) {
    return <div>Protokoll nicht gefunden</div>;
  }

  return (
    <div className="worker-log-detail">
      <button className="btn-back" onClick={onBack}>
        <ArrowLeft size={20} /> Zurück
      </button>

      <div className="log-detail-header">
        <div className="log-detail-title">
          <h1>{log.customers?.name}</h1>
          <p className="subtitle">{log.areas?.name} - {log.scheduled_date}</p>
        </div>
      </div>

      <div className="log-detail-content">
        <div className="plan-info">
          <h2>{log.cleaning_plans?.name}</h2>
          {log.cleaning_plans?.description && (
            <p>{log.cleaning_plans.description}</p>
          )}
        </div>

        <div className="steps-section">
          <h3>Reinigungsschritte</h3>
          <div className="steps-list">
            {logSteps.map((step, index) => (
              <div key={step.id} className="step-item">
                <div className="step-checkbox">
                  <input
                    type="checkbox"
                    checked={step.completed || false}
                    onChange={(e) =>
                      handleStepChange(index, 'completed', e.target.checked)
                    }
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
                  <textarea
                    value={step.worker_notes || ''}
                    onChange={(e) =>
                      handleStepChange(index, 'worker_notes', e.target.value)
                    }
                    placeholder="Notizen/Bemerkungen"
                    rows="2"
                    disabled={!step.completed}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="actions">
          <button
            className="btn-primary"
            onClick={handleSaveSteps}
            disabled={saving}
          >
            <Save size={18} /> Speichern
          </button>

          {logSteps.every(s => s.completed) && !log.signature && (
            <button
              className="btn-success"
              onClick={() => setShowSignature(true)}
            >
              ✍️ Unterzeichnen
            </button>
          )}
        </div>

        {showSignature && (
          <SignatureCanvas
            onSign={handleSignature}
            onCancel={() => setShowSignature(false)}
          />
        )}

        {log.signature && (
          <div className="signature-display">
            <h3>✓ Unterzeichnet</h3>
            <img src={log.signature} alt="Unterschrift" />
            <p>am {new Date(log.completed_at).toLocaleString('de-DE')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkerLogDetail;
