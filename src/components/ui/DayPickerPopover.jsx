import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format, parseISO, getDaysInMonth } from 'date-fns';
import { TimelineColor } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

export default function DayPickerPopover({
  value,
  onChange,
  accent = TimelineColor.EMERALD,
  dateLocale,
  baseDate,
  label,
  isOpen,
  onToggle,
  takenDays = null
}) {
  const { t } = useTranslation();
  const dateObj = baseDate ? parseISO(baseDate) : new Date();
  const totalDays = getDaysInMonth(dateObj);
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  const isDayTaken = (d) => {
    if (!takenDays) return false;
    if (takenDays instanceof Set) return takenDays.has(d);
    if (Array.isArray(takenDays)) return takenDays.includes(d);
    return false;
  };

  return (
    <div style={{ marginBottom: '14px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '0.8rem',
          fontWeight: '600',
          marginBottom: '5px',
          color: 'var(--text-muted)'
        }}
      >
        {label || t('modal.dayOfMonth')}
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-glass)',
          border: isOpen ? `2px solid ${accent}` : '1px solid var(--border-glass)',
          borderRadius: '8px',
          padding: '10px 14px',
          cursor: 'pointer',
          boxSizing: 'border-box'
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} style={{ color: accent }} />
          <span style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-main)' }}>
            {t('modal.dayValue', { day: value })}
          </span>
        </div>
        <ChevronDown
          size={15}
          style={{
            color: 'var(--text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s'
          }}
        />
      </div>
      {isOpen && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-glass-glow)',
            borderRadius: '10px',
            padding: '12px',
            marginTop: '8px',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}
          >
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: '700',
                color: 'var(--text-muted)',
                textTransform: 'uppercase'
              }}
            >
              {t('modal.selectDay')}
            </span>
            <span
              style={{
                fontSize: '0.74rem',
                color: 'var(--primary-light)',
                fontWeight: '800',
                textTransform: 'capitalize'
              }}
            >
              {t('modal.monthWithDays', { month: format(dateObj, 'MMMM yyyy', { locale: dateLocale }), count: totalDays })}
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px'
            }}
          >
            {daysArray.map((d) => {
              const isSelected = Number(value) === d;
              const taken = isDayTaken(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    onChange(d);
                    onToggle();
                  }}
                  style={{
                    position: 'relative',
                    padding: '7px 0',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? '700' : '500',
                    borderRadius: '6px',
                    border: isSelected
                      ? '1px solid color-mix(in srgb, var(--primary) 35%, transparent)'
                      : taken
                      ? `1px solid ${TimelineColor.DANGER}73`
                      : '1px solid var(--border-glass)',
                    background: isSelected
                      ? 'color-mix(in srgb, var(--primary) 15%, transparent)'
                      : taken
                      ? `${TimelineColor.DANGER}14`
                      : 'var(--bg-glass)',
                    color: isSelected ? 'var(--primary-light)' : taken ? TimelineColor.DANGER : 'var(--text-main)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--bg-card-hover)';
                      e.currentTarget.style.borderColor = 'var(--border-glass)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = taken ? `${TimelineColor.DANGER}14` : 'var(--bg-glass)';
                      e.currentTarget.style.borderColor = taken ? `1px solid ${TimelineColor.DANGER}73` : 'var(--border-glass)';
                    }
                  }}
                >
                  {d}
                  {taken && !isSelected && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '3px',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        backgroundColor: TimelineColor.DANGER
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
