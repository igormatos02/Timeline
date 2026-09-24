import React, { createContext, useContext, useState, useMemo } from 'react';
import { pt, enUS } from 'date-fns/locale';
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
  // date-fns locale matching the UI language (used to format month / day names)
  const dateLocale = language === 'pt' ? pt : enUS;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dateLocale }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
