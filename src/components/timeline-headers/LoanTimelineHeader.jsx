import React, { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle2,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '../../utils/loanCalculations';

export default function LoanTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  onEdit,
  onDelete,
  onAddEvent
}) {
  const [collapsed, setIsCollapsed] = useState(false);

  if (!timeline) return null;

  const headerColor = timeline.color || '#6366f1';
  const loanMetrics = timeline.metrics || {};

  const formatDateShort = (dateStr) => {
    try {
      if (!dateStr) return '';
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: pt });
    } catch {
      return dateStr;
    }
  };

  const totalDays = (() => {
    try {
      if (!timeline.startDate || !timeline.endDate) return 0;
      return differenceInCalendarDays(parseISO(timeline.endDate), parseISO(timeline.startDate));
    } catch {
      return 0;
    }
  })();

  const progressPercent = (() => {
    if (loanMetrics.progressPercent !== undefined) return Math.min(100, Math.max(0, loanMetrics.progressPercent));
    const totalDebt = timeline.totalDebt || 0;
    const amortized = timeline.amortizedCapital || 0;
    if (totalDebt <= 0) return 0;
    return Math.min(100, Math.round((amortized / totalDebt) * 100));
  })();

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
            aria-label={collapsed ? "Expandir cabeçalho" : "Recolher cabeçalho"}
            title={collapsed ? "Expandir cabeçalho" : "Recolher cabeçalho"}
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
              background: 'rgba(99, 102, 241, 0.12)',
              color: headerColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${headerColor}33`,
              flexShrink: 0
            }}
          >
            <CreditCard size={18} />
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
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: headerColor,
                  border: `1px solid ${headerColor}44`,
                  textTransform: 'uppercase'
                }}
              >
                Empréstimo
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
              <span>Nova Amortização</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onEdit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}
            >
              <Edit3 size={13} />
              <span>Editar Contrato</span>
            </button>
          )}

          {onDelete && !timeline.isSystemDefault && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={onDelete}
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
              <span>Excluir</span>
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo Expandido com Métricas do Empréstimo */}
      {!collapsed && (
        <div style={{ paddingTop: '14px' }}>
          <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '10px' }}>
            {/* Saldo Devedor Restante */}
            <div className="meta-item" style={{ padding: '6px 10px' }}>
              <div className="meta-icon-box" style={{ color: '#6366f1' }}>
                <CreditCard size={16} />
              </div>
              <div>
                <div className="meta-label" style={{ fontSize: '0.7rem' }}>Saldo Devedor</div>
                <div className="meta-value" style={{ color: 'var(--primary-light)', fontSize: '0.92rem', fontWeight: '800' }}>
                  {formatCurrency(loanMetrics.remainingBalance ?? timeline.remainingDebt ?? 0)}
                </div>
              </div>
            </div>

            {/* Total Já Pago */}
            <div className="meta-item" style={{ padding: '6px 10px' }}>
              <div className="meta-icon-box" style={{ color: '#10b981' }}>
                <DollarSign size={16} />
              </div>
              <div>
                <div className="meta-label" style={{ fontSize: '0.7rem' }}>Capital Amortizado</div>
                <div className="meta-value" style={{ color: '#10b981', fontWeight: '700', fontSize: '0.92rem' }}>
                  {formatCurrency(loanMetrics.totalPrincipalAmortized ?? timeline.amortizedCapital ?? 0)}
                </div>
                {loanMetrics.totalSavedInterest > 0 && (
                  <div style={{ marginTop: '2px' }}>
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: '4px',
                        padding: '1px 5px',
                        fontSize: '0.62rem',
                        fontWeight: '800',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title={`Total de juros futuros poupados: ${formatCurrency(loanMetrics.totalSavedInterest)}`}
                    >
                      💰 +{formatCurrency(loanMetrics.totalSavedInterest)} poupados
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Vigência do Contrato */}
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

            {/* Parcelas Pagas */}
            <div className="meta-item" style={{ padding: '6px 10px' }}>
              <div className="meta-icon-box" style={{ color: '#06b6d4' }}>
                <CheckCircle2 size={16} />
              </div>
              <div>
                <div className="meta-label" style={{ fontSize: '0.7rem' }}>Parcelas Pagas</div>
                <div className="meta-value" style={{ fontWeight: '800', fontSize: '0.92rem', color: '#06b6d4' }}>
                  {loanMetrics.paidInstallmentsCount ?? timeline.currentInstallmentNumber ?? 0}
                  {loanMetrics.totalInstallmentsCount ? (
                    <span style={{ fontSize: '0.76rem', fontWeight: '600', color: 'var(--text-dim)' }}>
                      {' '}de {loanMetrics.totalInstallmentsCount}
                    </span>
                  ) : null}
                </div>
                {loanMetrics.lastInstallmentDate && (
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Última prestação: {formatDateShort(loanMetrics.lastInstallmentDate)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Barra de Progresso de Amortização */}
          <div className="timeline-progress-container" style={{ marginTop: '4px' }}>
            <div className="progress-header" style={{ fontSize: '0.72rem', marginBottom: '3px' }}>
              <span>Progresso de Amortização do Capital</span>
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
        </div>
      )}
    </div>
  );
}
