/**
 * TodayView Component
 * Mobile-first, minimal-click dashboard for workers and shift leaders
 * Shows only TODAY's shifts and quick actions
 * Default landing page for non-admin roles
 */

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle, User, MapPin, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRBAC } from '../../hooks/useRBAC';
import auditService from '../../services/auditService';
import '../styles/TodayView.css';

function TodayView() {
  const { user, role, can } = useRBAC();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState(null);
  const [time, setTime] = useState(new Date());

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load today's shifts
  useEffect(() => {
    loadTodayShifts();
  }, [user, role]);

  const loadTodayShifts = async () => {
    try {
      setLoading(true);

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      let query = supabase
        .from('cleaning_shifts')
        .select(
          `
          id,
          name,
          location_id,
          start_time,
          end_time,
          status,
          assigned_to,
          location_name,
          customer_name,
          tasks (
            id,
            name,
            status,
            assigned_to
          )
        `
        )
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay);

      // RLS automatically filters based on role
      if (role === 'worker') {
        query = query.eq('assigned_to', user.id);
      } else if (role === 'manager') {
        // Manager sees all shifts at their location (RLS handles this)
      }

      const { data, error } = await query.order('start_time', { ascending: true });

      if (error) throw error;

      setShifts(data || []);

      // Log view action
      await auditService.logAction(
        'view',
        'shifts',
        null,
        `${role} viewed today shifts`,
        null,
        { date: new Date().toISOString(), count: data?.length }
      );
    } catch (error) {
      console.error('❌ Fehler beim Laden der Schichten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartShift = async shift => {
    try {
      const { error } = await supabase
        .from('cleaning_shifts')
        .update({ status: 'in_progress', started_at: new Date() })
        .eq('id', shift.id);

      if (error) throw error;

      // Log action
      await auditService.logAction(
        'update',
        'shifts',
        shift.id,
        shift.name,
        { status: 'scheduled' },
        { status: 'in_progress', started_at: new Date() }
      );

      loadTodayShifts();
    } catch (error) {
      console.error('❌ Fehler beim Starten der Schicht:', error);
    }
  };

  const handleCompleteShift = async shift => {
    try {
      const { error } = await supabase
        .from('cleaning_shifts')
        .update({
          status: 'completed',
          completed_at: new Date(),
          signed_by_worker: user.id,
        })
        .eq('id', shift.id);

      if (error) throw error;

      // Log action
      await auditService.logAction(
        'sign',
        'shifts',
        shift.id,
        shift.name,
        { status: 'in_progress' },
        { status: 'completed', signed_by_worker: user.id }
      );

      loadTodayShifts();
    } catch (error) {
      console.error('❌ Fehler beim Abschließen der Schicht:', error);
    }
  };

  // Count shifts by status
  const getShiftStats = () => {
    return {
      total: shifts.length,
      upcoming: shifts.filter(s => s.status === 'scheduled').length,
      active: shifts.filter(s => s.status === 'in_progress').length,
      completed: shifts.filter(s => s.status === 'completed').length,
    };
  };

  const stats = getShiftStats();

  if (loading) {
    return (
      <div className="today-view-loading">
        <div className="loading-spinner"></div>
        <p>Schichten werden geladen...</p>
      </div>
    );
  }

  return (
    <div className="today-view">
      {/* Header mit Clock */}
      <div className="today-view-header">
        <div className="today-view-header-left">
          <h1>Heute</h1>
          <p className="today-date">
            {time.toLocaleDateString('de-DE', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            })}
          </p>
          <p className="today-time">
            <Clock size={16} />
            {time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Stats Pills */}
        <div className="today-stats">
          <div className="stat-pill">
            <span className="stat-number">{stats.upcoming}</span>
            <span className="stat-label">Ausstehend</span>
          </div>
          <div className="stat-pill active">
            <span className="stat-number">{stats.active}</span>
            <span className="stat-label">Aktiv</span>
          </div>
          <div className="stat-pill completed">
            <span className="stat-number">{stats.completed}</span>
            <span className="stat-label">Fertig</span>
          </div>
        </div>
      </div>

      {/* Shifts List */}
      <div className="today-shifts">
        {shifts.length === 0 ? (
          <div className="today-empty">
            <AlertCircle size={48} />
            <h2>Keine Schichten heute</h2>
            <p>Du hast heute keine eingeplanten Schichten.</p>
          </div>
        ) : (
          <div className="shifts-list">
            {shifts.map(shift => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                role={role}
                can={can}
                onStart={() => handleStartShift(shift)}
                onComplete={() => handleCompleteShift(shift)}
                onSelect={() => setSelectedShift(shift)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Shift Detail Modal */}
      {selectedShift && (
        <ShiftDetailModal
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
          onStart={() => {
            handleStartShift(selectedShift);
            setSelectedShift(null);
          }}
          onComplete={() => {
            handleCompleteShift(selectedShift);
            setSelectedShift(null);
          }}
          role={role}
          can={can}
        />
      )}
    </div>
  );
}

/**
 * ShiftCard Component
 * Minimal design, mobile-optimized, quick-action buttons
 */
function ShiftCard({ shift, role, can, onStart, onComplete, onSelect }) {
  const getStatusColor = status => {
    switch (status) {
      case 'scheduled':
        return 'status-scheduled';
      case 'in_progress':
        return 'status-active';
      case 'completed':
        return 'status-completed';
      default:
        return '';
    }
  };

  const getStatusLabel = status => {
    switch (status) {
      case 'scheduled':
        return 'Geplant';
      case 'in_progress':
        return 'Aktiv';
      case 'completed':
        return 'Fertig';
      default:
        return status;
    }
  };

  const startTime = new Date(shift.start_time);
  const endTime = new Date(shift.end_time);
  const duration = Math.round((endTime - startTime) / 60000); // minutes

  return (
    <div className={`shift-card ${getStatusColor(shift.status)}`} onClick={onSelect}>
      {/* Status Badge */}
      <div className="shift-card-status">
        <span className={`status-badge ${shift.status}`}>
          {shift.status === 'in_progress' && <span className="pulse" />}
          {getStatusLabel(shift.status)}
        </span>
      </div>

      {/* Main Info */}
      <div className="shift-card-main">
        <h3 className="shift-card-title">{shift.name}</h3>

        {/* Time */}
        <div className="shift-card-time">
          <Clock size={14} />
          <span>
            {startTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} -{' '}
            {endTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="duration">({duration}h)</span>
        </div>

        {/* Location */}
        <div className="shift-card-location">
          <MapPin size={14} />
          <span>{shift.location_name}</span>
        </div>

        {/* Customer */}
        {shift.customer_name && (
          <div className="shift-card-customer">
            <User size={14} />
            <span>{shift.customer_name}</span>
          </div>
        )}
      </div>

      {/* Task Count */}
      {shift.tasks && shift.tasks.length > 0 && (
        <div className="shift-card-tasks">
          <span className="task-count">{shift.tasks.length} Tasks</span>
          <span className="task-completed">
            {shift.tasks.filter(t => t.status === 'completed').length}/{shift.tasks.length}
          </span>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="shift-card-actions">
        {shift.status === 'scheduled' && (
          <button className="btn btn-primary btn-small" onClick={e => {
            e.stopPropagation();
            onStart();
          }}>
            <Clock size={14} />
            Starten
          </button>
        )}

        {shift.status === 'in_progress' && (
          <button className="btn btn-success btn-small" onClick={e => {
            e.stopPropagation();
            onComplete();
          }}>
            <CheckCircle2 size={14} />
            Fertig
          </button>
        )}

        {shift.status === 'completed' && (
          <div className="shift-completed-badge">
            <CheckCircle2 size={14} />
            Abgeschlossen
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ShiftDetailModal
 * Full details of a shift with task list
 */
function ShiftDetailModal({ shift, onClose, onStart, onComplete, role, can }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>{shift.name}</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* Details Grid */}
          <div className="shift-details-grid">
            <div className="detail-item">
              <label>Zeit</label>
              <p>
                {new Date(shift.start_time).toLocaleTimeString('de-DE')} -{' '}
                {new Date(shift.end_time).toLocaleTimeString('de-DE')}
              </p>
            </div>

            <div className="detail-item">
              <label>Ort</label>
              <p>{shift.location_name}</p>
            </div>

            <div className="detail-item">
              <label>Kunde</label>
              <p>{shift.customer_name || 'N/A'}</p>
            </div>

            <div className="detail-item">
              <label>Status</label>
              <p>
                <span className={`badge badge-${shift.status}`}>
                  {shift.status === 'scheduled' && 'Geplant'}
                  {shift.status === 'in_progress' && 'Aktiv'}
                  {shift.status === 'completed' && 'Fertig'}
                </span>
              </p>
            </div>
          </div>

          {/* Tasks List */}
          {shift.tasks && shift.tasks.length > 0 && (
            <div className="shift-tasks">
              <h3>Tasks ({shift.tasks.length})</h3>
              <ul className="tasks-list">
                {shift.tasks.map(task => (
                  <li key={task.id} className={`task-item task-${task.status}`}>
                    <span className="task-checkbox">
                      {task.status === 'completed' && <CheckCircle2 size={18} />}
                    </span>
                    <span className="task-name">{task.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Schließen
          </button>

          {shift.status === 'scheduled' && (
            <button className="btn btn-primary" onClick={onStart}>
              Schicht starten
            </button>
          )}

          {shift.status === 'in_progress' && (
            <button className="btn btn-success" onClick={onComplete}>
              Schicht abschließen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TodayView;
