import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format, parseISO, getDaysInMonth } from 'date-fns';

export default function DayPickerPopover({
  value, onChange, accent = '#10b981', dateLocale,
  baseDate, label = 'Dia de vencimento', isOpen, onToggle,
  takenDays = null
}) {
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
      <label style={{
        display: 'block', fontSize: '0.78rem', fontWeight: '700',
        marginBottom: '5px', color: 'var(--text-main)'
      }}>{label}</label>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-glass, rgba(255,255,255,0.03))',
          border: isOpen ? `2px solid ${accent}` : '1px solid var(--border-glass)',
          borderRadius: '8px', padding: '10px 14px',
          cursor: 'pointer', boxSizing: 'border-box'
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} style={{ color: accent }} />
          <span style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-main)' }}>
            Dia {value}
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
        <div style={{
          background: 'var(--bg-card, #131722)',
          border: '1px solid var(--border-glass)',
          borderRadius: '10px', padding: '12px', marginTop: '8px'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <span style={{
              fontSize: '0.74rem', fontWeight: '700',
              color: 'var(--text-muted)', textTransform: 'uppercase'
            }}>Selecionar Dia</span>
            <span style={{
              fontSize: '0.74rem', color: accent, fontWeight: '800'
            }}>
              {format(dateObj, 'MMMM yyyy', { locale: dateLocale })} ({totalDays} dias)
            </span>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px'
          }}>
            {daysArray.map((d) => {
              const isSelected = Number(value) === d;
              const taken = isDayTaken(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => { onChange(d); onToggle(); }}
                  style={{
                    position: 'relative',
                    padding: '7px 0', fontSize: '0.82rem',
                    fontWeight: isSelected ? '800' : '600',
                    borderRadius: '6px',
                    border: isSelected
                      ? `2px solid ${accent}`
                      : taken
                      ? '1px dashed rgba(244, 63, 94, 0.45)'
                      : '1px solid var(--border-glass)',
                    background: isSelected
                      ? `${accent}38`
                      : taken
                      ? 'rgba(244, 63, 94, 0.08)'
                      : 'var(--bg-glass, rgba(255,255,255,0.03))',
                    color: isSelected ? accent : taken ? '#f43f5e' : 'var(--text-main)',
                    cursor: 'pointer', transition: 'all 0.15s ease'
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
                        backgroundColor: '#f43f5e'
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
