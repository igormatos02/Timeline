import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import * as mobileApi from './mobileApi.js';
import MobileAuth from './MobileAuth.jsx';
import MobileObligations from './MobileObligations.jsx';
import styles from './MobileApp.module.css';

/**
 * Mobile app for individual members (e.g. condominium owners): login / registration (Google or
 * e-mail and password, optionally with an invitation code) and their installments.
 */
export default function MobileApp() {
  const { t } = useTranslation();
  const [user, setUser] = useState(() => mobileApi.getStoredUser());
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(user));
  const [notice, setNotice] = useState('');
  const [acceptedTimeboardId, setAcceptedTimeboardId] = useState(null);

  // Invitation link opened on the web (…?invite=CODE): kept until the login / registration finishes
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('invite');
    if (code) mobileApi.setPendingInviteCode(code);
  }, []);

  const handleSessionExpired = useCallback(() => {
    mobileApi.clearSession();
    setUser(null);
    setNotice(t('auth.sessionExpired'));
  }, [t]);

  // Stored session: confirm it is still valid
  useEffect(() => {
    if (!user) return;
    mobileApi.getMe()
      .catch(() => handleSessionExpired())
      .finally(() => setIsCheckingSession(false));
  }, []);

  // After login: accept the pending invitation code (if any)
  const finishLogin = useCallback(async (loggedUser) => {
    const code = mobileApi.getPendingInviteCode();
    if (code) {
      try {
        const result = await mobileApi.acceptInviteByCode(code);
        if (result?.timeboard?.id) {
          mobileApi.setSelectedTimeboardId(result.timeboard.id);
          setAcceptedTimeboardId(result.timeboard.id);
        }
      } catch (err) {
        setNotice(err.message || t('invite.acceptFailed'));
      } finally {
        mobileApi.setPendingInviteCode(null);
      }
    }
    setUser(loggedUser);
  }, [t]);

  // Google sign-in through Supabase Auth: exchange the Supabase session for an API session
  useEffect(() => {
    let isMounted = true;
    const sync = async (session) => {
      if (!session?.access_token || mobileApi.getStoredUser()) return;
      try {
        const loggedUser = await mobileApi.loginWithGoogleSession(session.access_token);
        if (isMounted) await finishLogin(loggedUser);
      } catch (err) {
        if (isMounted) setNotice(err.message || t('auth.errors.googleAuthFailed'));
      }
    };
    supabase.auth.getSession().then(({ data: { session } }) => sync(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') sync(session);
    });
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [finishLogin, t]);

  const handleLogout = async () => {
    mobileApi.clearSession();
    mobileApi.setSelectedTimeboardId(null);
    try { await supabase.auth.signOut(); } catch { /* not signed in with Google */ }
    setUser(null);
  };

  if (isCheckingSession) {
    return (
      <div className={`${styles.screen} ${styles.centered}`}>
        <Loader2 size={28} className={styles.spin} style={{ alignSelf: 'center', color: 'var(--primary)' }} />
      </div>
    );
  }

  if (!user) {
    return <MobileAuth onLoggedIn={finishLogin} notice={notice} onClearNotice={() => setNotice('')} />;
  }

  return (
    <MobileObligations
      user={user}
      preferredTimeboardId={acceptedTimeboardId}
      notice={notice}
      onClearNotice={() => setNotice('')}
      onLogout={handleLogout}
      onSessionExpired={handleSessionExpired}
    />
  );
}
