import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';
import './WorkerModal.css';

function WorkerModal({ onClose, onSave, existingWorker }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    status: 'active',
  });
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomersAndAssignments();
  }, []);

  const fetchCustomersAndAssignments = async () => {
    try {
      // Hole alle Kunden
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name')
        .order('name', { ascending: true });

      if (customersError) throw customersError;
      setCustomers(customersData || []);

      // Wenn Worker existiert, lade seine zugewiesenen Kunden
      if (existingWorker) {
        setFormData({
          name: existingWorker.name || '',
          email: existingWorker.email || '',
          phone: existingWorker.phone || '',
          status: existingWorker.status || 'active',
        });

        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('worker_customers')
          .select('customer_id')
          .eq('worker_id', existingWorker.id);

        if (assignmentsError) throw assignmentsError;
        setSelectedCustomers(assignmentsData.map(a => a.customer_id));
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerToggle = customerId => {
    setSelectedCustomers(prev =>
      prev.includes(customerId) ? prev.filter(id => id !== customerId) : [...prev, customerId]
    );
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Bitte gib einen Namen ein');
      return;
    }

    if (!formData.email.trim()) {
      alert('Bitte gib eine Email ein');
      return;
    }

    // Validierung für neue Worker
    if (!existingWorker && !formData.password) {
      alert('Bitte gib ein Passwort für den neuen Arbeiter ein');
      return;
    }

    if (!existingWorker && formData.password.length < 6) {
      alert('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    // Wenn neuer Worker: Erstelle Auth-Account
    if (!existingWorker && formData.password) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          // Prüfe ob Email bereits existiert
          if (
            error.message.includes('already exists') ||
            error.message.includes('already registered')
          ) {
            throw new Error(
              'Ein Benutzer mit dieser Email-Adresse existiert bereits. Bitte verwenden Sie eine andere Email-Adresse.'
            );
          }
          throw error;
        }

        if (!data.user?.id) {
          throw new Error(
            'Benutzer-Account wurde nicht korrekt erstellt. Bitte versuchen Sie es erneut.'
          );
        }

        // Warnung über Email-Bestätigung
        const needsConfirmation = !data.session;
        if (needsConfirmation) {
          alert(
            'WICHTIG: Email-Bestätigung erforderlich!\n\nDer Arbeiter wurde erstellt, aber muss seine Email-Adresse bestätigen bevor er sich anmelden kann. Prüfen Sie die Supabase-Einstellungen um Email-Bestätigung zu deaktivieren.'
          );
        }

        const { password, ...workerData } = formData;
        onSave({
          ...workerData,
          user_id: data.user.id,
          customers: selectedCustomers,
          needsEmailConfirmation: needsConfirmation,
        });
      } catch (error) {
        console.error('Auth Error:', error);
        alert('Fehler beim Erstellen des Auth-Accounts: ' + error.message);
        return;
      }
    } else {
      onSave({
        ...formData,
        customers: selectedCustomers,
      });
    }
  };

  if (loading) {
    return <div className="loading">Lädt...</div>;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existingWorker ? 'Arbeiter bearbeiten' : 'Neuer Arbeiter'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="z.B. Max Müller"
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="max@beispiel.de"
              disabled={existingWorker}
            />
          </div>

          {!existingWorker && (
            <div className="form-group">
              <label>Passwort *</label>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          )}

          <div className="form-group">
            <label>Telefon</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+49..."
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </div>

          <div className="form-group">
            <label>Kunden zuweisen</label>
            <div className="customers-grid">
              {customers.map(customer => (
                <button
                  key={customer.id}
                  className={`customer-btn ${
                    selectedCustomers.includes(customer.id) ? 'selected' : ''
                  }`}
                  onClick={() => handleCustomerToggle(customer.id)}
                >
                  {customer.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {existingWorker ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkerModal;
