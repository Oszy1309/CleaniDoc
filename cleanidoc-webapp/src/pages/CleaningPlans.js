import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../App';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import PlanModal from '../components/PlanModal';
import './CleaningPlansPage.css';

const FREQUENCY_LABELS = {
  daily: 'Täglich',
  weekly: 'Wöchentlich',
  '3_times_weekly': '3x pro Woche',
  '2_times_weekly': '2x pro Woche',
  monthly: 'Monatlich',
  as_needed: 'Nach Bedarf',
};

function CleaningPlans() {
  const [plans, setPlans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // Filter states
  const [selectedCustomerId, setSelectedCustomerId] = useState('all');
  const [selectedAreaId, setSelectedAreaId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedFrequency, setSelectedFrequency] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Pläne laden mit Related Data
      const { data: plansData, error: plansError } = await supabase
        .from('cleaning_plans')
        .select(`
          *,
          customers:customer_id(id, name),
          areas:area_id(id, name)
        `)
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;

      // Für jeden Plan die Steps laden
      const plansWithSteps = await Promise.all(
        (plansData || []).map(async (plan) => {
          const { data: stepsData } = await supabase
            .from('cleaning_steps')
            .select('*')
            .eq('cleaning_plan_id', plan.id)
            .order('step_number', { ascending: true });

          return {
            ...plan,
            steps: stepsData || [],
          };
        })
      );

      setPlans(plansWithSteps);

      // Kunden und Bereiche für Filter laden
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name')
        .order('name', { ascending: true });

      const { data: areasData } = await supabase
        .from('areas')
        .select('id, name, customer_id')
        .order('name', { ascending: true });

      setCustomers(customersData || []);
      setAreas(areasData || []);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      alert('Fehler beim Laden der Reinigungspläne: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter Logic
  const filteredPlans = plans.filter((plan) => {
    if (selectedCustomerId !== 'all' && plan.customer_id !== selectedCustomerId) return false;
    if (selectedAreaId !== 'all' && plan.area_id !== selectedAreaId) return false;
    if (selectedStatus !== 'all' && plan.status !== selectedStatus) return false;
    if (selectedFrequency !== 'all' && plan.frequency !== selectedFrequency) return false;
    if (searchTerm && !plan.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Statistics
  const getStatistics = () => {
    return {
      total: filteredPlans.length,
      active: filteredPlans.filter((p) => p.status === 'active').length,
      inactive: filteredPlans.filter((p) => p.status === 'inactive').length,
      daily: filteredPlans.filter((p) => p.frequency === 'daily').length,
      weekly: filteredPlans.filter((p) => p.frequency === 'weekly').length,
      other: filteredPlans.filter(
        (p) => p.frequency !== 'daily' && p.frequency !== 'weekly'
      ).length,
    };
  };

  // CRUD Handlers
  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Plan wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    try {
      // Erst Steps löschen
      await supabase.from('cleaning_steps').delete().eq('cleaning_plan_id', planId);

      // Dann Plan löschen
      const { error } = await supabase.from('cleaning_plans').delete().eq('id', planId);

      if (error) throw error;

      fetchData();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert('Fehler beim Löschen des Plans: ' + error.message);
    }
  };

  const handleSavePlan = async (planData) => {
    try {
      const { steps, ...planInfo } = planData;
      let planId = editingPlan?.id;

      if (editingPlan) {
        // Update existierenden Plan
        const { error } = await supabase
          .from('cleaning_plans')
          .update({
            name: planInfo.name,
            description: planInfo.description,
            frequency: planInfo.frequency,
            day_of_week: planInfo.day_of_week,
          })
          .eq('id', planId);

        if (error) throw error;

        // Alte Steps löschen
        await supabase.from('cleaning_steps').delete().eq('cleaning_plan_id', planId);
      } else {
        // Neuen Plan erstellen
        // Für neue Pläne: Kunde & Bereich vom ersten Filter nehmen oder manuell erfragen
        if (selectedCustomerId === 'all' || selectedAreaId === 'all') {
          alert('Bitte wähle erst einen Kunden und Bereich aus den Filtern, um einen neuen Plan zu erstellen.');
          return;
        }

        const { data: newPlan, error: planError } = await supabase
          .from('cleaning_plans')
          .insert([
            {
              customer_id: selectedCustomerId,
              area_id: selectedAreaId,
              name: planInfo.name,
              description: planInfo.description,
              frequency: planInfo.frequency,
              day_of_week: planInfo.day_of_week,
              status: 'active',
            },
          ])
          .select();

        if (planError) throw planError;
        planId = newPlan[0].id;
      }

      // Neue Steps speichern
      if (steps && steps.length > 0) {
        const stepsToInsert = steps.map((step) => ({
          cleaning_plan_id: planId,
          step_number: step.step_number,
          step_name: step.step_name,
          cleaning_agent: step.cleaning_agent || 'none',
          dwell_time_minutes: step.dwell_time_minutes,
          description: (step.equipment || []).join(', '),
        }));

        const { error: stepsError } = await supabase
          .from('cleaning_steps')
          .insert(stepsToInsert);

        if (stepsError) throw stepsError;
      }

      setEditingPlan(null);
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern des Plans: ' + error.message);
    }
  };

  const handleToggleStatus = async (plan) => {
    const newStatus = plan.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('cleaning_plans')
        .update({ status: newStatus })
        .eq('id', plan.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Fehler beim Status-Update:', error);
      alert('Fehler beim Ändern des Status: ' + error.message);
    }
  };

  const stats = getStatistics();

  return (
    <div className="cleaning-plans-page">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>Reinigungspläne</h1>
          <p className="subtitle">Zentrale Verwaltung aller Reinigungspläne</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            if (selectedCustomerId === 'all' || selectedAreaId === 'all') {
              alert('Bitte wähle erst einen Kunden und Bereich aus den Filtern, um einen neuen Plan zu erstellen.');
              return;
            }
            setEditingPlan(null);
            setShowModal(true);
          }}
        >
          <Plus size={18} /> Neuer Plan
        </button>
      </div>

      {/* STATISTICS */}
      {!loading && (
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Gesamt</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-item success">
            <span className="stat-label">Aktiv</span>
            <span className="stat-value">{stats.active}</span>
          </div>
          <div className="stat-item warning">
            <span className="stat-label">Inaktiv</span>
            <span className="stat-value">{stats.inactive}</span>
          </div>
          <div className="stat-item info">
            <span className="stat-label">Täglich</span>
            <span className="stat-value">{stats.daily}</span>
          </div>
          <div className="stat-item primary">
            <span className="stat-label">Wöchentlich</span>
            <span className="stat-value">{stats.weekly}</span>
          </div>
          <div className="stat-item secondary">
            <span className="stat-label">Andere</span>
            <span className="stat-value">{stats.other}</span>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div className="filters-section">
        <div className="filter-icon">
          <Filter size={20} />
          <span>Filter</span>
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label>Kunde:</label>
            <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
              <option value="all">Alle Kunden</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Bereich:</label>
            <select value={selectedAreaId} onChange={(e) => setSelectedAreaId(e.target.value)}>
              <option value="all">Alle Bereiche</option>
              {areas
                .filter((area) =>
                  selectedCustomerId === 'all' || area.customer_id === selectedCustomerId
                )
                .map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="all">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Häufigkeit:</label>
            <select value={selectedFrequency} onChange={(e) => setSelectedFrequency(e.target.value)}>
              <option value="all">Alle Häufigkeiten</option>
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Suche:</label>
            <div className="search-input-wrapper">
              <Search size={18} />
              <input
                type="text"
                placeholder="Plan Name suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="loading">Lädt Reinigungspläne...</div>
      ) : filteredPlans.length === 0 ? (
        <div className="empty-state">
          <p>Keine Reinigungspläne gefunden</p>
          <p className="text-muted">
            {searchTerm || selectedCustomerId !== 'all' || selectedAreaId !== 'all'
              ? 'Versuche die Filter anzupassen'
              : 'Erstelle deinen ersten Reinigungsplan'}
          </p>
        </div>
      ) : (
        <div className="plans-grid">
          {filteredPlans.map((plan) => (
            <div key={plan.id} className={`plan-card ${plan.status === 'inactive' ? 'inactive' : ''}`}>
              <div className="plan-card-header">
                <div className="plan-title-section">
                  <h3>{plan.name}</h3>
                  <div className="plan-badges">
                    <span className={`badge ${plan.status === 'active' ? 'success' : 'warning'}`}>
                      {plan.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                    </span>
                    <span className="badge primary">{FREQUENCY_LABELS[plan.frequency]}</span>
                  </div>
                </div>
              </div>

              <div className="plan-card-body">
                <div className="plan-info-row">
                  <span className="info-label">Kunde:</span>
                  <span className="info-value">{plan.customers?.name || 'Unbekannt'}</span>
                </div>
                <div className="plan-info-row">
                  <span className="info-label">Bereich:</span>
                  <span className="info-value">{plan.areas?.name || 'Unbekannt'}</span>
                </div>
                <div className="plan-info-row">
                  <span className="info-label">Schritte:</span>
                  <span className="info-value">{plan.steps?.length || 0} Schritte</span>
                </div>
                {plan.frequency === 'daily' && plan.day_of_week && (
                  <div className="plan-info-row">
                    <span className="info-label">Tage:</span>
                    <span className="info-value">
                      {plan.day_of_week
                        .split(',')
                        .map((day) => day.substring(0, 2).toUpperCase())
                        .join(', ')}
                    </span>
                  </div>
                )}
                {plan.description && (
                  <div className="plan-description">
                    <p>{plan.description}</p>
                  </div>
                )}
              </div>

              <div className="plan-card-footer">
                <button
                  className={`btn-status ${plan.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                  onClick={() => handleToggleStatus(plan)}
                  title={plan.status === 'active' ? 'Deaktivieren' : 'Aktivieren'}
                >
                  {plan.status === 'active' ? 'Deaktivieren' : 'Aktivieren'}
                </button>
                <div className="plan-actions">
                  <button
                    className="btn-icon"
                    onClick={() => {
                      setEditingPlan(plan);
                      setShowModal(true);
                    }}
                    title="Bearbeiten"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="btn-icon delete"
                    onClick={() => handleDeletePlan(plan.id)}
                    title="Löschen"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <PlanModal
          onClose={() => {
            setShowModal(false);
            setEditingPlan(null);
          }}
          onSave={handleSavePlan}
          existingPlan={editingPlan}
          areas={areas.filter(
            (area) =>
              selectedCustomerId === 'all' || area.customer_id === selectedCustomerId
          )}
          selectedAreaId={selectedAreaId !== 'all' ? selectedAreaId : areas[0]?.id}
        />
      )}
    </div>
  );
}

export default CleaningPlans;
