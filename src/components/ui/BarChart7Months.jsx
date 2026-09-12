import React from 'react';
import { TrendingUp, Sparkles, Layers } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { TimelineColor } from '../../enums/index.js';

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
  formatProjection = (val) => formatCurrency(val)
}) {
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

        {middleLabel && (
          <div style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {middleIcon || <Layers size={15} style={{ color: middleColor || TimelineColor.INCOME }} />}
            <span>{middleLabel}</span>
            <span style={{ color: middleColor || TimelineColor.INCOME }}>
              {typeof middleValue === 'number' ? formatProjection(middleValue) : middleValue}
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
            fontSize: '0.7rem',
            fontWeight: '800',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            marginBottom: '10px',
            letterSpacing: '0.5px'
          }}
        >
          {chartTitle}
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
            const isNegative = m.total < 0;
            const heightPct = Math.max(8, Math.min(100, Math.round((Math.abs(m.total || 0) / maxMonthTotal) * 100)));
            const isCurrentMonth = idx === months.length - 1;

            const textCol = isNegative
              ? badColor
              : (isCurrentMonth ? (currentTextColor || goodColor) : 'var(--text-muted)');

            const barBg = isNegative
              ? (isCurrentMonth
                  ? `linear-gradient(180deg, ${badColor} 0%, rgba(244, 63, 94, 0.6) 100%)`
                  : `linear-gradient(180deg, rgba(244, 63, 94, 0.6) 0%, rgba(244, 63, 94, 0.25) 100%)`)
              : (isCurrentMonth
                  ? (currentGradient || `linear-gradient(180deg, ${goodColor} 0%, rgba(16, 185, 129, 0.6) 100%)`)
                  : (mutedGradientTop && mutedGradientBottom
                      ? `linear-gradient(180deg, ${mutedGradientTop} 0%, ${mutedGradientBottom} 100%)`
                      : `linear-gradient(180deg, rgba(16, 185, 129, 0.6) 0%, rgba(16, 185, 129, 0.25) 100%)`));

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
                  justifyContent: 'flex-end'
                }}
              >
                <div
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: '800',
                    color: textCol
                  }}
                >
                  {formatValue(m.total)}
                </div>

                <div
                  style={{
                    width: '100%',
                    height: '54px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '4px',
                    overflow: 'hidden'
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
                    title={`${m.label}: ${formatValue(m.total)}`}
                  />
                </div>

                <div
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: isCurrentMonth ? '800' : '600',
                    color: isCurrentMonth ? (isNegative ? badColor : (currentTextColor || goodColor)) : 'var(--text-dim)'
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