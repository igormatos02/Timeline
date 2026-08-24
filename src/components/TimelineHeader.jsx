import React, { useState } from 'react';
import {
  Calendar,
  Tag,
  Activity,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  CreditCard,
  Percent,
  Plus,
  Repeat,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Layers,
  Sparkles,
  ShieldAlert,
  Gift,
  BarChart2,
  LayoutDashboard,
  ShoppingCart,
  PiggyBank,
  Scale,
  Home,
  RotateCcw
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  formatCurrency,
  getLoanMetrics,
  getIncomeMetrics,
  getFinancialMetrics,
  getConsolidatedLoanMetrics,
  getPeriodicityLabel
} from '../utils/loanCalculations';
import IncomeEvolutionChart from './IncomeEvolutionChart';

export default function TimelineHeader({
  timeline,
  allTimelines = [],
  selectedTimelineIds = null,
  activeFinancialTab = 'entradas',
  onSelectFinancialTab,
  onEdit,
  onDelete,
  onReset,
  onOpenCreateTimeline,
  onOpenAmortizationModal,
  onScrollToOverdue
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'chart'

  if (!timeline) return null;

  const isPrincipal = timeline.type === 'Principal';
  const isLoanTimeline = timeline.type === 'Empréstimo';
  const isIncomeTimeline = timeline.type === 'Entradas' || timeline.type === 'Financeiro' || timeline.id === 'tl-income';

  const isSystemDefaultTimeline =
    isPrincipal ||
    activeFinancialTab === 'balanco' ||
    activeFinancialTab === 'entradas' ||
    activeFinancialTab === 'gastos' ||
    timeline.isSystemDefault ||
    timeline.canDelete === false ||
    timeline.type === 'entradas' ||
    timeline.type === 'gastos';

  const canDeleteTimeline = !isSystemDefaultTimeline;
  const canEditTimeline = !isPrincipal && activeFinancialTab !== 'balanco';
  const isJeepActive = isIncomeTimeline && (activeFinancialTab === 'jeep' || activeFinancialTab === 'emprestimos');
  const isDaciaActive = isIncomeTimeline && activeFinancialTab === 'dacia';
  const isCasa1Active = isIncomeTimeline && activeFinancialTab === 'casa1';
  const isCasa2Active = isIncomeTimeline && activeFinancialTab === 'casa2';
  const isCarLoanActive = isJeepActive || isDaciaActive || isCasa1Active || isCasa2Active;
  const effectiveIsLoan = isLoanTimeline || isCarLoanActive;

  const jeepContract = {
    id: "tl-loan-jeep",
    name: "Crédito Automóvel - Jeep",
    description: "Contrato Nº 80004197726 (TAN 11.183%). Débito Direto PT50002300004549878663394.",
    startDate: "2024-05-15",
    endDate: "2034-04-15",
    status: "Em Progresso",
    type: "Empréstimo",
    color: "#6366f1",
    totalDebt: 15456.60,
    installmentAmount: 218.47,
    periodicity: "mensal",
    dueDay: 15
  };

  const daciaContract = {
    id: "tl-loan-dacia",
    name: "Crédito Automóvel - Dacia Sandero",
    description: "Contrato CRD19605103001 (Matrícula: 46-XP-14). RCI Banque / Mobilize FS (TAEG 5.40%). Débito Direto PT50002300004549878663394.",
    startDate: "2019-05-29",
    endDate: "2027-05-28",
    status: "Em Progresso",
    type: "Empréstimo",
    color: "#8b5cf6",
    totalDebt: 9584.45,
    remainingDebt: 972.74,
    installmentAmount: 180.08,
    financialPortion: 124.17,
    servicesPortion: 55.91,
    periodicity: "mensal",
    dueDay: 28
  };

  const casa1Contract = {
    id: "tl-loan-casa1",
    name: "Crédito Hipotecário - Casa 1",
    contractNumber: "02012642",
    description: "Crédito Hipotecário Nº 02012642 (TAN 2.690%). Prestação nº 94. Próximo débito 01/08/2026.",
    startDate: "2018-11-01",
    endDate: "2054-10-01",
    status: "Em Progresso",
    type: "Empréstimo",
    color: "#0ea5e9",
    totalDebt: 67884.39,
    remainingDebt: 58006.90,
    amortizedCapital: 9877.49,
    installmentAmount: 288.01,
    tan: 2.690,
    currentInstallmentNumber: 94,
    remainingMonths: 338,
    periodicity: "mensal",
    dueDay: 1
  };

  const casa2Contract = {
    id: "tl-loan-casa2",
    name: "Crédito Hipotecário - Casa 2",
    contractNumber: "02015122",
    description: "Crédito Hipotecário Nº 02015122 (TAN 3.990%). Prestação nº 17. Próximo débito 01/08/2026.",
    startDate: "2025-03-01",
    endDate: "2054-03-01",
    status: "Em Progresso",
    type: "Empréstimo",
    color: "#14b8a6",
    totalDebt: 51417.00,
    remainingDebt: 50137.21,
    amortizedCapital: 1279.79,
    installmentAmount: 293.05,
    tan: 3.990,
    currentInstallmentNumber: 17,
    remainingMonths: 331,
    periodicity: "mensal",
    dueDay: 1
  };

  const currentCarContract = isCasa1Active
    ? casa1Contract
    : isCasa2Active
      ? casa2Contract
      : isDaciaActive
        ? daciaContract
        : jeepContract;

  const carLoanEvents = (timeline.events || []).filter((e) => {
    if (isCasa1Active) {
      return e.timelineOriginId === 'tl-loan-casa1' || e.title?.includes('02012642') || e.title?.includes('Casa 1');
    }
    if (isCasa2Active) {
      return e.timelineOriginId === 'tl-loan-casa2' || e.title?.includes('02015122') || e.title?.includes('Casa 2');
    }
    if (isDaciaActive) {
      return e.timelineOriginId === 'tl-loan-dacia' || e.timelineOriginId === 'tl-loan-crd19605103001' || e.title?.includes('Dacia') || (e.isSystemLoanEvent && e.amount === 180.08);
    }
    return e.timelineOriginId === 'tl-loan-jeep' || e.timelineOriginId === 'tl-loan-80004197726' || e.title?.includes('Jeep') || (e.isSystemLoanEvent && e.amount === 218.47);
  });

  const loanMetrics = isLoanTimeline ? getLoanMetrics(timeline, timeline.events || []) : null;
  const carLoanMetrics = isCarLoanActive ? getLoanMetrics(currentCarContract, carLoanEvents) : null;
  const activeLoanMetrics = isLoanTimeline ? loanMetrics : carLoanMetrics;

  const incomeMetrics = isIncomeTimeline ? getIncomeMetrics(timeline, timeline.events || []) : null;
  const finMetrics = isIncomeTimeline ? getFinancialMetrics(timeline, timeline.events || []) : null;
  const consolidatedMetrics = isPrincipal ? getConsolidatedLoanMetrics(allTimelines, selectedTimelineIds) : null;

  const collapsed = isCollapsed;

  // Format dates safely
  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), "d 'de' MMMM, yyyy", { locale: pt });
    } catch {
      return dateStr;
    }
  };

  const formatDateShort = (dateStr) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  // Status Badge Class & Icon
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Concluído':
        return { cls: 'badge-completed', icon: <CheckCircle2 size={12} /> };
      case 'Planeado':
        return { cls: 'badge-planned', icon: <AlertCircle size={12} /> };
      case 'Em Pausa':
        return { cls: 'badge-paused', icon: <PauseCircle size={12} /> };
      default:
        return { cls: 'badge-in-progress', icon: <PlayCircle size={12} /> };
    }
  };

  const statusInfo = getStatusBadge(timeline.status);

  // Calculate duration and progress %
  let totalDays = 0;
  let progressPercent = 0;
  try {
    const start = parseISO(timeline.startDate || (isCarLoanActive ? '2024-05-15' : '2024-01-01'));
    const end = parseISO(timeline.endDate || (isCarLoanActive ? '2034-04-15' : '2027-08-31'));
    const today = new Date('2026-08-21');
    totalDays = Math.max(1, differenceInDays(end, start));
    const elapsedDays = Math.max(0, differenceInDays(today, start));
    
    if (isPrincipal && consolidatedMetrics) {
      progressPercent = consolidatedMetrics.progressPercent;
    } else if (effectiveIsLoan && activeLoanMetrics) {
      progressPercent = activeLoanMetrics.progressPercent;
    } else {
      progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
    }
  } catch (err) {
    progressPercent = 50;
  }

  const getSelectedViewInfo = () => {
    if (isIncomeTimeline) {
      switch (activeFinancialTab) {
        case 'balanco':
          return { title: 'Balanço Global', icon: <Scale size={18} style={{ color: '#0ea5e9' }} /> };
        case 'entradas':
          return { title: 'Entradas e Rendimentos', icon: <DollarSign size={18} style={{ color: '#10b981' }} /> };
        case 'gastos':
          return { title: 'Gastos e Saídas', icon: <ShoppingCart size={18} style={{ color: '#f43f5e' }} /> };
        case 'investimentos':
          return { title: 'Investimentos e Poupança', icon: <PiggyBank size={18} style={{ color: '#6366f1' }} /> };
        case 'jeep':
          return { title: 'Crédito Automóvel - Jeep (Nº 80004197726)', icon: <CreditCard size={18} style={{ color: '#6366f1' }} /> };
        case 'dacia':
          return { title: 'Crédito Automóvel - Dacia (CRD19605103001)', icon: <CreditCard size={18} style={{ color: '#8b5cf6' }} /> };
        case 'casa1':
          return { title: 'Crédito Hipotecário - Casa 1 (Nº 02012642)', icon: <Home size={18} style={{ color: '#0ea5e9' }} /> };
        case 'casa2':
          return { title: 'Crédito Hipotecário - Casa 2 (Nº 02015122)', icon: <Home size={18} style={{ color: '#14b8a6' }} /> };
        case 'emprestimos':
          return { title: 'Crédito Automóvel Nº 80004197726', icon: <CreditCard size={18} style={{ color: '#8b5cf6' }} /> };
        default:
          return { title: 'Balanço Global', icon: <Scale size={18} style={{ color: '#0ea5e9' }} /> };
      }
    }
    return {
      title: timeline.name,
      icon: isPrincipal ? <Layers size={18} style={{ color: '#8b5cf6' }} /> : <CreditCard size={18} style={{ color: '#6366f1' }} />
    };
  };
  const selectedViewInfo = getSelectedViewInfo();
  const selectedViewTitle = selectedViewInfo.title;

  return (
    <div
      className={`timeline-hero glass-panel ${collapsed ? 'hero-collapsed' : ''}`}
      style={{
        '--active-timeline-color': timeline.color || '#10b981',
        padding: collapsed ? '12px 18px' : '16px 20px',
        marginBottom: '10px',
        transition: 'padding 0.2s ease, box-shadow 0.2s ease',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* 🏷️ Linha Superior: Nome da Timeline (Financeiro) e Badges */}
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
          {/* Botão de Chevron estilo Google para Expandir/Recolher */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir cabeçalho" : "Recolher cabeçalho"}
            title={collapsed ? "Expandir cabeçalho" : "Recolher cabeçalho"}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              border: '1px solid var(--border-glass)',
              background: 'rgba(99, 102, 241, 0.08)',
              color: 'var(--primary-light)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              padding: 0,
              flexShrink: 0
            }}
          >
            <ChevronDown
              size={18}
              strokeWidth={2.4}
              style={{
                transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  fontSize: '1.35rem',
                  fontWeight: '800',
                  color: 'var(--text-main)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                  cursor: 'pointer'
                }}
                onClick={() => setIsCollapsed(!collapsed)}
              >
                {timeline.name}
              </h1>
              {!isIncomeTimeline && (
                <span className={`badge ${statusInfo.cls}`} style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                  {statusInfo.icon} {timeline.status}
                </span>
              )}
            </div>
            {timeline.description && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {timeline.description}
              </p>
            )}
          </div>
        </div>

        {/* Lado Direito da Barra de Título: Botão Nova Timeline, Resetar e Resumo Compacto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Modo Compacto: resumo à direita */}
          {collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.08)', padding: '3px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              {selectedViewInfo.icon}
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)' }}>
                {selectedViewTitle}
              </span>
            </div>
          )}

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="btn btn-outline btn-sm"
              style={{
                padding: '4px 10px',
                fontSize: '0.76rem',
                fontWeight: '700',
                borderColor: 'rgba(245, 158, 11, 0.35)',
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.08)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '7px',
                cursor: 'pointer'
              }}
              title={
                activeFinancialTab === 'balanco'
                  ? 'Resetar Timeboard (apagar todos os movimentos)'
                  : activeFinancialTab === 'emprestimos'
                  ? 'Resetar todos os empréstimos'
                  : `Resetar ${selectedViewTitle}`
              }
            >
              <RotateCcw size={13} strokeWidth={2.2} />
              <span>Resetar</span>
            </button>
          )}

          {onOpenCreateTimeline && (
            <button
              type="button"
              onClick={onOpenCreateTimeline}
              className="btn btn-outline btn-sm"
              style={{
                padding: '4px 10px',
                fontSize: '0.76rem',
                fontWeight: '700',
                borderColor: 'var(--border-glass-glow)',
                color: 'var(--primary-light)',
                background: 'rgba(99, 102, 241, 0.08)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '7px',
                cursor: 'pointer'
              }}
              title="Criar nova timeline"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Nova Timeline</span>
            </button>
          )}
        </div>
      </div>

      {/* 📦 Parte Inferior: Visão Selecionada, Controlos de Ação, Métricas e Gráfico */}
      {!collapsed && (
        <div style={{ paddingTop: '12px' }}>
          <div className="hero-top" style={{ marginBottom: '12px' }}>
            <div className="hero-title-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedViewInfo.icon}
                <h2 className="hero-name" style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                  {selectedViewTitle}
                </h2>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* View Switcher: Summary vs Graph */}
              <div
                style={{
                  display: 'inline-flex',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '3px',
                  gap: '3px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('summary')}
                  className={`btn btn-sm ${viewMode === 'summary' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.76rem',
                    borderRadius: '6px',
                    background: viewMode === 'summary' ? 'var(--primary)' : 'transparent',
                    color: viewMode === 'summary' ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  <LayoutDashboard size={13} />
                  <span>Resumo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('chart')}
                  className={`btn btn-sm ${viewMode === 'chart' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.76rem',
                    borderRadius: '6px',
                    background: viewMode === 'chart' ? 'var(--primary)' : 'transparent',
                    color: viewMode === 'chart' ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  <BarChart2 size={13} />
                  <span>Gráfico</span>
                </button>
              </div>

              {effectiveIsLoan && onOpenAmortizationModal && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={onOpenAmortizationModal}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)', padding: '5px 12px' }}
                >
                  <TrendingDown size={14} />
                  <span>Amortizar</span>
                </button>
              )}

              {effectiveIsLoan && activeLoanMetrics && activeLoanMetrics.overdueInstallmentsCount > 0 && (
                <button
                  type="button"
                  onClick={onScrollToOverdue}
                  className="badge badge-paused"
                  style={{
                    animation: 'pulseGlow 2s infinite',
                    cursor: 'pointer',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    padding: '4px 8px',
                    fontSize: '0.72rem'
                  }}
                  title="Clique para ir diretamente à parcela em atraso"
                >
                  <AlertCircle size={12} /> {activeLoanMetrics.overdueInstallmentsCount} em Atraso ▾
                </button>
              )}

              {onReset && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={onReset}
                  style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.35)', padding: '5px 10px' }}
                  title="Resetar timeline (apagar todos os eventos desta timeline)"
                >
                  <RotateCcw size={13} />
                  <span>Resetar</span>
                </button>
              )}

              {canEditTimeline && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={onEdit}
                  style={{ padding: '5px 10px' }}
                  title="Editar detalhes da timeline"
                >
                  <Edit2 size={14} />
                  <span>Editar</span>
                </button>
              )}

              {canDeleteTimeline && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={onDelete}
                  style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '5px 8px' }}
                  title="Eliminar timeline"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* VIEW MODE 1: CHART EVOLUTION VIEW */}
          {viewMode === 'chart' ? (
            <IncomeEvolutionChart
              timeline={timeline}
              events={timeline.events || []}
              todayStr="2026-08-21"
              activeFinancialTab={activeFinancialTab}
            />
          ) : (
              /* VIEW MODE 2: SUMMARY METRICS GRID */
              <>
                {isPrincipal && consolidatedMetrics ? (
                <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                  {/* Total em Dívidas */}
                  <div className="meta-item" style={{ padding: '6px 10px' }}>
                    <div className="meta-icon-box" style={{ color: '#6366f1' }}>
                      <CreditCard size={16} />
                    </div>
                    <div>
                      <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total em Dívidas (Saldo)</div>
                      <div className="meta-value" style={{ color: 'var(--primary-light)', fontSize: '0.96rem', fontWeight: '800' }}>
                        {formatCurrency(consolidatedMetrics.totalRemainingBalance)}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                        de {formatCurrency(consolidatedMetrics.totalContractedDebt)} contratados
                      </div>
                    </div>
                  </div>

                  {/* Total Já Amortizado */}
                  <div className="meta-item" style={{ padding: '6px 10px' }}>
                    <div className="meta-icon-box" style={{ color: '#10b981' }}>
                      <DollarSign size={16} />
                    </div>
                    <div>
                      <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Amortizado (Capital)</div>
                      <div className="meta-value" style={{ color: '#10b981', fontSize: '0.96rem', fontWeight: '800' }}>
                        {formatCurrency(consolidatedMetrics.totalPrincipalAmortized)}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                        {formatCurrency(consolidatedMetrics.totalPaid)} total pago
                      </div>
                    </div>
                  </div>

                  {/* Contratos Ativos */}
                  <div className="meta-item" style={{ padding: '6px 10px' }}>
                    <div className="meta-icon-box" style={{ color: '#06b6d4' }}>
                      <Layers size={16} />
                    </div>
                    <div>
                      <div className="meta-label" style={{ fontSize: '0.7rem' }}>Contratos Integrados</div>
                      <div className="meta-value" style={{ fontSize: '0.88rem', fontWeight: '700' }}>
                        {consolidatedMetrics.activeCreditsCount} Linhas de Crédito
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                        {consolidatedMetrics.paidInstallments} de {consolidatedMetrics.totalInstallments} parcelas pagas
                      </div>
                    </div>
                  </div>

                  {/* Progresso de Quitação */}
                  <div className="meta-item" style={{ padding: '6px 10px' }}>
                    <div className="meta-icon-box" style={{ color: '#f59e0b' }}>
                      <Percent size={16} />
                    </div>
                    <div>
                      <div className="meta-label" style={{ fontSize: '0.7rem' }}>Amortização Global</div>
                      <div className="meta-value" style={{ fontSize: '0.88rem', fontWeight: '800', color: '#10b981' }}>
                        {consolidatedMetrics.progressPercent}% Amortizado
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                        {consolidatedMetrics.overdueInstallments > 0 ? `${consolidatedMetrics.overdueInstallments} em atraso` : 'Em dia'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : isIncomeTimeline && finMetrics ? (
                <>
                  {/* Cards de Métricas contextuais conforme a aba ativa */}
                  {activeFinancialTab === 'entradas' && (
                    <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#10b981' }}>
                          <DollarSign size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Mês Corrente</div>
                          <div className="meta-value" style={{ color: '#10b981', fontSize: '0.96rem', fontWeight: '800' }}>
                            +{formatCurrency(finMetrics.currentMonthIncome || 0)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                            {finMetrics.currentMonthIncomeReceived > 0
                              ? `${formatCurrency(finMetrics.currentMonthIncomeReceived)} já recebidos`
                              : 'Entradas previstas no mês'}
                          </div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#06b6d4' }}>
                          <TrendingUp size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Recebido até Hoje</div>
                          <div className="meta-value" style={{ color: '#06b6d4', fontSize: '0.96rem', fontWeight: '800' }}>
                            {formatCurrency(finMetrics.totalReceived || 0)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Entradas liquidadas e confirmadas</div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#f59e0b' }}>
                          <TrendingUp size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Média Mensal</div>
                          <div className="meta-value" style={{ color: '#f59e0b', fontSize: '0.96rem', fontWeight: '800' }}>
                            +{formatCurrency(finMetrics.monthlyAverageIncome || 0)} / mês
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Rendimento médio estimado</div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#8b5cf6' }}>
                          <Gift size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Projeção Anual</div>
                          <div className="meta-value" style={{ fontSize: '0.88rem', fontWeight: '800', color: '#a78bfa' }}>
                            {formatCurrency(finMetrics.annualProjectedIncome !== undefined ? finMetrics.annualProjectedIncome : finMetrics.totalForecastIncome)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>1 ano de entradas (mês atual + 11m)</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFinancialTab === 'gastos' && (
                    <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                      {/* 1. Média de Gastos Mensais */}
                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#f43f5e' }}>
                          <ShoppingCart size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Média de Gastos Mensais</div>
                          <div className="meta-value" style={{ color: '#f43f5e', fontSize: '0.96rem', fontWeight: '800' }}>
                            -{formatCurrency(finMetrics.monthlyAverageExpenses)} / mês
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Despesas médias por mês</div>
                        </div>
                      </div>

                      {/* 2. Gasto Mês Corrente */}
                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#fb7185' }}>
                          <Calendar size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Gasto Mês Corrente</div>
                          <div className="meta-value" style={{ color: '#fb7185', fontSize: '0.96rem', fontWeight: '800' }}>
                            -{formatCurrency(finMetrics.currentMonthExpenses)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                            {formatCurrency(finMetrics.currentMonthExpensesPaid)} já liquidados
                          </div>
                        </div>
                      </div>

                      {/* 3. Projeção Gasto Anual */}
                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#f59e0b' }}>
                          <TrendingUp size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Projeção Gasto Anual</div>
                          <div className="meta-value" style={{ fontSize: '0.96rem', fontWeight: '800', color: '#f59e0b' }}>
                            -{formatCurrency(finMetrics.projectedAnnualExpenses)} / ano
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Projeção calculada para 12 meses</div>
                        </div>
                      </div>

                      {/* 4. Total Gasto (Início até Hoje) */}
                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#94a3b8' }}>
                          <Repeat size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Gasto (Início até Hoje)</div>
                          <div className="meta-value" style={{ fontSize: '0.96rem', fontWeight: '800', color: '#f43f5e' }}>
                            -{formatCurrency(finMetrics.totalPaidExpenses)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                            Desde {formatDateShort(timeline.startDate || '2024-01-01')} até hoje
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFinancialTab === 'investimentos' && (
                    <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#6366f1' }}>
                          <PiggyBank size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Poupado & Investido</div>
                          <div className="meta-value" style={{ color: 'var(--primary-light)', fontSize: '0.96rem', fontWeight: '800' }}>
                            {formatCurrency(finMetrics.totalInvested)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Acumulado até à data</div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#10b981' }}>
                          <TrendingUp size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Aporte Mensal Planeado</div>
                          <div className="meta-value" style={{ color: '#10b981', fontSize: '0.96rem', fontWeight: '800' }}>
                            +600,00 € / mês
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>350€ Reserva + 250€ ETF</div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#0ea5e9' }}>
                          <Percent size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Taxa de Poupança Média</div>
                          <div className="meta-value" style={{ color: '#0ea5e9', fontSize: '0.96rem', fontWeight: '800' }}>
                            ~{finMetrics.savingsRate}%
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Do rendimento mensal</div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#8b5cf6' }}>
                          <Sparkles size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Património Projetado</div>
                          <div className="meta-value" style={{ fontSize: '0.88rem', fontWeight: '800' }}>
                            {formatCurrency(finMetrics.totalPlannedInvestments)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Projeção a longo prazo</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFinancialTab === 'balanco' && (
                    <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#6366f1' }}>
                          <PiggyBank size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Investido</div>
                          <div className="meta-value" style={{ color: 'var(--primary-light)', fontSize: '0.94rem', fontWeight: '800' }}>
                            {formatCurrency(finMetrics.totalInvested)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Aportes acumulados</div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: finMetrics.netRealized >= 0 ? '#10b981' : '#f43f5e' }}>
                          <Scale size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Saldo Líquido Realizado</div>
                          <div className="meta-value" style={{ color: finMetrics.netRealized >= 0 ? '#10b981' : '#f43f5e', fontSize: '0.96rem', fontWeight: '800' }}>
                            {finMetrics.netRealized >= 0 ? '+' : ''}{formatCurrency(finMetrics.netRealized)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Sobra acumulada</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 🚗 / 🏠 Aba Crédito (Automóvel ou Hipotecário) em Financeiro */}
                  {(activeFinancialTab === 'jeep' || activeFinancialTab === 'dacia' || activeFinancialTab === 'casa1' || activeFinancialTab === 'casa2' || activeFinancialTab === 'emprestimos') && carLoanMetrics && (
                    <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#8b5cf6' }}>
                          <CreditCard size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Saldo Devedor Restante</div>
                          <div className="meta-value" style={{ color: 'var(--primary-light)', fontSize: '0.94rem', fontWeight: '800' }}>
                            {formatCurrency(carLoanMetrics.remainingBalance)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                            de {formatCurrency(carLoanMetrics.totalDebt)} contratados
                          </div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#10b981' }}>
                          <DollarSign size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Capital Amortizado</div>
                          <div className="meta-value" style={{ color: '#10b981', fontSize: '0.94rem', fontWeight: '800' }}>
                            {formatCurrency(carLoanMetrics.totalPrincipalAmortized)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                            {formatCurrency(carLoanMetrics.totalPaid)} total pago
                          </div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#06b6d4' }}>
                          <Repeat size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Prestação Mensal</div>
                          <div className="meta-value" style={{ fontSize: '0.88rem', fontWeight: '800' }}>
                            {formatCurrency(carLoanMetrics.monthlyPayment)} / mês
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                            {carLoanMetrics.paidInstallmentsCount} de {carLoanMetrics.totalInstallmentsCount} parcelas pagas
                          </div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: carLoanMetrics.overdueInstallmentsCount > 0 ? '#f43f5e' : '#f59e0b' }}>
                          <Percent size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Progresso de Quitação</div>
                          <div className="meta-value" style={{ fontSize: '0.88rem', fontWeight: '800', color: carLoanMetrics.overdueInstallmentsCount > 0 ? '#f43f5e' : '#10b981' }}>
                            {carLoanMetrics.progressPercent}% Quitado
                          </div>
                          <div style={{ fontSize: '0.66rem', color: carLoanMetrics.overdueInstallmentsCount > 0 ? '#f43f5e' : 'var(--text-dim)' }}>
                            {carLoanMetrics.overdueInstallmentsCount > 0 ? `${carLoanMetrics.overdueInstallmentsCount} parcela em atraso` : 'Em dia'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : isLoanTimeline && loanMetrics ? (
                <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                  {/* Saldo Devedor Restante */}
                  <div className="meta-item" style={{ padding: '6px 10px' }}>
                    <div className="meta-icon-box" style={{ color: '#6366f1' }}>
                      <CreditCard size={16} />
                    </div>
                    <div>
                      <div className="meta-label" style={{ fontSize: '0.7rem' }}>Saldo Devedor</div>
                      <div className="meta-value" style={{ color: 'var(--primary-light)', fontSize: '0.92rem', fontWeight: '800' }}>
                        {formatCurrency(loanMetrics.remainingBalance)}
                      </div>
                    </div>
                  </div>

                  {/* Total Já Pago */}
                  <div className="meta-item" style={{ padding: '6px 10px' }}>
                    <div className="meta-icon-box" style={{ color: '#10b981' }}>
                      <DollarSign size={16} />
                    </div>
                    <div>
                      <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Pago</div>
                      <div className="meta-value" style={{ color: '#10b981', fontWeight: '700', fontSize: '0.92rem' }}>
                        {formatCurrency(loanMetrics.totalPaid)}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                        {formatCurrency(loanMetrics.totalPrincipalAmortized)} cap. + {formatCurrency(loanMetrics.totalInterestPaid)} jur.
                      </div>
                    </div>
                  </div>

                  {/* Início e Fim do Contrato */}
                  <div className="meta-item" style={{ padding: '6px 10px' }}>
                    <div className="meta-icon-box" style={{ color: '#06b6d4' }}>
                      <Calendar size={16} />
                    </div>
                    <div>
                      <div className="meta-label" style={{ fontSize: '0.7rem' }}>Vigência do Contrato</div>
                      <div className="meta-value" style={{ fontSize: '0.8rem' }}>
                        {formatDateShort(timeline.startDate)} <span style={{ color: 'var(--text-dim)' }}>→</span> {formatDateShort(timeline.endDate)}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                        Duração: {totalDays} dias
                      </div>
                    </div>
                  </div>

                  {/* Periodicidade do Pagamento */}
                  <div className="meta-item" style={{ padding: '6px 10px' }}>
                    <div className="meta-icon-box" style={{ color: '#f59e0b' }}>
                      <Repeat size={16} />
                    </div>
                    <div>
                      <div className="meta-label" style={{ fontSize: '0.7rem' }}>Periodicidade</div>
                      <div className="meta-value" style={{ fontWeight: '700', fontSize: '0.88rem' }}>
                        {getPeriodicityLabel(timeline.periodicity)}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                        {loanMetrics.paidInstallmentsCount} de {loanMetrics.totalInstallmentsCount} parcelas
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Progress Bar for Loans and Principal */}
              {(effectiveIsLoan || isPrincipal) && (
                <div className="timeline-progress-container" style={{ marginTop: '2px' }}>
                  <div className="progress-header" style={{ fontSize: '0.72rem', marginBottom: '3px' }}>
                    <span>{isPrincipal ? 'Progresso Global de Amortização das Dívidas' : 'Progresso de Amortização do Capital'}</span>
                    <span>{progressPercent}% amortizado</span>
                  </div>
                  <div className="progress-track" style={{ height: '5px' }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progressPercent}%`,
                        background: 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)'
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
