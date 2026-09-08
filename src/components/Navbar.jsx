import React from 'react';
import { Clock, Plus, LayoutGrid, Sparkles, Sun, Moon, LocateFixed, User, Shield, Settings, ChevronDown } from 'lucide-react';
import { getCurrentUser } from '../services/api';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function Navbar({
  timeboards = [],
  activeTimeboardId,
  onSelectTimeboard,
  onOpenCreateTimeboard,
  onOpenEditTimeboard,
  onScrollToToday,
  theme,
  onToggleTheme
}) {
  const currentUser = getCurrentUser();
  const { language, setLanguage, t } = useTranslation();

  const activeTimeboard = timeboards.find((tb) => tb.id === activeTimeboardId);

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

        {/* Custom Premium Timeboard Selector Dropdown & Settings Button */}
        <TimeboardDropdownSelector
          timeboards={timeboards}
          activeTimeboard={activeTimeboard}
          activeTimeboardId={activeTimeboardId}
          onSelectTimeboard={onSelectTimeboard}
          onOpenEditTimeboard={onOpenEditTimeboard}
        />

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

function TimeboardDropdownSelector({
  timeboards,
  activeTimeboard,
  activeTimeboardId,
  onSelectTimeboard,
  onOpenEditTimeboard
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formattedType = activeTimeboard?.type
    ? activeTimeboard.type.charAt(0).toUpperCase() + activeTimeboard.type.slice(1).toLowerCase()
    : 'Financial';

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: 'inline-block'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-card)',
          padding: '6px 10px 6px 12px',
          borderRadius: 'var(--radius-md, 10px)',
          border: '1px solid var(--border-glass, rgba(255,255,255,0.12))',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <LayoutGrid size={17} style={{ color: 'var(--primary)', flexShrink: 0 }} />

        {/* Selected Timeboard Info */}
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: '130px' }}>
          <span
            style={{
              fontSize: '0.86rem',
              fontWeight: '700',
              color: 'var(--text-main)',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '160px'
            }}
          >
            {activeTimeboard?.name || 'Selecione Timeboard'}
          </span>
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: '600',
              color: 'var(--primary-light)',
              lineHeight: 1,
              marginTop: '1px'
            }}
          >
            {formattedType}
          </span>
        </div>

        <ChevronDown
          size={15}
          style={{
            color: 'var(--text-muted)',
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            marginLeft: '4px'
          }}
        />

        {/* Settings Icon Button */}
        {onOpenEditTimeboard && activeTimeboard && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
              onOpenEditTimeboard(activeTimeboard);
            }}
            title="Timeboard Settings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              color: 'var(--primary-light)',
              cursor: 'pointer',
              padding: '5px',
              borderRadius: '6px',
              marginLeft: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            <Settings size={15} />
          </button>
        )}
      </div>

      {/* Floating Glassmorphism Options Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '240px',
            background: 'var(--bg-card, #131722)',
            border: '1px solid var(--border-glass-glow, rgba(99, 102, 241, 0.3))',
            borderRadius: '12px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.15)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '6px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '3px'
          }}
        >
          <div
            style={{
              padding: '6px 8px 4px 8px',
              fontSize: '0.68rem',
              fontWeight: '800',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Selecione o Timeboard
          </div>

          {timeboards.map((tb) => {
            const isSelected = tb.id === activeTimeboardId;
            const itemType = tb.type
              ? tb.type.charAt(0).toUpperCase() + tb.type.slice(1).toLowerCase()
              : 'Financial';

            return (
              <div
                key={tb.id}
                onClick={() => {
                  if (onSelectTimeboard) onSelectTimeboard(tb.id);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  border: isSelected ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                  <span
                    style={{
                      fontSize: '0.86rem',
                      fontWeight: isSelected ? '700' : '600',
                      color: isSelected ? 'var(--primary-light)' : 'var(--text-main)',
                      lineHeight: 1.2
                    }}
                  >
                    {tb.name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: isSelected ? '#818cf8' : 'var(--text-dim, #94a3b8)',
                      fontWeight: '500'
                    }}
                  >
                    {itemType}
                  </span>
                </div>

                {isSelected && (
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--primary, #6366f1)',
                      boxShadow: '0 0 8px #6366f1'
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

