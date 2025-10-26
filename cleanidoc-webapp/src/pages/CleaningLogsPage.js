import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import { Plus, AlertCircle } from 'lucide-react';
import LogListView from '../components/LogListView';
import LogDetailView from '../components/LogDetailView';
import './CleaningLogsPage.css';

function CleaningLogsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [generatingLogs, setGeneratingLogs] = useState(false);

  useEffect(() => {
    fetchLogsForDate(selectedDate);
  }, [selectedDate]);

  const fetchLogsForDate = async (date) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cleaning_logs')
        .select(`
          *,
          customers:customer_id(id, name),
          areas:area_id(id, name),
          cleaning_plans:cleaning_plan_id(id, name)
        `)
        .eq('scheduled_date', date)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateLogsForDate = async (date) => {
    try {
      console.log('🚀 ANFANG: generateLogsForDate für', date);
      setGeneratingLogs(true);

      // Hole alle aktiven Plans für das Datum
      const dayName = new Date(date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long' }).toLowerCase();
      const dayMap = {
        'montag': 'monday',
        'dienstag': 'tuesday',
        'mittwoch': 'wednesday',
        'donnerstag': 'thursday',
        'freitag': 'friday',
        'samstag': 'saturday',
        'sonntag': 'sunday',
      };

      console.log('🔍 Suche alle Pläne (nicht nur active)...');
      const { data: allPlans, error: allPlansError } = await supabase
        .from('cleaning_plans')
        .select('*');

      if (allPlansError) {
        console.error('❌ Fehler beim Laden aller Pläne:', allPlansError);
        throw allPlansError;
      }

      console.log('📋 ALLE Pläne:', allPlans.length);
      allPlans.forEach(plan => {
        console.log(`📋 Plan: "${plan.name}" | Status: "${plan.status}" | Frequency: "${plan.frequency}"`);
      });

      // Filtere nach status 'active' ODER 'fully_signed'
      const plans = allPlans.filter(plan =>
        plan.status === 'active' || plan.status === 'fully_signed'
      );

      console.log('✅ Verwendbare Pläne (active oder fully_signed):', plans.length);

      console.log('🔍 Debug: Gefundene aktive Pläne:', plans.length);
      console.log('🔍 Debug: Pläne Details:', plans);
      console.log('🔍 Debug: Aktueller Tag:', dayName, '→', dayMap[dayName]);

      // Filtere Plans die für diesen Tag relevant sind
      const relevantPlans = plans.filter(plan => {
        console.log(`🔍 Debug: Prüfe Plan "${plan.name}":`, {
          frequency: plan.frequency,
          day_of_week: plan.day_of_week,
          status: plan.status
        });

        // Daily Plans sind immer relevant
        if (plan.frequency === 'daily') {
          console.log('✅ Plan ist daily → relevant');
          return true;
        }

        // Wöchentliche oder spezifische Tage
        if (plan.day_of_week) {
          const days = plan.day_of_week.split(',');
          const isRelevant = days.includes(dayMap[dayName]);
          console.log(`📅 Plan Tage: ${days.join(', ')} → ${isRelevant ? 'relevant' : 'nicht relevant'}`);
          return isRelevant;
        }

        console.log('❌ Plan hat keine Tage definiert → nicht relevant');
        return false;
      });

      console.log('🎯 Debug: Relevante Pläne gefunden:', relevantPlans.length);

      // Prüfe welche Logs bereits für dieses Datum existieren
      const { data: existingLogs, error: existingError } = await supabase
        .from('cleaning_logs')
        .select('cleaning_plan_id')
        .eq('scheduled_date', date);

      if (existingError) throw existingError;

      const existingPlanIds = new Set(existingLogs?.map(log => log.cleaning_plan_id) || []);
      console.log('📋 Debug: Bereits vorhandene Plan-IDs für', date, ':', Array.from(existingPlanIds));

      // Filtere relevante Pläne: nur die, die noch KEIN Log für dieses Datum haben
      const newPlansToCreate = relevantPlans.filter(plan => {
        const alreadyExists = existingPlanIds.has(plan.id);
        if (alreadyExists) {
          console.log(`⚠️ Plan "${plan.name}" hat bereits ein Log für ${date} → überspringe`);
        } else {
          console.log(`✅ Plan "${plan.name}" → erstelle neues Log`);
        }
        return !alreadyExists;
      });

      console.log('🆕 Debug: Neue Logs zu erstellen:', newPlansToCreate.length);

      // Erstelle Logs nur für Pläne die noch kein Log haben
      const logsToCreate = newPlansToCreate.map(plan => ({
        customer_id: plan.customer_id,
        area_id: plan.area_id,
        cleaning_plan_id: plan.id,
        scheduled_date: date,
        status: 'pending',
        assigned_worker_id: null,
      }));

      if (logsToCreate.length === 0) {
        if (relevantPlans.length > 0) {
          alert(`Alle ${relevantPlans.length} relevanten Pläne haben bereits Logs für ${date}`);
        } else {
          alert('Keine Pläne für diesen Tag gefunden');
        }
        return;
      }

      // Erstelle die Logs und hole die IDs zurück
      const { data: createdLogs, error: insertError } = await supabase
        .from('cleaning_logs')
        .insert(logsToCreate)
        .select();

      if (insertError) throw insertError;

      // Jetzt für jeden erstellten Log die Steps aus dem Plan kopieren
      for (const log of createdLogs) {
        // Hole die Steps vom ursprünglichen Plan
        const { data: planSteps, error: stepsError } = await supabase
          .from('cleaning_steps')
          .select('*')
          .eq('cleaning_plan_id', log.cleaning_plan_id)
          .order('step_number', { ascending: true });

        if (stepsError) {
          console.error('Fehler beim Laden der Plan-Steps:', stepsError);
          continue;
        }

        // Erstelle cleaning_log_steps basierend auf den plan steps
        if (planSteps && planSteps.length > 0) {
          const logStepsToCreate = planSteps.map(step => ({
            cleaning_log_id: log.id,
            step_number: step.step_number,
            step_name: step.step_name,
            cleaning_agent: step.cleaning_agent,
            dwell_time_minutes: step.dwell_time_minutes,
            completed: false,
            notes: step.description || '',
          }));

          const { error: logStepsError } = await supabase
            .from('cleaning_log_steps')
            .insert(logStepsToCreate);

          if (logStepsError) {
            console.error('Fehler beim Erstellen der Log-Steps:', logStepsError);
          }
        }
      }

      if (existingLogs?.length > 0) {
        alert(`${logsToCreate.length} neue Logs erstellt für ${date}\n(${existingLogs.length} Logs existierten bereits)`);
      } else {
        alert(`${logsToCreate.length} Logs erstellt für ${date}`);
      }
      fetchLogsForDate(date);
    } catch (error) {
      console.error('Fehler beim Generieren der Logs:', error);
      alert('Fehler: ' + error.message);
    } finally {
      setGeneratingLogs(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (window.confirm('Log wirklich löschen?')) {
      try {
        // Delete log steps zuerst
        await supabase
          .from('cleaning_log_steps')
          .delete()
          .eq('cleaning_log_id', logId);

        // Dann den Log
        const { error } = await supabase
          .from('cleaning_logs')
          .delete()
          .eq('id', logId);

        if (error) throw error;
        fetchLogsForDate(selectedDate);
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
      }
    }
  };

  if (selectedLog) {
    return (
      <LogDetailView
        logId={selectedLog.id}
        onBack={() => {
          setSelectedLog(null);
          fetchLogsForDate(selectedDate);
        }}
      />
    );
  }

  return (
    <div className="cleaning-logs-page">
      <div className="page-header">
        <h1>Tagesplan & Protokolle</h1>
      </div>

      <div className="controls-section">
        <div className="date-picker">
          <label>Datum:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <button
          className="btn-primary"
          onClick={() => generateLogsForDate(selectedDate)}
          disabled={generatingLogs}
        >
          <Plus size={18} /> Logs generieren für {selectedDate}
        </button>
      </div>

      {loading ? (
        <div className="loading">Lädt Protokolle...</div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <AlertCircle size={32} />
          <p>Keine Protokolle für dieses Datum</p>
          <button
            className="btn-secondary"
            onClick={() => generateLogsForDate(selectedDate)}
          >
            Logs generieren
          </button>
        </div>
      ) : (
        <LogListView
          logs={logs}
          selectedDate={selectedDate}
          onSelectLog={setSelectedLog}
          onDeleteLog={handleDeleteLog}
        />
      )}
    </div>
  );
}

export default CleaningLogsPage;
