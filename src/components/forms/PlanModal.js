import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import './PlanModal.css';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: '3_times_weekly', label: '3x pro Woche' },
  { value: '2_times_weekly', label: '2x pro Woche' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'as_needed', label: 'Nach Bedarf' },
];

const DAY_OPTIONS = [
  { value: 'monday', label: 'Montag' },
  { value: 'tuesday', label: 'Dienstag' },
  { value: 'wednesday', label: 'Mittwoch' },
  { value: 'thursday', label: 'Donnerstag' },
  { value: 'friday', label: 'Freitag' },
  { value: 'saturday', label: 'Samstag' },
  { value: 'sunday', label: 'Sonntag' },
];

const EQUIPMENT_OPTIONS = [
  'Handfeger',
  'Besen',
  'Staubsauger',
  'Kehrmaschine',
  'Schrubsauger',
  'Lappen',
  'Mikrofasertuch',
  'Kompressor',
  'Dosierpistole',
  'Sprühflasche',
];

const CLEANING_AGENT_OPTIONS = [
  { value: 'none', label: 'Ohne' },
  { value: 'water_only', label: 'Nur Wasser' },
  { value: 'fm_plus', label: 'FM-Plus Gemisch' },
  { value: 'floor_ultra', label: 'Floor-Ultra Gemisch' },
  { value: 'k_dis', label: 'K-Dis Gemisch' },
];

const DEFAULT_STEPS = [
  {
    step_number: 1,
    step_name: 'Grobreinigung',
    cleaning_agent: 'none',
    dwell_time_minutes: 0,
    equipment: [],
  },
  {
    step_number: 2,
    step_name: 'Vorreinigung',
    cleaning_agent: 'water_only',
    dwell_time_minutes: 5,
    equipment: ['Lappen'],
  },
  {
    step_number: 3,
    step_name: 'Hauptreinigung (FM Plus)',
    cleaning_agent: 'fm_plus',
    dwell_time_minutes: 5,
    equipment: ['Mikrofasertuch'],
  },
  {
    step_number: 4,
    step_name: 'Bodenreinigung (Floor Ultra)',
    cleaning_agent: 'floor_ultra',
    dwell_time_minutes: 0,
    equipment: ['Lappen'],
  },
  {
    step_number: 5,
    step_name: 'Desinfektion (K Dis)',
    cleaning_agent: 'k_dis',
    dwell_time_minutes: 0,
    equipment: ['Mikrofasertuch'],
  },
];

