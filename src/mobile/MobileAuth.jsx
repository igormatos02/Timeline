import React, { useEffect, useState } from 'react';
import { Sparkles, Ticket, AlertCircle, ArrowRight, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import * as mobileApi from './mobileApi.js';
import { PUBLIC_SITE_URL } from '../../shared/config/appConfig.js';
import { isNativeApp, signInWithNativeGoogle } from './nativeGoogle.js';
import styles from './MobileApp.module.css';

// Official Google "G" logo colors (brand requirement of the Google sign-in button)
const GOOGLE_LOGO_COLORS = Object.freeze({ blue: '#4285F4', green: '#34A853', yellow: '#FBBC05', red: '#EA4335' });

const Mode = Object.freeze({ LOGIN: 'login', REGISTER: 'register', CODE: 'code' });

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill={GOOGLE_LOGO_COLORS.blue} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill={GOOGLE_LOGO_COLORS.green} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill={GOOGLE_LOGO_COLORS.yellow} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill={GOOGLE_LOGO_COLORS.red} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

/**
 * Login / registration of the mobile app: Google or e-mail and password; the invitation code
 * identifies the invitation (accepted right after the login / registration).
 */
export default function MobileAuth({ onLoggedIn, notice, onClearNotice }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(Mode.LOGIN);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [inviteInfo, setInviteInfo] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const shownError = error || notice;

  const applyCode = async (rawCode) => {
    const info = await mobileApi.lookupInviteCode(rawCode);
    mobileApi.setPendingInviteCode(rawCode);
    setInviteInfo(info);
    if (info.email) setEmail(info.email);
    setMode(Mode.REGISTER);
  };

  // Invitation code already known (link opened on the web)
  useEffect(() => {
    const pending = mobileApi.getPendingInviteCode();
    if (pending) applyCode(pending).catch(() => mobileApi.setPendingInviteCode(null));
  }, []);

  const switchMode = (next) => {
    setMode(next);
    setError('');
    onClearNotice();
  };

  const run = async (action) => {
    setError('');
    onClearNotice();
    setIsLoading(true);
    try {
      await action();
    } catch (err) {
      setError(err.message || t('auth.errors.requestFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckCode = (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError(t('auth.inviteCode.required'));
      return;
    }
    run(() => applyCode(code.trim()));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return setError(t('auth.errors.emailRequired'));
    if (!password) return setError(t('auth.errors.passwordRequired'));
    run(async () => {
      const loggedUser = mode === Mode.REGISTER
        ? await mobileApi.register(name, email, password)
        : await mobileApi.login(email, password);
      await onLoggedIn(loggedUser);
    });
  };

  const handleGoogle = () => run(async () => {
    // Android app: native Google account picker; the Supabase session is then synced by MobileApp
    if (isNativeApp()) {
      await signInWithNativeGoogle({
        notConfiguredMessage: t('mobile.googleNotConfigured'),
        noTokenMessage: t('auth.errors.googleAuthFailed')
      });
      return;
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` }
    });
    if (oauthError) throw new Error(oauthError.message);
  });

  const clearInvite = () => {
    mobileApi.setPendingInviteCode(null);
    setInviteInfo(null);
    setCode('');
    switchMode(Mode.CODE);
  };

  return (
    <div className={`${styles.screen} ${styles.centered}`}>
      <div className={styles.brand}>
        timeboard <Sparkles size={20} />
      </div>
      <p className={styles.subtitle}>{t('mobile.tagline')}</p>

      {inviteInfo && (
        <div className={styles.inviteBanner}>
          <Ticket size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={styles.inviteTitle}>{t('auth.inviteCode.invitationFor', { timeboard: inviteInfo.timeboardName })}</div>
            <div className={styles.inviteMeta}>{[inviteInfo.personName, inviteInfo.maskedEmail].filter(Boolean).join(' · ')}</div>
            <div className={styles.inviteMeta}>{t('auth.inviteCode.continueHint')}</div>
            <button type="button" className={styles.linkButton} style={{ padding: '4px 0 0' }} onClick={clearInvite}>
              {t('auth.inviteCode.useAnother')}
            </button>
          </div>
        </div>
      )}

      {shownError && (
        <div className={styles.error} role="alert">
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{shownError}</span>
        </div>
      )}

      <div className={styles.card}>
        {mode === Mode.CODE ? (
          <form onSubmit={handleCheckCode}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="mobile-invite-code">{t('auth.inviteCode.label')}</label>
              <input
                id="mobile-invite-code"
                className={`${styles.input} ${styles.codeInput}`}
                placeholder={t('auth.inviteCode.placeholder')}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoComplete="one-time-code"
                autoCapitalize="characters"
                autoFocus
              />
              <span className={styles.inviteMeta}>{t('auth.inviteCode.hint')}</span>
            </div>
            <button type="submit" className={styles.primaryButton} disabled={isLoading}>
              {isLoading ? <Loader2 size={18} className={styles.spin} /> : <ArrowRight size={18} />}
              <span>{t('auth.inviteCode.check')}</span>
            </button>
          </form>
        ) : (
          <>
            <div className={styles.tabs} role="tablist">
              {[Mode.LOGIN, Mode.REGISTER].map((tabMode) => (
                <button
                  key={tabMode}
                  type="button"
                  role="tab"
                  aria-selected={mode === tabMode}
                  className={`${styles.tab} ${mode === tabMode ? styles.tabActive : ''}`}
                  onClick={() => switchMode(tabMode)}
                >
                  {tabMode === Mode.LOGIN ? t('auth.loginButton') : t('auth.registerButton')}
                </button>
              ))}
            </div>

            <button type="button" className={styles.googleButton} onClick={handleGoogle} disabled={isLoading}>
              <GoogleLogo />
              <span>{t('auth.googleButton')}</span>
            </button>

            <div className={styles.divider}>{t('auth.orDivider')}</div>

            <form onSubmit={handleSubmit}>
              {mode === Mode.REGISTER && (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="mobile-name">{t('auth.nameLabel')}</label>
                  <input id="mobile-name" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder={t('auth.namePlaceholder')} />
                </div>
              )}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="mobile-email">{t('auth.emailLabel')}</label>
                <input id="mobile-email" type="email" inputMode="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder={t('auth.emailPlaceholder')} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="mobile-password">{t('auth.passwordLabel')}</label>
                <input
                  id="mobile-password"
                  type="password"
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === Mode.REGISTER ? 'new-password' : 'current-password'}
                  placeholder={t('auth.passwordPlaceholder')}
                />
              </div>
              <button type="submit" className={styles.primaryButton} disabled={isLoading}>
                {isLoading
                  ? <Loader2 size={18} className={styles.spin} />
                  : (mode === Mode.REGISTER ? <UserPlus size={18} /> : <LogIn size={18} />)}
                <span>{mode === Mode.REGISTER ? t('auth.registerAndEnter') : t('auth.loginButton')}</span>
              </button>
            </form>
          </>
        )}
      </div>

      {mode === Mode.CODE ? (
        <button type="button" className={styles.linkButton} onClick={() => switchMode(Mode.LOGIN)}>
          {t('auth.backToLogin')}
        </button>
      ) : !inviteInfo && (
        <button type="button" className={styles.linkButton} onClick={() => switchMode(Mode.CODE)}>
          <Ticket size={16} />
          {t('auth.inviteCode.haveCode')}
        </button>
      )}

      <div className={styles.footerLinks}>
        <a className={styles.footerLink} href={`${PUBLIC_SITE_URL}/privacidade`} target="_blank" rel="noreferrer">{t('legal.privacyLink')}</a>
      </div>
    </div>
  );
}
