import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

// Usuarios de demo para acceso rápido
const demoUsers = [
  { email: 'admin@vetos.com', nombre: 'Admin', rol: 'ADMIN', avatar: '👨‍💼' },
  { email: 'recepcion@vetos.com', nombre: 'Recepción', rol: 'RECEPCION', avatar: '👩‍💻' },
  { email: 'drgarcia@vetos.com', nombre: 'Dr. García', rol: 'MEDICO', avatar: '👨‍⚕️' },
  { email: 'dramartinez@vetos.com', nombre: 'Dra. Martínez', rol: 'MEDICO', avatar: '👩‍⚕️' },
  { email: 'laboratorio@vetos.com', nombre: 'Lab', rol: 'LABORATORIO', avatar: '🔬' },
  { email: 'farmacia@vetos.com', nombre: 'Farmacia', rol: 'FARMACIA', avatar: '💊' },
];

function Login() {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email || !password) {
      setLocalError('Por favor ingrese email y contraseña');
      return;
    }

    try {
      const user = await login(email, password);
      navigateByRole(user.rol);
    } catch (err) {
      setLocalError(err.message || 'Error al iniciar sesión');
    }
  };

  const quickLogin = async (demoUser) => {
    setLocalError('');
    clearError();
    
    try {
      const user = await login(demoUser.email, 'password123');
      navigateByRole(user.rol);
    } catch (err) {
      setLocalError(err.message || 'Error al iniciar sesión');
    }
  };

  const navigateByRole = (rol) => {
    const routes = {
      ADMIN: '/admin',
      RECEPCION: '/recepcion',
      MEDICO: '/medico',
      LABORATORIO: '/laboratorio',
      FARMACIA: '/farmacia',
    };
    navigate(routes[rol] || '/');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/logo login.png" alt="VET-OS Logo" />
          </div>
          <h1>VET-OS</h1>
          <p>Sistema de Gestión Veterinaria</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {(localError || error) && (
            <div className="error-message">{localError || error}</div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="quick-access">
          <p className="quick-access-title">Acceso Rápido (Demo)</p>
          <div className="quick-access-buttons">
            {demoUsers.map(user => (
              <button
                key={user.email}
                onClick={() => quickLogin(user)}
                className="quick-access-button"
                title={`${user.nombre} - ${user.rol}`}
                disabled={loading}
              >
                <span className="user-avatar">{user.avatar}</span>
                <div className="user-info">
                  <span className="user-role">{user.rol}</span>
                  <span className="user-name">{user.nombre}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="demo-note">Contraseña para todos: <strong>password123</strong></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
