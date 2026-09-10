import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient.js';
import * as api from '../services/api';
import { useToast } from '../context/ToastContext.jsx';

export default function useAuth(setCurrentView) {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState(() => api.getCurrentUser());

  // Effect: Listen to Supabase Auth State (Google OAuth Callback)
  useEffect(() => {
    let isMounted = true;

    // Check existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && isMounted) {
        const gUser = session.user;
        const gPayload = {
          googleId: gUser.id,
          email: gUser.email,
          name: gUser.user_metadata?.full_name || gUser.user_metadata?.name || (gUser.email ? gUser.email.split('@')[0] : 'Utilizador Google'),
          avatarUrl: gUser.user_metadata?.avatar_url || gUser.user_metadata?.picture || null
        };
        try {
          const appUser = await api.syncGoogleUser(gPayload);
          if (!isMounted) return;
          setCurrentUser(appUser);
          setCurrentView((prev) => (prev === 'landing' ? 'hub' : prev));
        } catch (err) {
          console.error('[App] Failed to sync Google OAuth session:', err);
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user && isMounted) {
        const gUser = session.user;
        const gPayload = {
          googleId: gUser.id,
          email: gUser.email,
          name: gUser.user_metadata?.full_name || gUser.user_metadata?.name || (gUser.email ? gUser.email.split('@')[0] : 'Utilizador Google'),
          avatarUrl: gUser.user_metadata?.avatar_url || gUser.user_metadata?.picture || null
        };
        try {
          const appUser = await api.syncGoogleUser(gPayload);
          if (!isMounted) return;
          setCurrentUser(appUser);
          setCurrentView((prev) => (prev === 'landing' ? 'hub' : prev));
        } catch (err) {
          console.error('[App] Failed to sync Google OAuth sign-in:', err);
        }
      } else if (event === 'SIGNED_OUT' && isMounted) {
        setCurrentUser(null);
        setCurrentView('landing');
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [setCurrentView]);

  const handleAuthSuccess = useCallback((user) => {
    setCurrentUser(user);
    setCurrentView('hub');
    localStorage.setItem('chrono_current_view', 'hub');
    showToast(`Bem-vindo, ${user.name}!`);
  }, [setCurrentView, showToast]);

  const handleLogout = useCallback(() => {
    api.logoutUser();
    setCurrentUser(null);
    setCurrentView('landing');
    localStorage.removeItem('chrono_current_view');
    showToast('Sessão terminada com sucesso.');
  }, [setCurrentView, showToast]);

  return { currentUser, handleAuthSuccess, handleLogout };
}