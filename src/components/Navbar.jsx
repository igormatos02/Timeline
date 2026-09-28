import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Sparkles,
  Sun,
  Moon,
  Settings,
  BarChart3,
  Users,
  LayoutGrid,
  ChevronDown,
  LogOut,
  Check
} from 'lucide-react';
import { getCurrentUser } from '../services/api';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { TimelineColor } from '../enums/index.js';
import { isGlobalTenant } from '../constants/tenant.js';
import VersionBadge from './ui/VersionBadge.jsx';
import LogoutConfirmModal from './LogoutConfirmModal.jsx';
import Tooltip from './ui/Tooltip.jsx';

export default function Navbar({
  theme,
  onToggleTheme,
  onNavigateToHub,
  onLogout,
  onOpenEntities,
  onOpenReports,
  onOpenSettings
}) {
  const currentUser = getCurrentUser() || {
    name: 'Igor Matos',
    avatarInitials: 'IM',
    tenantName: 'Espaço Pessoal'
  };
  const { language, setLanguage, t } = useTranslation();

  return (
    <header className="app-header">
      <div className="header-content">
        {/* Brand Logo */}
        <div
          className="brand-logo"
          onClick={onNavigateToHub}
          style={{ cursor: onNavigateToHub ? 'pointer' : 'default' }}
          title={onNavigateToHub ? t('header.viewHub') : undefined}
        >
          <div className="logo-icon">
            <Clock size={22} />
          </div>
          <div>
            <div className="brand-title">
              Timeboard <Sparkles size={16} style={{ color: 'var(--primary-light)' }} />
            </div>
          </div>
          <VersionBadge style={{ marginLeft: '4px' }} />
        </div>

        {/* Actions & User Profile */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Active Workspace / Timeboard Quick Actions (Icon-only with rich hints) */}
          {(onNavigateToHub || onOpenEntities || onOpenReports || onOpenSettings) && (
            <div
              className="header-workspace-actions"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {onNavigateToHub && (
                <Tooltip content={t('header.viewHubTooltip')}>
                  <button
                    type="button"
                    className="header-icon-action-btn"
                    onClick={onNavigateToHub}
                    aria-label={t('header.viewHubTooltip')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: '9px',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-glass)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.14)';
                      e.currentTarget.style.borderColor = 'var(--border-glass-glow)';
                      e.currentTarget.style.color = 'var(--primary-light)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-glass)';
                      e.currentTarget.style.borderColor = 'var(--border-glass)';
                      e.currentTarget.style.color = 'var(--text-main)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <LayoutGrid size={18} />
                  </button>
                </Tooltip>
              )}

              {onOpenEntities && (
                <Tooltip content={t('header.entitiesTooltip')}>
                  <button
                    type="button"
                    className="header-icon-action-btn"
                    onClick={onOpenEntities}
                    aria-label={t('header.entitiesTooltip')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: '9px',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-glass)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.14)';
                      e.currentTarget.style.borderColor = 'var(--border-glass-glow)';
                      e.currentTarget.style.color = 'var(--primary-light)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-glass)';
                      e.currentTarget.style.borderColor = 'var(--border-glass)';
                      e.currentTarget.style.color = 'var(--text-main)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <Users size={18} />
                  </button>
                </Tooltip>
              )}

              {onOpenReports && (
                <Tooltip content={t('header.reportsTooltip')}>
                  <button
                    type="button"
                    className="header-icon-action-btn"
                    onClick={onOpenReports}
                    aria-label={t('header.reportsTooltip')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: '9px',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-glass)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.14)';
                      e.currentTarget.style.borderColor = 'var(--border-glass-glow)';
                      e.currentTarget.style.color = 'var(--primary-light)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-glass)';
                      e.currentTarget.style.borderColor = 'var(--border-glass)';
                      e.currentTarget.style.color = 'var(--text-main)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <BarChart3 size={18} />
                  </button>
                </Tooltip>
              )}

              {onOpenSettings && (
                <Tooltip content={t('header.settingsTooltip')}>
                  <button
                    type="button"
                    className="header-icon-action-btn"
                    onClick={onOpenSettings}
                    aria-label={t('header.settingsTooltip')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: '9px',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-glass)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.14)';
                      e.currentTarget.style.borderColor = 'var(--border-glass-glow)';
                      e.currentTarget.style.color = 'var(--primary-light)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-glass)';
                      e.currentTarget.style.borderColor = 'var(--border-glass)';
                      e.currentTarget.style.color = 'var(--text-main)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <Settings size={18} />
                  </button>
                </Tooltip>
              )}

              {/* Subtle divider separating workspace tools from system settings */}
              <div
                style={{
                  width: '1px',
                  height: '20px',
                  background: 'var(--border-glass)',
                  margin: '0 4px'
                }}
              />
            </div>
          )}

          {/* Discreet Language Dropdown */}
          <LanguageDropdown language={language} setLanguage={setLanguage} />

          {/* Theme Toggle */}
          <Tooltip content={theme === 'light' ? t('header.toggleThemeDark') : t('header.toggleThemeLight')}>
            <button
              className="theme-toggle-btn"
              onClick={onToggleTheme}
              aria-label={theme === 'light' ? t('header.toggleThemeDark') : t('header.toggleThemeLight')}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </Tooltip>

          {/* 👤 Logged In User Dropdown */}
          <UserDropdown currentUser={currentUser} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}

