import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';
import { EventPeriodicity, TimelineColor } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

export default function PeriodicitySelector({
  value = EventPeriodicity.MONTHLY,
  onChange,
  accent = TimelineColor.EMERALD,
  label,
  isOpen,
  onToggle,
  disabled = false,
  marginBottom = '0'
}) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
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

  const options = [
    { id: EventPeriodicity.MONTHLY, label: t('periodicity.monthly') },
    { id: EventPeriodicity.BIWEEKLY, label: t('periodicity.biweekly') },
    { id: EventPeriodicity.BIMONTHLY, label: t('periodicity.bimonthly') },
    { id: EventPeriodicity.SEMIANNUAL, label: t('periodicity.biannual') },
    { id: EventPeriodicity.ANNUAL, label: t('periodicity.annual') }
  ];

  const currentOption = options.find((opt) => opt.id === value) || options[0];

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        marginBottom,
        minWidth: 0,
        flex: 1,
        opacity: disabled ? 0.45 : 1,
        pointerEvents: disabled ? 'none' : 'auto'
      }}
    >
      <label
        style={{
          display: 'block',
          fontSize: '0.8rem',
          fontWeight: '600',
          marginBottom: '5px',
          color: 'var(--text-muted)'
        }}
      >
        {label || t('modal.periodicity')}
      </label>

      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={toggle}
        style={{
          width: '100%',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          background: 'var(--bg-glass)',
          border: open ? '2px solid var(--primary)' : '1px solid var(--border-glass)',
          borderRadius: '8px',
          padding: '0 10px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxSizing: 'border-box',
          color: 'var(--text-main)',
          transition: 'border-color 0.15s ease'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
          <span
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
              color: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Clock size={14} />
          </span>
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
            {/* A movement that doesn't repeat has no periodicity: the field stays, empty */}
            {!disabled && currentOption.label}
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

      {open && !disabled && (
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
            padding: '6px',
            boxShadow: 'var(--shadow-lg)',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {options.map((opt) => {
            const isSelected = value === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  close();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '7px',
                  border: isSelected
                    ? '1px solid color-mix(in srgb, var(--primary) 35%, transparent)'
                    : '1px solid var(--border-glass)',
                  background: isSelected
                    ? 'color-mix(in srgb, var(--primary) 15%, transparent)'
                    : 'var(--bg-glass)',
                  color: isSelected ? 'var(--primary-light)' : 'var(--text-main)',
                  cursor: 'pointer',
                  textAlign: 'left',
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
                    e.currentTarget.style.background = 'var(--bg-glass)';
                    e.currentTarget.style.borderColor = 'var(--border-glass)';
                  }
                }}
              >
                <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? '700' : '500' }}>
                  {opt.label}
                </span>
                {isSelected && <Check size={13} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

