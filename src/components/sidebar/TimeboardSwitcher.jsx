import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Settings,
  ChevronDown,
  Plus,
  Search,
  Home,
  Wallet,
  FolderKanban,
  Calendar,
  Layers,
  X,
  LayoutGrid
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { TimelineColor, PersonRole, TimeboardType } from '../../enums/index.js';

function getTimeboardTypeMeta(type, t) {
  if (type === TimeboardType.EMPTY || type === 'empty') {
    return {
      label: t('timeboardsHub.typeEmpty'),
      color: TimelineColor.EMPTY,
      Icon: Layers
    };
  }
  if (type === TimeboardType.PROJECT || type === TimeboardType.PROJECTS || type === 'projects' || type === 'project') {
    return {
      label: t('timeboardsHub.typeProject'),
      color: TimelineColor.BLUE,
      Icon: FolderKanban
    };
  }
  if (type === TimeboardType.REMINDERS || type === 'reminders' || type === 'reminder') {
    return {
      label: t('timeboardsHub.typeReminders'),
      color: TimelineColor.WARNING,
      Icon: Calendar
    };
  }
  if (type === TimeboardType.CONDOFLOW || type === 'condoflow') {
    return {
      label: t('timeboardsHub.typeCondoflow'),
      color: TimelineColor.CONDOFLOW,
      Icon: Home
    };
  }
  return {
    label: t('timeboardsHub.typeFinancial'),
    color: TimelineColor.FINANCIAL,
    Icon: Wallet
  };
}

function getRoleBadgeLabel(timeboard, t) {
  if (timeboard?.role === PersonRole.ADMIN) {
    return t('timeboardSettings.entities.roles.admin');
  }
  if (timeboard?.role === PersonRole.INDIVIDUAL) {
    return t('timeboardSettings.entities.roles.individual');
  }
  if (timeboard?.role === PersonRole.CONTRIBUTOR) {
    return t('timeboardSettings.entities.roles.contributor');
  }
  return t('timeboardModal.templateShared');
}

