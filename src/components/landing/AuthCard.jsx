import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import * as api from '../../services/api.js';

export default function AuthCard({ onAuthSuccess, initialEmail = '', pendingInvite = null, t }) {
  const [authMode, setAuthMode] = useState(initialEmail ? 'register' : 'login'); // 'login' | 'register' | 'forgot'
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
      setAuthMode('register');
    }
  }, [initialEmail]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      await api.loginWithGoogle(pendingInvite);
    } catch (err) {
      setErrorMsg(err.message || 'Falha ao autenticar com a Google.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('Por favor introduza o seu email.');
      return;
    }

    if (authMode === 'forgot') {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setSuccessMsg('Enviámos um link de recuperação para o seu email!');
      }, 700);
      return;
    }

    if (!password) {
      setErrorMsg('Por favor introduza a sua palavra-passe.');
      return;
    }

    setIsLoading(true);
    try {
      let user;
      if (authMode === 'register') {
        user = await api.registerWithEmail(name, email, password);
      } else {
        user = await api.loginWithEmail(email, password);
      }
      if (onAuthSuccess) onAuthSuccess(user);
    } catch (err) {
      setErrorMsg(err.message || 'Ocorreu um erro ao processar o pedido.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card">
      {/* Brand Header */}
      <div className="auth-brand-header">
        <div className="auth-brand-logo-text">
          timeboard <Sparkles size={18} style={{ color: '#818cf8' }} />
        </div>
      </div>

      {/* Pending Invite Banner */}
      {pendingInvite && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.15) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.3)',
              color: '#c7d2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Send size={15} />
          </div>
          <div>
            <div style={{ color: '#ffffff', fontWeight: '700', fontSize: '0.86rem' }}>
              Convite para Timeboard Recebido! 🎉
            </div>
            <div style={{ color: '#cbd5e1', fontSize: '0.78rem', marginTop: '2px', lineHeight: 1.4 }}>
              Inicie sessão ou crie a sua conta para aceder diretamente ao dashboard partilhado.
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
            background: 'rgba(46, 160, 67, 0.15)',
            border: '1px solid rgba(46, 160, 67, 0.4)',
            color: '#3fb950',
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

      {/* Google SSO Button */}
      {authMode !== 'forgot' && (
        <>
          <button
            type="button"
            className="auth-google-btn"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Entrar com Google</span>
          </button>

          <div className="auth-divider">
            <span>ou</span>
          </div>
        </>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="auth-form">
        {authMode === 'register' && (
          <div className="auth-form-group">
            <label className="auth-label">Nome Completo</label>
            <div className="auth-input-wrapper">
              <input
                type="text"
                className="auth-input"
                placeholder="Ex: Igor Matos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          </div>
        )}

        <div className="auth-form-group">
          <label className="auth-label">Email</label>
          <div className="auth-input-wrapper">
            <input
              type="email"
              className="auth-input"
              placeholder="nome@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        </div>

        {authMode !== 'forgot' && (
          <div className="auth-form-group">
            <label className="auth-label">Palavra-passe</label>
            <div className="auth-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
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
            <span>A processar...</span>
          ) : authMode === 'register' ? (
            <>
              <UserPlus size={16} />
              <span>Criar Conta & Entrar</span>
            </>
          ) : authMode === 'forgot' ? (
            <>
              <Mail size={16} />
              <span>Enviar Link de Recuperação</span>
            </>
          ) : (
            <>
              <LogIn size={16} />
              <span>Entrar</span>
            </>
          )}
        </button>
      </form>

      {/* Footer Navigation Links */}
      <div className="auth-links">
        {authMode === 'login' ? (
          <>
            <button
              type="button"
              className="auth-link-btn"
              onClick={() => {
                setAuthMode('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
            >
              Criar uma conta
            </button>
            <button
              type="button"
              className="auth-link-btn"
              style={{ color: '#8b949e' }}
              onClick={() => {
                setAuthMode('forgot');
                setErrorMsg('');
                setSuccessMsg('');
              }}
            >
              Esqueci-me da palavra-passe
            </button>
          </>
        ) : authMode === 'register' ? (
          <button
            type="button"
            className="auth-link-btn"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            Já tem conta? Entrar
          </button>
        ) : (
          <button
            type="button"
            className="auth-link-btn"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            ← Voltar ao início de sessão
          </button>
        )}
      </div>
    </div>
  );
}
