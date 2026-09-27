import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Mail,
  Send,
  Ticket,
  ArrowRight
} from 'lucide-react';
import * as api from '../../services/api.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { TimelineColor } from '../../enums/index.js';

// Official Google "G" logo colors (brand requirement of the Google sign-in button)
const GOOGLE_LOGO_COLORS = Object.freeze({ blue: '#4285F4', green: '#34A853', yellow: '#FBBC05', red: '#EA4335' });

const AuthMode = Object.freeze({ LOGIN: 'login', REGISTER: 'register', FORGOT: 'forgot', CODE: 'code' });

export default function AuthCard({ onAuthSuccess, initialEmail = '', pendingInvite = null }) {
  const { t } = useTranslation();
  const [authMode, setAuthMode] = useState(initialEmail ? AuthMode.REGISTER : AuthMode.LOGIN);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  // Invitation code: typed by the person (or from the invitation link) and accepted after login / registration
  const [codeInput, setCodeInput] = useState('');
  const [inviteInfo, setInviteInfo] = useState(null);

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
      setAuthMode(AuthMode.REGISTER);
    }
  }, [initialEmail]);

  const applyInviteCode = async (code) => {
    const info = await api.lookupInviteCode(code);
    api.setPendingInviteCode(code);
    setInviteInfo(info);
    if (info.email) setEmail(info.email);
    setAuthMode(AuthMode.REGISTER);
    return info;
  };

  // Invitation link with a code: show the invitation details right away
  useEffect(() => {
    if (!pendingInvite?.code) return;
    applyInviteCode(pendingInvite.code).catch((err) => {
      api.setPendingInviteCode(null);
      setErrorMsg(err.message);
    });
  }, [pendingInvite?.code]);

  const switchMode = (mode) => {
    setAuthMode(mode);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleCheckCode = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!codeInput.trim()) {
      setErrorMsg(t('auth.inviteCode.required'));
      return;
    }
    setIsLoading(true);
    try {
      await applyInviteCode(codeInput.trim());
    } catch (err) {
      setErrorMsg(err.message || t('auth.inviteCode.invalid'));
    } finally {
      setIsLoading(false);
    }
  };

  const clearInvite = () => {
    api.setPendingInviteCode(null);
    setInviteInfo(null);
    setCodeInput('');
    switchMode(AuthMode.CODE);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      await api.loginWithGoogle(pendingInvite);
    } catch (err) {
      setErrorMsg(err.message || t('auth.errors.googleAuthFailed'));
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg(t('auth.errors.emailRequired'));
      return;
    }

    if (authMode === AuthMode.FORGOT) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setSuccessMsg(t('auth.success.resetSent'));
      }, 700);
      return;
    }

    if (!password) {
      setErrorMsg(t('auth.errors.passwordRequired'));
      return;
    }

    setIsLoading(true);
    try {
      const user = authMode === AuthMode.REGISTER
        ? await api.registerWithEmail(name, email, password)
        : await api.loginWithEmail(email, password);
      if (onAuthSuccess) onAuthSuccess(user);
    } catch (err) {
      setErrorMsg(err.message || t('auth.errors.requestFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const bannerStyle = {
    background: 'var(--primary-glow)',
    border: '1px solid var(--border-glass-glow)',
    borderRadius: '10px',
    padding: '12px 14px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px'
  };
  const bannerIconStyle = {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'var(--primary-glow)',
    color: 'var(--primary-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  };

  return (
    <div className="auth-card">
      {/* Brand Header */}
      <div className="auth-brand-header">
        <div className="auth-brand-logo-text">
          timeboard <Sparkles size={18} style={{ color: TimelineColor.PRIMARY_LIGHT }} />
        </div>
      </div>

      {/* Invitation identified by its code */}
      {inviteInfo ? (
        <div style={bannerStyle}>
          <div style={bannerIconStyle}><Ticket size={15} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-main)', fontWeight: '700', fontSize: '0.86rem' }}>
              {t('auth.inviteCode.invitationFor', { timeboard: inviteInfo.timeboardName })}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px', lineHeight: 1.4 }}>
              {[inviteInfo.personName, inviteInfo.maskedEmail].filter(Boolean).join(' · ')}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '4px', lineHeight: 1.4 }}>
              {t('auth.inviteCode.continueHint')}
            </div>
            <button type="button" className="auth-link-btn" style={{ padding: 0, marginTop: '4px', fontSize: '0.74rem' }} onClick={clearInvite}>
              {t('auth.inviteCode.useAnother')}
            </button>
          </div>
        </div>
      ) : pendingInvite && (
        <div style={bannerStyle}>
          <div style={bannerIconStyle}><Send size={15} /></div>
          <div>
            <div style={{ color: 'var(--text-main)', fontWeight: '700', fontSize: '0.86rem' }}>
              {t('landing.badge')} {t('auth.googleButton')}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px', lineHeight: 1.4 }}>
              {t('landing.subtitle')}
            </div>
          </div>
        </div>
      )}

      {/* Error / Success Feedback */}
      {errorMsg && (
        <div className="auth-error-banner">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: `${TimelineColor.SUCCESS}26`,
            border: `1px solid ${TimelineColor.SUCCESS}66`,
            color: TimelineColor.SUCCESS,
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Invitation code entry */}
      {authMode === AuthMode.CODE ? (
        <form onSubmit={handleCheckCode} className="auth-form">
          <div className="auth-form-group">
            <label className="auth-label">{t('auth.inviteCode.label')}</label>
            <div className="auth-input-wrapper">
              <input
                type="text"
                className="auth-input"
                placeholder={t('auth.inviteCode.placeholder')}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                autoComplete="one-time-code"
                autoCapitalize="characters"
                style={{ letterSpacing: '3px', fontWeight: 700, textAlign: 'center' }}
                autoFocus
              />
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{t('auth.inviteCode.hint')}</span>
          </div>
          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? <span>{t('auth.processing')}</span> : (
              <>
                <ArrowRight size={16} />
                <span>{t('auth.inviteCode.check')}</span>
              </>
            )}
          </button>
        </form>
      ) : (
        <>
          {/* Google SSO Button */}
          {authMode !== AuthMode.FORGOT && (
            <>
              <button
                type="button"
                className="auth-google-btn"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill={GOOGLE_LOGO_COLORS.blue}
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill={GOOGLE_LOGO_COLORS.green}
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill={GOOGLE_LOGO_COLORS.yellow}
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill={GOOGLE_LOGO_COLORS.red}
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{t('auth.googleButton')}</span>
              </button>

              <div className="auth-divider">
                <span>{t('auth.orDivider')}</span>
              </div>
            </>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {authMode === AuthMode.REGISTER && (
              <div className="auth-form-group">
                <label className="auth-label">{t('auth.nameLabel')}</label>
                <div className="auth-input-wrapper">
                  <input
                    type="text"
                    className="auth-input"
                    placeholder={t('auth.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="auth-form-group">
              <label className="auth-label">{t('auth.emailLabel')}</label>
              <div className="auth-input-wrapper">
                <input
                  type="email"
                  className="auth-input"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {authMode !== AuthMode.FORGOT && (
              <div className="auth-form-group">
                <label className="auth-label">{t('auth.passwordLabel')}</label>
                <div className="auth-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={authMode === AuthMode.REGISTER ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? (
                <span>{t('auth.processing')}</span>
              ) : authMode === AuthMode.REGISTER ? (
                <>
                  <UserPlus size={16} />
                  <span>{t('auth.registerAndEnter')}</span>
                </>
              ) : authMode === AuthMode.FORGOT ? (
                <>
                  <Mail size={16} />
                  <span>{t('auth.sendResetButton')}</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>{t('auth.loginButton')}</span>
                </>
              )}
            </button>
          </form>
        </>
      )}

      {/* Footer Navigation Links */}
      <div className="auth-links">
        {authMode === AuthMode.LOGIN && (
          <>
            <button type="button" className="auth-link-btn" onClick={() => switchMode(AuthMode.REGISTER)}>
              {t('auth.createAccountLink')}
            </button>
            <button type="button" className="auth-link-btn" style={{ color: 'var(--text-muted)' }} onClick={() => switchMode(AuthMode.FORGOT)}>
              {t('auth.forgotLink')}
            </button>
          </>
        )}
        {authMode === AuthMode.REGISTER && (
          <button type="button" className="auth-link-btn" onClick={() => switchMode(AuthMode.LOGIN)}>
            {t('auth.hasAccountLink')}
          </button>
        )}
        {(authMode === AuthMode.FORGOT || authMode === AuthMode.CODE) && (
          <button type="button" className="auth-link-btn" onClick={() => switchMode(AuthMode.LOGIN)}>
            {t('auth.backToLogin')}
          </button>
        )}
        {authMode !== AuthMode.CODE && !inviteInfo && (
          <button type="button" className="auth-link-btn" onClick={() => switchMode(AuthMode.CODE)}>
            <Ticket size={13} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
            {t('auth.inviteCode.haveCode')}
          </button>
        )}
      </div>
    </div>
  );
}
