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
  LayoutDashboard
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency, getLoanMetrics, getIncomeMetrics, getConsolidatedLoanMetrics, getPeriodicityLabel } from '../utils/loanCalculations';
import IncomeEvolutionChart from './IncomeEvolutionChart';

export default function TimelineHeader({
  timeline,
  allTimelines = [],
  selectedTimelineIds = null,
  onEdit,
  onDelete,
  onOpenAmortizationModal,
  onScrollToOverdue
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'chart'

  if (!timeline) return null;

  const isPrincipal = timeline.type === 'Principal';
  const isLoanTimeline = timeline.type === 'Empréstimo';
  const isIncomeTimeline = timeline.type === 'Entradas';
  
  const loanMetrics = isLoanTimeline ? getLoanMetrics(timeline, timeline.events || []) : null;
  const incomeMetrics = isIncomeTimeline ? getIncomeMetrics(timeline, timeline.events || []) : null;
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
    const start = parseISO(timeline.startDate);
    const end = parseISO(timeline.endDate);
    const today = new Date('2026-08-21');
    totalDays = Math.max(1, differenceInDays(end, start));
    const elapsedDays = Math.max(0, differenceInDays(today, start));
    
    if (isPrincipal && consolidatedMetrics) {
      progressPercent = consolidatedMetrics.progressPercent;
    } else if (isLoanTimeline && loanMetrics) {
      progressPercent = loanMetrics.progressPercent;
    } else {
      progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
    }
  } catch (err) {
    progressPercent = 50;
  }

  return (
    <div
      className={`timeline-hero glass-panel ${collapsed ? 'hero-collapsed' : ''}`}
      style={{
        '--active-timeline-color': timeline.color || '#10b981',
        padding: collapsed ? '10px 16px' : (isLoanTimeline || isPrincipal || isIncomeTimeline ? '14px 18px 10px 18px' : '20px'),
        marginBottom: '8px',
        transition: 'all 0.2s ease',
        boxShadow: collapsed ? '0 4px 16px rgba(0, 0, 0, 0.08)' : 'var(--shadow-sm)'
      }}
    >
      {/* Collapsed Mode */}
      {collapsed ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {!isIncomeTimeline && (
              <span className={`badge ${statusInfo.cls}`} style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                {statusInfo.icon} {timeline.status}
              </span>
            )}
            
            <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
              {timeline.name}
            </h2>

            {isPrincipal && consolidatedMetrics ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                  Total em Dívidas: {formatCurrency(consolidatedMetrics.totalRemainingBalance)}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#10b981' }}>
                  Amortizado: {formatCurrency(consolidatedMetrics.totalPrincipalAmortized)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  ({consolidatedMetrics.activeCreditsCount} Contratos • {progressPercent}%)
                </span>
              </div>
            ) : isIncomeTimeline && incomeMetrics ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#10b981' }}>
                  Recorrente: {formatCurrency(incomeMetrics.monthlyRecurring)} / mês
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#06b6d4' }}>
                  Recebido: {formatCurrency(incomeMetrics.totalReceived)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  ({incomeMetrics.receivedCount}/{incomeMetrics.totalEventsCount} entradas)
                </span>
              </div>
            ) : isLoanTimeline && loanMetrics ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--primary-light)' }}>
                  Saldo: {formatCurrency(loanMetrics.remainingBalance)}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#10b981' }}>
                  Pago: {formatCurrency(loanMetrics.totalPaid)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  ({loanMetrics.paidInstallmentsCount}/{loanMetrics.totalInstallmentsCount} parc. • {progressPercent}%)
                </span>
              </div>
            ) : null}

            {isLoanTimeline && loanMetrics && loanMetrics.overdueInstallmentsCount > 0 && (
              <button
                type="button"
                onClick={onScrollToOverdue}
                className="badge badge-paused"
                style={{
                  cursor: 'pointer',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '2px 8px',
                  fontSize: '0.72rem'
                }}
                title="Ir para parcela em atraso"
              >
                <AlertCircle size={11} /> {loanMetrics.overdueInstallmentsCount} em Atraso ▾
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* View Mode Toggle: Summary vs Chart */}
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                padding: '2px',
                gap: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setViewMode('summary');
                  setIsCollapsed(false);
                }}
                className={`btn btn-sm ${viewMode === 'summary' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  borderRadius: '5px',
                  background: viewMode === 'summary' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'summary' ? '#fff' : 'var(--text-muted)'
                }}
                title="Ver Resumo"
              >
                <LayoutDashboard size={12} />
                <span>Resumo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('chart');
                  setIsCollapsed(false);
                }}
                className={`btn btn-sm ${viewMode === 'chart' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  borderRadius: '5px',
                  background: viewMode === 'chart' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'chart' ? '#fff' : 'var(--text-muted)'
                }}
                title="Ver Gráfico"
              >
                <BarChart2 size={12} />
                <span>Gráfico</span>
              </button>
            </div>

            {isLoanTimeline && onOpenAmortizationModal && (
              <button
                className="btn btn-primary btn-sm"
                onClick={onOpenAmortizationModal}
                style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              >
                <TrendingDown size={13} /> Amortizar
              </button>
            )}

            {!isPrincipal && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={onEdit}
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                title="Editar timeline"
              >
                <Edit2 size={13} />
              </button>
            )}

            {/* Expand Toggle Button */}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setIsCollapsed(false)}
              style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--primary-light)', borderColor: 'var(--border-glass-glow)' }}
              title="Expandir cabeçalho"
            >
              <ChevronDown size={14} />
              <span>Expandir</span>
            </button>
          </div>
        </div>
      ) : (
        /* Expanded Mode */
        <>
          <div className="hero-top" style={{ marginBottom: isLoanTimeline || isPrincipal || isIncomeTimeline ? '10px' : '14px' }}>
            <div className="hero-title-group">
              {!isIncomeTimeline && (
                <div className="hero-badges">
                  <span className={`badge ${statusInfo.cls}`}>
                    {statusInfo.icon} {timeline.status}
                  </span>
                  <span className="badge badge-type" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                    {isPrincipal ? <Layers size={12} /> : isLoanTimeline ? <CreditCard size={12} /> : <Tag size={12} />} {timeline.type}
                  </span>

                  {/* Overdue Badge for Loans */}
                  {isLoanTimeline && loanMetrics && loanMetrics.overdueInstallmentsCount > 0 && (
                    <button
                      type="button"
                      onClick={onScrollToOverdue}
                      className="badge badge-paused"
                      style={{
                        animation: 'pulseGlow 2s infinite',
                        cursor: 'pointer',
                        border: '1px solid rgba(239, 68, 68, 0.4)'
                      }}
                      title="Clique para ir diretamente à parcela em atraso"
                    >
                      <AlertCircle size={12} /> {loanMetrics.overdueInstallmentsCount} em Atraso ▾
                    </button>
                  )}
                </div>
              )}
              <h1 className="hero-name" style={{ fontSize: isLoanTimeline || isPrincipal || isIncomeTimeline ? '1.4rem' : '1.75rem', marginTop: '2px' }}>{timeline.name}</h1>
              {timeline.description && (
                <p className="hero-description" style={{ fontSize: '0.82rem', marginBottom: 0 }}>{timeline.description}</p>
              )}
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

              {isLoanTimeline && onOpenAmortizationModal && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={onOpenAmortizationModal}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)', padding: '5px 12px' }}
                >
                  <TrendingDown size={14} />
                  <span>Amortizar</span>
                </button>
              )}

              {!isPrincipal && (
                <>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={onEdit}
                    style={{ padding: '5px 10px' }}
                    title="Editar detalhes da timeline"
                  >
                    <Edit2 size={14} />
                    <span>Editar</span>
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={onDelete}
                    style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '5px 8px' }}
                    title="Eliminar timeline"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}

              {/* Collapse Toggle Button */}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setIsCollapsed(true)}
                style={{ padding: '5px 8px', color: 'var(--text-muted)' }}
                title="Recolher cabeçalho para modo compacto"
              >
                <ChevronUp size={15} />
                <span>Recolher</span>
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: CHART EVOLUTION VIEW */}
          {viewMode === 'chart' ? (
            <IncomeEvolutionChart
              timeline={timeline}
              events={timeline.events || []}
              todayStr="2026-08-21"
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
              ) : isIncomeTimeline && incomeMetrics ? (
                <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                  {/* Rendimento Recorrente */}
                  <div className="meta-item" style={{ padding: '6px 10px' }}>
                    <div className="meta-icon-box" style={{ color: '#10b981' }}>
                      <DollarSign size={16} />
                    </div>
                    <div>
                      <div className="meta-label" style={{ fontSize: '0.7rem' }}>Rendimento Recorrente (Base)</div>
                      <div className="meta-value" style={{ color: '#10b981', fontSize: '0.96rem', fontWeight: '800' }}>
                        {formatCurrency(incomeMetrics.monthlyRecurring)} / mês
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                        Salário fixo mensal líquido
                      </div>
                    </div>
                  </div>

                  {/* Total Já Recebido */}
                  <div className="meta-item" style={{ padding: '6px 10px' }}>
                    <div className="meta-icon-box" style={{ color: '#06b6d4' }}>
                      <TrendingUp size={16} />
                    </div>
                    <div>
                      <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Recebido até Hoje</div>
                      <div className="meta-value" style={{ color: '#06b6d4', fontSize: '0.96rem', fontWeight: '800' }}>
                        {formatCurrency(incomeMetrics.totalReceived)}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                        {incomeMetrics.receivedCount} entradas confirmadas
                      </div>
                    </div>
                  </div>

                  {/* Próxima Entrada */}
                  <div className="meta-item" style={{ padding: '6px 10px' }}>
                    <div className="meta-icon-box" style={{ color: '#f59e0b' }}>
                      <Calendar size={16} />
                    </div>
                    <div>
                      <div className="meta-label" style={{ fontSize: '0.7rem' }}>Próxima Entrada Prevista</div>
                      <div className="meta-value" style={{ fontSize: '0.85rem', fontWeight: '700' }}>
                        {incomeMetrics.nextIncome ? formatDateShort(incomeMetrics.nextIncome.date) : '27/08/2026'}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#60a5fa', fontWeight: '700' }}>
                        {incomeMetrics.nextIncome ? `+${formatCurrency(incomeMetrics.nextIncome.amount)}` : '+3.300,00 €'}
                      </div>
                    </div>
                  </div>

                  {/* Total Projetado */}
                  <div className="meta-item" style={{ padding: '6px 10px' }}>
                    <div className="meta-icon-box" style={{ color: '#8b5cf6' }}>
                      <Gift size={16} />
                    </div>
                    <div>
                      <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Projetado no Horizonte</div>
                      <div className="meta-value" style={{ fontSize: '0.88rem', fontWeight: '800' }}>
                        {formatCurrency(incomeMetrics.totalForecast)}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                        {incomeMetrics.plannedCount} entradas futuras
                      </div>
                    </div>
                  </div>
                </div>
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
              {(isLoanTimeline || isPrincipal) && (
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
        </>
      )}
    </div>
  );
}
