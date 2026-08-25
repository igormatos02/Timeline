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
  activeFinancialTab = 'balanco',
  computeStartDate = null
}) {
  // Chart Mode: 'acumulado_real' (Historical Real Received up to Today), 'acumulativo' (Cumulative with Future Projection), 'variante' (Monthly Variation)
  const [chartMode, setChartMode] = useState('variante');

  // Horizon in Years: 1 to 10 years ahead
  const [horizonYears, setHorizonYears] = useState(2);

  // Hover state for interactive tooltips
  const [hoveredData, setHoveredData] = useState(null);

  const baseSalary = Number(timeline?.monthlySalary || 3300.00);

  // ----------------------------------------------------
  // Generate projection dataset across selected mode & horizon
  // ----------------------------------------------------
  const chartData = useMemo(() => {
    let start;
    try {
      if (computeStartDate) {
        start = parseISO(computeStartDate.length === 7 ? `${computeStartDate}-01` : computeStartDate);
      } else {
        start = parseISO(timeline?.startDate || (activeFinancialTab === 'emprestimos' ? '2024-05-15' : '2026-01-01'));
      }
      if (isNaN(start.getTime())) start = new Date(2026, 7, 1);
    } catch {
      start = new Date(2026, 7, 1);
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
      totalMonths = Math.max(1, (curYear - startYear) * 12 + (curMonth - startMonth) + 1);
    } else {
      totalMonths = Math.max(12, horizonYears * 12);
    }

    const data = [];
    let runningTotal = 0;
    if (activeFinancialTab === 'investimentos') {
      const seenInitial = new Set();
      (events || []).forEach((ev) => {
        const isInvestment = ev.financialType === 'investimento' || ev.isInvestment || (ev.category && ev.category.startsWith('investimento'));
        if (isInvestment && ev.initialInvestedAmount) {
          const key = ev.seriesId || ev.id;
          if (!seenInitial.has(key)) {
            runningTotal += Number(ev.initialInvestedAmount) || 0;
            seenInitial.add(key);
          }
        }
      });
    }

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
      const isPast = monthKey < currentMonthKey;
      const isCurrent = monthKey === currentMonthKey;

      let monthIncome = 0;
      let monthExpense = 0;
      let monthInvestment = 0;
      let notes = [];

      if (eventsByMonth[monthKey] && eventsByMonth[monthKey].length > 0) {
        eventsByMonth[monthKey].forEach((ev) => {
          const amt = Number(ev.amount || 0);
          const isReceived = ev.status === 'Recebido' || ev.status === 'Pago' || ev.status === 'Investido' || ev.isCompleted;

          const isLoan = ev.category === 'parcela_emprestimo' || ev.timelineOriginId === 'tl-loan-80004197726' || ev.isSystemLoanEvent || ev.category === 'amortizacao';
          const isIncome = (ev.financialType === 'entrada' || ev.isIncome || (ev.category && ev.category.startsWith('entrada'))) && !ev.isExpense && !ev.isInvestment && !isLoan;
          const isExpense = (ev.financialType === 'gasto' || ev.isExpense || (ev.category && ev.category.startsWith('saida')) || ev.category === 'gasto') && !isLoan;
          const isInvestment = ev.financialType === 'investimento' || ev.isInvestment || (ev.category && ev.category.startsWith('investimento'));

          const isValid = chartMode === 'acumulado_real' ? isReceived : true;
          if (isValid) {
            if (isIncome) {
              monthIncome += amt;
              if (activeFinancialTab === 'entradas' && ev.title && !notes.includes(ev.title)) {
                notes.push(ev.title);
              }
            }
            if (isExpense || isLoan) {
              monthExpense += amt;
              if ((activeFinancialTab === 'gastos' || activeFinancialTab === 'emprestimos' || activeFinancialTab === 'jeep' || activeFinancialTab === 'dacia' || activeFinancialTab === 'casa1' || activeFinancialTab === 'casa2') && ev.title && !notes.includes(ev.title)) {
                notes.push(ev.title);
              }
            }
            if (isInvestment) {
              monthInvestment += amt;
              if (activeFinancialTab === 'investimentos' && ev.title && !notes.includes(ev.title)) {
                notes.push(ev.title);
              }
            }
            if (activeFinancialTab === 'balanco' && ev.title && !notes.includes(ev.title)) {
              notes.push(ev.title);
            }
          }
        });
      }

      let monthTotal = 0;
      if (activeFinancialTab === 'entradas') {
        monthTotal = monthIncome;
      } else if (activeFinancialTab === 'gastos') {
        monthTotal = monthExpense;
      } else if (activeFinancialTab === 'emprestimos' || activeFinancialTab === 'jeep' || activeFinancialTab === 'dacia' || activeFinancialTab === 'casa1' || activeFinancialTab === 'casa2') {
        monthTotal = monthExpense;
      } else if (activeFinancialTab === 'investimentos') {
        monthTotal = monthInvestment;
      } else {
        // Balanço líquido = Entradas - Gastos/Empréstimos - Investimentos
        monthTotal = monthIncome - monthExpense - monthInvestment;
      }

      runningTotal += monthTotal;

      data.push({
        index: i,
        dateKey: monthKey,
        label: labelShort,
        monthTotal,
        monthIncome,
        monthExpense,
        monthInvestment,
        runningTotal,
        isPast,
        isCurrent,
        isFuture: !isPast && !isCurrent,
        notes: notes.join(' • ')
      });

      curDate = addMonths(curDate, 1);
    }

    return data;
  }, [timeline?.startDate, events, horizonYears, todayStr, chartMode, activeFinancialTab]);

  // Overall Statistics for the active view
  const isBalanco = activeFinancialTab === 'balanco';
  const isGastos = activeFinancialTab === 'gastos' || activeFinancialTab === 'emprestimos';
  const isInvest = activeFinancialTab === 'investimentos';
  const isEntradas = activeFinancialTab === 'entradas';

  const maxCumulative = chartData.length > 0 ? chartData[chartData.length - 1].runningTotal : 0;
  const maxMonthly = Math.max(...chartData.map((d) => Math.abs(d.monthTotal)), 1);
  const nonZeroMonths = chartData.filter((d) => Math.abs(d.monthTotal) > 0);
  const averageMonthly = nonZeroMonths.length > 0
    ? Math.round(nonZeroMonths.reduce((sum, d) => sum + d.monthTotal, 0) / nonZeroMonths.length)
    : 0;

  // Max/Min for Balanço with negative and positive values
  const maxPositiveBalanco = Math.max(0, ...chartData.map((d) => d.monthTotal));
  const minNegativeBalanco = Math.min(0, ...chartData.map((d) => d.monthTotal));
  const balancoSpan = (maxPositiveBalanco - minNegativeBalanco) || 1000;

  // SVG Dimensions & Scales
  const width = 860;
  const height = 240;
  const padding = { top: 25, right: 30, bottom: 40, left: 65 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Scaling helpers
  const getX = (idx) => padding.left + (idx / Math.max(1, chartData.length - 1)) * graphWidth;

  const getYCumulative = (val) => {
    if (isBalanco) {
      const maxCum = Math.max(1, ...chartData.map((d) => Math.abs(d.runningTotal)));
      return padding.top + graphHeight / 2 - (val / maxCum) * (graphHeight / 2);
    }
    const maxCum = Math.max(1, ...chartData.map((d) => d.runningTotal));
    return padding.top + graphHeight - (val / maxCum) * graphHeight;
  };

  const getZeroY = () => {
    if (isBalanco) {
      return padding.top + (maxPositiveBalanco / balancoSpan) * graphHeight;
    }
    return padding.top + graphHeight;
  };

  const getYMonthly = (val) => {
    if (isBalanco) {
      return padding.top + ((maxPositiveBalanco - val) / balancoSpan) * graphHeight;
    }
    const maxVal = Math.max(1, ...chartData.map((d) => d.monthTotal));
    return padding.top + graphHeight - (val / maxVal) * graphHeight;
  };

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
  }, [chartData, graphWidth, graphHeight, isBalanco]);

  const cumulativeAreaPath = useMemo(() => {
    if (!cumulativePath || chartData.length === 0) return '';
    const firstX = getX(0);
    const lastX = getX(chartData.length - 1);
    const zeroY = getZeroY();
    return `${cumulativePath} L ${lastX.toFixed(1)} ${zeroY} L ${firstX.toFixed(1)} ${zeroY} Z`;
  }, [cumulativePath, chartData, graphWidth, graphHeight, isBalanco, maxPositiveBalanco, balancoSpan]);

  // Find index of Today in dataset
  const todayIndex = chartData.findIndex((d) => d.isCurrent);
  const todayX = todayIndex >= 0 && chartMode !== 'acumulado_real' ? getX(todayIndex) : null;

  // Active theme color definitions
  const activeColor = isGastos ? '#f43f5e' : isInvest ? '#8b5cf6' : '#10b981';
  const activeGradId = isGastos ? 'roseBarGrad' : isInvest ? 'indigoBarGrad' : 'emeraldBarGrad';
  
  const handleMouseMove = (e) => {
    if (!chartData || chartData.length === 0) return;
    const svgRect = e.currentTarget.getBoundingClientRect();
    if (!svgRect.width) return;
    const clientX = e.clientX - svgRect.left;
    const svgX = (clientX / svgRect.width) * width;

    if (svgX < padding.left || svgX > width - padding.right) {
      setHoveredData(null);
      return;
    }

    const relRatio = (svgX - padding.left) / graphWidth;
    const rawIdx = relRatio * (chartData.length - 1);
    const closestIdx = Math.min(chartData.length - 1, Math.max(0, Math.round(rawIdx)));
    setHoveredData(chartData[closestIdx]);
  };

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
              onClick={() => setChartMode('variante')}
              className={`btn btn-sm ${chartMode === 'variante' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                padding: '4px 12px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                background: chartMode === 'variante' ? (isGastos ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' : isInvest ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)') : 'transparent',
                color: chartMode === 'variante' ? '#fff' : 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Variante Mensal: valores mês a mês específicos da visão ativa"
            >
              <BarChart2 size={13} />
              <span>Variante Mensal</span>
            </button>
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
              title="Acumulado Real: apenas valores efetivamente liquidados/recebidos até hoje"
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
              title="Projeção Acumulativa: histórico + projeção futura de 1 a 10 anos"
            >
              <TrendingUp size={13} />
              <span>Projeção Acumulativa</span>
            </button>
          </div>
        </div>

        {/* Center: Stat Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
              {isBalanco ? 'Balanço Médio / Mês' : isGastos ? 'Gasto Médio / Mês' : isInvest ? 'Aporte Médio / Mês' : 'Entrada Média / Mês'}
            </span>
            <span
              style={{
                fontSize: '0.95rem',
                fontWeight: '800',
                color: isBalanco
                  ? (averageMonthly >= 0 ? '#10b981' : '#f43f5e')
                  : activeColor
              }}
            >
              {isBalanco && averageMonthly > 0 ? '+' : isGastos && averageMonthly > 0 ? '-' : ''}
              {formatCurrency(averageMonthly)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-glass)', paddingLeft: '12px' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
              {chartMode === 'variante' ? 'Pico Mensal' : 'Total no Período'}
            </span>
            <span
              style={{
                fontSize: '0.95rem',
                fontWeight: '800',
                color: chartMode === 'variante' ? '#f59e0b' : activeColor
              }}
            >
              {chartMode === 'variante' ? formatCurrency(maxMonthly) : formatCurrency(maxCumulative)}
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
                  Horizonte:
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                  {horizonYears} {horizonYears === 1 ? 'Ano' : 'Anos'} ({chartData.length}m)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={horizonYears}
                onChange={(e) => setHorizonYears(Number(e.target.value))}
                style={{
                  width: '120px',
                  accentColor: 'var(--primary-light)',
                  cursor: 'pointer',
                  height: '4px'
                }}
                title="Arraste para ajustar o horizonte de projeção"
              />
            </div>
          </div>
        )}
      </div>

      {/* 📊 Interactive SVG Chart Area */}
      <div style={{ width: '100%', position: 'relative', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', minWidth: '600px', display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredData(null)}
        >
          <defs>
            {/* Emerald Gradient (Green - Entradas / Balanço Positivo) */}
            <linearGradient id="emeraldBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.45" />
            </linearGradient>

            <linearGradient id="emeraldAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>

            {/* Rose Gradient (Red - Gastos / Balanço Negativo) */}
            <linearGradient id="roseBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.45" />
            </linearGradient>

            <linearGradient id="roseAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
            </linearGradient>

            {/* Indigo Gradient (Investimentos) */}
            <linearGradient id="indigoBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.45" />
            </linearGradient>

            {/* Amber Gradient for Peaks */}
            <linearGradient id="amberBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.45" />
            </linearGradient>
          </defs>

          {/* Grid Background Lines (Horizontal) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + ratio * graphHeight;
            return (
              <line
                key={`grid-h-${ratio}`}
                x1={padding.left}
                y1={y}
                x2={padding.left + graphWidth}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeDasharray="2 2"
                pointerEvents="none"
              />
            );
          })}

          {/* Y Axis Reference Labels */}
          {isBalanco ? (
            [-1, -0.5, 0, 0.5, 1].map((step) => {
              const val = step > 0 ? (step * maxPositiveBalanco) : (Math.abs(step) * minNegativeBalanco);
              const y = getYMonthly(val);
              return (
                <g key={`y-axis-${step}`} pointerEvents="none">
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + graphWidth}
                    y2={y}
                    stroke={step === 0 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.04)'}
                    strokeWidth={step === 0 ? '1.5' : '1'}
                    strokeDasharray={step === 0 ? '' : '3 3'}
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    fill={step === 0 ? 'var(--text-main)' : 'var(--text-dim)'}
                    fontSize="10"
                    fontWeight={step === 0 ? '700' : '500'}
                    textAnchor="end"
                    fontFamily="inherit"
                  >
                    {step === 0 ? '0 €' : `${val >= 0 ? '+' : ''}${Math.round(val / 1000)}k €`}
                  </text>
                </g>
              );
            })
          ) : (
            [0, 0.33, 0.66, 1].map((ratio) => {
              const y = padding.top + graphHeight - ratio * graphHeight;
              const maxRef = chartMode === 'variante' ? maxMonthly : maxCumulative;
              const labelVal = ratio * maxRef;
              return (
                <g key={`y-axis-${ratio}`} pointerEvents="none">
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + graphWidth}
                    y2={y}
                    stroke={ratio === 0 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.04)'}
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
            })
          )}

          {/* Today Indicator Line */}
          {todayX && (
            <g pointerEvents="none">
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

          {/* Hovered Guide Line */}
          {hoveredData && (
            <g pointerEvents="none">
              <line
                x1={getX(hoveredData.index)}
                y1={padding.top}
                x2={getX(hoveredData.index)}
                y2={padding.top + graphHeight}
                stroke="rgba(255, 255, 255, 0.35)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
            </g>
          )}

          {/* MODE 1 & 2: Acumulado Real & Projeção Acumulativa (Area and Line) */}
          {(chartMode === 'acumulativo' || chartMode === 'acumulado_real') && (
            <g pointerEvents="none">
              <path d={cumulativeAreaPath} fill={isGastos ? 'url(#roseAreaGrad)' : 'url(#emeraldAreaGrad)'} />
              <path
                d={cumulativePath}
                fill="none"
                stroke={activeColor}
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
                        fill={d.isCurrent ? '#6366f1' : activeColor}
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
            <g pointerEvents="none">
              {chartData.map((d, i) => {
                const x = getX(i);
                const barWidth = Math.max(3, Math.min(18, (graphWidth / chartData.length) * 0.75));
                const zeroY = getZeroY();
                const isHovered = hoveredData?.dateKey === d.dateKey;

                let barY = zeroY;
                let barHeight = 0;
                let barFill = 'url(#emeraldBarGrad)';

                if (isBalanco) {
                  if (d.monthTotal >= 0) {
                    const topY = getYMonthly(d.monthTotal);
                    barY = topY;
                    barHeight = Math.max(2, zeroY - topY);
                    barFill = 'url(#emeraldBarGrad)'; // Verde para positivo
                  } else {
                    const bottomY = getYMonthly(d.monthTotal);
                    barY = zeroY;
                    barHeight = Math.max(2, bottomY - zeroY);
                    barFill = 'url(#roseBarGrad)'; // Vermelho para negativo
                  }
                } else if (isGastos) {
                  const topY = getYMonthly(d.monthTotal);
                  barY = topY;
                  barHeight = Math.max(2, padding.top + graphHeight - topY);
                  barFill = 'url(#roseBarGrad)'; // Vermelho para saídas
                } else if (isInvest) {
                  const topY = getYMonthly(d.monthTotal);
                  barY = topY;
                  barHeight = Math.max(2, padding.top + graphHeight - topY);
                  barFill = 'url(#indigoBarGrad)'; // Roxo para investimentos
                } else {
                  // Entradas
                  const topY = getYMonthly(d.monthTotal);
                  barY = topY;
                  barHeight = Math.max(2, padding.top + graphHeight - topY);
                  barFill = 'url(#emeraldBarGrad)'; // Verde para entradas
                }

                return (
                  <g key={d.dateKey}>
                    {Math.abs(d.monthTotal) > 0 ? (
                      <rect
                        x={x - barWidth / 2}
                        y={barY}
                        width={barWidth}
                        height={barHeight}
                        rx={barWidth > 6 ? 3 : 1}
                        fill={barFill}
                        opacity={isHovered ? 1 : d.isPast ? 0.95 : 0.8}
                        stroke={isHovered ? '#ffffff' : 'transparent'}
                        strokeWidth="1.5"
                      />
                    ) : (
                      <circle
                        cx={x}
                        cy={zeroY}
                        r={isHovered ? 3 : 1.5}
                        fill="rgba(148, 163, 184, 0.35)"
                      />
                    )}
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
                pointerEvents="none"
              >
                {d.label}
              </text>
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
              minWidth: '220px',
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
                {chartMode === 'acumulado_real' ? 'Realizado' : hoveredData.isPast ? 'Liquidado' : hoveredData.isCurrent ? 'Mês Atual' : 'Projeção'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>
                  {isBalanco ? 'Balanço Líquido:' : isGastos ? 'Total Saídas:' : isInvest ? 'Total Aportes:' : 'Total Entradas:'}
                </span>
                <span
                  style={{
                    fontWeight: '800',
                    color: isBalanco
                      ? (hoveredData.monthTotal >= 0 ? '#10b981' : '#f43f5e')
                      : (isGastos ? '#f43f5e' : isInvest ? '#a78bfa' : '#10b981')
                  }}
                >
                  {isBalanco && hoveredData.monthTotal > 0 ? '+' : isGastos && hoveredData.monthTotal > 0 ? '-' : ''}
                  {formatCurrency(hoveredData.monthTotal)}
                </span>
              </div>

              {isBalanco && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  <span>Entradas vs Saídas:</span>
                  <span>
                    <span style={{ color: '#10b981' }}>+{formatCurrency(hoveredData.monthIncome)}</span> / <span style={{ color: '#f43f5e' }}>-{formatCurrency(hoveredData.monthExpense)}</span>
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>{chartMode === 'acumulado_real' ? 'Acumulado Real:' : 'Total Acumulado:'}</span>
                <span style={{ fontWeight: '800', color: activeColor }}>
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
