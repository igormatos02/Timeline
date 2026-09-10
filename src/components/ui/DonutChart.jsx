import React from 'react';
import { computeDonutSlice, computePieSlices } from '../../utils/timelineCharts.js';

export function DonutChart({
  percent,
  sliceColor = 'var(--primary-light)',
  remainingColor = 'rgba(255, 255, 255, 0.08)',
  title,
  label,
  centerFontSize = '0.74rem'
}) {
  const { pathData, usedFraction } = computeDonutSlice(percent);
  const displayLabel = label !== undefined ? label : `${Math.round(Number(percent) || 0)}%`;

  return (
    <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
      <svg
        viewBox="-1 -1 2 2"
        style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}
      >
        <circle cx="0" cy="0" r="1" fill={remainingColor} />
        {usedFraction > 0 && (
          <path d={pathData} fill={sliceColor}>
            {title !== undefined && <title>{title}</title>}
          </path>
        )}
      </svg>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          background: 'var(--bg-card, #0f172a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-glass)',
          fontSize: centerFontSize,
          fontWeight: '800',
          color: sliceColor
        }}
      >
        {displayLabel}
      </div>
    </div>
  );
}

export function PieDonut({
  items,
  centerLabel = '100%',
  centerFontSize = '0.74rem',
  centerColor = 'var(--text-main)',
  empty = false,
  emptyLabel = '0%'
}) {
  const slices = computePieSlices(
    (items || []).map((s) => ({
      ...s,
      percent: Number(s.percent ?? s.pct ?? 0),
      name: s.name ?? s.label ?? ''
    }))
  );

  const isEmpty = empty || !slices || slices.length === 0;

  return (
    <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
      <svg
        viewBox="-1 -1 2 2"
        style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}
      >
        <circle cx="0" cy="0" r="1" fill="rgba(255, 255, 255, 0.08)" />
        {isEmpty ? (
          <circle
            cx="0"
            cy="0"
            r="0.95"
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="0.08"
            strokeDasharray="0.1 0.1"
          />
        ) : (
          slices.map((s, idx) => (
            <path
              key={idx}
              d={s.pathData}
              fill={s.color}
              style={{ cursor: 'pointer' }}
            >
              <title>{s.title || `${s.name}: ${s.percent}%`}</title>
            </path>
          ))
        )}
      </svg>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          background: 'var(--bg-card, #0f172a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-glass)',
          fontSize: centerFontSize,
          fontWeight: '800',
          color: centerColor
        }}
      >
        {isEmpty ? emptyLabel : centerLabel}
      </div>
    </div>
  );
}

export function DonutLegend({ items, nameFormatter }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: 1,
        overflowY: 'auto',
        maxHeight: '110px'
      }}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.76rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            <span
              style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }}
            />
            <span
              style={{
                color: 'var(--text-main)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {nameFormatter ? nameFormatter(item) : item.name}
            </span>
          </div>
          <span style={{ color: 'var(--text-muted)', fontWeight: '700', marginLeft: '6px' }}>
            {item.percent}%
          </span>
        </div>
      ))}
    </div>
  );
}