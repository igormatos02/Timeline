import React, { useState } from 'react';
import {
  Clock,
  Sparkles,
  Plus,
  Search,
  Settings,
  Trash2,
  Wallet,
  FolderKanban,
  LogOut,
  Moon,
  Sun,
  Calendar,
  Layers,
  ArrowRight,
  Share2,
  ChevronDown,
  Home
} from 'lucide-react';
import { TimeboardType, TimelineColor, PersonRole } from '../../enums/index.js';
import { isGlobalTenant } from '../../constants/tenant.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import LogoutConfirmModal from '../LogoutConfirmModal.jsx';
import './TimeboardsHub.css';

export default function TimeboardsHub({
  timeboards = [],
  myTimeboards: initialMyTimeboards = null,
  sharedTimeboards: initialSharedTimeboards = null,
  currentUser,
  onSelectTimeboard,
  onOpenCreateTimeboard,
  onOpenEditTimeboard,
  onDeleteTimeboard,
  onLogout,
  theme,
  onToggleTheme,
  language,
  onToggleLanguage,
  t: propT
}) {
  const { t: hookT } = useTranslation();
  const t = propT || hookT;
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const userMenuRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resolve my and shared lists
  const currentUserId = currentUser?.id;
  const myTimeboards = initialMyTimeboards || timeboards.filter(
    (tb) => !tb.isShared && (tb.ownerId === currentUserId || tb.userId === currentUserId || !tb.ownerId)
  );
  const sharedTimeboards = initialSharedTimeboards || timeboards.filter(
    (tb) => tb.isShared || (tb.ownerId && tb.ownerId !== currentUserId && tb.userId !== currentUserId)
  );

  const filterList = (list) => {
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(
      (tb) => tb.name?.toLowerCase().includes(q) || tb.description?.toLowerCase().includes(q)
    );
  };

  const filteredMy = filterList(myTimeboards);
  const filteredShared = filterList(sharedTimeboards);

  const getTypeDetails = (type) => {
    if (type === TimeboardType.EMPTY || type === 'empty') {
      return {
        label: t('timeboardsHub.typeEmpty'),
        color: TimelineColor.EMPTY,
        bg: `rgba(100, 116, 139, 0.15)`,
        border: `rgba(100, 116, 139, 0.3)`,
        icon: <Layers size={20} style={{ color: TimelineColor.EMPTY }} />
      };
    }
    if (type === TimeboardType.PROJECT || type === TimeboardType.PROJECTS || type === 'projects' || type === 'project') {
      return {
        label: t('timeboardsHub.typeProject'),
        color: TimelineColor.BLUE,
        bg: 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.3)',
        icon: <FolderKanban size={20} style={{ color: TimelineColor.BLUE }} />
      };
    }
    if (type === TimeboardType.REMINDERS || type === 'reminders' || type === 'reminder') {
      return {
        label: t('timeboardsHub.typeReminders'),
        color: TimelineColor.WARNING,
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.3)',
        icon: <Calendar size={20} style={{ color: TimelineColor.WARNING }} />
      };
    }
    if (type === TimeboardType.CONDOFLOW || type === 'condoflow') {
      return {
        label: t('timeboardsHub.typeCondoflow'),
        color: TimelineColor.CONDOFLOW,
        bg: 'rgba(166, 128, 105, 0.15)',
        border: 'rgba(166, 128, 105, 0.3)',
        icon: <Home size={20} style={{ color: TimelineColor.CONDOFLOW }} />
      };
    }
    return {
      label: t('timeboardsHub.typeFinancial'),
      color: TimelineColor.FINANCIAL,
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.3)',
      icon: <Wallet size={20} style={{ color: TimelineColor.FINANCIAL }} />
    };
  };

  const renderTimeboardCard = (tb, isShared = false) => {
    const typeInfo = getTypeDetails(tb.type);
    return (
      <div
        key={tb.id}
        className="hub-timeboard-card"
        onClick={() => onSelectTimeboard(tb.id)}
      >
        <div>
          <div className="hub-card-header">
            <div
              className="hub-card-icon"
              style={{ background: typeInfo.bg, border: `1px solid ${typeInfo.border}` }}
            >
              {typeInfo.icon}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isShared && (
                <span
                  className="hub-card-badge"
                  style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: TimelineColor.PURPLE,
                    border: '1px solid rgba(168, 85, 247, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Partilhado consigo via Timeboard Members"
                >
                  <Share2 size={11} />
                  <span>
                    {tb.role === PersonRole.ADMIN
                      ? t('timeboardsHub.roles.admin')
                      : tb.role === PersonRole.INDIVIDUAL
                      ? t('timeboardsHub.roles.individual')
                      : tb.role === PersonRole.CONTRIBUTOR
                      ? t('timeboardsHub.roles.contributor')
                      : t('timeboardModal.typeShared')}
                  </span>
                </span>
              )}
              <span
                className="hub-card-badge"
                style={{
                  background: typeInfo.bg,
                  color: typeInfo.color,
                  border: `1px solid ${typeInfo.border}`
                }}
              >
                {typeInfo.label}
              </span>
            </div>
          </div>

          <div className="hub-card-body" style={{ marginTop: '14px' }}>
            <h3 className="hub-card-title">{tb.name}</h3>
            <p className="hub-card-desc">
              {tb.description || t('timeboardsHub.noDescription')}
            </p>
          </div>
        </div>

        <div className="hub-card-footer" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: 'var(--primary-light)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            onClick={() => onSelectTimeboard(tb.id)}
          >
            <span>{t('timeboardsHub.openButton')}</span>
            <ArrowRight size={14} />
          </button>

          <div className="hub-card-actions">
            <button
              type="button"
              className="hub-card-action-btn"
              title={t('timeboardsHub.settingsTitle')}
              onClick={() => onOpenEditTimeboard(tb)}
            >
              <Settings size={15} />
            </button>
            {!isShared && onDeleteTimeboard && (
              <button
                type="button"
                className="hub-card-action-btn"
                style={{ color: TimelineColor.DANGER }}
                title={t('timeboardsHub.deleteTitle')}
                onClick={() => onDeleteTimeboard(tb.id)}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="hub-container">
      {/* Header */}
      <header className="hub-header">
        <div className="hub-brand">
          <div className="hub-brand-icon">
            <Clock size={20} />
          </div>
          <span>Timeboard <Sparkles size={15} style={{ color: TimelineColor.PRIMARY }} /></span>
        </div>

        <div className="hub-header-actions">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={onToggleLanguage}
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-main)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            {language === 'pt' ? '🇵🇹 PT' : '🇬🇧 EN'}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-main)',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* User Profile Pill & Dropdown */}
          <div ref={userMenuRef} style={{ position: 'relative', display: 'inline-block' }}>
            <div
              className="hub-user-pill"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
              title={t('header.userProfile')}
            >
              <div className="hub-user-avatar">
                {currentUser?.avatarInitials || 'IM'}
              </div>
              <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>
                {currentUser?.name || 'Igor Matos'}
              </span>
              <ChevronDown
                size={14}
                style={{
                  color: 'var(--text-muted)',
                  transform: isUserMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  marginLeft: '2px'
                }}
              />
            </div>

            {isUserMenuOpen && (
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
                    {currentUser?.name || 'Igor Matos'}
                  </div>
                  {!isGlobalTenant(currentUser?.tenantId, currentUser?.tenantName) ? (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {currentUser.tenantName}
                    </div>
                  ) : currentUser?.email ? (
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
                    setIsUserMenuOpen(false);
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
                    setIsUserMenuOpen(false);
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
        </div>
      </header>

      {/* Main Content */}
      <main className="hub-main">
        {/* Banner */}
        <section className="hub-hero-banner">
          <div>
            <h1 className="hub-greeting-title">
              {t('timeboardsHub.greetingTitle', { name: currentUser?.name ? currentUser.name.split(' ')[0] : 'Igor' })}
            </h1>
            <p className="hub-greeting-subtitle">
              {t('timeboardsHub.greetingSubtitle')}
            </p>
          </div>

          <div className="hub-stats-row">
            <div className="hub-stat-item">
              <span className="hub-stat-val">{myTimeboards.length}</span>
              <span className="hub-stat-lbl">{t('timeboardsHub.stats.myTimeboards')}</span>
            </div>
            <div className="hub-stat-item">
              <span className="hub-stat-val" style={{ color: TimelineColor.PURPLE }}>
                {sharedTimeboards.length}
              </span>
              <span className="hub-stat-lbl">{t('timeboardsHub.stats.shared')}</span>
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className="hub-controls-bar">
          <div className="hub-search-wrapper">
            <Search size={16} className="hub-search-icon" />
            <input
              type="text"
              className="hub-search-input"
              placeholder={t('timeboardsHub.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="hub-create-btn"
              onClick={onOpenCreateTimeboard}
            >
              <Plus size={16} />
              <span>{t('timeboardsHub.createButton')}</span>
            </button>
          </div>
        </section>

        {/* Section 1: My Timeboards */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: TimelineColor.PRIMARY }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {t('timeboardsHub.myTimeboards')}
              </h2>
              <span
                style={{
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: TimelineColor.PRIMARY,
                  padding: '2px 8px',
                  borderRadius: '100px',
                  fontSize: '0.78rem',
                  fontWeight: '700'
                }}
              >
                {filteredMy.length}
              </span>
            </div>
          </div>

          <div className="hub-grid">
            {/* Add Timeboard Action Card */}
            <div
              className="hub-add-card"
              onClick={onOpenCreateTimeboard}
              role="button"
              tabIndex={0}
            >
              <div className="hub-add-icon-circle">
                <Plus size={24} />
              </div>
              <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-main)' }}>
                {t('timeboardsHub.createTitle')}
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary, var(--text-dim))', maxWidth: '220px' }}>
                {t('timeboardsHub.createDesc')}
              </div>
            </div>

            {/* List of My Timeboards */}
            {filteredMy.map((tb) => renderTimeboardCard(tb, false))}
          </div>
        </section>

        {/* Section 2: Shared Dashboards */}
        {filteredShared.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: TimelineColor.PURPLE }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>
                  {t('timeboardsHub.sharedDashboards')}
                </h2>
                <span
                  style={{
                    background: 'rgba(168, 85, 247, 0.12)',
                    color: TimelineColor.PURPLE,
                    padding: '2px 8px',
                    borderRadius: '100px',
                    fontSize: '0.78rem',
                    fontWeight: '700'
                  }}
                >
                  {filteredShared.length}
                </span>
              </div>
            </div>

            <div className="hub-grid">
              {filteredShared.map((tb) => renderTimeboardCard(tb, true))}
            </div>
          </section>
        )}
      </main>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={onLogout}
      />
    </div>
  );
}
