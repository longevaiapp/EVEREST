import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import LanguageSwitch from './LanguageSwitch';
import './Navbar.css';

// Mapeo de roles a avatars
const roleAvatars = {
  ADMIN: '👨‍💼',
  RECEPCION: '👩‍💻',
  MEDICO: '👨‍⚕️',
  LABORATORIO: '🔬',
  FARMACIA: '💊',
};

function Navbar({ onLogout }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { notifications, markAsRead } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  
  const myNotifications = notifications.filter(n => n.para === user?.rol);
  const unreadCount = myNotifications.filter(n => !n.leida).length;

  const handleNotificationClick = (notification) => {
    if (!notification.leida) {
      markAsRead(notification.id);
    }
  };

  const getNotificationIcon = (tipo) => {
    switch(tipo) {
      case 'NUEVA_TAREA': return '📋';
      case 'ESTUDIOS_SOLICITADOS': return '🔬';
      case 'RESULTADOS_LISTOS': return '✅';
      case 'PACIENTE_LISTO_ALTA': return '🏥';
      case 'CIRUGIA_PROGRAMADA': return '🔪';
      default: return '📢';
    }
  };

  const getPriorityClass = (prioridad) => {
    return prioridad?.toLowerCase() || 'media';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return t('common.now');
    if (minutes < 60) return `${minutes}m ${t('common.ago')}`;
    if (hours < 24) return `${hours}h ${t('common.ago')}`;
    return `${days}d ${t('common.ago')}`;
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-brand">
          <img src="/logo.png" alt="Everest Vet Logo" className="navbar-logo" />
          <span>Everest Vet</span>
        </div>

        <div className="navbar-user">
          <div className="notifications-wrapper">
            <button 
              className={`navbar-notifications ${unreadCount > 0 ? 'has-unread' : ''}`}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <span className="notification-bell">🔔</span>
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <>
                <div 
                  className="notifications-overlay" 
                  onClick={() => setShowNotifications(false)}
                />
                <div className="notifications-dropdown">
                  <div className="notifications-header">
                    <h3>{t('navbar.notifications')}</h3>
                    {unreadCount > 0 && (
                      <span className="unread-count">{unreadCount} {t('navbar.unread')}</span>
                    )}
                  </div>
                  <div className="notifications-list">
                    {myNotifications.length === 0 ? (
                      <div className="no-notifications">
                        <p>{t('navbar.noNotifications')}</p>
                      </div>
                    ) : (
                      myNotifications.slice(0, 10).map(notification => (
                        <div 
                          key={notification.id} 
                          className={`notification-item ${!notification.leida ? 'unread' : ''} priority-${getPriorityClass(notification.prioridad)}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="notification-icon">
                            {getNotificationIcon(notification.tipo)}
                          </div>
                          <div className="notification-content">
                            <div className="notification-title">{notification.titulo}</div>
                            <div className="notification-message">{notification.mensaje}</div>
                            <div className="notification-time">{formatTime(notification.timestamp)}</div>
                          </div>
                          {!notification.leida && <div className="unread-dot"></div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          
          <LanguageSwitch />
          
          <div className="user-profile">
            <span className="user-avatar-nav">{roleAvatars[user?.rol] || '👤'}</span>
            <div className="user-info-nav">
              <span className="user-name-nav">{user?.nombre}</span>
              <span className="user-role-nav">{t(`roles.${user?.rol}`) || user?.rol}</span>
            </div>
          </div>

          <button className="btn-logout" onClick={onLogout}>
            {t('auth.logout')}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
