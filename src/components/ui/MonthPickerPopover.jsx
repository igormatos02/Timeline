import React from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, setMonth, setYear } from 'date-fns';

export default function MonthPickerPopover({
  value, onChange, accent = '#10b981', dateLocale,
  baseDate, label = 'Mês Final', isOpen, onToggle,
  year, onYearChange, explanation
}) {
  const dateObj = baseDate ? parseISO(baseDate) : new Date();
  const baseYearStr = format(dateObj, 'yyyy');
  const baseMonthStr = format(dateObj, 'MM');

  const displayLabel = value
    ? format(parseISO(`${value}-01`), 'MMMM yyyy', { locale: dateLocale })
    : label;

  return (
    <div style={{
      marginTop: '10px', padding: '12px',
      background: `${accent}14`, border: `1px solid ${accent}47`,
      borderRadius: '10px'
    }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        color: accent, fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px'
      }}>
        <Calendar size={13} />
        <span>{label}</span>
      </label>

      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-card, #131722)',
          border: isOpen ? `2px solid ${accent}` : `1px solid ${accent}59`,
          borderRadius: '8px', padding: '9px 12px', cursor: 'pointer'
        }}
      >
        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>
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
          marginTop: '8px', background: 'var(--bg-card, #131722)',
          border: `1px solid ${accent}4d`, borderRadius: '10px',
          padding: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
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
            <span style={{ fontWeight: '800', fontSize: '0.9rem', color: accent }}>{year}</span>
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
              const isPastThanStart = curMonthKey < `${baseYearStr}-${baseMonthStr}`;
              const sampleDate = setMonth(setYear(new Date(), year), mIdx);
              const monthLabel = format(sampleDate, 'MMM', { locale: dateLocale });

              return (
                <button key={curMonthKey} type="button" disabled={isPastThanStart}
                  onClick={() => { onChange(curMonthKey); onToggle(); }}
                  style={{
                    padding: '8px 4px', borderRadius: '6px',
                    border: isSelectedMonth ? `2px solid ${accent}` : '1px solid var(--border-glass)',
                    background: isSelectedMonth ? `${accent}40`
                      : isPastThanStart ? 'rgba(255,255,255,0.01)' : 'var(--bg-glass, rgba(255,255,255,0.03))',
                    color: isSelectedMonth ? accent : isPastThanStart ? 'var(--text-dim)' : 'var(--text-main)',
                    fontWeight: isSelectedMonth ? '800' : '600',
                    fontSize: '0.78rem', textTransform: 'capitalize',
                    cursor: isPastThanStart ? 'not-allowed' : 'pointer',
                    opacity: isPastThanStart ? 0.35 : 1
                  }}
                >{monthLabel}</button>
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
