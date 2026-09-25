import React, { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, CalendarRange } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

// Same look as the event card "subparts" badge, built from theme variables
const badgeStyle = (active) => ({
  fontSize: '0.72rem',
  fontWeight: 700,
  color: active ? 'var(--text-white)' : 'var(--primary-light)',
  background: active ? 'var(--primary)' : 'color-mix(in srgb, var(--primary) 14%, transparent)',
  border: '1px solid color-mix(in srgb, var(--primary) 40%, transparent)',
  borderRadius: '9999px',
  padding: '0 10px',
  width: '100%',
  minHeight: '30px',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  textTransform: 'capitalize',
  transition: 'all 0.15s ease',
  boxShadow: active ? '0 2px 8px var(--primary-glow)' : 'none'
});

const optionStyle = (selected) => ({
  padding: '5px 4px',
  borderRadius: '6px',
  border: `1px solid ${selected ? 'var(--primary)' : 'transparent'}`,
  background: selected ? 'var(--primary)' : 'var(--bg-glass)',
  color: selected ? 'var(--text-white)' : 'var(--text-main)',
  fontSize: '0.72rem',
  fontWeight: selected ? 700 : 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  textTransform: 'capitalize'
});

const labelStyle = {
  fontSize: '0.65rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em'
};

/**
 * Year / month period filter shown as two side-by-side badges; clicking a badge opens a
 * floating option grid (it does not push the sidebar down). Year and month are independent ('' = all).
 */
function PeriodBadgeFilter({ year, month, years, onYearChange, onMonthChange }) {
  const { t, dateLocale } = useTranslation();
  const [openPanel, setOpenPanel] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!openPanel) return undefined;
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpenPanel(null);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpenPanel(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openPanel]);

  const monthName = (m) => format(new Date(2000, m, 1), 'MMMM', { locale: dateLocale });
  const togglePanel = (panel) => setOpenPanel((prev) => (prev === panel ? null : panel));

  const pick = (panel, value) => {
    if (panel === 'year') onYearChange(value);
    else onMonthChange(value);
    setOpenPanel(null);
  };

  const fields = [
    {
      key: 'year',
      label: t('sidebar.yearLabel'),
      ariaLabel: t('sidebar.year'),
      Icon: CalendarRange,
      value: year,
      display: year !== '' ? year : t('buttons.all'),
      options: years.map((y) => ({ value: String(y), label: String(y) }))
    },
    {
      key: 'month',
      label: t('sidebar.monthLabel'),
      ariaLabel: t('sidebar.month'),
      Icon: CalendarDays,
      value: month,
      display: month !== '' ? monthName(Number(month)) : t('buttons.all'),
      options: Array.from({ length: 12 }, (_, m) => ({ value: String(m), label: monthName(m) }))
    }
  ];

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'flex', flexWrap: 'nowrap', gap: '12px', padding: '2px 0 6px' }}>
      {fields.map(({ key, label, ariaLabel, Icon, value, display, options }) => (
        <div key={key} style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
          <span style={labelStyle}>{label}</span>
          <button
            type="button"
            aria-label={ariaLabel}
            aria-haspopup="listbox"
            aria-expanded={openPanel === key}
            onClick={() => togglePanel(key)}
            style={badgeStyle(value !== '' || openPanel === key)}
          >
            <Icon size={11} />
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}>{display}</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>{openPanel === key ? '▲' : '▼'}</span>
          </button>

          {openPanel === key && (
            <div
              role="listbox"
              aria-label={ariaLabel}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 50,
                padding: '6px',
                borderRadius: '10px',
                border: '1px solid var(--border-glass)',
                background: 'var(--bg-card)',
                boxShadow: '0 8px 24px var(--primary-glow)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '4px'
              }}
            >
              <button
                type="button"
                role="option"
                aria-selected={String(value) === ''}
                onClick={() => pick(key, '')}
                style={{ ...optionStyle(String(value) === ''), gridColumn: '1 / -1' }}
              >
                {t('buttons.all')}
              </button>
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={String(value) === opt.value}
                  onClick={() => pick(key, opt.value)}
                  style={optionStyle(String(value) === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default React.memo(PeriodBadgeFilter);
