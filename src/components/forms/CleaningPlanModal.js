import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, Minus, Save, AlertTriangle } from 'lucide-react';
import './CleaningPlanModal.css';

function CleaningPlanModal({ plan, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    estimated_duration: '',
    difficulty_level: 'medium',
    required_tools: [],
    checklist: [],
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        category: plan.category || '',
        estimated_duration: plan.estimated_duration || '',
        difficulty_level: plan.difficulty_level || 'medium',
        required_tools: plan.required_tools || [],
        checklist: plan.checklist || [],
      });
    }
  }, [plan]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Kategorie ist erforderlich';
    }

    if (formData.checklist.length === 0) {
      newErrors.checklist = 'Mindestens ein Reinigungsschritt ist erforderlich';
    }

    if (
      formData.estimated_duration &&
      (isNaN(formData.estimated_duration) || formData.estimated_duration <= 0)
    ) {
      newErrors.estimated_duration = 'Dauer muss eine positive Zahl sein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSaving(true);

      const planData = {
        ...formData,
        estimated_duration: formData.estimated_duration
          ? parseInt(formData.estimated_duration)
          : null,
      };

      if (plan) {
        // Update existing plan
        const { error } = await supabase.from('cleaning_plans').update(planData).eq('id', plan.id);

        if (error) throw error;
      } else {
        // Create new plan
        const { error } = await supabase.from('cleaning_plans').insert([planData]);

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const addChecklistItem = () => {
    setFormData(prev => ({
      ...prev,
      checklist: [
        ...prev.checklist,
        {
          step: '',
          agent: '',
          dwell_time: '',
          notes: '',
        },
      ],
    }));
  };

  const removeChecklistItem = index => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index),
    }));
  };

  const updateChecklistItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addTool = () => {
    const newTool = prompt('Neues Werkzeug hinzufügen:');
    if (newTool && newTool.trim()) {
      setFormData(prev => ({
        ...prev,
        required_tools: [...prev.required_tools, newTool.trim()],
      }));
    }
  };

  const removeTool = index => {
    setFormData(prev => ({
      ...prev,
      required_tools: prev.required_tools.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container cleaning-plan-modal">
        <div className="modal-header">
          <h2>{plan ? 'Reinigungsplan bearbeiten' : 'Neuer Reinigungsplan'}</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <h3>Grundinformationen</h3>

            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder="z.B. Büro-Standardreinigung"
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="description">Beschreibung</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                placeholder="Beschreiben Sie den Zweck und Umfang dieses Reinigungsplans..."
                rows="3"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Kategorie *</label>
                <input
                  id="category"
                  type="text"
                  value={formData.category}
                  onChange={e => handleInputChange('category', e.target.value)}
                  placeholder="z.B. Büro, Küche, Bad"
                  className={errors.category ? 'error' : ''}
                />
                {errors.category && <span className="error-message">{errors.category}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="duration">Geschätzte Dauer (Minuten)</label>
                <input
                  id="duration"
                  type="number"
                  value={formData.estimated_duration}
                  onChange={e => handleInputChange('estimated_duration', e.target.value)}
                  placeholder="z.B. 30"
                  min="1"
                  className={errors.estimated_duration ? 'error' : ''}
                />
                {errors.estimated_duration && (
                  <span className="error-message">{errors.estimated_duration}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="difficulty">Schwierigkeitsgrad</label>
                <select
                  id="difficulty"
                  value={formData.difficulty_level}
                  onChange={e => handleInputChange('difficulty_level', e.target.value)}
                >
                  <option value="easy">Einfach</option>
                  <option value="medium">Mittel</option>
                  <option value="hard">Schwer</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Benötigte Werkzeuge</h3>
            <div className="tools-section">
              <div className="tools-list">
                {formData.required_tools.map((tool, index) => (
                  <div key={index} className="tool-item">
                    <span>{tool}</span>
                    <button
                      type="button"
                      onClick={() => removeTool(index)}
                      className="btn-remove-tool"
                    >
                      <Minus size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addTool} className="btn-add-tool">
                <Plus size={16} /> Werkzeug hinzufügen
              </button>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h3>Reinigungsschritte *</h3>
              <button type="button" onClick={addChecklistItem} className="btn-add-step">
                <Plus size={16} /> Schritt hinzufügen
              </button>
            </div>

            {errors.checklist && (
              <div className="error-message">
                <AlertTriangle size={16} />
                {errors.checklist}
              </div>
            )}

            <div className="checklist-items">
              {formData.checklist.map((item, index) => (
                <div key={index} className="checklist-item">
                  <div className="item-header">
                    <span className="step-number">Schritt {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(index)}
                      className="btn-remove-step"
                    >
                      <Minus size={16} />
                    </button>
                  </div>

                  <div className="item-fields">
                    <div className="form-group">
                      <label>Arbeitsschritt *</label>
                      <input
                        type="text"
                        value={item.step}
                        onChange={e => updateChecklistItem(index, 'step', e.target.value)}
                        placeholder="z.B. Schreibtisch abwischen"
                        required
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Reinigungsmittel</label>
                        <input
                          type="text"
                          value={item.agent}
                          onChange={e => updateChecklistItem(index, 'agent', e.target.value)}
                          placeholder="z.B. Allzweckreiniger"
                        />
                      </div>

                      <div className="form-group">
                        <label>Einwirkzeit (Min)</label>
                        <input
                          type="number"
                          value={item.dwell_time}
                          onChange={e => updateChecklistItem(index, 'dwell_time', e.target.value)}
                          placeholder="z.B. 2"
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Hinweise</label>
                      <textarea
                        value={item.notes}
                        onChange={e => updateChecklistItem(index, 'notes', e.target.value)}
                        placeholder="Besondere Hinweise oder Anweisungen..."
                        rows="2"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {formData.checklist.length === 0 && (
                <div className="empty-checklist">
                  <p>Noch keine Reinigungsschritte definiert.</p>
                  <button type="button" onClick={addChecklistItem} className="btn-primary">
                    <Plus size={16} /> Ersten Schritt hinzufügen
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
              Abbrechen
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? 'Speichert...' : plan ? 'Änderungen speichern' : 'Plan erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CleaningPlanModal;
