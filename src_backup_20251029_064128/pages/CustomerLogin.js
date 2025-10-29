import React, { useState } from 'react';
import { supabase } from '../App';
import PasswordReset from '../components/PasswordReset';
import './CustomerLogin.css';

function CustomerLogin({ setUser }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) throw error;

      // Check if user is a customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (customerError || !customerData) {
        await supabase.auth.signOut();
        throw new Error('Dieser Account ist kein Kundenkonto');
      }

      // Set customer flag
      setUser({
        ...data.user,
        isCustomer: true,
        customerData: customerData
      });

    } catch (error) {
      console.error('Customer Login Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (showPasswordReset) {
    return (
      <PasswordReset
        onBack={() => setShowPasswordReset(false)}
        userType="customer"
      />
    );
  }

  return (
    <div className="customer-login-container">
      <div className="customer-login-card">
        <div className="login-header">
          <h1>Kundenportal</h1>
          <p>Melden Sie sich an, um Ihre Reinigungsprotokolle einzusehen</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">E-Mail</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Passwort</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>

          <div className="forgot-password">
            <button
              type="button"
              onClick={() => setShowPasswordReset(true)}
              className="forgot-password-link"
            >
              Passwort vergessen?
            </button>
          </div>
        </form>

        <div className="login-links">
          <a href="/">Admin Login</a>
          <a href="/worker-login">Mitarbeiter Login</a>
        </div>
      </div>
    </div>
  );
}

export default CustomerLogin;