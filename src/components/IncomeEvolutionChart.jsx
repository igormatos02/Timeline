import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart2,
  Calendar,
  Layers,
  Sparkles,
  Sliders,
  DollarSign,
  Info,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { format, parseISO, addMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '../utils/loanCalculations';

export default function IncomeEvolutionChart({
  timeline = {},
  events = [],
  todayStr = '2026-08-21',
  activeFinancialTab = 'balanco'
}) {
  // Chart Mode: 'acumulado_real' (Historical Real Received up to Today), 'acumulativo' (Cumulative with Future Projection), 'variante' (Monthly Variation)
  const [chartMode, setChartMode] = useState('acumulado_real');

  // Horizon in Years: 1 to 10 years ahead
  const [horizonYears, setHorizonYears] = useState(5);

  // Hover state for interactive tooltips
  const [hoveredData, setHoveredData] = useState(null);

  const baseSalary = Number(timeline?.monthlySalary || 3300.00);

  // ----------------------------------------------------
  // Generate projection dataset across selected mode & horizon
  // ----------------------------------------------------
  const chartData = useMemo(() => {
    let start;
    try {
      start = parseISO(timeline?.startDate || (activeFinancialTab === 'emprestimos' ? '2024-05-15' : '2024-01-01'));
      if (isNaN(start.getTime())) start = new Date(2024, 0, 1);
    } catch {
      start = new Date(2024, 0, 1);
    }
    const currentMonthKey = todayStr.substring(0, 7); // '2026-08'

    // For 'acumulado_real', calculate exact number of months from start to current month (no future progression)
    let totalMonths;
    if (chartMode === 'acumulado_real') {
      let todayDate;
      try {
        todayDate = parseISO(todayStr);
      } catch {
        todayDate = new Date(2026, 7, 21);
      }
      const startYear = start.getFullYear();
      const startMonth = start.getMonth();
      const curYear = todayDate.getFullYear();
      const curMonth = todayDate.getMonth();
      totalMonths = Math.max(1, (curYear - startYear) * 12 + (curMonth - startMonth) + 1); // 32 months (Jan 2024 to Aug 2026)
    } else {
      totalMonths = Math.max(12, horizonYears * 12);
    }

    const data = [];
    let runningTotal = 0;

    // Index existing known events by YYYY-MM
    const eventsByMonth = {};
    (events || []).forEach((ev) => {
      if (ev && ev.date) {
        const key = ev.date.substring(0, 7); // 'YYYY-MM'
        if (!eventsByMonth[key]) eventsByMonth[key] = [];
        eventsByMonth[key].push(ev);
      }
    });

    let curDate = start;
    for (let i = 0; i < totalMonths; i++) {
      const monthKey = format(curDate, 'yyyy-MM');
      const labelShort = format(curDate, 'MMM yy', { locale: pt });
      const monthNum = curDate.getMonth() + 1;
      const isPast = monthKey < currentMonthKey;
      const isCurrent = monthKey === currentMonthKey;

      let monthTotal = 0;
      let notes = [];

      if (eventsByMonth[monthKey] && eventsByMonth[monthKey].length > 0) {
        eventsByMonth[monthKey].forEach((ev) => {
          const amt = Number(ev.amount || 0);
          const evIsPast = ev.date <= todayStr;
          const isReceived = ev.status === 'Recebido' || ev.status === 'Pago' || ev.status === 'Investido' || ev.isCompleted;

          const isLoan = ev.category === 'parcela_emprestimo' || ev.timelineOriginId === 'tl-loan-80004197726' || ev.isSystemLoanEvent || ev.category === 'amortizacao';
          const isIncome = (ev.financialType === 'entrada' || ev.isIncome || (ev.category && ev.category.startsWith('entrada'))) && !ev.isExpense && !ev.isInvestment && !isLoan;
          const isExpense = (ev.financialType === 'gasto' || ev.isExpense || (ev.category && ev.category.startsWith('saida')) || ev.category === 'gasto') && !isLoan;
          const isInvestment = ev.financialType === 'investimento' || ev.isInvestment || (ev.category && ev.category.startsWith('investimento'));

          // Match active financial tab
          let applies = true;
          if (activeFinancialTab === 'entradas') applies = isIncome;
          else if (activeFinancialTab === 'gastos') applies = isExpense || isLoan;
          else if (activeFinancialTab === 'investimentos') applies = isInvestment;
          else if (activeFinancialTab === 'emprestimos') applies = isLoan;
          // 'balanco' considers net (income - expense - investment - loan)

          if (applies) {
            let signedAmt = amt;
            if (activeFinancialTab === 'balanco') {
              if (isExpense || isLoan || isInvestment) signedAmt = -amt;
            }

            if (chartMode === 'acumulado_real') {
              if (isReceived) {
                monthTotal += isNaN(signedAmt) ? 0 : signedAmt;
              }
            } else {
              if (evIsPast) {
                if (isReceived) {
                  monthTotal += isNaN(signedAmt) ? 0 : signedAmt;
                }
              } else {
                monthTotal += isNaN(signedAmt) ? 0 : signedAmt;
              }
            }

            if (ev.category === 'entrada_esporadica' || amt > 2500) {
              if (ev.title) notes.push(ev.title);
            }
          }
        });
      } else if (chartMode !== 'acumulado_real') {
        // Projected future month fallbacks
        if (activeFinancialTab === 'entradas') {
          monthTotal = isNaN(baseSalary) ? 3349.60 : baseSalary;
        } else if (activeFinancialTab === 'gastos') {
          monthTotal = 1438.55;
        } else if (activeFinancialTab === 'investimentos') {
          monthTotal = 600.00;
        } else if (activeFinancialTab === 'emprestimos') {
          monthTotal = 218.47;
        } else {
          // Balanço líquido mensal
          monthTotal = 1311.05;
        }
      }

      runningTotal += monthTotal;

      data.push({
        index: i,
        dateKey: monthKey,
        label: labelShort,
        monthTotal,
        runningTotal,
        isPast,
        isCurrent,
        isFuture: !isPast && !isCurrent,
        notes: notes.join(' • ')
      });

      curDate = addMonths(curDate, 1);
    }

    return data;
  }, [timeline?.startDate, events, horizonYears, baseSalary, todayStr, chartMode, activeFinancialTab]);

  // Overall Statistics for the active view
  const maxCumulative = chartData.length > 0 ? chartData[chartData.length - 1].runningTotal : 0;
  const maxMonthly = Math.max(...chartData.map((d) => d.monthTotal), 1);
  const averageMonthly = chartData.length > 0 ? Math.round(maxCumulative / chartData.length) : baseSalary;

  // SVG Dimensions & Scales
  const width = 860;
  const height = 240;
  const padding = { top: 25, right: 30, bottom: 40, left: 65 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Scaling helpers
  const getX = (idx) => padding.left + (idx / Math.max(1, chartData.length - 1)) * graphWidth;
  const getYCumulative = (val) => padding.top + graphHeight - (val / Math.max(1, maxCumulative)) * graphHeight;
  const getYMonthly = (val) => padding.top + graphHeight - (val / Math.max(1, maxMonthly)) * graphHeight;

  // Build SVG Path for Cumulative Curve
  const cumulativePath = useMemo(() => {
    if (chartData.length === 0) return '';
    return chartData
      .map((d, i) => {
        const x = getX(i);
        const y = getYCumulative(d.runningTotal);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [chartData, maxCumulative, graphWidth, graphHeight]);

  const cumulativeAreaPath = useMemo(() => {
    if (!cumulativePath || chartData.length === 0) return '';
    const firstX = getX(0);
    const lastX = getX(chartData.length - 1);
    const bottomY = padding.top + graphHeight;
    return `${cumulativePath} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;
  }, [cumulativePath, chartData, graphWidth, graphHeight]);

  // Find index of Today in dataset
  const todayIndex = chartData.findIndex((d) => d.isCurrent);
  const todayX = todayIndex >= 0 && chartMode !== 'acumulado_real' ? getX(todayIndex) : null;

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-glass)',
        borderRadius: '16px',
        padding: '18px 20px',
        marginTop: '16px',
        backdropFilter: 'blur(16px)'
      }}
    >
      {/* 🔝 Controls Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '16px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--border-glass)'
        }}
      >
        {/* Left: Mode Switcher (3 Tabs) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-app)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)'
            }}
          >
            <button
              type="button"
              onClick={() => setChartMode('acumulado_real')}
              className={`btn btn-sm ${chartMode === 'acumulado_real' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                padding: '4px 12px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                background: chartMode === 'acumulado_real' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: chartMode === 'acumulado_real' ? '#fff' : 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Acumulado Real: apenas valores efetivamente recebidos do passado até ao mês atual (sem projeção)"
            >
              <Sparkles size={13} />
              <span>Acumulado Real</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('acumulativo')}
              className={`btn btn-sm ${chartMode === 'acumulativo' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                padding: '4px 12px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                background: chartMode === 'acumulativo' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                color: chartMode === 'acumulativo' ? '#fff' : 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Acumulado com Projeção: histórico recebido + projeção futura de 1 a 10 anos"
            >
              <TrendingUp size={13} />
              <span>Projeção Acumulativa</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('variante')}
              className={`btn btn-sm ${chartMode === 'variante' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                padding: '4px 12px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                background: chartMode === 'variante' ? 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)' : 'transparent',
                color: chartMode === 'variante' ? '#fff' : 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Variante Mensal: valores mês a mês com picos de bónus e subsídios"
            >
              <BarChart2 size={13} />
              <span>Variante Mensal</span>
            </button>
          </div>
        </div>

        {/* Center: Stat Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
              {chartMode === 'acumulado_real' ? 'Total Real Recebido' : chartMode === 'acumulativo' ? 'Total Projetado' : 'Média / Mês'}
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: '800', color: chartMode === 'acumulado_real' ? '#10b981' : chartMode === 'acumulativo' ? '#818cf8' : '#06b6d4' }}>
              {chartMode === 'variante' ? formatCurrency(averageMonthly) : formatCurrency(maxCumulative)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-glass)', paddingLeft: '12px' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
              {chartMode === 'variante' ? 'Pico Mensal' : 'Média Mensal'}
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: '800', color: chartMode === 'variante' ? '#f59e0b' : '#06b6d4' }}>
              {chartMode === 'variante' ? formatCurrency(maxMonthly) : formatCurrency(averageMonthly)}
            </span>
          </div>
        </div>

        {/* Right: Contextual Horizon Controller */}
        {chartMode === 'acumulado_real' ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(16, 185, 129, 0.08)',
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}
          >
            <Calendar size={14} style={{ color: '#10b981' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#10b981', textTransform: 'uppercase' }}>
                Histórico Realizado
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {chartData.length > 0 ? `${chartData[0].label} — ${chartData[chartData.length - 1].label}` : ''} ({chartData.length} meses)
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <Clock size={14} style={{ color: 'var(--primary-light)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                  Horizonte Temporal:
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                  {horizonYears} {horizonYears === 1 ? 'Ano' : 'Anos'} ({chartData.length} meses)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={horizonYears}
                onChange={(e) => setHorizonYears(Number(e.target.value))}
                style={{
                  width: '130px',
                  accentColor: 'var(--primary-light)',
                  cursor: 'pointer',
                  height: '4px'
                }}
                title="Arraste para projetar até 10 anos à frente"
              />
            </div>
          </div>
        )}
      </div>

      {/* 📊 Interactive SVG Chart Area */}
      <div style={{ width: '100%', position: 'relative', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', minWidth: '600px', display: 'block' }}
          onMouseLeave={() => setHoveredData(null)}
        >
          <defs>
            {/* Emerald Gradient for Cumulative Mode */}
            <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset="85%" stopColor="#10b981" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>

            {/* Cyan Gradient for Monthly Variation Mode */}
            <linearGradient id="cyanBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
            </linearGradient>

            {/* Amber Gradient for Spikes / Bonuses */}
            <linearGradient id="amberBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Grid horizontal lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padding.top + graphHeight * (1 - ratio);
            const isCumulativeView = chartMode === 'acumulativo' || chartMode === 'acumulado_real';
            const labelVal = isCumulativeView ? maxCumulative * ratio : maxMonthly * ratio;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  fill="var(--text-dim)"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="inherit"
                >
                  {labelVal >= 1000 ? `${Math.round(labelVal / 1000)}k €` : `${Math.round(labelVal)} €`}
                </text>
              </g>
            );
          })}

          {/* Today Indicator Line (21 Ago 2026) */}
          {todayX && (
            <g>
              <line
                x1={todayX}
                y1={padding.top}
                x2={todayX}
                y2={padding.top + graphHeight}
                stroke="#6366f1"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <rect
                x={todayX - 28}
                y={padding.top - 18}
                width="56"
                height="16"
                rx="4"
                fill="#6366f1"
              />
              <text
                x={todayX}
                y={padding.top - 6}
                fill="#ffffff"
                fontSize="9"
                fontWeight="800"
                textAnchor="middle"
                fontFamily="inherit"
              >
                📍 HOJE
              </text>
            </g>
          )}

          {/* MODE 1 & 2: Acumulado Real & Projeção Acumulativa (Area and Line) */}
          {(chartMode === 'acumulativo' || chartMode === 'acumulado_real') && (
            <g>
              <path d={cumulativeAreaPath} fill="url(#emeraldGrad)" />
              <path
                d={cumulativePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Points on Hover / Milestones */}
              {chartData.map((d, i) => {
                const x = getX(i);
                const y = getYCumulative(d.runningTotal);
                const isHovered = hoveredData?.dateKey === d.dateKey;
                const isYearMarker = i % 12 === 0;

                return (
                  <g key={d.dateKey}>
                    {(isHovered || isYearMarker || d.isCurrent) && (
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 6 : isYearMarker ? 4 : 3}
                        fill={d.isCurrent ? '#6366f1' : '#10b981'}
                        stroke="var(--bg-app)"
                        strokeWidth="2"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* MODE 3: Variante Mensal (Bar columns) */}
          {chartMode === 'variante' && (
            <g>
              {chartData.map((d, i) => {
                const x = getX(i);
                const barWidth = Math.max(3, Math.min(18, (graphWidth / chartData.length) * 0.75));
                const y = getYMonthly(d.monthTotal);
                const barHeight = padding.top + graphHeight - y;
                const isHovered = hoveredData?.dateKey === d.dateKey;
                const hasBonus = d.monthTotal > baseSalary;

                return (
                  <g key={d.dateKey}>
                    <rect
                      x={x - barWidth / 2}
                      y={y}
                      width={barWidth}
                      height={Math.max(2, barHeight)}
                      rx={barWidth > 6 ? 3 : 1}
                      fill={hasBonus ? 'url(#amberBarGrad)' : 'url(#cyanBarGrad)'}
                      opacity={isHovered ? 1 : d.isPast ? 0.9 : 0.65}
                      stroke={isHovered ? '#ffffff' : 'transparent'}
                      strokeWidth="1"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* X Axis Labels (Years & Key Months) */}
          {chartData.map((d, i) => {
            const step = chartMode === 'acumulado_real' ? 6 : 12;
            const isMarker = i % step === 0;
            if (!isMarker && i !== chartData.length - 1) return null;
            const x = getX(i);
            const y = padding.top + graphHeight + 18;

            return (
              <text
                key={`lbl-${d.dateKey}`}
                x={x}
                y={y}
                fill="var(--text-muted)"
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
                fontFamily="inherit"
              >
                {d.label}
              </text>
            );
          })}

          {/* Transparent Overlay Rectangles for Smooth Hover Interaction */}
          {chartData.map((d, i) => {
            const x = getX(i);
            const stepWidth = Math.max(8, graphWidth / chartData.length);
            return (
              <rect
                key={`hover-${d.dateKey}`}
                x={x - stepWidth / 2}
                y={padding.top}
                width={stepWidth}
                height={graphHeight}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredData(d)}
              />
            );
          })}
        </svg>

        {/* 💬 Dynamic Tooltip Card on Hover */}
        {hoveredData && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '20px',
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              padding: '10px 14px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              minWidth: '200px',
              pointerEvents: 'none',
              zIndex: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary-light)', textTransform: 'uppercase' }}>
                🗓️ {hoveredData.dateKey} ({hoveredData.label})
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: chartMode === 'acumulado_real' ? 'rgba(16, 185, 129, 0.2)' : hoveredData.isPast ? 'rgba(16, 185, 129, 0.2)' : hoveredData.isCurrent ? 'rgba(99, 102, 241, 0.2)' : 'rgba(148, 163, 184, 0.15)',
                  color: chartMode === 'acumulado_real' ? '#10b981' : hoveredData.isPast ? '#10b981' : hoveredData.isCurrent ? '#a5b4fc' : '#94a3b8',
                  fontWeight: '700'
                }}
              >
                {chartMode === 'acumulado_real' ? 'Realizado' : hoveredData.isPast ? 'Recebido' : hoveredData.isCurrent ? 'Mês Atual' : 'Projeção'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>{chartMode === 'acumulado_real' ? 'Recebido no Mês:' : 'Entrada do Mês:'}</span>
                <span style={{ fontWeight: '800', color: '#06b6d4' }}>
                  +{formatCurrency(hoveredData.monthTotal)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>{chartMode === 'acumulado_real' ? 'Acumulado Real:' : 'Total Acumulado:'}</span>
                <span style={{ fontWeight: '800', color: '#10b981' }}>
                  {formatCurrency(hoveredData.runningTotal)}
                </span>
              </div>

              {hoveredData.notes && (
                <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#f59e0b', fontStyle: 'italic' }}>
                  ✨ {hoveredData.notes}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