export default function TimeboardSwitcher({
  timeboards = [],
  activeTimeboard,
  activeTimeboardId,
  onSelectTimeboard,
  onOpenEditTimeboard,
  onOpenCreateTimeboard,
  onNavigateToHub,
  currentUser
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const activeMeta = getTimeboardTypeMeta(activeTimeboard?.type, t);
  const ActiveIcon = activeMeta.Icon;

  const currentUserId = currentUser?.id;
  const isNotOwner = activeTimeboard && (activeTimeboard.isShared || (activeTimeboard.ownerId && currentUserId && activeTimeboard.ownerId !== currentUserId));

  const filteredTimeboards = useMemo(() => {
    if (!searchTerm.trim()) return timeboards;
    const q = searchTerm.toLowerCase();
    return timeboards.filter(
      (tb) => tb.name?.toLowerCase().includes(q) || tb.description?.toLowerCase().includes(q)
    );
  }, [timeboards, searchTerm]);

  return (
    <div
      ref={dropdownRef}
      className="sidebar-unified-header"
    >
      {/* Unified Sidebar Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          gap: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          background: isOpen ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
          transition: 'background 0.15s ease'
        }}
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.06)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'transparent';
        }}
        title={t('header.switchTimeboard')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
          {/* Type Icon Badge */}
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeMeta.color,
              flexShrink: 0
            }}
          >
            <ActiveIcon size={15} />
          </div>

          {/* Timeboard Info */}
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: '0.84rem',
                fontWeight: '700',
                color: 'var(--text-main)',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {activeTimeboard?.name || t('header.selectTimeboard')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: '600',
                  color: 'var(--primary-light)',
                  lineHeight: 1
                }}
              >
                {activeMeta.label}
              </span>
              {isNotOwner && (
                <span
                  style={{
                    fontSize: '0.58rem',
                    fontWeight: '700',
                    color: TimelineColor.PURPLE,
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: '4px',
                    padding: '1px 4px',
                    lineHeight: 1
                  }}
                >
                  {getRoleBadgeLabel(activeTimeboard, t)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions: Direct Settings Button + Chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {onOpenEditTimeboard && activeTimeboard && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onOpenEditTimeboard(activeTimeboard);
              }}
              title={t('header.timeboardSettings')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                color: 'var(--primary-light)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
              }}
            >
              <Settings size={14} />
            </button>
          )}

          <ChevronDown
            size={15}
            style={{
              color: 'var(--text-muted)',
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          />
        </div>
      </div>

      {/* Floating Glassmorphism Workspace Switcher Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '100%',
            minWidth: '280px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-glass-glow)',
            borderRadius: '14px',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.55), 0 0 24px rgba(99, 102, 241, 0.15)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '10px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {/* Active Timeboard Card with dedicated settings button */}
          {activeTimeboard && (
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '10px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: 'var(--bg-glass)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: activeMeta.color,
                      flexShrink: 0
                    }}
                  >
                    <ActiveIcon size={14} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.64rem',
                        fontWeight: '700',
                        color: 'var(--text-dim)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        lineHeight: 1
                      }}
                    >
                      {t('header.activeTimeboard')}
                    </div>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '2px',
                        maxWidth: '180px'
                      }}
                    >
                      {activeTimeboard.name}
                    </div>
                  </div>
                </div>
              </div>

              {onOpenEditTimeboard && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenEditTimeboard(activeTimeboard);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '7px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: 'var(--primary-light)',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Settings size={14} />
                  <span>{t('header.timeboardSettings')}</span>
                </button>
              )}
            </div>
          )}

          {/* Search Bar if > 2 timeboards */}
          {timeboards.length > 2 && (
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '9px',
                  color: 'var(--text-dim)',
                  pointerEvents: 'none'
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('header.searchTimeboards')}
                style={{
                  width: '100%',
                  padding: '6px 28px 6px 28px',
                  borderRadius: '8px',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-main)',
                  fontSize: '0.78rem',
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {/* Timeboards List Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div
              style={{
                padding: '2px 4px',
                fontSize: '0.66rem',
                fontWeight: '800',
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>{t('header.allTimeboards')}</span>
              <span>{filteredTimeboards.length}</span>
            </div>

            <div
              style={{
                maxHeight: '180px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                paddingRight: '2px'
              }}
            >
              {filteredTimeboards.length === 0 ? (
                <div
                  style={{
                    padding: '14px 8px',
                    textAlign: 'center',
                    color: 'var(--text-dim)',
                    fontSize: '0.78rem'
                  }}
                >
                  {t('header.noTimeboardsFound')}
                </div>
              ) : (
                filteredTimeboards.map((tb) => {
                  const isSelected = tb.id === activeTimeboardId;
                  const itemMeta = getTimeboardTypeMeta(tb.type, t);
                  const ItemIcon = itemMeta.Icon;
                  const tbIsNotOwner = tb.isShared || (tb.ownerId && currentUserId && tb.ownerId !== currentUserId);

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
                        padding: '6px 8px',
                        borderRadius: '8px',
                        background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        border: isSelected ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: 'var(--bg-glass)',
                            border: '1px solid var(--border-glass)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: itemMeta.color,
                            flexShrink: 0
                          }}
                        >
                          <ItemIcon size={14} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0, flex: 1 }}>
                          <span
                            style={{
                              fontSize: '0.82rem',
                              fontWeight: isSelected ? '700' : '600',
                              color: isSelected ? 'var(--primary-light)' : 'var(--text-main)',
                              lineHeight: 1.2,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '140px'
                            }}
                          >
                            {tb.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                            <span
                              style={{
                                fontSize: '0.66rem',
                                color: isSelected ? 'var(--primary-light)' : 'var(--text-dim)',
                                fontWeight: '500'
                              }}
                            >
                              {itemMeta.label}
                            </span>
                            {tbIsNotOwner && (
                              <span
                                style={{
                                  fontSize: '0.58rem',
                                  fontWeight: '700',
                                  color: TimelineColor.PURPLE,
                                  background: 'rgba(168, 85, 247, 0.12)',
                                  borderRadius: '3px',
                                  padding: '0 3px',
                                  lineHeight: 1
                                }}
                              >
                                {getRoleBadgeLabel(tb, t)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        {onOpenEditTimeboard && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsOpen(false);
                              onOpenEditTimeboard(tb);
                            }}
                            title={t('header.editTimeboard')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-dim)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '5px',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--primary-light)';
                              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--text-dim)';
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <Settings size={14} />
                          </button>
                        )}

                        {isSelected && (
                          <div
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'var(--primary)',
                              boxShadow: '0 0 8px rgba(99, 102, 241, 0.8)',
                              marginLeft: '2px'
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div style={{ height: '1px', background: 'var(--border-glass)', margin: '2px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {onOpenCreateTimeboard && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCreateTimeboard();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 8px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.78rem',
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
                <Plus size={15} style={{ color: 'var(--primary-light)' }} />
                <span>{t('header.createNewTimeboard')}</span>
              </button>
            )}

            {onNavigateToHub && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToHub();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 8px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
                  e.currentTarget.style.color = 'var(--text-main)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <LayoutGrid size={15} style={{ color: 'var(--primary-light)' }} />
                <span>{t('header.viewHub')}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
