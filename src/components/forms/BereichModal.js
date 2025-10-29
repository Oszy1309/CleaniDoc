import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './BereichModal.css';

const BEREICH_VORLAGEN = [
  { name: 'Hygieneschleuse', type: 'hygiene' },
  { name: 'Produktionshalle 1', type: 'production_hall' },
  { name: 'Produktionshalle 2', type: 'production_hall' },
  { name: 'Küche', type: 'kitchen' },
  { name: 'Kühlhaus 1', type: 'cooling' },
  { name: 'Kühlhaus 2', type: 'cooling' },
  { name: 'Trockenlager', type: 'storage' },
  { name: 'Verpackungslinie', type: 'other' },
  { name: 'Sozialräume', type: 'other' },
  { name: 'Lagerbereich', type: 'storage' },
];

function BereichModal({ onClose, onSave, existingArea }) {
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [customAreaName, setCustomAreaName] = useState('');
  const [description, setDescription] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    if (existingArea) {
      setDescription(existingArea.description || '');
    }
  }, [existingArea]);

  const handleTemplateToggle = template => {
    if (existingArea) return; // Im Edit-Modus nur Beschreibung änderbar

    setSelectedAreas(prev => {
      const exists = prev.find(a => a.name === template.name && a.isTemplate);
      if (exists) {
        return prev.filter(a => !(a.name === template.name && a.isTemplate));
      } else {
        return [...prev, { name: template.name, isTemplate: true, type: template.type }];
      }
    });
  };

  const handleAddCustom = () => {
    if (customAreaName.trim()) {
      setSelectedAreas(prev => [
        ...prev,
        { name: customAreaName.trim(), isTemplate: false, type: 'other' },
      ]);
      setCustomAreaName('');
      setShowCustomInput(false);
    }
  };

  const handleRemoveArea = index => {
    setSelectedAreas(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (existingArea) {
      // Edit-Modus: nur Beschreibung speichern
      onSave({
        name: existingArea.name,
        description,
        area_type: existingArea.area_type,
      });
    } else {
      // Neu-Modus: alle ausgewählten Bereiche speichern
      if (selectedAreas.length === 0) {
        alert('Bitte wähle mindestens einen Bereich aus');
        return;
      }

      selectedAreas.forEach(area => {
        onSave({
          name: area.name,
          description: '',
          area_type: area.type,
        });
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existingArea ? 'Bereich bearbeiten' : 'Bereiche erstellen'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {existingArea ? (
            // Edit-Modus
            <>
              <h3>{existingArea.name}</h3>
              <div className="form-group">
                <label>Beschreibung / Besonderheiten</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="z.B. Besondere Reinigungsmittel erforderlich..."
                  rows={4}
                />
              </div>
            </>
          ) : (
            // Neu-Modus
            <>
              <div className="templates-section">
                <h3>Vordefinierte Bereiche</h3>
                <div className="templates-grid">
                  {BEREICH_VORLAGEN.map(template => (
                    <button
                      key={template.name}
                      className={`template-btn ${
                        selectedAreas.some(a => a.name === template.name && a.isTemplate)
                          ? 'selected'
                          : ''
                      }`}
                      onClick={() => handleTemplateToggle(template)}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="custom-section">
                <h3>Eigene Bereiche</h3>
                {showCustomInput ? (
                  <div className="custom-input-group">
                    <input
                      type="text"
                      value={customAreaName}
                      onChange={e => setCustomAreaName(e.target.value)}
                      placeholder="Name des Bereichs"
                      autoFocus
                    />
                    <button
                      className="btn-add"
                      onClick={handleAddCustom}
                      disabled={!customAreaName.trim()}
                    >
                      Hinzufügen
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={() => {
                        setShowCustomInput(false);
                        setCustomAreaName('');
                      }}
                    >
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <button className="btn-add-custom" onClick={() => setShowCustomInput(true)}>
                    + Eigener Bereich
                  </button>
                )}
              </div>

              {selectedAreas.length > 0 && (
                <div className="selected-areas">
                  <h3>Ausgewählte Bereiche ({selectedAreas.length})</h3>
                  <ul>
                    {selectedAreas.map((area, index) => (
                      <li key={index}>
                        <span>{area.name}</span>
                        <button className="remove-btn" onClick={() => handleRemoveArea(index)}>
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {existingArea ? 'Speichern' : 'Bereiche erstellen'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BereichModal;
