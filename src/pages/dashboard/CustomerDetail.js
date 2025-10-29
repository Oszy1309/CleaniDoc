import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react';
import BereichModal from '../../components/forms/BereichModal';
import PlansTab from '../../components/features/PlansTab';
import './CustomerDetail.css';

function CustomerDetail() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [showBereichModal, setShowBereichModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);

  const fetchCustomerAndAreas = useCallback(async () => {
    try {
      // Kunde laden
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Bereiche laden
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true });

      if (areasError) throw areasError;
      setAreas(areasData || []);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomerAndAreas();
  }, [fetchCustomerAndAreas]);

  const handleDeleteArea = async areaId => {
    if (window.confirm('Bereich wirklich löschen?')) {
      try {
        const { error } = await supabase.from('areas').delete().eq('id', areaId);

        if (error) throw error;
        fetchCustomerAndAreas();
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
      }
    }
  };

  const handleSaveArea = async areaData => {
    try {
      if (editingArea) {
        // Update
        const { error } = await supabase.from('areas').update(areaData).eq('id', editingArea.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('areas')
          .insert([{ ...areaData, customer_id: customerId }]);

        if (error) throw error;
      }
      setEditingArea(null);
      setShowBereichModal(false);
      fetchCustomerAndAreas();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    }
  };

  if (loading) {
    return <div className="loading">Lädt...</div>;
  }

  if (!customer) {
    return <div>Kunde nicht gefunden</div>;
  }

  return (
    <div className="customer-detail">
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/customers')}>
          <ArrowLeft size={20} /> Zurück
        </button>
        <h1>{customer.name}</h1>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Informationen
        </button>
        <button
          className={`tab ${activeTab === 'areas' ? 'active' : ''}`}
          onClick={() => setActiveTab('areas')}
        >
          Bereiche ({areas.length})
        </button>
        <button
          className={`tab ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          Reinigungspläne
        </button>
      </div>

      {activeTab === 'info' && (
        <div className="tab-content">
          <div className="info-card">
            {customer.contact_person && (
              <div className="info-row">
                <span className="label">Kontaktperson:</span>
                <span>{customer.contact_person}</span>
              </div>
            )}
            {customer.email && (
              <div className="info-row">
                <span className="label">Email:</span>
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="info-row">
                <span className="label">Telefon:</span>
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.address && (
              <div className="info-row">
                <span className="label">Adresse:</span>
                <span>{customer.address}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'areas' && (
        <div className="tab-content">
          {areas.length === 0 ? (
            <div className="empty-state">
              <p>Keine Bereiche zugewiesen</p>
              <button
                className="btn-primary"
                onClick={() => {
                  setEditingArea(null);
                  setShowBereichModal(true);
                }}
              >
                <Plus size={18} /> Bereiche erstellen
              </button>
            </div>
          ) : (
            <>
              <button
                className="btn-primary"
                onClick={() => {
                  setEditingArea(null);
                  setShowBereichModal(true);
                }}
                style={{ marginBottom: '1.5rem' }}
              >
                <Plus size={18} /> Bereich hinzufügen
              </button>

              <div className="areas-list">
                {areas.map(area => (
                  <div key={area.id} className="area-card">
                    <div className="area-info">
                      <h3>{area.name}</h3>
                      {area.description && <p className="description">{area.description}</p>}
                    </div>
                    <div className="area-actions">
                      <button
                        className="btn-icon"
                        onClick={() => {
                          setEditingArea(area);
                          setShowBereichModal(true);
                        }}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDeleteArea(area.id)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="tab-content">
          <PlansTab customerId={customerId} areas={areas} />
        </div>
      )}

      {showBereichModal && (
        <BereichModal
          onClose={() => {
            setShowBereichModal(false);
            setEditingArea(null);
          }}
          onSave={handleSaveArea}
          existingArea={editingArea}
        />
      )}
    </div>
  );
}

export default CustomerDetail;
