import React from 'react';
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
  DollarSign,
  CreditCard,
  Percent,
  Plus,
  Repeat,
  ArrowRight
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency, getLoanMetrics, getPeriodicityLabel } from '../utils/loanCalculations';

export default function TimelineHeader({
  timeline,
  onEdit,
  onDelete,
  onOpenAmortizationModal,
  onScrollToOverdue
}) {
  if (!timeline) return null;

  const isLoanTimeline = timeline.type === 'Empréstimo';
  const loanMetrics = isLoanTimeline ? getLoanMetrics(timeline, timeline.events || []) : null;

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
    progressPercent = isLoanTimeline && loanMetrics
      ? loanMetrics.progressPercent
      : Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  } catch (err) {
    progressPercent = 50;
  }

  return (
    <div
      className="timeline-hero glass-panel"
      style={{ '--active-timeline-color': timeline.color || '#6366f1' }}
    >
      <div className="hero-top">
        <div className="hero-title-group">
          <div className="hero-badges">
            <span className={`badge ${statusInfo.cls}`}>
              {statusInfo.icon} {timeline.status}
            </span>
            <span className="badge badge-type" style={isLoanTimeline ? { background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-light)', borderColor: 'var(--border-glass-glow)' } : {}}>
              {isLoanTimeline ? <CreditCard size={12} /> : <Tag size={12} />} {timeline.type}
            </span>

            {/* Overdue Badge - Clickable to scroll directly to overdue installment */}
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
          <h1 className="hero-name">{timeline.name}</h1>
          <p className="hero-description">{timeline.description}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {isLoanTimeline && onOpenAmortizationModal && (
            <button
              className="btn btn-primary btn-sm"
              onClick={onOpenAmortizationModal}
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)' }}
            >
              <TrendingDown size={15} />
              <span>Amortizar</span>
            </button>
          )}

          <button
            className="btn btn-secondary btn-sm"
            onClick={onEdit}
            title="Editar detalhes da timeline"
          >
            <Edit2 size={15} />
            <span>Editar</span>
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={onDelete}
            style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            title="Eliminar timeline"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Meta Grid - Differentiated for Loan vs Standard */}
      {isLoanTimeline && loanMetrics ? (
        <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {/* Saldo Devedor Restante */}
          <div className="meta-item">
            <div className="meta-icon-box" style={{ color: '#6366f1' }}>
              <CreditCard size={18} />
            </div>
            <div>
              <div className="meta-label">Saldo Devedor</div>
              <div className="meta-value" style={{ color: 'var(--primary-light)', fontSize: '1.05rem', fontWeight: '800' }}>
                {formatCurrency(loanMetrics.remainingBalance)}
              </div>
            </div>
          </div>

          {/* Total Já Pago */}
          <div className="meta-item">
            <div className="meta-icon-box" style={{ color: '#10b981' }}>
              <DollarSign size={18} />
            </div>
            <div>
              <div className="meta-label">Total Pago</div>
              <div className="meta-value" style={{ color: '#10b981', fontWeight: '700' }}>
                {formatCurrency(loanMetrics.totalPaid)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                {formatCurrency(loanMetrics.totalPrincipalAmortized)} cap. + {formatCurrency(loanMetrics.totalInterestPaid)} jur.
              </div>
            </div>
          </div>

          {/* Início e Fim do Contrato */}
          <div className="meta-item">
            <div className="meta-icon-box" style={{ color: '#06b6d4' }}>
              <Calendar size={18} />
            </div>
            <div>
              <div className="meta-label">Vigência do Contrato</div>
              <div className="meta-value" style={{ fontSize: '0.85rem' }}>
                {formatDateShort(timeline.startDate)} <span style={{ color: 'var(--text-dim)' }}>→</span> {formatDateShort(timeline.endDate)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                Duração total: {totalDays} dias
              </div>
            </div>
          </div>

          {/* Periodicidade do Pagamento */}
          <div className="meta-item">
            <div className="meta-icon-box" style={{ color: '#f59e0b' }}>
              <Repeat size={18} />
            </div>
            <div>
              <div className="meta-label">Periodicidade</div>
              <div className="meta-value" style={{ fontWeight: '700' }}>
                {getPeriodicityLabel(timeline.periodicity)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                {loanMetrics.paidInstallmentsCount} de {loanMetrics.totalInstallmentsCount} parcelas pagas
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="hero-meta-grid">
          <div className="meta-item">
            <div className="meta-icon-box">
              <Calendar size={18} />
            </div>
            <div>
              <div className="meta-label">Data de Início</div>
              <div className="meta-value">{formatDate(timeline.startDate)}</div>
            </div>
          </div>

          <div className="meta-item">
            <div className="meta-icon-box" style={{ color: '#06b6d4' }}>
              <Calendar size={18} />
            </div>
            <div>
              <div className="meta-label">Data de Fim</div>
              <div className="meta-value">{formatDate(timeline.endDate)}</div>
            </div>
          </div>

          <div className="meta-item">
            <div className="meta-icon-box" style={{ color: '#10b981' }}>
              <Clock size={18} />
            </div>
            <div>
              <div className="meta-label">Duração Total</div>
              <div className="meta-value">{totalDays} dias</div>
            </div>
          </div>

          <div className="meta-item">
            <div className="meta-icon-box" style={{ color: '#ec4899' }}>
              <Activity size={18} />
            </div>
            <div>
              <div className="meta-label">Eventos Registados</div>
              <div className="meta-value">{timeline.events ? timeline.events.length : 0} marcos</div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="timeline-progress-container">
        <div className="progress-header">
          <span>{isLoanTimeline ? 'Progresso de Amortização do Capital' : 'Progresso Temporal'}</span>
          <span>{progressPercent}% {isLoanTimeline ? 'amortizado' : 'decorrido'}</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${progressPercent}%`,
              background: isLoanTimeline
                ? 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)'
                : timeline.color || '#6366f1'
            }}
          />
        </div>
      </div>
    </div>
  );
}
