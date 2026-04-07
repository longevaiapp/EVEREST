import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import './DashboardSelector.css';

// All available dashboards with their config
const ALL_DASHBOARDS = [
  { key: 'recepcion', icon: '🏥', route: '/recepcion', color: '#2196f3' },
  { key: 'medico', icon: '👨‍⚕️', route: '/medico', color: '#4caf50' },
  { key: 'farmacia', icon: '💊', route: '/farmacia', color: '#ff9800' },
  { key: 'laboratorio', icon: '🔬', route: '/laboratorio', color: '#9c27b0' },
  { key: 'estilista', icon: '✂️', route: '/estilista', color: '#e91e63' },
  { key: 'hospitalizacion', icon: '🏨', route: '/hospitalizacion', color: '#00bcd4' },
  { key: 'quirofano', icon: '🔪', route: '/quirofano', color: '#607d8b' },
  { key: 'crematorio', icon: '🔥', route: '/crematorio', color: '#795548' },
  { key: 'banco-sangre', icon: '🩸', route: '/banco-sangre', color: '#f44336' },
  { key: 'admin', icon: '⚙️', route: '/admin', color: '#37474f' },
];

// Default dashboard access based on role when no explicit permissions set
const DEFAULT_ACCESS = {
  ADMIN: ['recepcion', 'medico', 'farmacia', 'laboratorio', 'estilista', 'admin', 'hospitalizacion', 'crematorio', 'banco-sangre', 'quirofano'],
  RECEPCION: ['recepcion'],
  MEDICO: ['medico', 'hospitalizacion', 'banco-sangre', 'quirofano'],
  LABORATORIO: ['laboratorio'],
  FARMACIA: ['farmacia'],
  ESTILISTA: ['estilista'],
  HOSPITALIZACION: ['hospitalizacion'],
  QUIROFANO: ['quirofano'],
  RECOLECTOR: ['crematorio'],
  OPERADOR_CREMATORIO: ['crematorio'],
  ENTREGA: ['crematorio'],
  BANCO_SANGRE: ['banco-sangre'],
};

// Dashboard label keys for i18n
const DASHBOARD_LABELS = {
  'recepcion': 'dashboards.recepcion',
  'medico': 'dashboards.medico',
  'farmacia': 'dashboards.farmacia',
  'laboratorio': 'dashboards.laboratorio',
  'estilista': 'dashboards.estilista',
  'hospitalizacion': 'dashboards.hospitalizacion',
  'quirofano': 'dashboards.quirofano',
  'crematorio': 'dashboards.crematorio',
  'banco-sangre': 'dashboards.bancoSangre',
  'admin': 'dashboards.admin',
};

function DashboardSelector() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  if (!user) return null;

  // Get accessible dashboards: from user's dashboardAccess or role defaults
  const accessKeys = user.dashboardAccess || DEFAULT_ACCESS[user.rol] || [];
  
  // If user only has access to 1 dashboard, navigate directly
  if (accessKeys.length === 1) {
    const dash = ALL_DASHBOARDS.find(d => d.key === accessKeys[0]);
    if (dash) {
      navigate(dash.route, { replace: true });
      return null;
    }
  }

  const accessibleDashboards = ALL_DASHBOARDS.filter(d => accessKeys.includes(d.key));

  return (
    <div className="selector-container">
      <div className="selector-content">
        <div className="selector-header">
          <img src="/logo.png" alt="Everest" className="selector-logo" />
          <h1>{t('dashboards.selectTitle', 'Selecciona un módulo')}</h1>
          <p className="selector-welcome">
            {t('dashboards.welcome', 'Bienvenido')}, <strong>{user.nombre}</strong>
          </p>
        </div>

        <div className="selector-grid">
          {accessibleDashboards.map(dash => (
            <button
              key={dash.key}
              className="selector-card"
              onClick={() => navigate(dash.route)}
              style={{ '--card-color': dash.color }}
            >
              <div className="selector-card-icon">{dash.icon}</div>
              <div className="selector-card-label">
                {t(DASHBOARD_LABELS[dash.key], dash.key)}
              </div>
            </button>
          ))}
        </div>

        <button className="selector-logout" onClick={logout}>
          {t('auth.logout', 'Cerrar sesión')}
        </button>
      </div>
    </div>
  );
}

export { ALL_DASHBOARDS, DEFAULT_ACCESS };
export default DashboardSelector;
