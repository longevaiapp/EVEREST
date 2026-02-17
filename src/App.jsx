import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Navbar from './components/Navbar';
import RecepcionDashboard from './components/dashboards/RecepcionDashboard';
import MedicoDashboard from './components/dashboards/MedicoDashboard';
import FarmaciaDashboard from './components/dashboards/FarmaciaDashboard';
import LaboratorioDashboard from './components/dashboards/LaboratorioDashboard';
import EstilistaDashboard from './components/dashboards/EstilistaDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import RegistroCliente from './components/RegistroCliente';
import './App.css';

// Layout con Navbar para usuarios autenticados
function AuthenticatedLayout({ children }) {
  const { logout } = useAuth();

  return (
    <div className="app">
      <Navbar onLogout={logout} />
      {children}
    </div>
  );
}

// Componente para redirigir al dashboard según rol
function RoleBasedRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  const routes = {
    ADMIN: '/admin',
    RECEPCION: '/recepcion',
    MEDICO: '/medico',
    LABORATORIO: '/laboratorio',
    FARMACIA: '/farmacia',
    ESTILISTA: '/estilista',
  };

  return <Navigate to={routes[user.rol] || '/login'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <ToastProvider>
            <Routes>
              {/* Ruta pública - Login */}
              <Route path="/login" element={<Login />} />

              {/* Rutas protegidas */}
              <Route path="/recepcion" element={
                <ProtectedRoute roles={['RECEPCION', 'ADMIN']}>
                  <AuthenticatedLayout>
                    <RecepcionDashboard />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } />

              <Route path="/medico" element={
                <ProtectedRoute roles={['MEDICO', 'ADMIN']}>
                  <AuthenticatedLayout>
                    <MedicoDashboard />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } />

              <Route path="/farmacia" element={
                <ProtectedRoute roles={['FARMACIA', 'ADMIN']}>
                  <AuthenticatedLayout>
                    <FarmaciaDashboard />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } />

              <Route path="/laboratorio" element={
                <ProtectedRoute roles={['LABORATORIO', 'ADMIN']}>
                  <AuthenticatedLayout>
                    <LaboratorioDashboard />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } />

              <Route path="/estilista" element={
                <ProtectedRoute roles={['ESTILISTA', 'ADMIN']}>
                  <AuthenticatedLayout>
                    <EstilistaDashboard />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } />

              <Route path="/admin" element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AuthenticatedLayout>
                    <AdminDashboard />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              } />

              <Route path="/registro-cliente" element={
                <ProtectedRoute roles={['RECEPCION', 'ADMIN']}>
                  <RegistroCliente />
                </ProtectedRoute>
              } />

              {/* Ruta raíz - redirige según rol */}
              <Route path="/" element={<RoleBasedRedirect />} />

              {/* Ruta por defecto - 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
