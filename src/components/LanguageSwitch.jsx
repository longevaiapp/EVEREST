// src/components/LanguageSwitch.jsx
// Componente para cambiar el idioma de la aplicación

import { useTranslation } from 'react-i18next';
import './LanguageSwitch.css';

function LanguageSwitch() {
  const { i18n, t } = useTranslation();
  
  const currentLang = i18n.language?.split('-')[0] || 'es';
  
  const toggleLanguage = () => {
    const newLang = currentLang === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  return (
    <button 
      className="language-switch"
      onClick={toggleLanguage}
      title={t('navbar.language')}
    >
      <span className="lang-icon">🌐</span>
      <span className="lang-code">{currentLang.toUpperCase()}</span>
    </button>
  );
}

export default LanguageSwitch;
