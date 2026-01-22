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
const ProtectedRoute = ({ children, roles, redirectTo = '/login' }) => {
  const { isAuthenticated, loading, hasRole, user } = useAuth();
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

  // Si se especificaron roles y el usuario no tiene ninguno, redirigir
  if (roles && !hasRole(roles)) {
    // Redirigir al dashboard correspondiente según su rol
    const dashboardRoutes = {
      ADMIN: '/admin',
      RECEPCION: '/recepcion',
      MEDICO: '/medico',
      LABORATORIO: '/laboratorio',
      FARMACIA: '/farmacia',
    };

    const userDashboard = dashboardRoutes[user?.rol] || '/';
    return <Navigate to={userDashboard} replace />;
  }

  return children;
};

export default ProtectedRoute;
