/**
 * useRBAC Hook
 * Verwaltet Rollen-basierte Zugriffskontrolle und Berechtigungen
 * Integriert mit Supabase RLS Policies
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

export function useRBAC() {
  const { user, role } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userScope, setUserScope] = useState(null);

  /**
   * Lade Berechtigungen basierend auf Rolle
   */
  useEffect(() => {
    if (!user || !role) {
      setLoading(false);
      return;
    }

    const loadPermissions = async () => {
      try {
        // Hole Rolle mit Berechtigungen
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select(
            `
            id,
            name,
            role_permissions (
              permission_id,
              scope,
              permissions (
                resource,
                action
              )
            )
          `
          )
          .eq('name', role)
          .single();

        if (roleError) throw roleError;

        // Strukturiere Berechtigungen für schnelle Lookups
        const permsMap = (roleData?.role_permissions || []).map(rp => ({
          resource: rp.permissions.resource,
          action: rp.permissions.action,
          scope: rp.scope,
        }));

        setPermissions(permsMap);

        // Hole User-Scope (Location, Team, etc.)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('location_id, team_id')
          .eq('id', user.id)
          .single();

        if (!userError && userData) {
          setUserScope({
            locationId: userData.location_id,
            teamId: userData.team_id,
          });
        }
      } catch (error) {
        console.error('❌ Fehler beim Laden von Berechtigungen:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [user, role]);

  /**
   * Prüfe ob User eine spezifische Berechtigung hat
   * @param {string} resource - z.B. 'shifts', 'tasks'
   * @param {string} action - z.B. 'read', 'create', 'update', 'delete'
   * @returns {boolean}
   */
  const hasPermission = useCallback(
    (resource, action) => {
      return permissions.some(
        p => p.resource === resource && p.action === action
      );
    },
    [permissions]
  );

  /**
   * Prüfe ob User eine Berechtigung mit bestimmtem Scope hat
   * @param {string} resource
   * @param {string} action
   * @param {string} scope - 'all', 'own', 'team', 'location', 'contract'
   * @returns {boolean}
   */
  const hasPermissionWithScope = useCallback(
    (resource, action, requiredScope = null) => {
      const perm = permissions.find(
        p => p.resource === resource && p.action === action
      );

      if (!perm) return false;

      // Wenn keine Scope-Anforderung, ok
      if (!requiredScope) return true;

      // Prüfe ob Scope passt
      if (perm.scope === 'all') return true;
      if (perm.scope === requiredScope) return true;

      return false;
    },
    [permissions]
  );

  /**
   * Hole alle Berechtigungen für eine Resource
   * @param {string} resource
   * @returns {array} - Array of {action, scope}
   */
  const getResourcePermissions = useCallback(
    resource => {
      return permissions.filter(p => p.resource === resource);
    },
    [permissions]
  );

  /**
   * RBAC Shortcuts für häufige Checks
   */
  const can = {
    // Shifts
    viewShifts: () => hasPermission('shifts', 'read'),
    createShifts: () => hasPermission('shifts', 'create'),
    updateShifts: () => hasPermission('shifts', 'update'),
    signShifts: () => hasPermission('shifts', 'sign'),
    approveShifts: () => hasPermission('shifts', 'approve'),

    // Tasks
    viewTasks: () => hasPermission('tasks', 'read'),
    createTasks: () => hasPermission('tasks', 'create'),
    updateTasks: () => hasPermission('tasks', 'update'),
    signTasks: () => hasPermission('tasks', 'sign'),

    // Reports
    viewReports: () => hasPermission('reports', 'read'),
    createReports: () => hasPermission('reports', 'create'),
    exportReports: () => hasPermission('reports', 'export'),

    // Users
    viewUsers: () => hasPermission('users', 'read'),
    manageUsers: () => hasPermission('users', 'create'),

    // Incidents
    reportIncidents: () => hasPermission('incidents', 'create'),
    viewIncidents: () => hasPermission('incidents', 'read'),

    // Documents
    viewDocuments: () => hasPermission('documents', 'read'),
  };

  return {
    user,
    role,
    loading,
    permissions,
    userScope,
    hasPermission,
    hasPermissionWithScope,
    getResourcePermissions,
    can,
  };
}

/**
 * HOC: Wrapper für Komponenten die Berechtigung prüfen
 * Zeigt Fallback wenn Nutzer keine Berechtigung hat
 */
export function withRBAC(Component, requiredResource, requiredAction) {
  return function ProtectedComponent(props) {
    const { hasPermission, loading } = useRBAC();

    if (loading) {
      return <div className="rbac-loading">Berechtigungen werden geprüft...</div>;
    }

    if (!hasPermission(requiredResource, requiredAction)) {
      return (
        <div className="rbac-unauthorized">
          <h3>Zugriff verweigert</h3>
          <p>Sie haben keine Berechtigung für diese Aktion.</p>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

/**
 * Context Provider für RBAC (optional, für global usage)
 */
import { createContext, useContext } from 'react';

const RBACContext = createContext(null);

export function RBACProvider({ children }) {
  const rbac = useRBAC();

  return (
    <RBACContext.Provider value={rbac}>
      {children}
    </RBACContext.Provider>
  );
}

export function useRBACContext() {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBACContext muss innerhalb RBACProvider verwendet werden');
  }
  return context;
}
