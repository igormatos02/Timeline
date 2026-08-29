import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations.js';

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

  const t = (path, params = {}) => {
    const keys = path.split('.');
    let result = translations[language];

    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        // Fallback to English
        let fallbackResult = translations.en;
        for (const fbKey of keys) {
          if (fallbackResult && typeof fallbackResult === 'object' && fbKey in fallbackResult) {
            fallbackResult = fallbackResult[fbKey];
          } else {
            fallbackResult = null;
            break;
          }
        }
        result = fallbackResult || path;
        break;
      }
    }

    if (typeof result === 'string') {
      let interpolated = result;
      for (const [pKey, pVal] of Object.entries(params)) {
        interpolated = interpolated.replace(new RegExp(`\\{${pKey}\\}`, 'g'), pVal);
      }
      return interpolated;
    }

    return result || path;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
