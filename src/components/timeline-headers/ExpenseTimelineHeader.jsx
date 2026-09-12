import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Settings,
  RotateCcw
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { ExpenseEventCategory } from '../../../shared/enums/ExpensesEventCategory.js';
import { EventType, isCancelledStatus } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import { DonutChart, PieDonut, DonutLegend } from '../ui/DonutChart.jsx';
import BarChart7Months from '../ui/BarChart7Months.jsx';
import { computeMonthDiff } from '../../utils/timelineCharts.js';

export default function ExpenseTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  filteredEvents,
  selectedExpenseCategories = [],
  onEdit,
  onDelete,
  onAddEvent,
  onReset,
  activeViewMode = 'summary',
  setActiveViewMode
}) {
  const { t, language } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(false);

  if (!timeline) return null;

  const headerColor = timeline.color || '#f43f5e';
  const metrics = timeline.metrics || {};

  return (
    <HeaderShell
      timeline={timeline}
      collapsed={collapsed}
      onToggle={() => setIsCollapsed(!collapsed)}
      headerColor={headerColor}
      left={
        <HeaderTitleBlock
          color={headerColor}
          icon={<ShoppingCart size={18} />}
          name={timeline.name}
          badge={t('expenseHeader.badge')}
          iconBackground="rgba(244, 63, 94, 0.12)"
          badgeBackground="rgba(244, 63, 94, 0.12)"
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
                fontWeight: '700'
              }}
            >
              <Plus size={14} />
              <span>{t('expenseHeader.addExpenseButton')}</span>
            </button>
          )}

          {/* Alternância de Modo de Visualização */}
          {setActiveViewMode && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-card)',
                borderRadius: '8px',
                padding: '2px',
                border: '1px solid var(--border-glass)'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveViewMode('summary')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  border: 'none',
                  background: activeViewMode === 'summary' ? 'var(--primary-color)' : 'transparent',
                  color: activeViewMode === 'summary' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: activeViewMode === 'summary' ? '700' : '500'
                }}
              >
                {t('expenseHeader.viewSummary')}
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode('categories')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  border: 'none',
                  background: activeViewMode === 'categories' ? 'var(--primary-color)' : 'transparent',
                  color: activeViewMode === 'categories' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: activeViewMode === 'categories' ? '700' : '500'
                }}
              >
                {t('expenseHeader.viewCategories')}
              </button>
            </div>
          )}

          {onReset && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onReset}
              title={t('buttons.reset') || (language === 'pt' ? 'Reiniciar' : 'Reset')}
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
              <span>{t('buttons.reset') || (language === 'pt' ? 'Reset' : 'Reset')}</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onEdit}
              title={t('expenseHeader.settingsTitle')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}
            >
              <Settings size={13} />
              <span>{t('buttons.edit') || (language === 'pt' ? 'Editar' : 'Edit')}</span>
            </button>
          )}

          {onDelete && !timeline.isSystemDefault && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => onDelete && onDelete(timeline)}
              title={t('expenseHeader.deleteTitle')}
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
      {/* Conteúdo Expandido com Métricas de Despesas no Novo Layout */}
      {!collapsed && (() => {
        const isFiltered = (selectedExpenseCategories && selectedExpenseCategories.length > 0) || (filteredEvents !== undefined);
        const eventsList = (isFiltered && filteredEvents) ? filteredEvents : (events && events.length > 0 ? events : (timeline.events || []));
        const currentMonthStr = new Date().toISOString().substring(0, 7);

        // DTO vindo da Stored Procedure SQL Supabase get_expense_timeline_metrics (usado apenas se não estiver filtrado)
        const dto = !isFiltered ? (timeline.expenseHeaderResult || timeline.procedureMetrics || metrics.expenseHeaderResult) : null;

        // 1. GASTOS POR CATEGORIA & ENTRADAS (Calculado com base nos eventos visíveis na UI)
        const validEnumValues = Object.values(ExpenseEventCategory);
        let uiTotalExp = 0;
        let uiTotalInc = 0;
        const currentMonthCategoryTotals = {};
        const allCategoryTotals = {};

        eventsList.forEach((ev) => {
          if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status)) return;
          const isExpense = ev.eventType === EventType.EXPENSE || ev.isExpense;
          const isIncome = ev.eventType === EventType.INCOME || ev.isIncome;

          if (isExpense) {
            const amt = Number(ev.amount || 0);
            let cat = (ev.category || '').toLowerCase();
            if (!validEnumValues.includes(cat)) {
              cat = ExpenseEventCategory.OTHER;
            }
            allCategoryTotals[cat] = (allCategoryTotals[cat] || 0) + amt;

            if (ev.date.startsWith(currentMonthStr)) {
              uiTotalExp += amt;
              currentMonthCategoryTotals[cat] = (currentMonthCategoryTotals[cat] || 0) + amt;
            }
          } else if (isIncome && ev.date.startsWith(currentMonthStr)) {
            uiTotalInc += Number(ev.amount || 0);
          }
        });

        let monthTotalExpense = dto?.current_month_expense ?? uiTotalExp;
        let monthTotalIncome = dto?.current_month_income ?? uiTotalInc;

        // Extrair lista de categorias diretamente do DTO ou dos eventos da UI
        let categoryList = (!isFiltered && dto?.categories_breakdown && dto.categories_breakdown.length > 0)
          ? dto.categories_breakdown.map((item) => ({
              rawCat: item.category,
              name: item.category, // Membro exato do enum ExpenseEventCategory
              amount: Number(item.amount || 0),
              percent: Number(item.percent || 0)
            }))
          : [];

        // Fallback para cálculo local se a lista de categorias estiver vazia ou filtrada
        if (categoryList.length === 0) {
          const targetCategoryTotals = Object.keys(currentMonthCategoryTotals).length > 0 ? currentMonthCategoryTotals : allCategoryTotals;
          const targetTotal = Object.values(targetCategoryTotals).reduce((sum, val) => sum + val, 0);

          categoryList = Object.entries(targetCategoryTotals)
            .filter(([cat]) => validEnumValues.includes(cat))
            .map(([cat, amt]) => ({
              rawCat: cat,
              name: cat,
              amount: amt,
              percent: targetTotal > 0 ? Math.round((amt / targetTotal) * 100) : 0
            }))
            .sort((a, b) => b.amount - a.amount);
        }

        // Cálculo da Projeção Anual: do mês atual até +12 meses (janela de 1 ano a partir de hoje)
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


        let annualTotalExpense = 0;
        let annualTotalIncome = 0;

        eventsList.forEach((ev) => {
          if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
          const evMonthKey = ev.date.substring(0, 7);

          if (evMonthKey >= startMonthKey && evMonthKey < endMonthKey) {
            const isExpense = ev.eventType === 'expense' || ev.eventType === EventType.EXPENSE || ev.isExpense;
            const isIncome = ev.eventType === 'income' || ev.eventType === EventType.INCOME || ev.isIncome;

            if (isExpense) {
              annualTotalExpense += Number(ev.amount || 0);
            } else if (isIncome) {
              annualTotalIncome += Number(ev.amount || 0);
            }
          }
        });

        // Se não houver entradas cadastradas para os próximos 12 meses, usar a estimativa mensal da timeline se configurada
        if (annualTotalIncome === 0) {
          const monthlyBudget = timeline.monthlyBudget || metrics.monthlyBudget || 0;
          const monthlyIncomeTarget = monthTotalIncome > 0 ? monthTotalIncome : (dto?.monthly_budget || monthlyBudget || 0);
          annualTotalIncome = monthlyIncomeTarget * 12;
        }

        const annualCommitmentPercent = annualTotalIncome > 0 ? Math.min(100, Math.round((annualTotalExpense / annualTotalIncome) * 100)) : 0;

        // 3. PRÓXIMOS 30 DIAS e Mês Atual (calculado com base na lista de eventos da UI)
        const todayStr = new Date().toISOString().substring(0, 10);
        const next30Date = new Date();
        next30Date.setDate(next30Date.getDate() + 30);
        const next30Str = next30Date.toISOString().substring(0, 10);

        let committedAmount30 = dto?.committed_amount_30 ?? 0;
        let committedCount30 = dto?.committed_count_30 ?? 0;
        let paidAmountMonth = dto?.paid_amount_month ?? 0;
        let paidCountMonth = dto?.paid_count_month ?? 0;

        let uiCommAmt = 0;
        let uiCommCnt = 0;
        let uiPaidAmt = 0;
        let uiPaidCnt = 0;

        eventsList.forEach((ev) => {
          if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
          const isExpense = ev.eventType === 'expense' || ev.eventType === EventType.EXPENSE || ev.isExpense;
          if (isExpense) {
            if (ev.date >= todayStr && ev.date <= next30Str) {
              uiCommAmt += Number(ev.amount || 0);
              uiCommCnt += 1;
            }
            const isPaid = ev.status === 'paid' || ev.status === 'settled' || ev.status === 'completed' || ev.isCompleted;
            if (ev.date.startsWith(currentMonthStr) && isPaid) {
              uiPaidAmt += Number(ev.amount || 0);
              uiPaidCnt += 1;
            }
          }
        });

        if (isFiltered || committedAmount30 === 0) {
          committedAmount30 = uiCommAmt;
          committedCount30 = uiCommCnt;
        }
        if (isFiltered || paidAmountMonth === 0) {
          paidAmountMonth = uiPaidAmt;
          paidCountMonth = uiPaidCnt;
        }

        return (
          <div style={{ paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Grid Principal 2x2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {/* Quadrante 1: GASTOS POR CATEGORIA */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* 1. GASTOS POR CATEGORIA (PieChart SVG & Legenda) */}
                <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('expenseHeader.categoriesTitle')}
                </div>
                {(() => {
                  const categoryColors = [
                    '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#06b6d4',
                    '#a855f7', '#ec4899', '#3b82f6', '#84cc16', '#14b8a6'
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
                            {t('expenseHeader.noExpenses')}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                            {t('expenseHeader.noExpensesHint')}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const items = categoryList.map((c, i) => ({
                    ...c,
                    color: categoryColors[i % categoryColors.length],
                    title: `${t(`expenseCategories.${c.name}`) || c.name}: ${c.percent}%`
                  }));

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                      <PieDonut items={items} centerFontSize="0.66rem" />
                      <DonutLegend
                        items={items}
                        nameFormatter={(item) => t(`expenseCategories.${item.name}`) || item.name}
                      />
                    </div>
                  );
                })()}
              </div>

              {/* Quadrante 2: COMPROMETIMENTO ANUAL (PieChart Donut SVG Anual) */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('expenseHeader.annualCommitmentTitle')}
                </div>
                {(() => {
                  if (annualTotalExpense === 0 && annualTotalIncome === 0) {
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
                            {t('expenseHeader.noAnnualCommitment')}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                            {t('expenseHeader.noAnnualCommitmentHint')}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const sliceColor = annualCommitmentPercent > 85 ? '#f43f5e' : '#6366f1';

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                      <DonutChart
                        percent={annualCommitmentPercent}
                        sliceColor={sliceColor}
                        remainingColor="rgba(255, 255, 255, 0.08)"
                        title={`${t('expenseHeader.annualCommitmentLabel')} ${annualCommitmentPercent}%`}
                        label={`${annualCommitmentPercent}%`}
                      />

                      {/* Informações Numéricas de Gastos vs Entradas Anuais */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                          {t('expenseHeader.annualCommitmentLabel')}
                        </div>
                        <div style={{ fontSize: '0.94rem', fontWeight: '800', color: 'var(--text-main)' }}>
                          {formatCurrency(annualTotalExpense)}
                        </div>
                        {annualTotalIncome > 0 ? (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {t('expenseHeader.ofAnnualTotal', { amount: formatCurrency(annualTotalIncome) })}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {t('expenseHeader.projectedNext12Months')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Quadrante 3: PRÓXIMOS 30 DIAS (PieChart Donut SVG de Pagamentos) */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('expenseHeader.next30DaysTitle')}
                </div>
                {(() => {
                  if (committedAmount30 === 0 && paidAmountMonth === 0) {
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
                            {t('expenseHeader.noPendingPayments')}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                            {t('expenseHeader.noPendingPaymentsHint')}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const totalPrevistoOuComprometido = monthTotalExpense > 0 ? monthTotalExpense : committedAmount30;
                  const paidPercent = totalPrevistoOuComprometido > 0 ? Math.min(100, Math.round((paidAmountMonth / totalPrevistoOuComprometido) * 100)) : 0;

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                      <DonutChart
                        percent={paidPercent}
                        sliceColor="#10b981"
                        remainingColor="rgba(244, 63, 94, 0.25)"
                        title={`${t('expenseHeader.paidLabel')} ${paidPercent}%`}
                        label={`${paidPercent}%`}
                      />

                      {/* Informações Numéricas de Comprometido vs Pagos */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{t('expenseHeader.committedLabel')}</span>
                          <strong style={{ color: '#f43f5e' }}>{formatCurrency(committedAmount30)}</strong>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{t('expenseHeader.paidLabel')}</span>
                          <strong style={{ color: '#10b981' }}>{formatCurrency(paidAmountMonth)}</strong>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {t('expenseHeader.committedVsPaidCount', { committed: committedCount30, paid: paidCountMonth })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Rodapé com Comparações, Projeção Anual & Gráfico de Colunas dos últimos 6 meses + mês atual */}
            {(() => {
              // Gerar estrutura dos últimos 6 meses + mês atual (total 7 meses)
              const currentDateObj = new Date();
              const last7Months = [];
              const localeStr = language === 'pt' ? 'pt-PT' : 'en-US';
              for (let i = 6; i >= 0; i--) {
                const year = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() - i, 1).getFullYear();
                const month = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() - i, 1).getMonth() + 1;
                const monthStr = String(month).padStart(2, '0');
                const key = `${year}-${monthStr}`;

                const d = new Date(year, month - 1, 1);
                const label = d.toLocaleDateString(localeStr, { month: 'short' }).replace('.', '').toUpperCase();
                last7Months.push({ key, label, total: 0 });
              }

              // Calcular volume de despesas de cada um dos 7 meses
              eventsList.forEach((ev) => {
                if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
                const isExpense = ev.eventType === 'expense' || ev.isExpense;
                if (isExpense) {
                  const evKey = ev.date.substring(0, 7);
                  const foundMonth = last7Months.find((m) => m.key === evKey);
                  if (foundMonth) {
                    foundMonth.total += Number(ev.amount || 0);
                  }
                }
              });

              const { diffPercentStr, isDiffPositive, currentMonthTotal } = computeMonthDiff(last7Months);
              const isDiffNegative = diffPercentStr === '0,0%' || !isDiffPositive;

              // Projeção anual calculada a partir da soma real dos eventos projetados nos próximos 12 meses
              const annualProj = annualTotalExpense;

              return (
                <BarChart7Months
                  months={last7Months}
                  chartTitle={t('expenseHeader.chartTitle')}
                  monthVsPrevLabel={t('expenseHeader.monthVsPrevMonth')}
                  diffPercentStr={diffPercentStr}
                  isGoodChange={isDiffNegative}
                  goodColor="#10b981"
                  sparklesLabel={t('expenseHeader.annualProjection')}
                  projection={annualProj}
                  sparklesColor="#f59e0b"
                  projectionColor="#f59e0b"
                  currentGradient="linear-gradient(180deg, #f43f5e 0%, #e11d48 100%)"
                  mutedGradientTop="rgba(244, 63, 94, 0.6)"
                  mutedGradientBottom="rgba(244, 63, 94, 0.3)"
                  currentTextColor="#f43f5e"
                />
              );
            })()}
          </div>
        );
        })()}
    </HeaderShell>
  );
}
