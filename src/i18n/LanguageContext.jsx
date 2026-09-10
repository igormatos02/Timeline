import React, { createContext, useContext, useState, useMemo } from 'react';
import { createT } from '../../shared/i18n/index.js';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, fallback) => fallback || key
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem('timeline_language') || 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang) => {
    const validLang = lang === 'pt' ? 'pt' : 'en';
    setLanguageState(validLang);
    try {
      localStorage.setItem('timeline_language', validLang);
    } catch {}
  };

  const t = useMemo(() => createT(language), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
