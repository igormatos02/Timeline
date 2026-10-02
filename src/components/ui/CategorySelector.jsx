import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { TimelineColor } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

export default function CategorySelector({
  value,
  onChange,
  categoryMeta = {},
  accent = TimelineColor.EMERALD,
  translationPrefix = 'incomeCategories',
  label,
  isOpen,
  onToggle,
  marginBottom = '0'
}) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const open = isOpen !== undefined ? isOpen : internalOpen;
  const toggle = onToggle || (() => setInternalOpen((prev) => !prev));
  const close = () => {
    if (typeof onToggle === 'function' && isOpen) onToggle();
    else setInternalOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const currentMeta = categoryMeta[value] || Object.values(categoryMeta)[0] || {};
  const CurrentIcon = currentMeta?.icon;
  const displayLabel = t(`${translationPrefix}.${value}`) || value;

  const entries = Object.entries(categoryMeta);
  const showSearch = entries.length > 8;

  const filteredEntries = entries.filter(([catKey, meta]) => {
    if (!search.trim()) return true;
    const itemLabel = t(`${translationPrefix}.${catKey}`) || catKey;
    return itemLabel.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom, minWidth: 0, flex: 1 }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '0.8rem',
            fontWeight: '600',
            marginBottom: '5px',
            color: 'var(--text-muted)'
          }}
        >
          {label}
        </label>
      )}

      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        style={{
          width: '100%',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          background: open ? 'var(--input-focus-bg)' : 'var(--bg-glass)',
          border: open ? '1px solid var(--input-focus-border)' : '1px solid var(--border-glass)',
          boxShadow: open ? 'var(--input-focus-glow)' : 'none',
          borderRadius: '8px',
          padding: '0 10px',
          cursor: 'pointer',
          boxSizing: 'border-box',
          color: 'var(--text-main)',
          transition: 'all var(--transition-fast)'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
          {CurrentIcon && (
            <span
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: currentMeta.bg || `${accent}24`,
                color: currentMeta.color || accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <CurrentIcon size={14} />
            </span>
          )}
          <span
            style={{
              fontSize: '0.88rem',
              fontWeight: '700',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'var(--text-main)'
            }}
          >
            {displayLabel}
          </span>
        </span>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            flexShrink: 0
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'var(--bg-card)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border-glass-glow)',
            borderRadius: '10px',
            padding: '8px',
            boxShadow: 'var(--shadow-lg)',
            boxSizing: 'border-box',
            maxHeight: '280px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {showSearch && (
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '9px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('sidebar.search')}
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 8px 0 28px',
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
          )}

          <div
            style={{
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: entries.length > 4 ? '1fr 1fr' : '1fr',
              gap: '4px',
              paddingRight: '2px'
            }}
          >
            {filteredEntries.map(([catKey, meta]) => {
              const IconComp = meta.icon;
              const isSelected = value === catKey;
              const itemLabel = t(`${translationPrefix}.${catKey}`) || catKey;

              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => {
                    onChange(catKey);
                    setSearch('');
                    close();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    padding: '7px 8px',
                    borderRadius: '7px',
                    border: isSelected ? `1px solid ${meta.color}` : '1px solid var(--border-glass)',
                    background: isSelected ? meta.bg : 'var(--bg-glass)',
                    color: isSelected ? meta.color : 'var(--text-main)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box',
                    minWidth: 0
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                    {IconComp && (
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '5px',
                          background: meta.bg,
                          color: meta.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <IconComp size={12} />
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: isSelected ? '700' : '500',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {itemLabel}
                    </span>
                  </span>
                  {isSelected && <Check size={13} style={{ color: meta.color, flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

