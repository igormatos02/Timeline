import React, { useEffect, useRef } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, setMonth, setYear } from 'date-fns';
import { TimelineColor } from '../../enums/index.js';

export default function MonthPickerPopover({
  value,
  onChange,
  accent = TimelineColor.EMERALD,
  dateLocale,
  baseDate = null,
  label = '',
  isOpen,
  onToggle,
  year,
  onYearChange,
  explanation = null,
  allowPast = false
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onToggle();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onToggle();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onToggle]);

  const dateObj = baseDate ? parseISO(baseDate) : new Date();
  const baseYearStr = format(dateObj, 'yyyy');
  const baseMonthStr = format(dateObj, 'MM');

  const displayLabel = value
    ? format(parseISO(`${value}-01`), 'MMMM yyyy', { locale: dateLocale })
    : label;

  return (
    <div
      ref={containerRef}
      style={{
        marginTop: '10px',
        padding: '12px',
        background: `${accent}14`,
        border: `1px solid ${accent}47`,
        borderRadius: '10px',
        position: 'relative'
      }}
    >
      {label && (
        <label style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          color: accent, fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px'
        }}>
          <Calendar size={13} />
          <span>{label}</span>
        </label>
      )}

      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: isOpen ? 'var(--input-focus-bg)' : 'var(--bg-glass)',
          border: isOpen ? '1px solid var(--input-focus-border)' : '1px solid var(--border-glass)',
          boxShadow: isOpen ? 'var(--input-focus-glow)' : 'none',
          borderRadius: '8px', padding: '9px 12px', cursor: 'pointer',
          transition: 'all var(--transition-fast)'
        }}
      >
        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'capitalize' }}>
          {displayLabel}
        </span>
        <ChevronDown size={15} style={{
          color: accent,
          transform: isOpen ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s'
        }} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 110,
          background: 'var(--bg-card)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${accent}4d`,
          borderRadius: '10px',
          padding: '12px',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '10px'
          }}>
            <button type="button" onClick={() => onYearChange(year - 1)}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer',
                display: 'flex', padding: '4px'
              }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--primary-light)' }}>{year}</span>
            <button type="button" onClick={() => onYearChange(year + 1)}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer',
                display: 'flex', padding: '4px'
              }}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {Array.from({ length: 12 }, (_, mIdx) => {
              const mStr = String(mIdx + 1).padStart(2, '0');
              const curMonthKey = `${year}-${mStr}`;
              const isSelectedMonth = value === curMonthKey;
              const isPastThanStart = !allowPast && Boolean(baseDate) && curMonthKey < `${baseYearStr}-${baseMonthStr}`;
              const sampleDate = setMonth(setYear(new Date(), year), mIdx);
              const monthLabel = format(sampleDate, 'MMM', { locale: dateLocale });

              return (
                <button
                  key={curMonthKey}
                  type="button"
                  disabled={isPastThanStart}
                  onClick={() => { onChange(curMonthKey); onToggle(); }}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '6px',
                    border: isSelectedMonth
                      ? '1px solid color-mix(in srgb, var(--primary) 35%, transparent)'
                      : '1px solid var(--border-glass)',
                    background: isSelectedMonth
                      ? 'color-mix(in srgb, var(--primary) 15%, transparent)'
                      : isPastThanStart
                      ? 'transparent'
                      : 'var(--bg-glass)',
                    color: isSelectedMonth
                      ? 'var(--primary-light)'
                      : isPastThanStart
                      ? 'var(--text-dim)'
                      : 'var(--text-main)',
                    fontWeight: isSelectedMonth ? '700' : '500',
                    fontSize: '0.78rem',
                    textTransform: 'capitalize',
                    cursor: isPastThanStart ? 'not-allowed' : 'pointer',
                    opacity: isPastThanStart ? 0.35 : 1,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isPastThanStart && !isSelectedMonth) {
                      e.currentTarget.style.background = 'var(--bg-card-hover)';
                      e.currentTarget.style.borderColor = 'var(--border-glass)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isPastThanStart && !isSelectedMonth) {
                      e.currentTarget.style.background = 'var(--bg-glass)';
                      e.currentTarget.style.borderColor = 'var(--border-glass)';
                    }
                  }}
                >
                  {monthLabel}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {explanation && (
        <div style={{
          fontSize: '0.72rem', color: 'var(--text-dim)',
          marginTop: '8px', lineHeight: 1.3
        }}>{explanation}</div>
      )}
    </div>
  );
}

