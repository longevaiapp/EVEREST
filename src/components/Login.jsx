import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitch from './LanguageSwitch';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message || t('auth.loginError'));
    }
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
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.enterPassword')}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {(localError || error) && (
            <div className="error-message">{localError || error}</div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? t('auth.loggingIn') : t('auth.loginButton')}
          </button>
        </form>


      </div>
    </div>
  );
}

export default Login;
