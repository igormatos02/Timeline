import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format, parseISO, getDaysInMonth } from 'date-fns';
import { TimelineColor } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

const PART = Object.freeze({ YEAR: 'year', MONTH: 'month', DAY: 'day' });
const YEARS_AROUND = 5;

const toDateStr = (year, monthIndex, day) => format(new Date(year, monthIndex, day), 'yyyy-MM-dd');

/**
 * Keeps { date, day } inside [minDate, maxDate] ('yyyy-MM-dd', both optional).
 * Returns the same shape used by DueDatePicker ({ date: 'yyyy-MM-01', day }).
 */
export function clampDueDate({ date, day }, minDate = null, maxDate = null) {
  const base = date ? parseISO(date) : new Date();
  const safeDay = Math.min(getDaysInMonth(base), Math.max(1, Number(day) || 1));
  let full = toDateStr(base.getFullYear(), base.getMonth(), safeDay);
  if (minDate && full < minDate) full = minDate;
  if (maxDate && full > maxDate) full = maxDate;
  const d = parseISO(full);
  return { date: format(d, 'yyyy-MM-01'), day: d.getDate() };
}

/**
 * DueDatePicker - Year | Month | Day on a single row, floating its selection grid
 * above other elements without pushing content down.
 */
export default function DueDatePicker({
  date,
  day,
  onChange,
  accent = TimelineColor.SUCCESS,
  dayLabel,
  takenDays = null,
  onOpen,
  minDate = null,
  maxDate = null,
  compact = false,
  marginBottom = '0'
}) {
  const { t, dateLocale } = useTranslation();
  const [openPart, setOpenPart] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!openPart) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenPart(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenPart(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openPart]);

  const dateObj = date ? parseISO(date) : new Date();
  const year = dateObj.getFullYear();
  const monthIndex = dateObj.getMonth();
  const totalDays = getDaysInMonth(dateObj);

  const togglePart = (part) => {
    const next = openPart === part ? null : part;
    setOpenPart(next);
    if (next && onOpen) onOpen();
  };

  const emit = (nextYear, nextMonthIndex, nextDay) => {
    onChange(clampDueDate({ date: format(new Date(nextYear, nextMonthIndex, 1), 'yyyy-MM-01'), day: nextDay }, minDate, maxDate));
  };

  // Allowed range checks (by year, by month and by day)
  const minMonthKey = minDate ? minDate.substring(0, 7) : null;
  const maxMonthKey = maxDate ? maxDate.substring(0, 7) : null;
  const isYearDisabled = (y) => (minDate && y < Number(minDate.substring(0, 4))) || (maxDate && y > Number(maxDate.substring(0, 4)));
  const isMonthDisabled = (y, m) => {
    const key = format(new Date(y, m, 1), 'yyyy-MM');
    return Boolean((minMonthKey && key < minMonthKey) || (maxMonthKey && key > maxMonthKey));
  };
  const isDayDisabled = (d) => {
    const full = toDateStr(year, monthIndex, d);
    return Boolean((minDate && full < minDate) || (maxDate && full > maxDate));
  };

  const isDayTaken = (d) => {
    if (!takenDays) return false;
    if (takenDays instanceof Set) return takenDays.has(d);
    if (Array.isArray(takenDays)) return takenDays.includes(d);
    return false;
  };

  const labelStyle = {
    display: 'block',
    fontSize: compact ? '0.7rem' : '0.8rem',
    fontWeight: '600',
    marginBottom: compact ? '2px' : '5px',
    color: 'var(--text-muted)'
  };

  const renderTrigger = (part, label, text, withIcon = false) => {
    const isOpen = openPart === part;
    return (
      <div style={{ minWidth: 0, flex: 1 }}>
        <label style={labelStyle}>{label}</label>
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => togglePart(part)}
          style={{
            width: '100%',
            height: compact ? '28px' : '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: compact ? '4px' : '6px',
            background: 'var(--bg-glass)',
            border: isOpen ? '2px solid var(--primary)' : '1px solid var(--border-glass)',
            borderRadius: compact ? '6px' : '8px',
            padding: compact ? '0 6px' : '0 10px',
            cursor: 'pointer',
            boxSizing: 'border-box',
            color: 'var(--text-main)',
            transition: 'border-color 0.15s ease'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: compact ? '4px' : '6px', minWidth: 0 }}>
            {withIcon && <Calendar size={compact ? 11 : 15} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />}
            <span style={{ fontSize: compact ? '0.72rem' : '0.88rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
          </span>
          <ChevronDown size={compact ? 11 : 14} style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
        </button>
      </div>
    );
  };

  const renderGridButton = (key, content, isSelected, onClick, taken = false, disabled = false) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        opacity: disabled ? 0.35 : 1,
        position: 'relative',
        padding: compact ? '4px 0' : '8px 0',
        fontSize: compact ? '0.68rem' : '0.82rem',
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
        color: isSelected
          ? 'var(--primary-light)'
          : taken
          ? TimelineColor.DANGER
          : 'var(--text-main)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        textTransform: 'capitalize'
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isSelected) {
          e.currentTarget.style.background = 'var(--bg-card-hover)';
          e.currentTarget.style.borderColor = 'var(--border-glass)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isSelected) {
          e.currentTarget.style.background = taken ? `${TimelineColor.DANGER}14` : 'var(--bg-glass)';
          e.currentTarget.style.borderColor = taken ? `1px solid ${TimelineColor.DANGER}73` : 'var(--border-glass)';
        }
      }}
    >
      {content}
      {taken && !isSelected && (
        <span style={{ position: 'absolute', top: '2px', right: '3px', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: TimelineColor.DANGER }} />
      )}
    </button>
  );

  const renderGrid = () => {
    if (!openPart) return null;
    let title;
    let info = null;
    let columns;
    let buttons;

    if (openPart === PART.YEAR) {
      title = t('modal.selectYear');
      columns = 4;
      const years = Array.from({ length: YEARS_AROUND * 2 + 2 }, (_, i) => year - YEARS_AROUND + i);
      buttons = years.map((y) => renderGridButton(y, y, y === year, () => { emit(y, monthIndex, day); setOpenPart(null); }, false, isYearDisabled(y)));
    } else if (openPart === PART.MONTH) {
      title = t('modal.selectMonth');
      info = String(year);
      columns = 4;
      buttons = Array.from({ length: 12 }, (_, m) => renderGridButton(
        m,
        format(new Date(year, m, 1), 'MMM', { locale: dateLocale }).replace('.', ''),
        m === monthIndex,
        () => { emit(year, m, day); setOpenPart(null); },
        false,
        isMonthDisabled(year, m)
      ));
    } else {
      title = t('modal.selectDay');
      info = t('modal.monthWithDays', { month: format(dateObj, 'MMMM yyyy', { locale: dateLocale }), count: totalDays });
      columns = 7;
      buttons = Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => renderGridButton(
        d, d, Number(day) === d, () => { emit(year, monthIndex, d); setOpenPart(null); }, isDayTaken(d), isDayDisabled(d)
      ));
    }

    return (
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
          borderRadius: compact ? '8px' : '10px',
          padding: compact ? '8px' : '12px',
          boxShadow: 'var(--shadow-lg)',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: compact ? '6px' : '10px' }}>
          <span style={{ fontSize: compact ? '0.62rem' : '0.74rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{title}</span>
          {info && <span style={{ fontSize: compact ? '0.62rem' : '0.74rem', color: 'var(--primary-light)', fontWeight: '800', textTransform: 'capitalize' }}>{info}</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: compact ? '3px' : '6px' }}>{buttons}</div>
      </div>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom }}>
      <div style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr 1.15fr', gap: compact ? '4px' : '6px' }}>
        {renderTrigger(PART.YEAR, t('modal.year'), String(year))}
        {renderTrigger(PART.MONTH, t('modal.month'), format(dateObj, 'MMMM', { locale: dateLocale }))}
        {renderTrigger(PART.DAY, dayLabel || t('modal.dayOfMonth'), t('modal.dayValue', { day }), true)}
      </div>
      {renderGrid()}
    </div>
  );
}
