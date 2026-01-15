import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Login from './components/Login';
import Navbar from './components/Navbar';
import RecepcionDashboard from './components/dashboards/RecepcionDashboard';
import MedicoDashboard from './components/dashboards/MedicoDashboard';
import FarmaciaDashboard from './components/dashboards/FarmaciaDashboard';
import LaboratorioDashboard from './components/dashboards/LaboratorioDashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import RegistroCliente from './components/RegistroCliente';
import './App.css';

function AppContent() {
  const { currentUser, setCurrentUser } = useApp();

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const renderDashboard = () => {
    if (!currentUser) return null;

    switch (currentUser.rol) {
      case 'RECEPCION':
        return <RecepcionDashboard />;
      case 'MEDICO':
        return <MedicoDashboard />;
      case 'FARMACIA':
        return <FarmaciaDashboard />;
      case 'LABORATORIO':
        return <LaboratorioDashboard />;
      case 'ADMIN':
        return <AdminDashboard />;
      default:
        return <div>Rol no reconocido</div>;
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Navbar onLogout={handleLogout} />
      {renderDashboard()}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/registro-cliente" element={<RegistroCliente />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
