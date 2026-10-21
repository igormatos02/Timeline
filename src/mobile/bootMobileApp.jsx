import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { TimelineColor } from '../enums/index.js';

const DEFAULT_APP_LANGUAGE = 'pt';
const LANGUAGE_DEFAULT_KEY = 'condoflow_language_default';
const LANGUAGE_DEFAULT_VERSION = 'pt-1';

/** Starts a CondoFlow app (members or Gestão): device language and theme, status bar color, then the root. */
export function bootMobileApp(root) {
  // CondoFlow apps start in Portuguese (condominiums in Portugal); English stays one tap away. Installs that took the
  // device language before get Portuguese once, then the person's choice is kept
  try {
    if (localStorage.getItem(LANGUAGE_DEFAULT_KEY) !== LANGUAGE_DEFAULT_VERSION) {
      localStorage.setItem('timeline_language', DEFAULT_APP_LANGUAGE);
      localStorage.setItem(LANGUAGE_DEFAULT_KEY, LANGUAGE_DEFAULT_VERSION);
    }
  } catch { /* storage unavailable */ }

  // Browser / status bar color
  const themeColorMeta = document.createElement('meta');
  themeColorMeta.name = 'theme-color';
  themeColorMeta.content = TimelineColor.PRIMARY;
  document.head.appendChild(themeColorMeta);

  // Theme follows the device (light / dark)
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const applyTheme = () => document.documentElement.setAttribute('data-theme', darkQuery.matches ? 'dark' : 'light');
  applyTheme();
  darkQuery.addEventListener('change', applyTheme);

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <LanguageProvider>
        {root}
      </LanguageProvider>
    </StrictMode>
  );
}
