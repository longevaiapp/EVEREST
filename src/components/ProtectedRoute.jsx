// src/components/ProtectedRoute.jsx
// Componente para proteger rutas según autenticación y roles

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Componente que protege rutas requiriendo autenticación y opcionalmente roles específicos
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componente a renderizar si pasa las validaciones
 * @param {string|string[]} [props.roles] - Rol o roles permitidos (opcional)
 * @param {string} [props.redirectTo] - Ruta a la que redirigir si no tiene acceso (default: /login)
 */
// Map route roles to dashboardAccess keys
const ROLE_TO_DASHBOARD = {
  RECEPCION: 'recepcion',
  MEDICO: 'medico',
  FARMACIA: 'farmacia',
  LABORATORIO: 'laboratorio',
  ESTILISTA: 'estilista',
  HOSPITALIZACION: 'hospitalizacion',
  QUIROFANO: 'quirofano',
  ADMIN: 'admin',
  RECOLECTOR: 'crematorio',
  OPERADOR_CREMATORIO: 'crematorio',
  ENTREGA: 'crematorio',
  BANCO_SANGRE: 'banco-sangre',
};

const ProtectedRoute = ({ children, roles, redirectTo = '/login' }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras se verifica autenticación
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Si se especificaron roles, check dashboardAccess first, then role
  if (roles) {
    const dashboardAccess = user?.dashboardAccess || [];
    // Convert required roles to dashboard keys and check access
    const requiredKeys = roles.map(r => ROLE_TO_DASHBOARD[r]).filter(Boolean);
    const hasAccess = requiredKeys.some(k => dashboardAccess.includes(k));
    // Fallback to traditional role check
    const hasRole = roles.includes(user?.rol);
    if (!hasAccess && !hasRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
