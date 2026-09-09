import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  User,
  Building2,
  UserCheck,
  ChevronDown,
  Check,
  AlertCircle,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { PersonType } from '../enums/index.js';
import * as api from '../services/api.js';

export default function ObligationSelector({
  isObligation = false,
  obligationPersonId = '',
  onChangeIsObligation,
  onToggleObligation,
  onChangeObligationPersonId,
  onSelectPerson,
  timeboardId,
  error = false,
  showError = false,
  accentColor = '#f59e0b',
  t: customT
}) {
  const { t: contextT } = useTranslation();
  const t = customT || contextT;

  const handleToggle = onToggleObligation || onChangeIsObligation || (() => {});
  const handleSelectPerson = onSelectPerson || onChangeObligationPersonId || (() => {});
  const hasError = Boolean(error || showError);

  const [persons, setPersons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Load persons for current timeboard
  useEffect(() => {
    let isMounted = true;
    if (timeboardId) {
      setIsLoading(true);
      api.fetchPersons(timeboardId)
        .then((data) => {
          if (isMounted) {
            setPersons(Array.isArray(data) ? data : []);
          }
        })
        .catch((err) => {
          console.warn('[ObligationSelector] Failed to load persons:', err);
          if (isMounted) setPersons([]);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [timeboardId]);

  // Click outside to close custom dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const selectedPerson = persons.find((p) => p.id === obligationPersonId);

  const getPersonIcon = (type) => {
    if (type === PersonType.ORGANIZATION) return <Building2 size={15} />;
    if (type === PersonType.MEMBER) return <UserCheck size={15} />;
    return <User size={15} />;
  };

  const getPersonBadge = (type) => {
    if (type === PersonType.ORGANIZATION) {
      return {
        label: t('timeboardSettings.entities.types.organization') || 'Empresa',
        color: '#60a5fa',
        bg: 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.3)'
      };
    }
    if (type === PersonType.MEMBER) {
      return {
        label: t('timeboardSettings.entities.types.member') || 'Membro',
        color: '#a78bfa',
        bg: 'rgba(139, 92, 246, 0.15)',
        border: 'rgba(139, 92, 246, 0.3)'
      };
    }
    return {
      label: t('timeboardSettings.entities.types.person') || 'Pessoa',
      color: '#34d399',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.3)'
    };
  };

  return (
    <div
      className="obligation-selector-container"
      style={{
        borderRadius: '12px',
        background: isObligation
          ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)'
          : 'var(--bg-glass, rgba(255, 255, 255, 0.03))',
        border: isObligation
          ? '1px solid rgba(245, 158, 11, 0.35)'
          : '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
        padding: '14px 16px',
        marginBottom: '16px',
        transition: 'all 0.25s ease',
        boxShadow: isObligation ? '0 0 20px rgba(245, 158, 11, 0.1)' : 'none'
      }}
    >
      {/* Header Switch Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: isObligation ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: isObligation ? '#fbbf24' : 'var(--text-dim, #94a3b8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <FileCheck2 size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: '700', color: isObligation ? '#fbbf24' : 'var(--text-main, #ffffff)' }}>
                {t('modal.isObligation') || 'É Obrigação?'}
              </span>
              {isObligation && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Obrigação
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--text-dim, #94a3b8)', lineHeight: 1.2 }}>
              {t('modal.isObligationDesc') || 'Vincule este evento financeiro a uma pessoa, membro ou empresa'}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isObligation}
          onClick={() => {
            const nextVal = !isObligation;
            handleToggle(nextVal);
            if (!nextVal) {
              handleSelectPerson('');
            }
          }}
          style={{
            width: '44px',
            height: '24px',
            borderRadius: '9999px',
            background: isObligation ? (accentColor || '#f59e0b') : 'rgba(148, 163, 184, 0.25)',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s ease',
            padding: 0,
            flexShrink: 0
          }}
        >
          <span
            style={{
              display: 'block',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#ffffff',
              position: 'absolute',
              top: '3px',
              left: isObligation ? '22px' : '4px',
              transition: 'left 0.2s ease',
              boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
            }}
          />
        </button>
      </div>

      {/* Person Selection Box when isObligation is True */}
      {isObligation && (
        <div
          style={{
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px dashed rgba(245, 158, 11, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <label
            style={{
              fontSize: '0.8rem',
              fontWeight: '700',
              color: hasError ? '#f87171' : 'var(--text-main, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{t('modal.obligationPersonLabel') || 'Pessoa / Membro / Empresa Responsável *'}</span>
          </label>

          {/* Custom Dropdown Trigger */}
          <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <div
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              style={{
                width: '100%',
                background: 'var(--bg-input, rgba(0, 0, 0, 0.35))',
                border: hasError
                  ? '1.5px solid #ef4444'
                  : isDropdownOpen
                  ? '1.5px solid #f59e0b'
                  : '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '10px',
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
                boxShadow: isDropdownOpen ? '0 0 12px rgba(245, 158, 11, 0.2)' : 'none'
              }}
            >
              {selectedPerson ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: selectedPerson.type === PersonType.ORGANIZATION ? '6px' : '50%',
                      background: getPersonBadge(selectedPerson.type).bg,
                      color: getPersonBadge(selectedPerson.type).color,
                      border: `1px solid ${getPersonBadge(selectedPerson.type).border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {getPersonIcon(selectedPerson.type)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-main, #ffffff)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {selectedPerson.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: getPersonBadge(selectedPerson.type).bg,
                        color: getPersonBadge(selectedPerson.type).color,
                        border: `1px solid ${getPersonBadge(selectedPerson.type).border}`
                      }}
                    >
                      {getPersonBadge(selectedPerson.type).label}
                    </span>
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: '0.86rem', color: hasError ? '#f87171' : 'var(--text-dim, #94a3b8)' }}>
                  {t('modal.obligationPersonPlaceholder') || 'Selecione uma pessoa ou empresa...'}
                </span>
              )}

              <ChevronDown
                size={16}
                style={{
                  color: isObligation ? '#fbbf24' : 'var(--text-dim)',
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  flexShrink: 0,
                  marginLeft: '8px'
                }}
              />
            </div>

            {/* Custom Dropdown Popover */}
            {isDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  zIndex: 1500,
                  background: 'var(--bg-card, #1e293b)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '12px',
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.75), 0 0 20px rgba(245, 158, 11, 0.15)',
                  padding: '6px',
                  maxHeight: '230px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  backdropFilter: 'blur(16px)',
                  animation: 'fadeIn 0.15s ease-out'
                }}
              >
                {isLoading ? (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    Carregando entidades...
                  </div>
                ) : persons.length === 0 ? (
                  <div style={{ padding: '14px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                    {t('modal.noPersonsAvailable') || 'Nenhuma entidade cadastrada neste timeboard.'}
                  </div>
                ) : (
                  persons.map((p) => {
                    const isSelected = p.id === obligationPersonId;
                    const badge = getPersonBadge(p.type);

                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          handleSelectPerson(p.id);
                          setIsDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: p.type === PersonType.ORGANIZATION ? '6px' : '50%',
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {getPersonIcon(p.type)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.86rem', fontWeight: '700', color: isSelected ? '#fbbf24' : 'var(--text-main, #ffffff)' }}>
                              {p.name}
                            </span>
                            {p.email && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                {p.email}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`
                            }}
                          >
                            {badge.label}
                          </span>
                          {isSelected && <Check size={14} style={{ color: '#fbbf24' }} />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Validation Error Message */}
          {hasError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#f87171',
                fontSize: '0.78rem',
                fontWeight: '600',
                marginTop: '2px'
              }}
            >
              <AlertCircle size={14} />
              <span>{t('modal.obligationPersonRequired') || 'Por favor, selecione uma entidade responsável por esta obrigação.'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
