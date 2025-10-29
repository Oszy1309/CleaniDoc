import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../App';
import { Plus, Edit2, Trash2, Copy, FileText, CheckCircle, Clock, Users } from 'lucide-react';
import CleaningPlanModal from '../components/CleaningPlanModal';
import CleaningPlanDetail from '../components/CleaningPlanDetail';
import './CleaningPlans.css';

function CleaningPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'detail'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cleaning_plans')
        .select(`
          *,
          cleaning_logs!cleaning_plan_id(id, status),
          customers(id, name)
        `)
        .order(sortBy, { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Reinigungspläne:', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setShowModal(true);
  };

  const handleEditPlan = (plan) => {
    setSelectedPlan(plan);
    setShowModal(true);
  };

  const handleViewPlan = (plan) => {
    setSelectedPlan(plan);
    setViewMode('detail');
  };

  const handleDuplicatePlan = async (plan) => {
    try {
      const newPlan = {
        name: `${plan.name} (Kopie)`,
        description: plan.description,
        checklist: plan.checklist,
        category: plan.category,
        estimated_duration: plan.estimated_duration,
        difficulty_level: plan.difficulty_level,
        required_tools: plan.required_tools
      };

      const { error } = await supabase
        .from('cleaning_plans')
        .insert([newPlan]);

      if (error) throw error;
      await fetchPlans();
    } catch (error) {
      console.error('Fehler beim Duplizieren:', error);
      alert('Fehler beim Duplizieren: ' + error.message);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Reinigungsplan wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('cleaning_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      await fetchPlans();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert('Fehler beim Löschen: ' + error.message);
    }
  };

  const filteredPlans = plans.filter(plan => {
    const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || plan.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatsForPlan = (plan) => {
    const logs = plan.cleaning_logs || [];
    return {
      totalUsage: logs.length,
      completedUsage: logs.filter(log => log.status === 'completed').length,
      inProgressUsage: logs.filter(log => log.status === 'in_progress').length
    };
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'easy': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getDifficultyLabel = (level) => {
    switch (level) {
      case 'easy': return 'Einfach';
      case 'medium': return 'Mittel';
      case 'hard': return 'Schwer';
      default: return 'Unbekannt';
    }
  };

  const categories = [...new Set(plans.map(p => p.category).filter(Boolean))];

  if (loading) {
    return <div className="loading">Lädt Reinigungspläne...</div>;
  }

  if (viewMode === 'detail' && selectedPlan) {
    return (
      <CleaningPlanDetail
        plan={selectedPlan}
        onBack={() => {
          setViewMode('grid');
          setSelectedPlan(null);
        }}
        onEdit={handleEditPlan}
        onDelete={handleDeletePlan}
        onDuplicate={handleDuplicatePlan}
      />
    );
  }

  return (
    <div className="cleaning-plans-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Reinigungspläne</h1>
          <p className="subtitle">Verwalten Sie Ihre standardisierten Reinigungsabläufe und Checklisten</p>
        </div>
        <button className="btn-primary" onClick={handleCreatePlan}>
          <Plus size={18} /> Neuer Plan
        </button>
      </div>

      <div className="controls-section">
        <div className="search-filter-controls">
          <div className="search-input">
            <input
              type="text"
              placeholder="Pläne durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-controls">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">Alle Kategorien</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">Name</option>
              <option value="category">Kategorie</option>
              <option value="estimated_duration">Dauer</option>
              <option value="difficulty_level">Schwierigkeit</option>
              <option value="created_at">Erstellungsdatum</option>
            </select>
          </div>
        </div>

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-value">{plans.length}</div>
            <div className="stat-label">Gesamt</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{categories.length}</div>
            <div className="stat-label">Kategorien</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {plans.reduce((sum, plan) => sum + (plan.cleaning_logs?.length || 0), 0)}
            </div>
            <div className="stat-label">Verwendungen</div>
          </div>
        </div>
      </div>

      <div className="plans-grid">
        {filteredPlans.map((plan) => {
          const stats = getStatsForPlan(plan);
          return (
            <div
              key={plan.id}
              className="plan-card"
              onDoubleClick={() => handleViewPlan(plan)}
              title="Doppelklick zum Anzeigen"
            >
              <div className="plan-card-header">
                <div className="plan-title">
                  <h3>{plan.name}</h3>
                  {plan.category && (
                    <span className="category-badge">{plan.category}</span>
                  )}
                </div>
                <div className="plan-actions">
                  <button
                    className="btn-icon view"
                    onClick={() => handleViewPlan(plan)}
                    title="Anzeigen"
                  >
                    <FileText size={16} />
                  </button>
                  <button
                    className="btn-icon edit"
                    onClick={() => handleEditPlan(plan)}
                    title="Bearbeiten"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon duplicate"
                    onClick={() => handleDuplicatePlan(plan)}
                    title="Duplizieren"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="btn-icon delete"
                    onClick={() => handleDeletePlan(plan.id)}
                    title="Löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="plan-info">
                {plan.description && (
                  <p className="plan-description">{plan.description}</p>
                )}

                <div className="plan-metadata">
                  {plan.estimated_duration && (
                    <div className="metadata-item">
                      <Clock size={14} />
                      <span>{plan.estimated_duration} min</span>
                    </div>
                  )}

                  {plan.difficulty_level && (
                    <div className="metadata-item">
                      <div
                        className="difficulty-indicator"
                        style={{ backgroundColor: getDifficultyColor(plan.difficulty_level) }}
                      />
                      <span>{getDifficultyLabel(plan.difficulty_level)}</span>
                    </div>
                  )}

                  {plan.checklist && (
                    <div className="metadata-item">
                      <CheckCircle size={14} />
                      <span>{plan.checklist.length} Schritte</span>
                    </div>
                  )}
                </div>

                <div className="plan-stats">
                  <div className="stat-item">
                    <span className="stat-value">{stats.totalUsage}</span>
                    <span className="stat-label">Verwendungen</span>
                  </div>
                  <div className="stat-item success">
                    <span className="stat-value">{stats.completedUsage}</span>
                    <span className="stat-label">Abgeschlossen</span>
                  </div>
                  <div className="stat-item warning">
                    <span className="stat-value">{stats.inProgressUsage}</span>
                    <span className="stat-label">Aktiv</span>
                  </div>
                </div>

                {plan.required_tools && plan.required_tools.length > 0 && (
                  <div className="required-tools">
                    <span className="tools-label">Benötigte Werkzeuge:</span>
                    <div className="tools-list">
                      {plan.required_tools.slice(0, 3).map((tool, index) => (
                        <span key={index} className="tool-badge">{tool}</span>
                      ))}
                      {plan.required_tools.length > 3 && (
                        <span className="tool-badge more">+{plan.required_tools.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredPlans.length === 0 && (
        <div className="empty-state">
          <FileText size={48} />
          <h3>Keine Reinigungspläne gefunden</h3>
          <p>
            {searchTerm || filterCategory !== 'all'
              ? 'Keine Pläne entsprechen Ihren Suchkriterien.'
              : 'Erstellen Sie Ihren ersten Reinigungsplan, um zu beginnen.'
            }
          </p>
          {!searchTerm && filterCategory === 'all' && (
            <button className="btn-primary" onClick={handleCreatePlan}>
              <Plus size={18} /> Ersten Plan erstellen
            </button>
          )}
        </div>
      )}

      {showModal && (
        <CleaningPlanModal
          plan={selectedPlan}
          onClose={() => {
            setShowModal(false);
            setSelectedPlan(null);
          }}
          onSave={fetchPlans}
        />
      )}
    </div>
  );
}

export default CleaningPlans;