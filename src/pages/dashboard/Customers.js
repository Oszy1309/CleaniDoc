import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2 } from 'lucide-react';
import './Customers.css';

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    contact_person: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async e => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('customers').insert([formData]);

      if (error) throw error;
      setFormData({ name: '', email: '', phone: '', address: '', contact_person: '' });
      setShowForm(false);
      fetchCustomers();
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Kunden:', error);
    }
  };

  const handleDeleteCustomer = async id => {
    if (window.confirm('Kundendaten wirklich löschen?')) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', id);

        if (error) throw error;
        fetchCustomers();
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
      }
    }
  };

  if (loading) {
    return <div className="loading">Lädt Kunden...</div>;
  }

  return (
    <div className="customers-page">
      <div className="page-header">
        <h1>Kunden</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> Neuer Kunde
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <form onSubmit={handleAddCustomer}>
            <input
              type="text"
              placeholder="Kundenname"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
              style={{ width: '100%', marginBottom: '1rem' }}
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              style={{ width: '100%', marginBottom: '1rem' }}
            />
            <div className="form-row">
              <input
                type="tel"
                placeholder="Telefon"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
              <input
                type="text"
                placeholder="Kontaktperson"
                value={formData.contact_person}
                onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </div>
            <input
              type="text"
              placeholder="Adresse"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              style={{ width: '100%', marginBottom: '1rem' }}
            />
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Speichern
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="customers-list">
        {customers.length === 0 ? (
          <p className="empty-state">Noch keine Kunden hinzugefügt.</p>
        ) : (
          customers.map(customer => (
            <div key={customer.id} className="customer-card">
              <div
                className="customer-info"
                onClick={() => navigate(`/customers/${customer.id}`)}
                style={{ cursor: 'pointer', flex: 1 }}
              >
                <h3>{customer.name}</h3>
                {customer.contact_person && <p>{customer.contact_person}</p>}
                {customer.email && <p>{customer.email}</p>}
                {customer.phone && <p>{customer.phone}</p>}
              </div>
              <div className="customer-actions">
                <button
                  className="btn-icon delete"
                  onClick={() => handleDeleteCustomer(customer.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Customers;
