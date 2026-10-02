import React, { useState, useEffect, useRef } from 'react';
import { Repeat, Zap, Calendar, ChevronDown, Check } from 'lucide-react';
import { EventRecurrence, TimelineColor } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

export default function RecurrenceSelector({
  value = EventRecurrence.ONCE,
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

  if (disabled) return null;

  const options = [
    { id: EventRecurrence.RECURRING, label: t('recurrence.recurring'), icon: Repeat },
    { id: EventRecurrence.ONCE, label: t('recurrence.once'), icon: Zap },
    { id: EventRecurrence.LIMITED, label: t('recurrence.limited'), icon: Calendar }
  ];

  const currentOption = options.find((opt) => opt.id === value) || options[0];
  const CurrentIcon = currentOption.icon;

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom, minWidth: 0, flex: 1 }}>
      <label
        style={{
          display: 'block',
          fontSize: '0.8rem',
          fontWeight: '600',
          marginBottom: '5px',
          color: 'var(--text-muted)'
        }}
      >
        {label || t('modal.recurrence')}
      </label>

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
            <CurrentIcon size={14} />
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
            {currentOption.label}
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
            padding: '6px',
            boxShadow: 'var(--shadow-lg)',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {options.map((opt) => {
            const IconComp = opt.icon;
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
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '5px',
                      background: isSelected ? 'color-mix(in srgb, var(--primary) 20%, transparent)' : 'var(--bg-glass)',
                      color: isSelected ? 'var(--primary-light)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <IconComp size={12} />
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? '700' : '500' }}>
                    {opt.label}
                  </span>
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

