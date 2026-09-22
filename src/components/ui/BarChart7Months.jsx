import React from 'react';
import { TrendingUp, Sparkles, Layers } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { TimelineColor } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

export default function BarChart7Months({
  months,
  chartTitle,
  monthVsPrevLabel,
  diffPercentStr,
  isGoodChange,
  goodColor = TimelineColor.SUCCESS,
  badColor = TimelineColor.DANGER,
  middleLabel,
  middleValue,
  middleIcon,
  middleColor,
  sparklesLabel,
  projection,
  sparklesColor,
  projectionColor,
  currentGradient,
  mutedGradientTop,
  mutedGradientBottom,
  currentTextColor,
  formatValue = (val) => formatCurrency(val).replace(',00', ''),
  formatProjection = (val) => formatCurrency(val),
  mode = 'projected',
  onToggleMode,
  accentColor
}) {
  const { t } = useTranslation();
  const maxMonthTotal = Math.max(...months.map((m) => Math.abs(m.total || 0)), 1);

  return (
    <div
      style={{
        borderTop: '1px solid var(--border-glass)',
        paddingTop: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.82rem',
          fontWeight: '700'
        }}
      >
        {middleLabel ? (
          <>
            <div style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {middleIcon || <Layers size={15} style={{ color: middleColor || TimelineColor.INCOME }} />}
              <span>{middleLabel}</span>
              <span style={{ color: middleColor || TimelineColor.INCOME }}>
                {typeof middleValue === 'number' ? formatProjection(middleValue) : middleValue}
              </span>
            </div>

            <div style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={15} style={{ color: isGoodChange ? goodColor : badColor }} />
              <span>{monthVsPrevLabel}</span>
              <span
                style={{
                  color: isGoodChange ? goodColor : badColor,
                  background: isGoodChange ? `${goodColor}1f` : `${badColor}1f`,
                  padding: '2px 6px',
                  borderRadius: '6px'
                }}
              >
                {diffPercentStr}
              </span>
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={15} style={{ color: isGoodChange ? goodColor : badColor }} />
            <span>{monthVsPrevLabel}</span>
            <span
              style={{
                color: isGoodChange ? goodColor : badColor,
                background: isGoodChange ? `${goodColor}1f` : `${badColor}1f`,
                padding: '2px 6px',
                borderRadius: '6px'
              }}
            >
              {diffPercentStr}
            </span>
          </div>
        )}

        {sparklesLabel && (
          <div style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={15} style={{ color: sparklesColor || goodColor }} />
            <span>{sparklesLabel}</span>
            <span style={{ color: projectionColor || sparklesColor || goodColor }}>{formatProjection(projection)}</span>
          </div>
        )}
      </div>

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.015)',
          border: '1px solid var(--border-glass)',
          borderRadius: '8px',
          padding: '12px 14px 10px 14px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: '800',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {chartTitle}
          </div>

          {onToggleMode && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '6px',
                padding: '2px',
                border: '1px solid var(--border-glass)',
                flexShrink: 0,
                userSelect: 'none'
              }}
            >
              <button
                type="button"
                onClick={() => onToggleMode('projected')}
                style={{
                  padding: '3px 10px',
                  minWidth: '74px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  background: mode === 'projected' ? (accentColor || goodColor || 'var(--primary)') : 'transparent',
                  color: mode === 'projected' ? TimelineColor.WHITE : 'var(--text-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'background-color 0.15s ease, color 0.15s ease'
                }}
              >
                {t('timeline.monthProjection')}
              </button>
              <button
                type="button"
                onClick={() => onToggleMode('realized')}
                style={{
                  padding: '3px 10px',
                  minWidth: '74px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  background: mode === 'realized' ? (accentColor || goodColor || 'var(--primary)') : 'transparent',
                  color: mode === 'realized' ? TimelineColor.WHITE : 'var(--text-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'background-color 0.15s ease, color 0.15s ease'
                }}
              >
                {t('timeline.realProjection')}
              </button>
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '8px',
            height: '90px'
          }}
        >
          {months.map((m, idx) => {
            const isNotComputed = Boolean(m.isNotComputed);
            const isNegative = m.total < 0;
            const heightPct = isNotComputed
              ? 8
              : Math.max(8, Math.min(100, Math.round((Math.abs(m.total || 0) / maxMonthTotal) * 100)));
            const isCurrentMonth = idx === months.length - 1;

            const textCol = isNotComputed
              ? 'var(--text-dim)'
              : (isNegative
                ? badColor
                : (isCurrentMonth ? (currentTextColor || goodColor) : 'var(--text-muted)'));

            const barBg = isNotComputed
              ? 'rgba(148, 163, 184, 0.12)'
              : (isNegative
                ? (isCurrentMonth
                    ? `linear-gradient(180deg, ${badColor} 0%, rgba(244, 63, 94, 0.6) 100%)`
                    : `linear-gradient(180deg, rgba(244, 63, 94, 0.6) 0%, rgba(244, 63, 94, 0.25) 100%)`)
                : (isCurrentMonth
                    ? (currentGradient || `linear-gradient(180deg, ${goodColor} 0%, rgba(16, 185, 129, 0.6) 100%)`)
                    : (mutedGradientTop && mutedGradientBottom
                        ? `linear-gradient(180deg, ${mutedGradientTop} 0%, ${mutedGradientBottom} 100%)`
                        : `linear-gradient(180deg, rgba(16, 185, 129, 0.6) 0%, rgba(16, 185, 129, 0.25) 100%)`)));

            return (
              <div
                key={`${m.key}-${idx}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  height: '100%',
                  justifyContent: 'flex-end',
                  opacity: isNotComputed ? 0.6 : 1
                }}
              >
                <div
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: '800',
                    color: textCol
                  }}
                >
                  {isNotComputed ? '—' : formatValue(m.total)}
                </div>

                <div
                  style={{
                    width: '100%',
                    height: '54px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: isNotComputed ? '1px dashed rgba(148, 163, 184, 0.3)' : undefined
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${heightPct}%`,
                      background: barBg,
                      borderRadius: '4px',
                      transition: 'height 0.3s ease'
                    }}
                    title={isNotComputed ? `${m.label}: ${t('timeline.notComputed')}` : `${m.label}: ${formatValue(m.total)}`}
                  />
                </div>

                <div
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: isCurrentMonth ? '800' : '600',
                    color: isNotComputed
                      ? 'var(--text-dim)'
                      : (isCurrentMonth ? (isNegative ? badColor : (currentTextColor || goodColor)) : 'var(--text-dim)')
                  }}
                >
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}