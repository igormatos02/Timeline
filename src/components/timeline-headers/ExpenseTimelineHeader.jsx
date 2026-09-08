import React, { useState } from 'react';
import {
  ShoppingCart,
  Sparkles,
  Clock,
  TrendingDown,
  TrendingUp,
  Calendar,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  Settings,
  RotateCcw
} from 'lucide-react';
import { formatCurrency } from '../../utils/loanCalculations';
import { ExpenseEventCategory } from '../../../shared/enums/ExpensesEventCategory.js';
import { EventType } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

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
    <div
      className={`timeline-hero glass-panel ${collapsed ? 'hero-collapsed' : ''}`}
      style={{
        borderLeft: `4px solid ${headerColor}`,
        '--active-timeline-color': headerColor,
        padding: collapsed ? '12px 18px' : '16px 20px',
        marginBottom: '10px',
        transition: 'padding 0.2s ease, box-shadow 0.2s ease',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* 🏷️ Topo: Título, Ícone e Ações */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: collapsed ? '0' : '12px',
          borderBottom: collapsed ? 'none' : '1px solid var(--border-glass)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setIsCollapsed(!collapsed)}
            aria-label={collapsed ? (language === 'pt' ? 'Expandir cabeçalho' : 'Expand header') : (language === 'pt' ? 'Recolher cabeçalho' : 'Collapse header')}
            title={collapsed ? (language === 'pt' ? 'Expandir cabeçalho' : 'Expand header') : (language === 'pt' ? 'Recolher cabeçalho' : 'Collapse header')}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, transform 0.2s ease',
              flexShrink: 0
            }}
          >
            {collapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
          </button>

          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'rgba(244, 63, 94, 0.12)',
              color: headerColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${headerColor}33`,
              flexShrink: 0
            }}
          >
            <ShoppingCart size={18} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {timeline.name}
              </h1>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(244, 63, 94, 0.12)',
                  color: headerColor,
                  border: `1px solid ${headerColor}44`,
                  textTransform: 'uppercase'
                }}
              >
                {t('expenseHeader.badge')}
              </span>
            </div>
            {timeline.description && (
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {timeline.description}
              </p>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
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
              onClick={onDelete}
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
              <span>{t('buttons.delete') || (language === 'pt' ? 'Excluir' : 'Delete')}</span>
            </button>
          )}
        </div>
      </div>

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
          if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
          const isExpense = ev.eventType === 'expense' || ev.eventType === EventType.EXPENSE || ev.isExpense;
          const isIncome = ev.eventType === 'income' || ev.eventType === EventType.INCOME || ev.isIncome;

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
        const startMonthKey = startDateObj.toISOString().substring(0, 7); // ex: '2026-09'

        const endDateObj = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + 12, 1);
        const endMonthKey = endDateObj.toISOString().substring(0, 7); // ex: '2027-09'

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
                    color: categoryColors[i % categoryColors.length]
                  }));

                  // Construção SVG do PieChart (Donut)
                  let cumulativePercent = 0;
                  const getCoordinatesForPercent = (percent) => {
                    const x = Math.cos(2 * Math.PI * percent);
                    const y = Math.sin(2 * Math.PI * percent);
                    return [x, y];
                  };

                  const slices = items.map((slice) => {
                    const startPercent = cumulativePercent;
                    cumulativePercent += slice.percent / 100;
                    const endPercent = cumulativePercent;

                    const [startX, startY] = getCoordinatesForPercent(startPercent);
                    const [endX, endY] = getCoordinatesForPercent(endPercent);
                    const largeArcFlag = slice.percent / 100 > 0.5 ? 1 : 0;

                    const pathData = [
                      `M ${startX} ${startY}`,
                      `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                      `L 0 0`
                    ].join(' ');

                    return { ...slice, pathData };
                  });

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                      {/* PieChart Donut SVG */}
                      <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                        <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}>
                          {slices.map((s, idx) => (
                            <path
                              key={idx}
                              d={s.pathData}
                              fill={s.color}
                              style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                            >
                              <title>{`${t(`expenseCategories.${s.name}`) || s.name}: ${s.percent}%`}</title>
                            </path>
                          ))}
                        </svg>
                        {/* Miolo Donut */}
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
                            fontSize: '0.66rem',
                            fontWeight: '800',
                            color: 'var(--text-main)'
                          }}
                        >
                          100%
                        </div>
                      </div>

                      {/* Legenda de Cores para Todas as Categorias Encontradas */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto', maxHeight: '110px' }}>
                        {items.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                              <span style={{ color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {t(`expenseCategories.${item.name}`) || item.name}
                              </span>
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontWeight: '700', marginLeft: '6px' }}>
                              {item.percent}%
                            </span>
                          </div>
                        ))}
                      </div>
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

                  const usedFraction = Math.min(1, Math.max(0, annualCommitmentPercent / 100));
                  const sliceX = Math.cos(2 * Math.PI * usedFraction);
                  const sliceY = Math.sin(2 * Math.PI * usedFraction);
                  const largeArcFlag = usedFraction > 0.5 ? 1 : 0;

                  const sliceColor = annualCommitmentPercent > 85 ? '#f43f5e' : '#6366f1';
                  const remainingColor = 'rgba(255, 255, 255, 0.08)';

                  const pathData = usedFraction >= 0.999
                    ? `M 1 0 A 1 1 0 1 1 -0.999 0 L 0 0`
                    : `M 1 0 A 1 1 0 ${largeArcFlag} 1 ${sliceX} ${sliceY} L 0 0`;

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                      {/* PieChart Donut SVG para % Anual */}
                      <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                        <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}>
                          {/* Fundo (Restante / Livre) */}
                          <circle cx="0" cy="0" r="1" fill={remainingColor} />
                          {/* Fatia Comprometida */}
                          {usedFraction > 0 && (
                            <path d={pathData} fill={sliceColor} style={{ transition: 'all 0.3s ease' }}>
                              <title>{`${t('expenseHeader.annualCommitmentLabel')} ${annualCommitmentPercent}%`}</title>
                            </path>
                          )}
                        </svg>
                        {/* Miolo Donut com % Anual */}
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
                            fontSize: '0.74rem',
                            fontWeight: '800',
                            color: sliceColor
                          }}
                        >
                          {annualCommitmentPercent}%
                        </div>
                      </div>

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
                  const paidFraction = Math.min(1, Math.max(0, paidPercent / 100));

                  const sliceX = Math.cos(2 * Math.PI * paidFraction);
                  const sliceY = Math.sin(2 * Math.PI * paidFraction);
                  const largeArcFlag = paidFraction > 0.5 ? 1 : 0;

                  const sliceColor = '#10b981'; // Verde para Pago
                  const remainingColor = 'rgba(244, 63, 94, 0.25)'; // Vermelho suave para pendente/comprometido

                  const pathData = paidFraction >= 0.999
                    ? `M 1 0 A 1 1 0 1 1 -0.999 0 L 0 0`
                    : `M 1 0 A 1 1 0 ${largeArcFlag} 1 ${sliceX} ${sliceY} L 0 0`;

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                      {/* PieChart Donut SVG do progresso de Pagos */}
                      <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                        <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}>
                          {/* Fundo (Comprometido / Pendente) */}
                          <circle cx="0" cy="0" r="1" fill={remainingColor} />
                          {/* Fatia Já Paga */}
                          {paidFraction > 0 && (
                            <path d={pathData} fill={sliceColor} style={{ transition: 'all 0.3s ease' }}>
                              <title>{`${t('expenseHeader.paidLabel')} ${paidPercent}%`}</title>
                            </path>
                          )}
                        </svg>
                        {/* Miolo Donut com % Pago */}
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
                            fontSize: '0.74rem',
                            fontWeight: '800',
                            color: sliceColor
                          }}
                        >
                          {paidPercent}%
                        </div>
                      </div>

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

              // Calcular a variação percentual comparando os 2 últimos meses do gráfico de colunas
              const currentMonthTotal = last7Months[last7Months.length - 1]?.total || 0;
              const prevMonthTotal = last7Months[last7Months.length - 2]?.total || 0;
              let diffPercentStr = '0,0%';
              let isDiffNegative = false;

              if (prevMonthTotal > 0) {
                const diffPct = ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
                isDiffNegative = diffPct <= 0;
                diffPercentStr = `${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1).replace('.', ',')}%`;
              } else if (currentMonthTotal > 0) {
                diffPercentStr = '+100%';
              }

              // Projeção anual calculada diretamente a partir dos eventos de despesas visíveis na UI (mês atual * 12)
              const annualProj = (currentMonthTotal > 0 ? currentMonthTotal : monthTotalExpense) * 12;

              // Maior valor para escalar a altura das colunas do gráfico
              const maxMonthTotal = Math.max(...last7Months.map((m) => m.total), 1);

              return (
                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Linha de Métricas */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: '700' }}>
                    <div style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TrendingUp size={15} style={{ color: isDiffNegative ? '#10b981' : '#f43f5e' }} />
                      <span>{t('expenseHeader.monthVsPrevMonth')}</span>
                      <span style={{ color: isDiffNegative ? '#10b981' : '#f43f5e', background: isDiffNegative ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)', padding: '2px 6px', borderRadius: '6px' }}>
                        {diffPercentStr}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={15} style={{ color: '#f59e0b' }} />
                      <span>{t('expenseHeader.annualProjection')}</span>
                      <span style={{ color: '#f59e0b' }}>{formatCurrency(annualProj)}</span>
                    </div>
                  </div>

                  {/* Gráfico de Colunas: Volume de Gastos (Últimos 6 Meses + Mês Atual) */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '12px 14px 10px 14px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                      {t('expenseHeader.chartTitle')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', height: '90px' }}>
                      {last7Months.map((m, idx) => {
                        const heightPct = Math.max(8, Math.min(100, Math.round((m.total / maxMonthTotal) * 100)));
                        const isCurrentMonth = idx === last7Months.length - 1;

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
                            <div style={{ fontSize: '0.66rem', fontWeight: '800', color: isCurrentMonth ? '#f43f5e' : 'var(--text-muted)' }}>
                              {formatCurrency(m.total).replace(',00', '')}
                            </div>

                            <div style={{ width: '100%', height: '54px', display: 'flex', alignItems: 'flex-end', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: '100%',
                                  height: `${heightPct}%`,
                                  background: isCurrentMonth
                                    ? 'linear-gradient(180deg, #f43f5e 0%, #e11d48 100%)'
                                    : 'linear-gradient(180deg, rgba(244, 63, 94, 0.6) 0%, rgba(244, 63, 94, 0.3) 100%)',
                                  borderRadius: '4px',
                                  transition: 'height 0.3s ease'
                                }}
                                title={`${m.label}: ${formatCurrency(m.total)}`}
                              />
                            </div>

                            <div style={{ fontSize: '0.66rem', fontWeight: isCurrentMonth ? '800' : '600', color: isCurrentMonth ? '#f43f5e' : 'var(--text-dim)' }}>
                              {m.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}
    </div>
  );
}
