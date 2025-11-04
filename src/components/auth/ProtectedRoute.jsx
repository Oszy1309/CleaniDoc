/**
 * ProtectedRoute - Role-Based Access Control
 * Wraps components that require authentication and specific roles
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function ProtectedRoute({ children, requiredRoles, fallback = null }) {
  const { user, role, loading, isAuthenticated } = useAuth();

  // Still loading
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check role requirement
  if (requiredRoles) {
    const hasRequiredRole = Array.isArray(requiredRoles)
      ? requiredRoles.includes(role)
      : role === requiredRoles;

    if (!hasRequiredRole) {
      return fallback || <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
