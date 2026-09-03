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
  onAddEvent,
  onOpenAmortizationModal
}) {
  const [collapsed, setIsCollapsed] = useState(false);

  if (!timeline) return null;

  const headerColor = timeline.color || '#6366f1';
  const loanMetrics = timeline.loanHeaderResult || timeline.procedureMetrics || timeline.metrics || {};

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

  const progressPercent = loanMetrics.amortized_percent ?? loanMetrics.amortizedPercent ?? 0;

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
          {(onAddEvent || onOpenAmortizationModal) && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onOpenAmortizationModal || onAddEvent}
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
        <div style={{ paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Seção 1: Saldo Devedor & Capital Amortizado */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                Saldo Devedor
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                {formatCurrency(loanMetrics.remaining_debt ?? loanMetrics.remainingBalance ?? 0)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Capital ainda devido
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                Capital Amortizado
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981' }}>
                {formatCurrency(loanMetrics.amortized_capital ?? loanMetrics.paid_capital ?? 0)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {progressPercent}% do capital original
              </div>
            </div>
          </div>

          {/* Barra de Progresso de Amortização */}
          <div className="timeline-progress-container">
            <div className="progress-header" style={{ fontSize: '0.72rem', marginBottom: '3px' }}>
              <span>Progresso de Amortização do Capital</span>
              <span>{progressPercent}% amortizado</span>
            </div>
            <div className="progress-track" style={{ height: '6px' }}>
              <div
                className="progress-fill"
                style={{
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)'
                }}
              />
            </div>
          </div>

          {/* Seção 2: Parcelas, Quitação Prevista, Prestação Atual, Próximo Vencimento */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                Parcelas
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {loanMetrics.paid_installments ?? 0} / {loanMetrics.total_installments ?? 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {loanMetrics.remaining_installments ?? 0} restantes
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                Quitação Prevista
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {formatDateShort(loanMetrics.estimated_payoff_date) || '-'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                Prestação Atual
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                {formatCurrency(loanMetrics.current_installment_amount ?? 0)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                Próximo Vencimento
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {formatDateShort(loanMetrics.next_due_date) || '-'}
              </div>
            </div>
          </div>

          {/* Seção 3: 💰 COMPOSIÇÃO DA DÍVIDA & 📊 O QUE JÁ PAGUEI & 📈 CUSTO DO EMPRÉSTIMO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
            {/* 💰 COMPOSIÇÃO DA DÍVIDA */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: '800', color: 'var(--primary-light)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💰 COMPOSIÇÃO DA DÍVIDA</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>CAPITAL AINDA DEVIDO</span>
                  <span style={{ fontWeight: '700' }}>{formatCurrency(loanMetrics.future_capital ?? 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>JUROS FUTUROS ESTIMADOS</span>
                  <span style={{ fontWeight: '700' }}>{formatCurrency(loanMetrics.future_interest ?? 0)}</span>
                </div>
                <div style={{ borderTop: '1px dashed var(--border-glass)', pt: '4px', mt: '2px', display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                  <span>TOTAL FUTURO A PAGAR</span>
                  <span style={{ color: 'var(--primary-light)' }}>{formatCurrency(loanMetrics.future_total ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* 📊 O QUE JÁ PAGUEI */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#10b981', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📊 O QUE JÁ PAGUEI</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>CAPITAL AMORTIZADO</span>
                  <span style={{ fontWeight: '700' }}>{formatCurrency(loanMetrics.paid_capital ?? loanMetrics.amortized_capital ?? 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>JUROS PAGOS</span>
                  <span style={{ fontWeight: '700' }}>{formatCurrency(loanMetrics.paid_interest ?? 0)}</span>
                </div>
                <div style={{ borderTop: '1px dashed var(--border-glass)', pt: '4px', mt: '2px', display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                  <span>TOTAL JÁ PAGO</span>
                  <span style={{ color: '#10b981' }}>{formatCurrency(loanMetrics.paid_total ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* 📈 CUSTO DO EMPRÉSTIMO */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#f59e0b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📈 CUSTO DO EMPRÉSTIMO</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>CAPITAL ORIGINAL</span>
                  <span style={{ fontWeight: '700' }}>{formatCurrency(loanMetrics.original_capital ?? loanMetrics.total_debt ?? 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>JUROS TOTAIS ESTIMADOS</span>
                  <span style={{ fontWeight: '700' }}>{formatCurrency(loanMetrics.total_estimated_interest ?? 0)}</span>
                </div>
                <div style={{ borderTop: '1px dashed var(--border-glass)', pt: '4px', mt: '2px', display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                  <span>CUSTO TOTAL DO EMPRÉSTIMO</span>
                  <span style={{ color: '#f59e0b' }}>{formatCurrency(loanMetrics.total_loan_cost ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
