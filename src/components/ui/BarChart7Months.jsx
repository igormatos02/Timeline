import React from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../utils/loanCalculations.js';

export default function BarChart7Months({
  months,
  chartTitle,
  monthVsPrevLabel,
  diffPercentStr,
  isGoodChange,
  goodColor,
  badColor = '#f43f5e',
  sparklesLabel,
  projection,
  sparklesColor,
  projectionColor,
  currentGradient,
  mutedGradientTop,
  mutedGradientBottom,
  currentTextColor
}) {
  const maxMonthTotal = Math.max(...months.map((m) => m.total), 1);

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
        <div style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={15} style={{ color: sparklesColor }} />
          <span>{sparklesLabel}</span>
          <span style={{ color: projectionColor }}>{formatCurrency(projection)}</span>
        </div>
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
            const heightPct = Math.max(8, Math.min(100, Math.round((m.total / maxMonthTotal) * 100)));
            const isCurrentMonth = idx === months.length - 1;

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
                    color: isCurrentMonth ? currentTextColor : 'var(--text-muted)'
                  }}
                >
                  {formatCurrency(m.total).replace(',00', '')}
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
                      background: isCurrentMonth
                        ? currentGradient
                        : `linear-gradient(180deg, ${mutedGradientTop} 0%, ${mutedGradientBottom} 100%)`,
                      borderRadius: '4px',
                      transition: 'height 0.3s ease'
                    }}
                    title={`${m.label}: ${formatCurrency(m.total)}`}
                  />
                </div>

                <div
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: isCurrentMonth ? '800' : '600',
                    color: isCurrentMonth ? currentTextColor : 'var(--text-dim)'
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