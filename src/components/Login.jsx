import { useState } from 'react';
import { mockUsers } from '../data/mockUsers';
import './Login.css';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const user = mockUsers.find(
      u => u.username === username && u.password === password
    );

    if (user) {
      onLogin(user);
    } else {
      setError('Usuario o contraseña incorrectos');
    }
  };

  const quickLogin = (user) => {
    onLogin(user);
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
            <label htmlFor="username">Usuario</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingrese su usuario"
              autoComplete="username"
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
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button">
            Iniciar Sesión
          </button>
        </form>

        <div className="quick-access">
          <p className="quick-access-title">Acceso Rápido (Demo)</p>
          <div className="quick-access-buttons">
            {mockUsers.map(user => (
              <button
                key={user.id}
                onClick={() => quickLogin(user)}
                className="quick-access-button"
                title={`${user.nombre} - ${user.rol}`}
              >
                <span className="user-avatar">{user.avatar}</span>
                <div className="user-info">
                  <span className="user-role">{user.rol}</span>
                  <span className="user-name">{user.nombre}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="demo-note">Contraseña para todos: <strong>123</strong></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
