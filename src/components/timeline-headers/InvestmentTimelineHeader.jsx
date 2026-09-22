import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Layers,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../../utils/formatCurrency';
import { EventStatus, EventType, isCancelledStatus, isPositiveStatus, TimelineColor } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import { DonutChart, PieDonut, DonutLegend } from '../ui/DonutChart.jsx';
import BarChart7Months from '../ui/BarChart7Months.jsx';
import { computeMonthDiff } from '../../utils/timelineCharts.js';

export default function InvestmentTimelineHeader({
  timeline,
  timeboard = null,
  computeStartDate = null,
  allTimelines = [],
  events = [],
  pockets: propPockets = [],
  onOpenCreatePocket = null,
  onEdit,
  onDelete,
  onAddEvent,
  onReset,
  activeViewMode = 'summary',
  setActiveViewMode
}) {
  const { t, dateLocale } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(false);
  const pockets = propPockets || [];

  if (!timeline) return null;

  const headerColor = timeline.color || TimelineColor.INVESTMENT;
  const metrics = timeline.metrics || {};
  const dto = timeline.investmentHeaderResult || timeline.procedureMetrics || metrics.investmentHeaderResult;

  const eventsList = timeline.events || events || [];
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  // 1. POUPANÇA POR COFRINHOS
  const pocketColors = [
    TimelineColor.INVESTMENT,
    TimelineColor.PURPLE,
    TimelineColor.CYAN,
    TimelineColor.SUCCESS,
    TimelineColor.WARNING,
    TimelineColor.PINK,
    TimelineColor.BLUE,
    TimelineColor.SLATE,
    TimelineColor.PRIMARY,
    TimelineColor.ROSE
  ];

  let totalPocketsAccumulated = 0;
  const rawPocketList = pockets.map((pocket, idx) => {
    const pInitial = Number(pocket.initial_value ?? pocket.initialValue ?? 0);
    let pocketContributed = 0;

    eventsList.forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
      if (ev.pocketId === pocket.id || ev.pocket_id === pocket.id) {
        const isReceived = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
        const isExternal = Boolean(ev.isExternal || ev.is_external);
        if (isReceived || isExternal) {
          pocketContributed += Number(ev.amount || 0);
        }
      }
    });

    const accumulated = pInitial + pocketContributed;
    totalPocketsAccumulated += accumulated;

    return {
      id: pocket.id,
      name: pocket.name,
      amount: accumulated,
      color: pocket.color || pocketColors[idx % pocketColors.length]
    };
  });

  const pocketList = rawPocketList
    .map((item) => ({
      ...item,
      percent: totalPocketsAccumulated > 0 ? Math.round((item.amount / totalPocketsAccumulated) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // 2. COMPROMETIMENTO ANUAL — Aportes projetados nos próximos 12 meses vs Renda Anual
  const startDateObj = new Date();
  const startYear = startDateObj.getFullYear();
  const startMonth = startDateObj.getMonth();
  const startMonthKey = `${startYear}-${String(startMonth + 1).padStart(2, '0')}`;

  const endTotalMonths = startMonth + 12;
  const endYear = startYear + Math.floor(endTotalMonths / 12);
  const endMonthNum = endTotalMonths % 12;
  const endMonthKey = `${endYear}-${String(endMonthNum + 1).padStart(2, '0')}`;

  let annualTotalInvested = 0;
  let annualRegularInvested = 0;
  let annualExternalInvested = 0;
  let currentMonthRegularInvested = 0;
  let currentMonthExternalInvested = 0;
  let annualTotalIncome = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status)) return;
    const isIncome = ev.eventType === EventType.INCOME || ev.isIncome;
    const isInvestment = ev.eventType === EventType.INVESTMENT || ev.isInvestment;
    const isExternal = Boolean(ev.isExternal || ev.is_external);
    const amt = Number(ev.amount || 0);

    if (isIncome) {
      const evMonthKey = ev.date.substring(0, 7);
      if (evMonthKey >= startMonthKey && evMonthKey < endMonthKey) {
        annualTotalIncome += amt;
      }
    }

    if (isInvestment) {
      if (ev.date.startsWith(currentMonthStr)) {
        if (isExternal) {
          currentMonthExternalInvested += amt;
        } else {
          currentMonthRegularInvested += amt;
        }
      }

      const evMonthKey = ev.date.substring(0, 7);
      if (evMonthKey >= startMonthKey && evMonthKey < endMonthKey) {
        if (isExternal) {
          annualExternalInvested += amt;
        } else {
          annualRegularInvested += amt;
          annualTotalInvested += amt;
        }
      }
    }
  });

  if (annualTotalIncome === 0) {
    const monthlyFallback = timeline.monthlySalary || timeline.monthlyBudget || timeline.monthlyIncome || 0;
    annualTotalIncome = monthlyFallback * 12;
  }

  const annualCommitmentPercent = annualTotalIncome > 0
    ? Math.min(100, Math.round((annualTotalInvested / annualTotalIncome) * 100))
    : 0;

  // 3. ATUAL: TOTAL RECEBIDO / APORTADO (INCLUINDO APORTE INICIAL & DEPÓSITOS EXTERNOS) & TARGET
  let totalInstallmentsReceived = 0;
  let initialContribution = 0;
  let totalReceivedCount = 0;
  let highestTargetVersion = -1;
  let customTarget = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status)) return;
    const isInvestment = ev.eventType === EventType.INVESTMENT || ev.isInvestment;
    if (isInvestment) {
      const isExternal = Boolean(ev.isExternal || ev.is_external);
      const isReceived = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);

      // External deposits are added to Received / Invested without impacting other calculations
      if (isReceived || isExternal) {
        totalInstallmentsReceived += Number(ev.amount || 0);
        totalReceivedCount += 1;
      }
      if (Number(ev.initialInvestedAmount || 0) > 0 && (ev.isFirstOccurrence || !ev.isProjected)) {
        initialContribution += Number(ev.initialInvestedAmount);
      }
      const evVer = Number(ev.version !== undefined ? ev.version : (ev.eventVersion !== undefined ? ev.eventVersion : (ev.event_version || 0)));
      if (Number(ev.targetAmount || 0) > 0 && evVer >= highestTargetVersion) {
        highestTargetVersion = evVer;
        customTarget = Number(ev.targetAmount);
      }
    }
  });

  let pocketsInitialSum = 0;
  let pocketsTargetSum = 0;
  pockets.forEach((p) => {
    pocketsInitialSum += Number(p.initial_value ?? p.initialValue ?? 0);
    pocketsTargetSum += Number(p.target_value ?? p.targetValue ?? 0);
  });

  const totalReceived = totalInstallmentsReceived + initialContribution + (initialContribution === 0 ? pocketsInitialSum : 0);

  const targetAmount = customTarget > 0
    ? customTarget
    : (timeline.targetAmount || timeline.target || metrics?.targetAmount || metrics?.target || dto?.target || dto?.annual_target || pocketsTargetSum || 0);

  const targetPercent = targetAmount > 0
    ? Math.min(100, Math.round((totalReceived / targetAmount) * 100))
    : 0;

  const initialValueAmount = timeline.initialValue ?? timeline.initial_value ?? 0;

  return (
    <HeaderShell
      timeline={timeline}
      collapsed={collapsed}
      onToggle={() => setIsCollapsed(!collapsed)}
      headerColor={headerColor}
      left={
        <HeaderTitleBlock
          color={headerColor}
          name={timeline.name}
          description={timeline.description}
          id={timeline.id}
        />
      }
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title={t('common.edit')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                color: 'var(--primary-light)',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '600',
                transition: 'background-color 0.15s ease, border-color 0.15s ease'
              }}
            >
              <Settings size={14} />
              <span>{t('common.edit')}</span>
            </button>
          )}
        </div>
      }
    >
      {/* Conteúdo Expandido */}
      {!collapsed && (
        <div style={{ paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Alternador de Modo de Visão */}
          {setActiveViewMode && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div
                style={{
                  display: 'inline-flex',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '3px',
                  gap: '3px',
                  height: '32px',
                  alignItems: 'center'
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveViewMode('summary')}
                  className={`btn-view-toggle ${activeViewMode === 'summary' ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: activeViewMode === 'summary' ? '800' : '600',
                    cursor: 'pointer',
                    background: activeViewMode === 'summary' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                    color: activeViewMode === 'summary' ? TimelineColor.INVESTMENT : 'var(--text-muted)'
                  }}
                >
                  <Layers size={13} />
                  <span>{t('investmentHeader.summaryView')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewMode('graph')}
                  className={`btn-view-toggle ${activeViewMode === 'graph' ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: activeViewMode === 'graph' ? '800' : '600',
                    cursor: 'pointer',
                    background: activeViewMode === 'graph' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                    color: activeViewMode === 'graph' ? TimelineColor.INVESTMENT : 'var(--text-muted)'
                  }}
                >
                  <Sparkles size={13} />
                  <span>{t('investmentHeader.evolutionView')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Grid Principal 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Quadrante 1: POUPANÇA POR COFRINHOS (PieChart SVG & Legenda) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('investmentHeader.categoriesTitle')}
              </div>
              {(() => {
                if (!pocketList || pocketList.length === 0) {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', padding: '6px 0' }}>
                      <div style={{ position: 'relative', width: '76px', height: '76px', flexShrink: 0 }}>
                        <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                          <circle cx="0" cy="0" r="0.82" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.25" strokeDasharray="3 3" />
                        </svg>
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            background: 'var(--bg-card)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--border-glass)',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            color: 'var(--text-dim)'
                          }}
                        >
                          0%
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                          {t('investmentHeader.noPockets')}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                          {t('investmentHeader.noPocketsHint')}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <PieDonut items={pocketList} />
                    <DonutLegend items={pocketList} />
                  </div>
                );
              })()}
            </div>

            {/* Quadrante 2: COMPROMETIMENTO ANUAL (Aportes vs Renda — Donut Chart) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('investmentHeader.annualProjectionTitle')}
              </div>
              {(() => {
                if (annualTotalInvested === 0 && annualTotalIncome === 0) {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', padding: '6px 0' }}>
                      <div style={{ position: 'relative', width: '76px', height: '76px', flexShrink: 0 }}>
                        <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                          <circle cx="0" cy="0" r="0.82" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.25" strokeDasharray="3 3" />
                        </svg>
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            background: 'var(--bg-card)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--border-glass)',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            color: 'var(--text-dim)'
                          }}
                        >
                          0%
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                          {t('investmentHeader.noInvestments')}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                          {t('investmentHeader.noInvestmentsHint')}
                        </span>
                      </div>
                    </div>
                  );
                }

                const sliceColor = annualCommitmentPercent > 60 ? TimelineColor.WARNING : TimelineColor.INVESTMENT;

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <DonutChart
                      percent={annualCommitmentPercent}
                      sliceColor={sliceColor}
                      remainingColor="rgba(255, 255, 255, 0.08)"
                      title={`${t('investmentHeader.annualProjectionTitle')}: ${annualCommitmentPercent}%`}
                      label={`${annualCommitmentPercent}%`}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                        {t('investmentHeader.projectionNext12Months')}
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: '800', color: 'var(--text-main)' }}>
                        {formatCurrency(annualTotalInvested)}
                      </div>
                      {annualTotalIncome > 0 ? (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {t('investmentHeader.annualTarget', { amount: formatCurrency(annualTotalIncome) })}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {t('investmentHeader.projectionNext12Months')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quadrante 3: ATUAL (Valor Inicial, Total Aportado & Target) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('investmentHeader.currentTitle')}
              </div>
              {(() => {
                const targetReachedLabel = t('investmentHeader.targetReached', { percent: targetPercent });
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <DonutChart
                      percent={targetPercent}
                      sliceColor={TimelineColor.INVESTMENT}
                      remainingColor="rgba(139, 92, 246, 0.2)"
                      title={targetReachedLabel}
                      label={`${targetPercent}%`}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('investmentHeader.initialValue')}</span>
                        <strong style={{ color: 'var(--primary-light)', fontSize: '0.86rem' }}>{formatCurrency(initialValueAmount)}</strong>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('investmentHeader.receivedTotalLabel')}</span>
                        <strong style={{ color: TimelineColor.SUCCESS, fontSize: '0.86rem' }}>{formatCurrency(totalReceived)}</strong>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('investmentHeader.targetLabel')}</span>
                        <strong style={{ color: TimelineColor.INVESTMENT, fontSize: '0.86rem' }}>{formatCurrency(targetAmount)}</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {targetReachedLabel}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Rodapé com Comparações, Projeção Anual & Gráfico de Colunas dos últimos 6 meses + mês atual */}
          {(() => {
            const timeboardComputeStart = timeboard?.computeFrom || timeboard?.compute_from;
            const ownComputeStart = timeline?.computeStartDate || timeline?.compute_start_date || timeline?.computeFrom || timeline?.compute_from;
            const rawComputeStart = computeStartDate || timeboardComputeStart || ownComputeStart;
            const computeFromMonth = rawComputeStart && String(rawComputeStart) !== '1900-01' && !String(rawComputeStart).startsWith('1900-01') && String(rawComputeStart) !== 'all'
              ? String(rawComputeStart).substring(0, 7)
              : null;

            const currentDateObj = new Date();
            const last7Months = [];
            for (let i = 6; i >= 0; i--) {
              const year = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() - i, 1).getFullYear();
              const month = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() - i, 1).getMonth() + 1;
              const monthStr = String(month).padStart(2, '0');
              const key = `${year}-${monthStr}`;

              const d = new Date(year, month - 1, 1);
              const label = format(d, 'MMM', { locale: dateLocale }).replace('.', '').toUpperCase();
              const isNotComputed = Boolean(computeFromMonth && key < computeFromMonth);
              last7Months.push({ key, label, total: 0, isNotComputed });
            }

            eventsList.forEach((ev) => {
              if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
              const isInvestment = ev.eventType === EventType.INVESTMENT || ev.isInvestment;
              if (isInvestment) {
                const evKey = ev.date.substring(0, 7);
                if (computeFromMonth && evKey < computeFromMonth) return;
                const foundMonth = last7Months.find((m) => m.key === evKey);
                if (foundMonth) {
                  foundMonth.total += Number(ev.amount || 0);
                }
              }
            });

            const { diffPercentStr, isDiffPositive } = computeMonthDiff(last7Months);

            const annualProj = annualRegularInvested + annualExternalInvested;

            return (
              <BarChart7Months
                months={last7Months}
                chartTitle={t('investmentHeader.chartTitle')}
                monthVsPrevLabel={t('investmentHeader.monthVsPrevMonth')}
                diffPercentStr={diffPercentStr}
                isGoodChange={isDiffPositive}
                goodColor={TimelineColor.INVESTMENT}
                sparklesLabel={t('investmentHeader.annualProjectionLabel')}
                projection={annualProj}
                sparklesColor={TimelineColor.INVESTMENT}
                projectionColor={TimelineColor.INVESTMENT}
                currentGradient={`linear-gradient(180deg, ${TimelineColor.INVESTMENT} 0%, rgba(139, 92, 246, 0.8) 100%)`}
                mutedGradientTop="rgba(99, 102, 241, 0.6)"
                mutedGradientBottom="rgba(99, 102, 241, 0.3)"
                currentTextColor={TimelineColor.INVESTMENT}
              />
            );
          })()}
        </div>
      )}
    </HeaderShell>
  );
}
