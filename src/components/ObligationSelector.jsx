import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Building2,
  UserCheck,
  UserX,
  ChevronDown,
  Check,
  AlertCircle,
  Search,
  X
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { PersonType, TimelineColor } from '../enums/index.js';
import * as api from '../services/api.js';

// Persons come from the API with personName (legacy objects may still use name / person_name)
const getPersonName = (p) => p?.personName || p?.person_name || p?.name || p?.email || '';

// Case and accent insensitive text used by the person search ("catia" matches "Cátia")
const normalizeSearch = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function ObligationSelector({
  isObligation = false,
  obligationPersonId = '',
  onChangeIsObligation,
  onToggleObligation,
  onChangeObligationPersonId,
  onSelectPerson,
  onChange,
  timeboardId,
  error = false,
  showError = false,
  accentColor = TimelineColor.AMBER,
  t: customT
}) {
  const { t: contextT } = useTranslation();
  const t = customT || contextT;

  const hasObligation = Boolean(isObligation || obligationPersonId);
  const accent = accentColor || TimelineColor.AMBER;
  const hasError = Boolean(error || showError);

  const [persons, setPersons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [personSearch, setPersonSearch] = useState('');
  const dropdownRef = useRef(null);

  // Load persons for current timeboard
  useEffect(() => {
    let isMounted = true;
    if (timeboardId) {
      setIsLoading(true);
      api.fetchPersons(timeboardId)
        .then((data) => {
          if (isMounted) {
            const list = Array.isArray(data) ? data : [];
            const sorted = [...list].sort((a, b) => {
              const typeComp = (a.type || PersonType.PERSON || '').toLowerCase().localeCompare((b.type || PersonType.PERSON || '').toLowerCase());
              if (typeComp !== 0) return typeComp;
              return getPersonName(a).localeCompare(getPersonName(b), undefined, { sensitivity: 'base' });
            });
            setPersons(sorted);
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
        setPersonSearch('');
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const selectedPerson = persons.find((p) => p.id === obligationPersonId);
  const searchTerm = normalizeSearch(personSearch);
  const filteredPersons = searchTerm
    ? persons.filter((p) => normalizeSearch(getPersonName(p)).includes(searchTerm) || normalizeSearch(p.email).includes(searchTerm))
    : persons;

  const closeDropdown = () => {
    setIsDropdownOpen(false);
    setPersonSearch('');
  };

  const selectPerson = (personId) => {
    const isNowObligation = Boolean(personId);
    if (onSelectPerson) onSelectPerson(personId);
    if (onChangeObligationPersonId) onChangeObligationPersonId(personId);
    if (onToggleObligation) onToggleObligation(isNowObligation);
    if (onChangeIsObligation) onChangeIsObligation(isNowObligation);
    if (onChange) {
      onChange({
        isObligation: isNowObligation,
        obligationPersonId: personId || ''
      });
    }
    closeDropdown();
  };

  const handleSwitchClick = () => {
    if (hasObligation) {
      // Turn OFF -> clear selected person
      selectPerson('');
    } else {
      // Turn ON -> open dropdown so user can select a person
      setIsDropdownOpen(true);
    }
  };

  const getPersonIcon = (type) => {
    if (type === PersonType.ORGANIZATION) return <Building2 size={15} />;
    if (type === PersonType.MEMBER) return <UserCheck size={15} />;
    return <User size={15} />;
  };

  const getPersonBadge = (type) => {
    const color = type === PersonType.ORGANIZATION
      ? TimelineColor.BLUE
      : type === PersonType.MEMBER
        ? TimelineColor.PURPLE
        : TimelineColor.SUCCESS;
    const labelKey = type === PersonType.ORGANIZATION
      ? 'timeboardSettings.entities.types.organization'
      : type === PersonType.MEMBER
        ? 'timeboardSettings.entities.types.member'
        : 'timeboardSettings.entities.types.person';
    return { label: t(labelKey), color, bg: `${color}26`, border: `${color}4d` };
  };

  const renderPersonAvatar = (person, size) => {
    const badge = getPersonBadge(person.type);
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: person.type === PersonType.ORGANIZATION ? '6px' : '50%',
          background: badge.bg,
          color: badge.color,
          border: `1px solid ${badge.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {getPersonIcon(person.type)}
      </div>
    );
  };

  const renderTypeBadge = (type) => {
    const badge = getPersonBadge(type);
    return (
      <span
        style={{
          fontSize: '0.68rem',
          fontWeight: '700',
          padding: '2px 6px',
          borderRadius: '4px',
          background: badge.bg,
          color: badge.color,
          border: `1px solid ${badge.border}`,
          whiteSpace: 'nowrap'
        }}
      >
        {badge.label}
      </span>
    );
  };

  return (
    <div className="obligation-selector-container" style={{ position: 'relative' }}>
      {/* Label and Compact Switch Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: hasError ? TimelineColor.DANGER : 'var(--text-muted)',
            cursor: 'pointer'
          }}
          onClick={() => setIsDropdownOpen((prev) => !prev)}
        >
          {t('modal.obligationPersonLabel')}
        </label>

        {/* Compact Toggle Switch (28x16px matching Automático switch) */}
        <div
          role="switch"
          aria-checked={hasObligation}
          tabIndex={0}
          onClick={handleSwitchClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSwitchClick();
            }
          }}
          title={hasObligation ? t('modal.noObligationPerson') : t('modal.obligationPersonPlaceholder')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div
            style={{
              width: '28px',
              height: '16px',
              borderRadius: '10px',
              background: hasObligation ? accent : 'var(--border-glass)',
              position: 'relative',
              transition: 'background 0.2s ease'
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: 'var(--bg-main)',
                position: 'absolute',
                top: '2px',
                left: hasObligation ? '14px' : '2px',
                transition: 'left 0.2s ease',
                boxShadow: 'var(--shadow-xs)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Person Selector Field */}
      <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
        <button
          type="button"
          aria-expanded={isDropdownOpen}
          onClick={() => (isDropdownOpen ? closeDropdown() : setIsDropdownOpen(true))}
          style={{
            width: '100%',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            borderRadius: '8px',
            background: 'var(--bg-glass)',
            border: `1px solid ${hasError ? TimelineColor.DANGER : isDropdownOpen ? accent : (hasObligation ? `${accent}66` : 'var(--border-glass)')}`,
            boxShadow: isDropdownOpen ? `0 0 12px ${accent}33` : 'none',
            color: 'var(--text-main)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxSizing: 'border-box',
            textAlign: 'left'
          }}
        >
          {selectedPerson ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0, flex: 1 }}>
              {renderPersonAvatar(selectedPerson, '24px')}
              <span style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {getPersonName(selectedPerson)}
              </span>
              {renderTypeBadge(selectedPerson.type)}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasError ? TimelineColor.DANGER : 'var(--text-dim)' }}>
              <User size={15} style={{ opacity: 0.6 }} />
              <span style={{ fontSize: '0.86rem' }}>
                {t('modal.obligationPersonPlaceholder')}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
            {selectedPerson && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  selectPerson('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    selectPerson('');
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title={t('modal.noObligationPerson')}
              >
                <X size={12} />
              </span>
            )}
            <ChevronDown
              size={15}
              style={{
                color: 'var(--text-muted)',
                transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
                flexShrink: 0
              }}
            />
          </div>
        </button>

        {/* Floating Dropdown Popover (Opens UPWARDS so it is never hidden or clipped) */}
        {isDropdownOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 2000,
              background: 'var(--bg-card)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--border-glass)',
              borderRadius: '10px',
              boxShadow: 'var(--shadow-lg)',
              padding: '6px',
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            {/* Search field (filters by name / email) */}
            <div style={{ position: 'sticky', top: '-6px', background: 'var(--bg-card)', padding: '0 0 6px', zIndex: 1 }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  autoFocus
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredPersons.length > 0) selectPerson(filteredPersons[0].id);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      closeDropdown();
                    }
                  }}
                  placeholder={t('modal.searchPerson')}
                  aria-label={t('modal.searchPerson')}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '0 10px 0 30px',
                    fontSize: '0.8rem',
                    borderRadius: '6px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-main)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Clear selection option if person currently selected */}
            {selectedPerson && !personSearch && (
              <button
                type="button"
                onClick={() => selectPerson('')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-card-hover)';
                  e.currentTarget.style.borderColor = 'var(--border-glass)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <UserX size={14} style={{ color: TimelineColor.ROSE }} />
                <span>{t('modal.noObligationPerson')}</span>
              </button>
            )}

            {isLoading ? (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {t('modal.loadingPersons')}
              </div>
            ) : persons.length === 0 ? (
              <div style={{ padding: '14px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                {t('modal.noPersonsAvailable')}
              </div>
            ) : filteredPersons.length === 0 ? (
              <div style={{ padding: '14px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                {t('modal.noPersonsFound')}
              </div>
            ) : (
              filteredPersons.map((p) => {
                const isSelected = p.id === obligationPersonId;
                const name = getPersonName(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPerson(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '7px',
                      border: isSelected
                        ? '1px solid color-mix(in srgb, var(--primary) 35%, transparent)'
                        : '1px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: isSelected ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'transparent',
                      color: isSelected ? 'var(--primary-light)' : 'var(--text-main)',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'var(--bg-card-hover)';
                        e.currentTarget.style.borderColor = 'var(--border-glass)';
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
                      {renderPersonAvatar(p, '24px')}
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: isSelected ? '700' : '600', color: isSelected ? 'var(--primary-light)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {name}
                        </span>
                        {p.email && p.email !== name && (
                          <span style={{ fontSize: '0.72rem', color: isSelected ? 'var(--primary-light)' : 'var(--text-dim)', opacity: isSelected ? 0.85 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {renderTypeBadge(p.type)}
                      {isSelected && <Check size={14} style={{ color: 'var(--primary-light)' }} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {hasError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: TimelineColor.DANGER, fontSize: '0.76rem', fontWeight: '600', marginTop: '6px' }}>
          <AlertCircle size={14} />
          <span>{t('modal.obligationPersonRequired')}</span>
        </div>
      )}
    </div>
  );
}