function LanguageDropdown({ language, setLanguage }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: 'inline-block'
      }}
    >
      {/* Discreet Language Badge Trigger (Outside: only PT or EN) */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          height: '36px',
          padding: '0 10px',
          borderRadius: '9px',
          background: isOpen ? 'rgba(99, 102, 241, 0.16)' : 'var(--bg-glass)',
          border: isOpen ? '1px solid var(--border-glass-glow)' : '1px solid var(--border-glass)',
          color: 'var(--text-main)',
          cursor: 'pointer',
          fontSize: '0.76rem',
          fontWeight: '700',
          letterSpacing: '0.5px',
          userSelect: 'none',
          transition: 'all 0.15s ease'
        }}
        title={t('header.selectLanguage')}
      >
        <span>{language.toUpperCase()}</span>
        <ChevronDown
          size={12}
          style={{
            color: 'var(--text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease'
          }}
        />
      </div>

      {/* Floating Language Options with Flags Inside */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '160px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-glass-glow)',
            borderRadius: '10px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5), 0 0 16px rgba(99, 102, 241, 0.15)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '4px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setLanguage('pt');
              setIsOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              borderRadius: '6px',
              border: 'none',
              background: language === 'pt' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: language === 'pt' ? 'var(--primary-light)' : 'var(--text-main)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: language === 'pt' ? '700' : '500',
              transition: 'background 0.15s ease',
              textAlign: 'left',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              if (language !== 'pt') e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
            }}
            onMouseLeave={(e) => {
              if (language !== 'pt') e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>🇵🇹</span>
              <span>{t('header.languagePt')}</span>
            </span>
            {language === 'pt' && (
              <Check size={14} style={{ color: 'var(--primary)' }} />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setLanguage('en');
              setIsOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              borderRadius: '6px',
              border: 'none',
              background: language === 'en' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: language === 'en' ? 'var(--primary-light)' : 'var(--text-main)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: language === 'en' ? '700' : '500',
              transition: 'background 0.15s ease',
              textAlign: 'left',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              if (language !== 'en') e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
            }}
            onMouseLeave={(e) => {
              if (language !== 'en') e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>🇬🇧</span>
              <span>{t('header.languageEn')}</span>
            </span>
            {language === 'en' && (
              <Check size={14} style={{ color: 'var(--primary)' }} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function UserDropdown({ currentUser, onLogout }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);
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

  return (
    <>
      <div
        ref={dropdownRef}
        style={{
          position: 'relative',
          display: 'inline-block'
        }}
      >
        <div
          className="user-profile-badge"
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            padding: '4px 10px 4px 6px',
            background: isOpen ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.08)',
            border: '1px solid var(--border-glass-glow)',
            borderRadius: '9999px',
            marginLeft: '6px',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'all 0.2s ease'
          }}
          title={t('header.userProfile')}
        >
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${TimelineColor.PRIMARY} 0%, ${TimelineColor.PURPLE} 100%)`,
              color: TimelineColor.WHITE,
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
                background: TimelineColor.SUCCESS,
                border: '1.5px solid var(--bg-card)',
                borderRadius: '50%'
              }}
              title="Online"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: 1.15 }}>
              {currentUser.name}
            </span>
            {!isGlobalTenant(currentUser?.tenantId, currentUser?.tenantName) && (
              <span style={{ fontSize: '0.64rem', color: 'var(--primary-light)', fontWeight: '600' }}>
                {currentUser.tenantName}
              </span>
            )}
          </div>
          <ChevronDown
            size={14}
            style={{
              color: 'var(--text-muted)',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
              marginLeft: '2px'
            }}
          />
        </div>

        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '210px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-glass-glow)',
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
            {/* User Info Header */}
            <div style={{ padding: '6px 8px 6px 8px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: 1.2 }}>
                {currentUser.name}
              </div>
              {!isGlobalTenant(currentUser?.tenantId, currentUser?.tenantName) ? (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {currentUser.tenantName}
                </div>
              ) : currentUser.email ? (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {currentUser.email}
                </div>
              ) : null}
            </div>

            <div style={{ height: '1px', background: 'var(--border-glass)', margin: '2px 0' }} />

            {/* Option: Definições de Conta */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Settings size={15} style={{ color: 'var(--primary-light)' }} />
              <span>{t('header.accountSettings')}</span>
            </button>

            <div style={{ height: '1px', background: 'var(--border-glass)', margin: '2px 0' }} />

            {/* Option: Sair (Logout) */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsLogoutModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'transparent',
                border: 'none',
                color: TimelineColor.DANGER,
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <LogOut size={15} style={{ color: TimelineColor.DANGER }} />
              <span>{t('header.logout')}</span>
            </button>
          </div>
        )}
      </div>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={onLogout}
      />
    </>
  );
}


