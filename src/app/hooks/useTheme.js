import { useEffect, useState } from 'react';

// Extracted from App.jsx (App).
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('chrono_theme') || 'light';
  });

  // Apply theme to document
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('chrono_theme', theme);
    } catch (e) { }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return {
    handleToggleTheme,
    theme
  };
}
