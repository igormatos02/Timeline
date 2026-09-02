import React from 'react';
import { Clock, Plus, LayoutGrid, Sparkles, Sun, Moon, LocateFixed, User, Shield } from 'lucide-react';
import { getCurrentUser } from '../services/api';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function Navbar({
  timeboards = [],
  activeTimeboardId,
  onSelectTimeboard,
  onOpenCreateTimeboard,
  onScrollToToday,
  theme,
  onToggleTheme
}) {
  const currentUser = getCurrentUser();
  const { language, setLanguage, t } = useTranslation();

  return (
    <header className="app-header">
      <div className="header-content">
        {/* Brand Logo */}
        <div className="brand-logo">
          <div className="logo-icon">
            <Clock size={22} />
          </div>
          <div>
            <div className="brand-title">
              Chrono Timeboard <Sparkles size={16} style={{ color: '#818cf8' }} />
            </div>
            <div className="brand-subtitle">{t('header.brandSubtitle')}</div>
          </div>
        </div>

        {/* Timeboard Selector Dropdown */}
        <div className="timeline-selector-wrapper" title={t('header.selectTimeboard')}>
          <LayoutGrid size={18} style={{ color: 'var(--primary)' }} />
          <select
            className="timeline-select"
            value={activeTimeboardId}
            onChange={(e) => onSelectTimeboard && onSelectTimeboard(e.target.value)}
          >
            {timeboards.map((tb) => (
              <option key={tb.id} value={tb.id}>
                {tb.name}
              </option>
            ))}
          </select>
        </div>

        {/* Actions & User Profile */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Language Toggle UK / PT */}
          <div
            className="language-selector-group"
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '2px',
              gap: '2px'
            }}
          >
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              title="English (UK)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: 'none',
                background: language === 'en' ? 'var(--primary)' : 'transparent',
                color: language === 'en' ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: language === 'en' ? '700' : '500',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>🇬🇧</span>
              <span>EN</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage('pt')}
              className={`lang-btn ${language === 'pt' ? 'active' : ''}`}
              title="Português (PT)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: 'none',
                background: language === 'pt' ? 'var(--primary)' : 'transparent',
                color: language === 'pt' ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: language === 'pt' ? '700' : '500',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>🇵🇹</span>
              <span>PT</span>
            </button>
          </div>

          {/* Botão Ir para Hoje / Atual */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onScrollToToday}
            style={{
              background: 'rgba(99, 102, 241, 0.15)',
              borderColor: 'var(--primary-light)',
              color: 'var(--primary-light)',
              fontWeight: '700'
            }}
            title={t('header.goToTodayTitle')}
          >
            <LocateFixed size={16} />
            <span>{t('header.goToToday')}</span>
          </button>

          {/* Theme Toggle */}
          <button
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={theme === 'light' ? t('header.toggleThemeDark') : t('header.toggleThemeLight')}
            aria-label="Alternar tema"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Novo Timeboard Button (Primary Style) */}
          <button
            className="btn btn-primary btn-sm"
            onClick={onOpenCreateTimeboard}
            title={t('header.createTimeboardTitle')}
          >
            <Plus size={16} />
            <span>{t('header.newTimeboard')}</span>
          </button>

          {/* 👤 Logged In User Pill / Avatar */}
          <div
            className="user-profile-badge"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '4px 12px 4px 6px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid var(--border-glass-glow)',
              borderRadius: '9999px',
              marginLeft: '6px',
              cursor: 'default',
              userSelect: 'none',
              transition: 'all 0.2s ease'
            }}
            title={`Utilizador Ativo: ${currentUser.name} (${currentUser.role}) • ${currentUser.tenantName}`}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '0.78rem',
                letterSpacing: '0.5px',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                position: 'relative'
              }}
            >
              {currentUser.avatarInitials}
              <span
                style={{
                  position: 'absolute',
                  bottom: '-1px',
                  right: '-1px',
                  width: '8px',
                  height: '8px',
                  background: '#10b981',
                  border: '1.5px solid var(--bg-card)',
                  borderRadius: '50%'
                }}
                title="Online / Ativo"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: 1.15 }}>
                {currentUser.name}
              </span>
              <span style={{ fontSize: '0.64rem', color: 'var(--primary-light)', fontWeight: '600' }}>
                {currentUser.tenantName}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

