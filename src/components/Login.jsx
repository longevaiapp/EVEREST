import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitch from './LanguageSwitch';
import './Login.css';

// Demo users for quick access
const demoUsers = [
  { email: 'admin@vetos.com', nombre: 'Admin', rol: 'ADMIN', avatar: '👨‍💼' },
  { email: 'recepcion@vetos.com', nombre: 'Reception', rol: 'RECEPCION', avatar: '👩‍💻' },
  { email: 'drgarcia@vetos.com', nombre: 'Dr. García', rol: 'MEDICO', avatar: '👨‍⚕️' },
  { email: 'dramartinez@vetos.com', nombre: 'Dra. Martínez', rol: 'MEDICO', avatar: '👩‍⚕️' },
  { email: 'hospitalizacion@vetos.com', nombre: 'Hospitalization', rol: 'HOSPITALIZACION', avatar: '🏥' },
  { email: 'estilista@vetos.com', nombre: 'Stylist', rol: 'ESTILISTA', avatar: '✂️' },
  { email: 'laboratorio@vetos.com', nombre: 'Lab', rol: 'LABORATORIO', avatar: '🔬' },
  { email: 'farmacia@vetos.com', nombre: 'Pharmacy', rol: 'FARMACIA', avatar: '💊' },
  { email: 'recolector@vetos.com', nombre: 'Recolector', rol: 'RECOLECTOR', avatar: '🚗' },
  { email: 'crematorio@vetos.com', nombre: 'Crematorio', rol: 'OPERADOR_CREMATORIO', avatar: '🔥' },
  { email: 'entregas@vetos.com', nombre: 'Entregas', rol: 'ENTREGA', avatar: '📦' },
  { email: 'bancosangre@vetos.com', nombre: 'Banco Sangre', rol: 'BANCO_SANGRE', avatar: '🩸' },
];

function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email || !password) {
      setLocalError(t('auth.enterCredentials'));
      return;
    }

    try {
      const user = await login(email, password);
      navigateByRole(user.rol);
    } catch (err) {
      setLocalError(err.message || t('auth.loginError'));
    }
  };

  const quickLogin = async (demoUser) => {
    setLocalError('');
    clearError();

    try {
      const user = await login(demoUser.email, 'password123');
      navigateByRole(user.rol);
    } catch (err) {
      setLocalError(err.message || t('auth.loginError'));
    }
  };

  const navigateByRole = (rol) => {
    const routes = {
      ADMIN: '/admin',
      RECEPCION: '/recepcion',
      MEDICO: '/medico',
      HOSPITALIZACION: '/hospitalizacion',
      ESTILISTA: '/estilista',
      LABORATORIO: '/laboratorio',
      FARMACIA: '/farmacia',
      RECOLECTOR: '/crematorio',
      OPERADOR_CREMATORIO: '/crematorio',
      ENTREGA: '/crematorio',
      BANCO_SANGRE: '/banco-sangre',
    };
    navigate(routes[rol] || '/');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-language-switch">
          <LanguageSwitch />
        </div>
        <div className="login-header">
          <div className="login-logo">
            <img src="/logo.png" alt="Everest Vet Logo" />
          </div>
          <h1>Everest Vet</h1>
          <p>{t('auth.systemTitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.enterEmail')}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.enterPassword')}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {(localError || error) && (
            <div className="error-message">{localError || error}</div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? t('auth.loggingIn') : t('auth.loginButton')}
          </button>
        </form>

        <div className="quick-access">
          <p className="quick-access-title">{t('auth.quickAccess')}</p>
          <div className="quick-access-buttons">
            {demoUsers.map(user => (
              <button
                key={user.email}
                onClick={() => quickLogin(user)}
                className="quick-access-button"
                title={`${user.nombre} - ${t(`roles.${user.rol}`)}`}
                disabled={loading}
              >
                <span className="user-avatar">{user.avatar}</span>
                <div className="user-info">
                  <span className="user-role">{t(`roles.${user.rol}`)}</span>
                  <span className="user-name">{user.nombre}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="demo-note">{t('auth.demoPassword')} <strong>password123</strong></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
