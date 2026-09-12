import React, { useState } from 'react';
import {
  PiggyBank,
  Sparkles,
  Plus,
  Trash2,
  Layers,
  Settings,
  RotateCcw
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { InvestmentEventCategory } from '../../../shared/enums/InvestmentEventCategory.js';
import { EventType, isCancelledStatus } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import { DonutChart, PieDonut, DonutLegend } from '../ui/DonutChart.jsx';
import BarChart7Months from '../ui/BarChart7Months.jsx';
import { computeMonthDiff } from '../../utils/timelineCharts.js';

export default function InvestmentTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  onEdit,
  onDelete,
  onAddEvent,
  onReset,
  activeViewMode = 'summary',
  setActiveViewMode
}) {
  const { t } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(false);

  if (!timeline) return null;

  const headerColor = timeline.color || '#6366f1';
  const metrics = timeline.metrics || {};
  const dto = timeline.investmentHeaderResult || timeline.procedureMetrics || metrics.investmentHeaderResult;

  const eventsList = timeline.events || events || [];
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  // 1. INVESTIMENTOS / POUPANÇA POR CATEGORIA & TOTAL DO MÊS
  const validEnumValues = Object.values(InvestmentEventCategory);

  let monthTotalInvested = dto?.current_month_invested ?? 0;

  let uiTotalInv = 0;
  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status)) return;
    const isInvestment = ev.eventType === EventType.INVESTMENT || ev.isInvestment;
    if (isInvestment && ev.date.startsWith(currentMonthStr)) {
      uiTotalInv += Number(ev.amount || 0);
    }
  });

  if (monthTotalInvested === 0 && uiTotalInv > 0) {
    monthTotalInvested = uiTotalInv;
  }

  // Extrair lista de categorias diretamente do DTO vindo da Stored Procedure SQL usando os valores exatos do enum
  let categoryList = (dto?.categories_breakdown && dto.categories_breakdown.length > 0)
    ? dto.categories_breakdown.map((item) => ({
        rawCat: item.category,
        name: item.category, // Valor exato vindo do enum
        amount: Number(item.amount || 0),
        percent: Number(item.percent || 0)
      }))
    : [];

  // Fallback para cálculo local se o DTO for nulo ou vazio
  if (categoryList.length === 0) {
    const categoryTotals = {};
    eventsList.forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status)) return;
      const isInvestment = ev.eventType === EventType.INVESTMENT || ev.isInvestment;
      if (isInvestment && ev.date.startsWith(currentMonthStr)) {
        const amt = Number(ev.amount || 0);
        let cat = (ev.category || '').toLowerCase();
        if (!validEnumValues.includes(cat)) {
          cat = InvestmentEventCategory.OTHER;
        }
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      }
    });

    categoryList = Object.entries(categoryTotals)
      .filter(([cat]) => validEnumValues.includes(cat))
      .map(([cat, amt]) => ({
        rawCat: cat,
        name: cat, // Valor exato vindo do enum
        amount: amt,
        percent: monthTotalInvested > 0 ? Math.round((amt / monthTotalInvested) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  // 2. COMPROMETIMENTO ANUAL — Aportes projetados nos próximos 12 meses vs Renda Anual
  const startDateObj = new Date();
  // Use local year/month to avoid timezone shifts from toISOString() (UTC) vs local time
  const startYear = startDateObj.getFullYear();
  const startMonth = startDateObj.getMonth(); // 0-indexed
  const startMonthKey = `${startYear}-${String(startMonth + 1).padStart(2, '0')}`;

  // End = exactly 12 months later (exclusive upper bound)
  const endTotalMonths = startMonth + 12;
  const endYear = startYear + Math.floor(endTotalMonths / 12);
  const endMonthNum = endTotalMonths % 12; // 0-indexed
  const endMonthKey = `${endYear}-${String(endMonthNum + 1).padStart(2, '0')}`;


  let annualTotalInvested = 0;
  let annualRegularInvested = 0;
  let annualExternalInvested = 0;
  let currentMonthRegularInvested = 0;
  let currentMonthExternalInvested = 0;
  let annualTotalIncome = 0;

  // eventsList already contains rawEvents from all timelines (set by App.jsx activeTimeline memo)
  // So we scan it once for both income and investment events in the 12-month window
  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
    const isIncome = ev.eventType === 'income' || ev.eventType === EventType.INCOME || ev.isIncome;
    const isInvestment = ev.eventType === 'investment' || ev.eventType === EventType.INVESTMENT || ev.isInvestment;
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

  // Fallback: use timeline monthly salary/budget setting if no income events found
  if (annualTotalIncome === 0) {
    const monthlyFallback = timeline.monthlySalary || timeline.monthlyBudget || timeline.monthlyIncome || 0;
    annualTotalIncome = monthlyFallback * 12;
  }

  const annualCommitmentPercent = annualTotalIncome > 0
    ? Math.min(100, Math.round((annualTotalInvested / annualTotalIncome) * 100))
    : 0;

  // 3. ATUAL: TOTAL RECEBIDO / APORTADO (INCLUINDO APORTE INICIAL) & TARGET
  let totalInstallmentsReceived = 0;
  let initialContribution = 0;
  let totalReceivedCount = 0;
  let highestTargetVersion = -1;
  let customTarget = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
    const isInvestment = ev.eventType === 'investment' || ev.eventType === EventType.INVESTMENT || ev.isInvestment;
    if (isInvestment) {
      const isReceived = ev.status === 'paid' || ev.status === 'settled' || ev.status === 'completed' || ev.status === 'received' || ev.status === 'invested' || ev.isCompleted;
      if (isReceived) {
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

  const totalReceived = totalInstallmentsReceived + initialContribution;

  const targetAmount = customTarget > 0
    ? customTarget
    : (timeline.targetAmount || timeline.target || metrics?.targetAmount || metrics?.target || dto?.target || dto?.annual_target || 0);

  const targetPercent = targetAmount > 0
    ? Math.min(100, Math.round((totalReceived / targetAmount) * 100))
    : 0;

  return (
    <HeaderShell
      timeline={timeline}
      collapsed={collapsed}
      onToggle={() => setIsCollapsed(!collapsed)}
      headerColor={headerColor}
      left={
        <HeaderTitleBlock
          color={headerColor}
          icon={<PiggyBank size={18} />}
          name={timeline.name}
          badge={t('investmentHeader.badge') || 'Poupança & Investimentos'}
          iconBackground="rgba(99, 102, 241, 0.12)"
          badgeBackground="rgba(99, 102, 241, 0.12)"
          description={timeline.description}
          id={timeline.id}
        />
      }
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onAddEvent && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onAddEvent}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '700',
                background: headerColor,
                borderColor: headerColor
              }}
            >
              <Plus size={14} />
              <span>Novo Aporte</span>
            </button>
          )}

          {onReset && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={onReset}
              title="Limpar todos os movimentos desta timeline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title="Timeline Settings"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                color: 'var(--primary-light)',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <Settings size={15} />
            </button>
          )}

          {onDelete && !timeline.isSystemDefault && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => onDelete && onDelete(timeline)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}
            >
              <Trash2 size={13} />
              <span>{t('buttons.delete')}</span>
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
                    color: activeViewMode === 'summary' ? '#6366f1' : 'var(--text-muted)'
                  }}
                >
                  <Layers size={13} />
                  <span>Resumo</span>
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
                    color: activeViewMode === 'graph' ? '#6366f1' : 'var(--text-muted)'
                  }}
                >
                  <Sparkles size={13} />
                  <span>Evolução</span>
                </button>
              </div>
            </div>
          )}

          {/* Grid Principal 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Quadrante 1: INVESTIMENTOS POR CATEGORIA (PieChart SVG & Legenda) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                INVESTIMENTOS POR CATEGORIA
              </div>
              {(() => {
                const categoryColors = [
                  '#6366f1', '#a855f7', '#06b6d4', '#10b981', '#f59e0b',
                  '#ec4899', '#3b82f6', '#84cc16', '#14b8a6', '#f43f5e'
                ];

                if (!categoryList || categoryList.length === 0) {
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
                            background: 'var(--bg-card, #0f172a)',
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
                          Sem investimentos registados
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                          Adicione aportes para visualizar o gráfico por categoria.
                        </span>
                      </div>
                    </div>
                  );
                }

                const items = categoryList.map((c, i) => ({
                  ...c,
                  color: categoryColors[i % categoryColors.length]
                }));

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <PieDonut items={items} />
                    <DonutLegend items={items} />
                  </div>
                );
              })()}
            </div>

            {/* Quadrante 2: COMPROMETIMENTO ANUAL (Aportes vs Renda — Donut Chart) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ANNUAL COMMITMENT
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
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)', width: '42px', height: '42px',
                            borderRadius: '50%', background: 'var(--bg-card, #0f172a)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid var(--border-glass)', fontSize: '0.7rem',
                            fontWeight: '700', color: 'var(--text-dim)'
                          }}
                        >
                          0%
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                          Sem dados disponíveis
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                          Adicione aportes e rendimentos para calcular o comprometimento anual.
                        </span>
                      </div>
                    </div>
                  );
                }

                const sliceColor = annualCommitmentPercent > 60 ? '#f59e0b' : '#6366f1';

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <DonutChart
                      percent={annualCommitmentPercent}
                      sliceColor={sliceColor}
                      remainingColor="rgba(255, 255, 255, 0.08)"
                      title={`Annual Commitment: ${annualCommitmentPercent}%`}
                      label={`${annualCommitmentPercent}%`}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                        Annual Commitment:
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: '800', color: 'var(--text-main)' }}>
                        {formatCurrency(annualTotalInvested)}
                      </div>
                      {annualTotalIncome > 0 ? (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          of {formatCurrency(annualTotalIncome)} annual total
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          projected next 12 months
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quadrante 3: ATUAL (PieChart Donut SVG de Atingimento do Target) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('investmentHeader.currentTitle') || 'ATUAL'}
              </div>
              {(() => {
                const targetReachedLabel = t('investmentHeader.targetReached', { percent: targetPercent }) || `${targetPercent}% do target`;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <DonutChart
                      percent={targetPercent}
                      sliceColor="#8b5cf6"
                      remainingColor="rgba(139, 92, 246, 0.2)"
                      title={targetReachedLabel}
                      label={`${targetPercent}%`}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('investmentHeader.receivedTotalLabel') || 'recebidos:'}</span>
                        <strong style={{ color: '#10b981', fontSize: '0.86rem' }}>{formatCurrency(totalReceived)}</strong>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('investmentHeader.targetLabel') || 'target:'}</span>
                        <strong style={{ color: '#8b5cf6', fontSize: '0.86rem' }}>{formatCurrency(targetAmount)}</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {t('investmentHeader.targetReached', { percent: targetPercent }) || `${targetPercent}% do target atingido`}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Rodapé com Comparações, Projeção Anual & Gráfico de Colunas dos últimos 6 meses + mês atual */}
          {(() => {
            const currentDateObj = new Date();
            const last7Months = [];
            for (let i = 6; i >= 0; i--) {
              const year = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() - i, 1).getFullYear();
              const month = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() - i, 1).getMonth() + 1;
              const monthStr = String(month).padStart(2, '0');
              const key = `${year}-${monthStr}`;

              const d = new Date(year, month - 1, 1);
              const label = d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '').toUpperCase();
              last7Months.push({ key, label, total: 0 });
            }

            eventsList.forEach((ev) => {
              if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
              const isInvestment = ev.eventType === 'investment' || ev.eventType === EventType.INVESTMENT || ev.isInvestment;
              if (isInvestment) {
                const evKey = ev.date.substring(0, 7);
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
                chartTitle="EVOLUÇÃO DO VOLUME DE APORTES (ÚLTIMOS 6 MESES + MÊS ATUAL)"
                monthVsPrevLabel="Este mês vs mês anterior:"
                diffPercentStr={diffPercentStr}
                isGoodChange={isDiffPositive}
                goodColor="#6366f1"
                sparklesLabel="Projeção anual:"
                projection={annualProj}
                sparklesColor="#6366f1"
                projectionColor="#6366f1"
                currentGradient="linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)"
                mutedGradientTop="rgba(99, 102, 241, 0.6)"
                mutedGradientBottom="rgba(99, 102, 241, 0.3)"
                currentTextColor="#6366f1"
              />
            );
          })()}
        </div>
      )}
    </HeaderShell>
  );
}
