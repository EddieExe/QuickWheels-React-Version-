import { createContext, useContext, useState, useEffect } from 'react';
import { LANGUAGES, getTranslation } from '../utils/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', LANGUAGES[language]?.dir || 'ltr');
  }, [language]);

  function changeLanguage(lang) {
    setLanguage(lang);
  }

  function t(key) {
    return getTranslation(key, language);
  }

  const value = {
    language,
    changeLanguage,
    t,
    languages: LANGUAGES,
    currentLanguage: LANGUAGES[language],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}