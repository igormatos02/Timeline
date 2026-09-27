import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient.js';
import * as api from '../services/api';
import { useToast } from '../context/ToastContext.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function useAuth(setCurrentView) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState(() => api.getCurrentUser());

  // Effect: Google sign-in through Supabase Auth — the Supabase session is exchanged for an API session
  useEffect(() => {
    let isMounted = true;

    const syncSession = async (session) => {
      if (!session?.access_token || !isMounted) return;
      // Already signed in to the API with this account
      if (api.isUserLoggedIn()) return;
      try {
        const appUser = await api.syncGoogleSession(session.access_token);
        if (!isMounted) return;
        setCurrentUser(appUser);
        setCurrentView((prev) => (prev === 'landing' ? 'hub' : prev));
      } catch (err) {
        console.error('[useAuth] Failed to sync Google session:', err);
        showToast(err.message || t('auth.errors.googleAuthFailed'), 'error');
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => syncSession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        syncSession(session);
      } else if (event === 'SIGNED_OUT' && isMounted) {
        setCurrentUser(null);
        setCurrentView('landing');
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [setCurrentView, showToast, t]);

  // Effect: the API rejected the session (expired / invalid token) -> back to the login
  useEffect(() => {
    const handleExpired = () => {
      setCurrentUser(null);
      setCurrentView('landing');
      localStorage.removeItem('chrono_current_view');
      showToast(t('auth.sessionExpired'), 'info');
    };
    window.addEventListener(api.SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(api.SESSION_EXPIRED_EVENT, handleExpired);
  }, [setCurrentView, showToast, t]);

  const handleAuthSuccess = useCallback((user) => {
    setCurrentUser(user);
    setCurrentView('hub');
    localStorage.setItem('chrono_current_view', 'hub');
    showToast(t('auth.welcome', { name: user.name }));
  }, [setCurrentView, showToast, t]);

  const handleLogout = useCallback(() => {
    api.logoutUser();
    setCurrentUser(null);
    setCurrentView('landing');
    localStorage.removeItem('chrono_current_view');
    showToast(t('auth.loggedOut'));
  }, [setCurrentView, showToast, t]);

  return { currentUser, handleAuthSuccess, handleLogout };
}
