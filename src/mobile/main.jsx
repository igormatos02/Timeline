import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import MobileApp from './MobileApp.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { TimelineColor } from '../enums/index.js';

// Default language: the device language (Portuguese or English) when none was chosen yet
try {
  if (!localStorage.getItem('timeline_language')) {
    localStorage.setItem('timeline_language', (navigator.language || '').toLowerCase().startsWith('pt') ? 'pt' : 'en');
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
      <MobileApp />
    </LanguageProvider>
  </StrictMode>
);
