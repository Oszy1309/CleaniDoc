import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import PlanModal from '../forms/PlanModal';
import './PlansTab.css';

function PlansTab({ customerId, areas }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedAreaId, setSelectedAreaId] = useState(areas[0]?.id || null);

  const fetchPlans = useCallback(async () => {
    try {
      // Pläne laden
      const { data: plansData, error: plansError } = await supabase
        .from('cleaning_plans')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;

      // Für jeden Plan die Steps laden
      const plansWithSteps = await Promise.all(
        (plansData || []).map(async plan => {
          const { data: stepsData, error: stepsError } = await supabase
            .from('cleaning_steps')
            .select('*')
            .eq('cleaning_plan_id', plan.id)
            .order('step_number', { ascending: true });

          if (stepsError) console.error('Fehler beim Laden der Steps:', stepsError);
          return {
            ...plan,
            steps: stepsData || [],
          };
        })
      );

      setPlans(plansWithSteps);
    } catch (error) {
      console.error('Fehler beim Laden der Pläne:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleDeletePlan = async planId => {
    if (window.confirm('Plan wirklich löschen?')) {
      try {
        // Erst die Steps löschen
        await supabase.from('cleaning_steps').delete().eq('cleaning_plan_id', planId);

        // Dann den Plan
        const { error } = await supabase.from('cleaning_plans').delete().eq('id', planId);

        if (error) throw error;
        fetchPlans();
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
      }
    }
  };

  const handleAdminApproval = async planId => {
    if (window.confirm('Plan als Admin unterschreiben?')) {
      try {
        const { error } = await supabase
          .from('cleaning_plans')
          .update({
            approved_by_admin: true,
            admin_approval_date: new Date().toISOString(),
          })
          .eq('id', planId);

        if (error) throw error;
        fetchPlans();
        alert('Plan erfolgreich als Admin unterschrieben!');
      } catch (error) {
        console.error('Fehler bei Admin-Unterschrift:', error);
        alert('Fehler: ' + error.message);
      }
    }
  };

  const handleCustomerApproval = async planId => {
    if (window.confirm('Plan als Kunde unterschreiben?')) {
      try {
        // Prüfe ob Admin bereits unterschrieben hat
        const { data: plan, error: checkError } = await supabase
          .from('cleaning_plans')
          .select('approved_by_admin')
          .eq('id', planId)
          .single();

        if (checkError) throw checkError;

        if (!plan.approved_by_admin) {
          alert('Plan muss zuerst vom Admin unterschrieben werden!');
          return;
        }

        const { error } = await supabase
          .from('cleaning_plans')
          .update({
            approved_by_customer: true,
            customer_approval_date: new Date().toISOString(),
            status: 'fully_signed',
          })
          .eq('id', planId);

        if (error) throw error;
        fetchPlans();
        alert('Plan erfolgreich als Kunde unterschrieben! Status: fully_signed');
      } catch (error) {
        console.error('Fehler bei Kunden-Unterschrift:', error);
        alert('Fehler: ' + error.message);
      }
    }
  };

  const handleSavePlan = async planData => {
    try {
      const { steps, ...planInfo } = planData;
      let planId = editingPlan?.id;

      if (editingPlan) {
        // Update Plan
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
        // Insert Plan
        const { data: newPlan, error: planError } = await supabase
          .from('cleaning_plans')
          .insert([
            {
              customer_id: customerId,
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

      // Neue/Aktualisierte Steps speichern
      if (steps && steps.length > 0) {
        const stepsToInsert = steps.map(step => ({
          cleaning_plan_id: planId,
          step_number: step.step_number,
          step_name: step.step_name,
          cleaning_agent: step.cleaning_agent || 'none',
          dwell_time_minutes: step.dwell_time_minutes,
          description: (step.equipment || []).join(', '), // Geräte als String speichern
        }));

        const { error: stepsError } = await supabase.from('cleaning_steps').insert(stepsToInsert);

        if (stepsError) throw stepsError;
      }

      setEditingPlan(null);
      setShowModal(false);
      fetchPlans();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern des Plans: ' + error.message);
    }
  };

  const unsignedPlans = plans.filter(p => !p.approved_by_admin || !p.approved_by_customer);

  const getAreaName = areaId => {
    return areas.find(a => a.id === areaId)?.name || 'Unbekannt';
  };

  if (loading) {
    return <div className="loading">Lädt Pläne...</div>;
  }

  return (
    <div className="plans-tab">
      {unsignedPlans.length > 0 && (
        <div className="signature-banner">
          <AlertCircle size={20} />
          <span>{unsignedPlans.length} Plan(e) warten auf Unterschrift</span>
        </div>
      )}

      <div className="plans-header">
        <div className="area-selector">
          <label>Bereich:</label>
          <select value={selectedAreaId} onChange={e => setSelectedAreaId(e.target.value)}>
            {areas.map(area => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditingPlan(null);
            setShowModal(true);
          }}
        >
          <Plus size={18} /> Neuer Plan
        </button>
      </div>

      <div className="plans-list">
        {plans.length === 0 ? (
          <p className="empty-state">Noch keine Reinigungspläne erstellt.</p>
        ) : (
          plans.map(plan => (
            <div key={plan.id} className="plan-card">
              <div className="plan-header">
                <div className="plan-title">
                  <h3>{plan.name}</h3>
                  <span className="area-badge">{getAreaName(plan.area_id)}</span>
                </div>
                <div className="plan-status">
                  {plan.approved_by_admin && plan.approved_by_customer ? (
                    <span className="badge signed">✓ Unterschrieben</span>
                  ) : (
                    <span className="badge unsigned">⚠ Unterschrift ausstehend</span>
                  )}
                </div>
              </div>

              <div className="plan-details">
                {plan.description && <p className="description">{plan.description}</p>}
                <div className="plan-meta">
                  <span>Häufigkeit: {plan.frequency}</span>
                  <span>Schritte: {plan.steps?.length || 0}</span>
                </div>
              </div>

              <div className="plan-actions">
                {/* Admin-Unterschrift Button */}
                {!plan.approved_by_admin && (
                  <button
                    className="btn-secondary"
                    onClick={() => handleAdminApproval(plan.id)}
                    style={{ marginRight: '8px', fontSize: '12px', padding: '4px 8px' }}
                  >
                    Admin ✓
                  </button>
                )}

                {/* Kunden-Unterschrift Button */}
                {!plan.approved_by_customer && plan.approved_by_admin && (
                  <button
                    className="btn-secondary"
                    onClick={() => handleCustomerApproval(plan.id)}
                    style={{ marginRight: '8px', fontSize: '12px', padding: '4px 8px' }}
                  >
                    Kunde ✓
                  </button>
                )}

                <button
                  className="btn-icon"
                  onClick={() => {
                    setEditingPlan(plan);
                    setShowModal(true);
                  }}
                  disabled={plan.approved_by_admin && plan.approved_by_customer}
                >
                  <Edit2 size={18} />
                </button>
                <button
                  className="btn-icon delete"
                  onClick={() => handleDeletePlan(plan.id)}
                  disabled={plan.approved_by_admin || plan.approved_by_customer}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <PlanModal
          onClose={() => {
            setShowModal(false);
            setEditingPlan(null);
          }}
          onSave={handleSavePlan}
          existingPlan={editingPlan}
          areas={areas}
          selectedAreaId={selectedAreaId}
        />
      )}
    </div>
  );
}

export default PlansTab;
