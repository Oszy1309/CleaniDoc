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

      const { data: plans, error: plansError } = await supabase
        .from('cleaning_plans')
        .select('*')
        .eq('status', 'active');

      if (plansError) throw plansError;

      // Filtere Plans die für diesen Tag relevant sind
      const relevantPlans = plans.filter(plan => {
        if (plan.day_of_week) {
          const days = plan.day_of_week.split(',');
          return days.includes(dayMap[dayName]);
        }
        return false;
      });

      // Erstelle Logs für jeden relevanten Plan
      const logsToCreate = relevantPlans.map(plan => ({
        customer_id: plan.customer_id,
        area_id: plan.area_id,
        cleaning_plan_id: plan.id,
        scheduled_date: date,
        status: 'pending',
        assigned_worker_id: null,
      }));

      if (logsToCreate.length === 0) {
        alert('Keine Pläne für diesen Tag gefunden');
        return;
      }

      const { error: insertError } = await supabase
        .from('cleaning_logs')
        .insert(logsToCreate);

      if (insertError) throw insertError;

      alert(`${logsToCreate.length} Logs erstellt für ${date}`);
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
