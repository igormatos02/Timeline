import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Landmark,
  Scale,
  Home,
  RotateCcw,
  X
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
import * as api from '../services/api';

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
  const [computeFromMonth, setComputeFromMonth] = useState(() => {
    if (timeline?.computeFromMonth) return timeline.computeFromMonth;
    try {
      return localStorage.getItem('timeline_compute_from_month') || '2026-08';
    } catch {
      return '2026-08';
    }
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempComputeMonth, setTempComputeMonth] = useState(computeFromMonth);

  useEffect(() => {
    if (timeline?.computeFromMonth && timeline.computeFromMonth !== computeFromMonth) {
      setComputeFromMonth(timeline.computeFromMonth);
    }
  }, [timeline?.computeFromMonth]);

  const handleSaveComputeMonth = async (val) => {
    setComputeFromMonth(val);
    try {
      localStorage.setItem('timeline_compute_from_month', val);
      if (timeline?.id) {
        await api.updateTimeline(timeline.id, { computeFromMonth: val });
      }
    } catch (e) {
      console.error('Error saving computeFromMonth to database:', e);
    }
    setIsDatePickerOpen(false);
  };

  useEffect(() => {
    if (!isDatePickerOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsDatePickerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDatePickerOpen]);

  const getFormattedMonthLabel = (monthStr) => {
    if (!monthStr || monthStr === '1900-01') return 'Todo o Histórico';
    try {
      const d = parseISO(`${monthStr}-01`);
      if (isNaN(d.getTime())) return monthStr;
      return format(d, "MMMM 'de' yyyy", { locale: pt });
    } catch {
      return monthStr;
    }
  };

  if (!timeline) return null;

  const isPrincipal = timeline.type === 'Principal';
  const isLoanTimeline = timeline.type === 'Empréstimo';
  const isIncomeTimeline =
    timeline.type === 'Entradas' ||
    timeline.type === 'Financeiro' ||
    timeline.type === 'entradas' ||
    timeline.type === 'gastos' ||
    timeline.type === 'investimentos' ||
    timeline.id === 'tl-income' ||
    timeline.id === 'b3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e';

  const isSystemDefaultTimeline =
    isPrincipal ||
    activeFinancialTab === 'balanco' ||
    activeFinancialTab === 'entradas' ||
    activeFinancialTab === 'gastos' ||
    activeFinancialTab === 'investimentos' ||
    timeline.isSystemDefault ||
    timeline.canDelete === false ||
    timeline.type === 'entradas' ||
    timeline.type === 'gastos' ||
    timeline.type === 'investimentos';

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
    name: "Crédito Egas Moniz",
    contractNumber: "02012642",
    description: "Crédito Nº 02012642 (TAN 2.690%). Prestação nº 94 (238 meses restantes).",
    startDate: "2018-11-03",
    endDate: "2046-06-03",
    status: "Em Progresso",
    type: "Empréstimo",
    color: "#0ea5e9",
    totalDebt: 67884.39,
    remainingDebt: 58006.90,
    amortizedCapital: 9877.49,
    installmentAmount: 288.01,
    tan: 2.690,
    totalInstallments: 332,
    currentInstallmentNumber: 94,
    remainingMonths: 238,
    periodicity: "mensal",
    dueDay: 3
  };

  const casa2Contract = {
    id: "tl-loan-casa2",
    name: "Hipoteca Egas Moniz",
    contractNumber: "02015122",
    description: "Hipoteca Nº 02015122 (TAN 3.990%). Prestação nº 17 (322 meses restantes).",
    startDate: "2025-04-03",
    endDate: "2053-06-03",
    status: "Em Progresso",
    type: "Empréstimo",
    color: "#14b8a6",
    totalDebt: 51417.00,
    remainingDebt: 50137.21,
    amortizedCapital: 1279.79,
    installmentAmount: 293.05,
    tan: 3.990,
    totalInstallments: 339,
    currentInstallmentNumber: 17,
    remainingMonths: 322,
    periodicity: "mensal",
    dueDay: 3
  };

  const currentCarContract = isCasa1Active
    ? casa1Contract
    : isCasa2Active
      ? casa2Contract
      : isDaciaActive
        ? daciaContract
        : jeepContract;

  const daciaTimelineFromAll = (allTimelines || []).find((t) => t.id === 'd5e6f7a8-b9c0-4d1e-2f3a-4b5c6d7e8f9a' || t.name?.toLowerCase().includes('dacia') || t.contractNumber === 'CRD19605103001');
  const jeepTimelineFromAll = (allTimelines || []).find((t) => t.id === 'c4d5e6f7-a8b9-4c0d-1e2f-3a4b5c6d7e8f' || t.name?.toLowerCase().includes('jeep') || t.contractNumber === '80004197726');
  const casa1TimelineFromAll = (allTimelines || []).find((t) => t.id === 'e6f7a8b9-c0d1-4e2f-3a4b-5c6d7e8f9a0b' || t.name?.includes('02012642') || (t.name?.includes('Egas Moniz') && !t.name?.includes('Hipoteca')));
  const casa2TimelineFromAll = (allTimelines || []).find((t) => t.id === 'f7a8b9c0-d1e2-4f3a-4b5c-6d7e8f9a0b1c' || t.name?.includes('02015122') || t.name?.includes('Hipoteca'));

  const carLoanEvents = (timeline.events || []).filter((e) => {
    if (isCasa1Active) {
      return (e.timelineOriginId === 'tl-loan-casa1' || e.timelineOriginId === 'e6f7a8b9-c0d1-4e2f-3a4b-5c6d7e8f9a0b' || e.title?.includes('02012642') || e.title?.includes('Crédito Egas Moniz') || e.title?.includes('Casa 1')) && !e.title?.includes('Hipoteca');
    }
    if (isCasa2Active) {
      return e.timelineOriginId === 'tl-loan-casa2' || e.timelineOriginId === 'f7a8b9c0-d1e2-4f3a-4b5c-6d7e8f9a0b1c' || e.title?.includes('02015122') || e.title?.includes('Hipoteca') || e.title?.includes('Casa 2');
    }
    if (isDaciaActive) {
      return e.timelineOriginId === 'tl-loan-dacia' || e.timelineOriginId === 'tl-loan-crd19605103001' || e.timelineOriginId === 'd5e6f7a8-b9c0-4d1e-2f3a-4b5c6d7e8f9a' || e.title?.includes('Dacia') || (e.isSystemLoanEvent && e.amount === 180.08);
    }
    return e.timelineOriginId === 'tl-loan-jeep' || e.timelineOriginId === 'tl-loan-80004197726' || e.timelineOriginId === 'c4d5e6f7-a8b9-4c0d-1e2f-3a4b5c6d7e8f' || e.title?.includes('Jeep') || (e.isSystemLoanEvent && e.amount === 218.47);
  });

  const fullLoanEvents = isCasa1Active && casa1TimelineFromAll?.events?.length
    ? casa1TimelineFromAll.events
    : isCasa2Active && casa2TimelineFromAll?.events?.length
      ? casa2TimelineFromAll.events
      : isDaciaActive && daciaTimelineFromAll?.events?.length
        ? daciaTimelineFromAll.events
        : isJeepActive && jeepTimelineFromAll?.events?.length
          ? jeepTimelineFromAll.events
          : carLoanEvents;

  const loanMetrics = isLoanTimeline ? getLoanMetrics(timeline, timeline.events || []) : null;
  const carLoanMetrics = isCarLoanActive ? getLoanMetrics(currentCarContract, fullLoanEvents) : null;
  const activeLoanMetrics = isLoanTimeline ? loanMetrics : carLoanMetrics;

  const incomeMetrics = isIncomeTimeline ? getIncomeMetrics(timeline, timeline.events || []) : null;
  const finMetrics = isIncomeTimeline ? getFinancialMetrics(timeline, timeline.events || [], computeFromMonth) : null;
  const consolidatedMetrics = isPrincipal ? getConsolidatedLoanMetrics(allTimelines, selectedTimelineIds) : null;

  // Consolidated loan metrics across all 4 loan contracts
  const allLoanTimelinesList = [jeepContract, daciaContract, casa1Contract, casa2Contract];
  const loanTimelinesFromAll = (allTimelines || []).filter(t => t.type === 'Empréstimo' || t.type === 'emprestimo');
  const totalAllLoansAmortized = loanTimelinesFromAll.length >= 4
    ? loanTimelinesFromAll.reduce((acc, t) => {
        const m = getLoanMetrics(t, t.events || []);
        return acc + (Number(m.totalPrincipalAmortized || t.amortizedCapital || 0));
      }, 0)
    : allLoanTimelinesList.reduce((acc, c) => acc + (Number(c.amortizedCapital || 0)), 0);

  const totalAllLoansRemaining = loanTimelinesFromAll.length >= 4
    ? loanTimelinesFromAll.reduce((acc, t) => {
        const m = getLoanMetrics(t, t.events || []);
        return acc + (Number(m.remainingBalance || t.remainingDebt || 0));
      }, 0)
    : allLoanTimelinesList.reduce((acc, c) => acc + (Number(c.remainingDebt || 0)), 0);

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
          return { title: 'Crédito Egas Moniz (Nº 02012642)', icon: <Home size={18} style={{ color: '#0ea5e9' }} /> };
        case 'casa2':
          return { title: 'Hipoteca Egas Moniz (Nº 02015122)', icon: <Home size={18} style={{ color: '#14b8a6' }} /> };
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

        {/* Lado Direito da Barra de Título: Botão Nova Timeline e Resumo Compacto */}
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

              {/* Botão Resetar exclusivo para Entradas, Gastos e Investimentos */}
              {onReset && (activeFinancialTab === 'entradas' || activeFinancialTab === 'gastos' || activeFinancialTab === 'investimentos') && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={onReset}
                  style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.35)', padding: '5px 10px' }}
                  title={`Resetar timeline ${selectedViewTitle}`}
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
              computeStartDate={computeFromMonth}
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
                      <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Já Amortizado</div>
                      <div className="meta-value" style={{ color: '#10b981', fontSize: '0.96rem', fontWeight: '800' }}>
                        {formatCurrency(consolidatedMetrics.totalAmortized)}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                        {formatCurrency(consolidatedMetrics.totalPaidSoFar)} total pago
                      </div>
                    </div>
                  </div>

                  {/* Encargo Mensal */}
                  <div className="meta-item" style={{ padding: '6px 10px' }}>
                    <div className="meta-icon-box" style={{ color: '#06b6d4' }}>
                      <Repeat size={16} />
                    </div>
                    <div>
                      <div className="meta-label" style={{ fontSize: '0.7rem' }}>Encargo Mensal Total</div>
                      <div className="meta-value" style={{ fontSize: '0.96rem', fontWeight: '800' }}>
                        {formatCurrency(consolidatedMetrics.totalMonthlyPayment)} / mês
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                        {consolidatedMetrics.totalContractsCount} créditos ativos
                      </div>
                    </div>
                  </div>

                  {/* Dívida Quitada */}
                  <div className="meta-item" style={{ padding: '6px 10px' }}>
                    <div className="meta-icon-box" style={{ color: '#8b5cf6' }}>
                      <Percent size={16} />
                    </div>
                    <div>
                      <div className="meta-label" style={{ fontSize: '0.7rem' }}>Progresso Global</div>
                      <div className="meta-value" style={{ fontSize: '0.96rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                        {consolidatedMetrics.progressPercent}%
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                        Dívida amortizada
                      </div>
                    </div>
                  </div>
                </div>
              ) : isIncomeTimeline && finMetrics ? (
                <>
                  {/* Cards de Métricas contextuais conforme a aba ativa */}
                  {activeFinancialTab === 'entradas' && incomeMetrics && (
                    <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#10b981' }}>
                          <DollarSign size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Recebido este Mês</div>
                          <div className="meta-value" style={{ color: '#10b981', fontSize: '0.94rem', fontWeight: '800' }}>
                            {formatCurrency(incomeMetrics.currentMonthReceived)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>{formatCurrency(incomeMetrics.monthlyBaseSalary)} base</div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: 'var(--primary-light)' }}>
                          <TrendingUp size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Recebido</div>
                          <div className="meta-value" style={{ color: 'var(--primary-light)', fontSize: '0.94rem', fontWeight: '800' }}>
                            {formatCurrency(incomeMetrics.totalReceived)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Ano corrente</div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#06b6d4' }}>
                          <Sparkles size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Projeção Anual</div>
                          <div className="meta-value" style={{ fontSize: '0.88rem', fontWeight: '800' }}>
                            {formatCurrency(incomeMetrics.annualProjected)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>12 meses</div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#8b5cf6' }}>
                          <Calendar size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Próxima Entrada</div>
                          <div className="meta-value" style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>
                            {incomeMetrics.nextIncome ? `${formatCurrency(incomeMetrics.nextIncome.amount)}` : 'Nenhuma'}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                            {incomeMetrics.nextIncome ? formatDateShort(incomeMetrics.nextIncome.date) : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFinancialTab === 'gastos' && (
                    <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#f43f5e' }}>
                          <ShoppingCart size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Pago este Mês</div>
                          <div className="meta-value" style={{ color: '#f43f5e', fontSize: '0.94rem', fontWeight: '800' }}>
                            {formatCurrency(finMetrics.currentMonthExpensesPaid)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>de {formatCurrency(finMetrics.currentMonthExpenses)} previstos</div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#fb7185' }}>
                          <TrendingDown size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Pago</div>
                          <div className="meta-value" style={{ color: '#fb7185', fontSize: '0.94rem', fontWeight: '800' }}>
                            {formatCurrency(finMetrics.totalPaidExpenses)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Histórico acumulado</div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#f59e0b' }}>
                          <Repeat size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Média Mensal</div>
                          <div className="meta-value" style={{ fontSize: '0.88rem', fontWeight: '800' }}>
                            {formatCurrency(finMetrics.monthlyAverageExpenses)} / mês
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Média despesas correntes</div>
                        </div>
                      </div>

                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#8b5cf6' }}>
                          <Calendar size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Próxima Saída</div>
                          <div className="meta-value" style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>
                            {finMetrics.nextExpense ? `${formatCurrency(finMetrics.nextExpense.amount)}` : 'Nenhuma'}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                            {finMetrics.nextExpense ? formatDateShort(finMetrics.nextExpense.date) : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {(activeFinancialTab === 'investimentos' || timeline.type === 'investimentos' || timeline.id === 'b3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e') && (
                    <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                      {/* Card 1: Total Investido */}
                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#6366f1' }}>
                          <DollarSign size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Investido</div>
                          <div className="meta-value" style={{ color: 'var(--primary-light)', fontSize: '0.94rem', fontWeight: '800' }}>
                            {formatCurrency(finMetrics.totalInvested)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Património consolidado</div>
                        </div>
                      </div>

                      {/* Card 2: Total Poupança */}
                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#10b981' }}>
                          <PiggyBank size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Poupança</div>
                          <div className="meta-value" style={{ color: '#10b981', fontSize: '0.94rem', fontWeight: '800' }}>
                            {formatCurrency(finMetrics.totalPoupanca || 0)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Reserva e liquidez</div>
                        </div>
                      </div>

                      {/* Card 3: Total Património */}
                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#a855f7' }}>
                          <Landmark size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Património</div>
                          <div className="meta-value" style={{ color: '#c084fc', fontSize: '0.94rem', fontWeight: '800' }}>
                            {formatCurrency(finMetrics.totalPatrimonio || 0)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Bens e imóveis</div>
                        </div>
                      </div>

                      {/* Card 4: Total Outros */}
                      <div className="meta-item" style={{ padding: '6px 10px' }}>
                        <div className="meta-icon-box" style={{ color: '#38bdf8' }}>
                          <Sparkles size={16} />
                        </div>
                        <div>
                          <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Outros</div>
                          <div className="meta-value" style={{ color: '#38bdf8', fontSize: '0.94rem', fontWeight: '800' }}>
                            {formatCurrency(finMetrics.totalOutros || 0)}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Fundos / Ações / Outros</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFinancialTab === 'balanco' && (
                    <>
                      <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                        {/* Card 1: Total Investido (Total + Poupança / Património / Outros) */}
                        <div className="meta-item" style={{ padding: '6px 12px' }}>
                          <div className="meta-icon-box" style={{ color: '#6366f1' }}>
                            <PiggyBank size={16} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                              <span className="meta-label" style={{ fontSize: '0.7rem' }}>Total Investido</span>
                              <span style={{ color: 'var(--primary-light)', fontSize: '0.94rem', fontWeight: '800' }}>
                                {formatCurrency(finMetrics.totalInvested)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Poupança:</span>
                                <span style={{ color: '#10b981', fontSize: '0.82rem', fontWeight: '800' }}>
                                  {formatCurrency(finMetrics.totalPoupanca || 0)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Património:</span>
                                <span style={{ color: '#c084fc', fontSize: '0.82rem', fontWeight: '800' }}>
                                  {formatCurrency(finMetrics.totalPatrimonio || 0)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Outros:</span>
                                <span style={{ color: '#38bdf8', fontSize: '0.82rem', fontWeight: '800' }}>
                                  {formatCurrency(finMetrics.totalOutros || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card 2: Total Saldo Líquido (Realizado + Previsto) */}
                        <div className="meta-item" style={{ padding: '6px 12px' }}>
                          <div className="meta-icon-box" style={{ color: finMetrics.netRealized >= 0 ? '#10b981' : '#f43f5e' }}>
                            <Scale size={16} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="meta-label" style={{ fontSize: '0.7rem', marginBottom: '2px' }}>Total Saldo Líquido</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Realizado:</span>
                                <span style={{ color: finMetrics.netRealized >= 0 ? '#10b981' : '#f43f5e', fontSize: '0.88rem', fontWeight: '800' }}>
                                  {finMetrics.netRealized >= 0 ? '+' : ''}{formatCurrency(finMetrics.netRealized)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Previsto:</span>
                                <span style={{ color: finMetrics.netProjectedCurrent >= 0 ? '#38bdf8' : '#f43f5e', fontSize: '0.88rem', fontWeight: '800' }}>
                                  {finMetrics.netProjectedCurrent >= 0 ? '+' : ''}{formatCurrency(finMetrics.netProjectedCurrent)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card 3: Total Capital (Amortizado + Devido) */}
                        <div className="meta-item" style={{ padding: '6px 12px' }}>
                          <div className="meta-icon-box" style={{ color: '#8b5cf6' }}>
                            <CreditCard size={16} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="meta-label" style={{ fontSize: '0.7rem', marginBottom: '2px' }}>Total Capital</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Amortizado:</span>
                                <span style={{ color: '#10b981', fontSize: '0.88rem', fontWeight: '800' }}>
                                  {formatCurrency(totalAllLoansAmortized)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Devido:</span>
                                <span style={{ color: '#f43f5e', fontSize: '0.88rem', fontWeight: '800' }}>
                                  {formatCurrency(totalAllLoansRemaining)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card 4: Computar a partir de (Quadrado interativo ao lado) */}
                        <div
                          className="meta-item"
                          onClick={() => {
                            setTempComputeMonth(computeFromMonth);
                            setIsDatePickerOpen(true);
                          }}
                          style={{
                            padding: '6px 10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: isDatePickerOpen ? '1px solid var(--primary)' : '1px solid var(--border-glass)'
                          }}
                          title="Clique para alterar e salvar a data de início da computação"
                        >
                          <div className="meta-icon-box" style={{ color: 'var(--primary-light)' }}>
                            <Calendar size={16} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="meta-label" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span>Computar a partir de</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--primary-light)', fontWeight: '700' }}>⚙️ Alterar</span>
                            </div>
                            <div className="meta-value" style={{ color: 'var(--text-main)', fontSize: '0.92rem', fontWeight: '800' }}>
                              {getFormattedMonthLabel(computeFromMonth)}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                              {computeFromMonth === '1900-01' ? 'Sem filtro inicial' : `Base: ${computeFromMonth}`} (Salvo)
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Modal para configurar e salvar a data de início através de Portal */}
                      {isDatePickerOpen && typeof document !== 'undefined' && createPortal(
                        <div
                          className="modal-overlay"
                          onClick={() => setIsDatePickerOpen(false)}
                          style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: '100vw',
                            height: '100vh',
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 99999,
                            padding: '16px',
                            boxSizing: 'border-box'
                          }}
                        >
                          <div
                            className="modal-card"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              maxWidth: '440px',
                              width: '100%',
                              background: 'var(--bg-card, #131722)',
                              borderRadius: '16px',
                              border: '1px solid var(--border-glass-glow, rgba(99, 102, 241, 0.35))',
                              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(99, 102, 241, 0.18)',
                              padding: '24px',
                              boxSizing: 'border-box'
                            }}
                          >
                            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-light)', padding: '7px', borderRadius: '10px', display: 'flex' }}>
                                  <Calendar size={20} />
                                </div>
                                <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
                                  Computar a partir de
                                </h3>
                              </div>
                              <button
                                type="button"
                                className="modal-close-btn action-icon-btn"
                                onClick={() => setIsDatePickerOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
                              >
                                <X size={18} />
                              </button>
                            </div>

                            <div style={{ padding: '0 0 16px 0' }}>
                              <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                                Defina a partir de qual mês/ano o <strong>Summary</strong> e os <strong>Gráficos de Balanço</strong> devem ser calculados. Esta preferência fica salva automaticamente.
                              </p>

                              <label
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--text-main)',
                                  display: 'block',
                                  marginBottom: '6px',
                                  fontWeight: '700'
                                }}
                              >
                                Selecione Mês e Ano:
                              </label>
                              <input
                                type="month"
                                value={tempComputeMonth}
                                onChange={(e) => setTempComputeMonth(e.target.value)}
                                className="form-input"
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  fontSize: '0.94rem',
                                  borderRadius: '10px',
                                  background: 'var(--bg-app, #0f172a)',
                                  border: '1px solid var(--border-glass-glow, rgba(99, 102, 241, 0.3))',
                                  color: 'var(--text-main)',
                                  marginBottom: '16px',
                                  boxSizing: 'border-box'
                                }}
                              />

                              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '700' }}>
                                Atalhos rápidos:
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${tempComputeMonth === '2026-08' ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => setTempComputeMonth('2026-08')}
                                  style={{ fontSize: '0.76rem', padding: '7px' }}
                                >
                                  Ago/2026 (Mês Atual)
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${tempComputeMonth === '2026-01' ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => setTempComputeMonth('2026-01')}
                                  style={{ fontSize: '0.76rem', padding: '7px' }}
                                >
                                  Jan/2026 (Início do Ano)
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${tempComputeMonth === '2025-01' ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => setTempComputeMonth('2025-01')}
                                  style={{ fontSize: '0.76rem', padding: '7px' }}
                                >
                                  Jan/2025
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${tempComputeMonth === '2024-01' ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => setTempComputeMonth('2024-01')}
                                  style={{ fontSize: '0.76rem', padding: '7px' }}
                                >
                                  Jan/2024 (Origem)
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${tempComputeMonth === '1900-01' ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => setTempComputeMonth('1900-01')}
                                  style={{ fontSize: '0.76rem', padding: '8px', gridColumn: 'span 2' }}
                                >
                                  Sem Filtro (Todo o Histórico)
                                </button>
                              </div>
                            </div>

                            <div className="form-footer" style={{ margin: 0, paddingTop: '16px', borderTop: '1px solid var(--border-glass, rgba(255,255,255,0.08))', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setIsDatePickerOpen(false)}
                                style={{ padding: '8px 16px', borderRadius: '8px' }}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleSaveComputeMonth(tempComputeMonth)}
                                style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: '800' }}
                              >
                                Salvar e Aplicar
                              </button>
                            </div>
                          </div>
                        </div>,
                        document.body
                      )}
                    </>
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