function PlanModal({ onClose, onSave, existingPlan, areas, selectedAreaId }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: 'daily',
    day_of_week: [],
  });
  const [steps, setSteps] = useState(DEFAULT_STEPS);
  const [expandedStep, setExpandedStep] = useState(0);

  useEffect(() => {
    if (existingPlan) {
      setFormData({
        name: existingPlan.name || '',
        description: existingPlan.description || '',
        frequency: existingPlan.frequency || 'daily',
        day_of_week: existingPlan.day_of_week ? existingPlan.day_of_week.split(',') : [],
      });

      // Steps aus existingPlan laden (sie werden von PlansTab mitgebracht)
      if (existingPlan.steps && existingPlan.steps.length > 0) {
        setSteps(
          existingPlan.steps.map(step => ({
            step_number: step.step_number,
            step_name: step.step_name,
            cleaning_agent: step.cleaning_agent || 'none',
            dwell_time_minutes: step.dwell_time_minutes,
            equipment: step.description ? step.description.split(', ') : [],
          }))
        );
      }
    }
  }, [existingPlan]);

  const handleDayToggle = day => {
    setFormData(prev => {
      const days = prev.day_of_week.includes(day)
        ? prev.day_of_week.filter(d => d !== day)
        : [...prev.day_of_week, day];
      return { ...prev, day_of_week: days };
    });
  };

  const handleStepChange = (index, field, value) => {
    setSteps(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleEquipmentToggle = (stepIndex, equipment) => {
    setSteps(prev => {
      const updated = [...prev];
      const newStep = { ...updated[stepIndex] };
      const currentEquipment = Array.isArray(newStep.equipment) ? [...newStep.equipment] : [];

      if (currentEquipment.includes(equipment)) {
        newStep.equipment = currentEquipment.filter(e => e !== equipment);
      } else {
        newStep.equipment = [...currentEquipment, equipment];
      }

      updated[stepIndex] = newStep;
      return updated;
    });
  };

  const handleAddStep = () => {
    const newStep = {
      step_number: steps.length + 1,
      step_name: 'Neuer Schritt',
      method: 'other',
      dwell_time_minutes: 0,
      equipment: [],
    };
    setSteps([...steps, newStep]);
    setExpandedStep(steps.length);
  };

  const handleDeleteStep = index => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Bitte gib einen Namen für den Plan ein');
      return;
    }

    if (formData.frequency === 'daily' && formData.day_of_week.length === 0) {
      alert('Bitte wähle mindestens einen Wochentag');
      return;
    }

    if (steps.length === 0) {
      alert('Bitte füge mindestens einen Reinigungsschritt hinzu');
      return;
    }

    const dataToSave = {
      ...formData,
      day_of_week: formData.day_of_week.join(','),
      steps: steps.map(step => ({
        ...step,
        cleaning_agent: step.cleaning_agent || 'none',
      })),
    };

    onSave(dataToSave);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existingPlan ? 'Plan bearbeiten' : 'Neuer Reinigungsplan'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {/* PLAN BASICS */}
          <div className="section-header">Plan-Grunddaten</div>

          <div className="form-group">
            <label>Plan Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="z.B. Tägliche Produktionshallen-Reinigung"
            />
          </div>

          <div className="form-group">
            <label>Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Besonderheiten, Anmerkungen..."
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Häufigkeit *</label>
            <select
              value={formData.frequency}
              onChange={e => setFormData({ ...formData, frequency: e.target.value })}
            >
              {FREQUENCY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {formData.frequency === 'daily' && (
            <div className="form-group">
              <label>Wochentage *</label>
              <div className="day-selector">
                {DAY_OPTIONS.map(day => (
                  <button
                    key={day.value}
                    className={`day-btn ${formData.day_of_week.includes(day.value) ? 'selected' : ''}`}
                    onClick={() => handleDayToggle(day.value)}
                  >
                    {day.label.substring(0, 2).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CLEANING STEPS */}
          <div className="section-header" style={{ marginTop: '2rem' }}>
            Reinigungsschritte
          </div>

          <div className="steps-list">
            {steps.map((step, index) => (
              <div key={index} className="step-accordion">
                <button
                  className="step-header"
                  onClick={() => setExpandedStep(expandedStep === index ? -1 : index)}
                >
                  <span className="step-number">Schritt {step.step_number}</span>
                  <span className="step-name">{step.step_name}</span>
                  {expandedStep === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {expandedStep === index && (
                  <div className="step-content">
                    <div className="form-group">
                      <label>Schritt Name</label>
                      <input
                        type="text"
                        value={step.step_name}
                        onChange={e => handleStepChange(index, 'step_name', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Benötigte Geräte</label>
                      <div className="equipment-selector">
                        {EQUIPMENT_OPTIONS.map(equipment => (
                          <button
                            key={equipment}
                            className={`equipment-btn ${
                              (step.equipment || []).includes(equipment) ? 'selected' : ''
                            }`}
                            onClick={() => handleEquipmentToggle(index, equipment)}
                          >
                            {equipment}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Reinigungsmittel</label>
                      <select
                        value={step.cleaning_agent || 'none'}
                        onChange={e => handleStepChange(index, 'cleaning_agent', e.target.value)}
                      >
                        {CLEANING_AGENT_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Einwirkzeit (Minuten)</label>
                      <input
                        type="number"
                        value={step.dwell_time_minutes}
                        onChange={e =>
                          handleStepChange(index, 'dwell_time_minutes', parseInt(e.target.value))
                        }
                        min="0"
                      />
                    </div>

                    {steps.length > 1 && (
                      <button className="btn-delete-step" onClick={() => handleDeleteStep(index)}>
                        <Trash2 size={16} /> Schritt löschen
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button className="btn-add-step" onClick={handleAddStep}>
            <Plus size={18} /> Schritt hinzufügen
          </button>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {existingPlan ? 'Speichern' : 'Plan erstellen'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PlanModal;
