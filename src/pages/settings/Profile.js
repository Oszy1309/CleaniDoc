import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Camera, Save, Edit3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './Profile.css';

function Profile() {
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    role: '',
    avatar_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Versuche Profil aus workers oder users Tabelle zu laden
        const { data: workerData } = await supabase
          .from('workers')
          .select('*')
          .eq('email', user.email)
          .single();

        if (workerData) {
          setProfile({
            first_name: workerData.first_name || '',
            last_name: workerData.last_name || '',
            email: workerData.email || user.email,
            phone: workerData.phone || '',
            address: workerData.address || '',
            role: workerData.role || 'worker',
            avatar_url: workerData.avatar_url || '',
          });
        } else {
          // Fallback für andere Benutzer
          const emailName = user.email?.split('@')[0] || 'Benutzer';
          const names = emailName.split('.');
          setProfile({
            first_name: names[0] || emailName,
            last_name: names[1] || '',
            email: user.email,
            phone: '',
            address: '',
            role: 'user',
            avatar_url: '',
          });
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden des Profils:', error);
      setMessage('Fehler beim Laden des Profils');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async e => {
    e.preventDefault();
    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Versuche Profil in workers Tabelle zu aktualisieren
        const { error } = await supabase
          .from('workers')
          .update({
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone,
            address: profile.address,
          })
          .eq('email', user.email);

        if (error) {
          throw error;
        }

        setMessage('Profil erfolgreich aktualisiert');
        setIsEditing(false);

        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setMessage('Fehler beim Speichern des Profils');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getUserInitials = () => {
    const first = profile.first_name?.charAt(0)?.toUpperCase() || '';
    const last = profile.last_name?.charAt(0)?.toUpperCase() || '';
    return first + last || profile.email?.charAt(0)?.toUpperCase() || '?';
  };

  const getRoleDisplayName = role => {
    const roleMap = {
      admin: 'Administrator',
      manager: 'Manager',
      worker: 'Mitarbeiter',
      supervisor: 'Supervisor',
      user: 'Benutzer',
    };
    return roleMap[role] || 'Benutzer';
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Profil wird geladen...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Mein Profil</h1>
        <p>Verwalten Sie Ihre persönlichen Informationen und Einstellungen</p>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profilbild" />
              ) : (
                <span className="avatar-initials">{getUserInitials()}</span>
              )}
              <button className="avatar-edit-btn" title="Profilbild ändern">
                <Camera size={16} />
              </button>
            </div>
            <div className="profile-info">
              <h2>
                {profile.first_name} {profile.last_name}
              </h2>
              <p className="profile-email">{profile.email}</p>
              <span className={`role-badge role-${profile.role}`}>
                {getRoleDisplayName(profile.role)}
              </span>
            </div>
          </div>

          {message && (
            <div className={`message ${message.includes('Fehler') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSave} className="profile-form">
            <div className="form-section">
              <div className="section-header">
                <h3>Persönliche Informationen</h3>
                <button
                  type="button"
                  className="edit-toggle-btn"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit3 size={16} />
                  {isEditing ? 'Abbrechen' : 'Bearbeiten'}
                </button>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="first_name">
                    <User size={16} />
                    Vorname
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    value={profile.first_name}
                    onChange={e => handleInputChange('first_name', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Ihr Vorname"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="last_name">
                    <User size={16} />
                    Nachname
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    value={profile.last_name}
                    onChange={e => handleInputChange('last_name', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Ihr Nachname"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">
                    <Mail size={16} />
                    E-Mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="readonly"
                  />
                  <small>E-Mail-Adresse kann nicht geändert werden</small>
                </div>

                <div className="form-group">
                  <label htmlFor="phone">
                    <Phone size={16} />
                    Telefonnummer
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={e => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Ihre Telefonnummer"
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="address">
                    <MapPin size={16} />
                    Adresse
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={profile.address}
                    onChange={e => handleInputChange('address', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Ihre Adresse"
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={saving}>
                  <Save size={16} />
                  {saving ? 'Speichert...' : 'Änderungen speichern'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
