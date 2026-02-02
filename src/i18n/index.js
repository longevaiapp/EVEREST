// src/i18n/index.js
// Configuración de internacionalización con react-i18next

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importar traducciones
import es from './locales/es.json';
import en from './locales/en.json';

const resources = {
  es: { translation: es },
  en: { translation: en }
};

i18n
  .use(LanguageDetector) // Detecta el idioma del navegador
  .use(initReactI18next) // Integración con React
  .init({
    resources,
    lng: 'en', // Force English as default language
    fallbackLng: 'en', // Fallback to English
    debug: false,
    
    interpolation: {
      escapeValue: false // React ya escapa por defecto
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
