import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Building2,
  UserCheck,
  ChevronDown,
  Check,
  AlertCircle,
  FileCheck2,
  Search
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
  timeboardId,
  error = false,
  showError = false,
  accentColor = TimelineColor.WARNING,
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
    handleSelectPerson(personId);
    closeDropdown();
  };
  const accent = accentColor || TimelineColor.WARNING;

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
    <div
      className="obligation-selector-container"
      style={{
        borderRadius: '10px',
        background: 'var(--bg-glass)',
        border: `1px solid ${isObligation ? `${accent}59` : 'var(--border-glass)'}`,
        padding: '12px 14px',
        marginBottom: '14px',
        transition: 'border-color 0.2s ease'
      }}
    >
      {/* Header Switch Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: isObligation ? `${accent}26` : 'var(--bg-input)',
              color: isObligation ? accent : 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <FileCheck2 size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)' }}>
                {t('modal.isObligation')}
              </span>
              {isObligation && (
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: '800',
                    background: `${accent}26`,
                    color: accent,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {t('modal.obligationBadge')}
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {t('modal.isObligationDesc')}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isObligation}
          aria-label={t('modal.isObligation')}
          onClick={() => {
            const nextVal = !isObligation;
            handleToggle(nextVal);
            if (!nextVal) {
              handleSelectPerson('');
            }
          }}
          style={{
            width: '40px',
            height: '22px',
            borderRadius: '9999px',
            background: isObligation ? accent : 'var(--border-glass)',
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
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: TimelineColor.WHITE,
              position: 'absolute',
              top: '3px',
              left: isObligation ? '21px' : '3px',
              transition: 'left 0.2s ease',
              boxShadow: 'var(--shadow-sm)'
            }}
          />
        </button>
      </div>

      {/* Person Selection when isObligation is True (same look as the other modal fields) */}
      {isObligation && (
        <div style={{ marginTop: '12px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: '700',
              marginBottom: '6px',
              color: hasError ? TimelineColor.DANGER : 'var(--text-main)'
            }}
          >
            {t('modal.obligationPersonLabel')}
          </label>

          <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <button
              type="button"
              onClick={() => (isDropdownOpen ? closeDropdown() : setIsDropdownOpen(true))}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'var(--bg-glass)',
                border: `1px solid ${hasError ? TimelineColor.DANGER : isDropdownOpen ? accent : 'var(--border-glass)'}`,
                boxShadow: isDropdownOpen ? `0 0 12px ${accent}33` : 'none',
                color: 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                textAlign: 'left'
              }}
            >
              {selectedPerson ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', minWidth: 0 }}>
                  {renderPersonAvatar(selectedPerson, '28px')}
                  <span style={{ fontWeight: '700', fontSize: '0.86rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {getPersonName(selectedPerson)}
                  </span>
                  {renderTypeBadge(selectedPerson.type)}
                </div>
              ) : (
                <span style={{ fontSize: '0.86rem', color: hasError ? TimelineColor.DANGER : 'var(--text-dim)' }}>
                  {t('modal.obligationPersonPlaceholder')}
                </span>
              )}

              <ChevronDown
                size={16}
                style={{
                  color: 'var(--text-muted)',
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  flexShrink: 0,
                  marginLeft: '8px'
                }}
              />
            </button>

            {isDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  zIndex: 1500,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-sm)',
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
                        padding: '6px 10px 6px 30px',
                        fontSize: '0.78rem',
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
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          background: isSelected ? `${accent}1f` : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          {renderPersonAvatar(p, '26px')}
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: '700', color: isSelected ? accent : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {name}
                            </span>
                            {p.email && p.email !== name && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.email}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          {renderTypeBadge(p.type)}
                          {isSelected && <Check size={14} style={{ color: accent }} />}
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
      )}
    </div>
  );
}
