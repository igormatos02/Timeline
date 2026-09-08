import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Wallet,
  PieChart,
  TrendingUp,
  Settings
} from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '../../utils/loanCalculations';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

export default function LoanTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  onEdit,
  onToggleStatus,
  onDelete,
  onAddEvent,
  onOpenAmortizationModal
}) {
  const { t } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(false);

  if (!timeline) return null;

  const isInactive = timeline.status === 'inactive' || timeline.status === 'INACTIVE';
  const headerColor = isInactive ? '#94a3b8' : (timeline.color || '#6366f1');
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

  // Visual text color tokens (grayed out when inactive)
  const textColorMain = isInactive ? '#94a3b8' : 'var(--text-main)';
  const textColorLight = isInactive ? '#64748b' : 'var(--primary-light)';
  const textColorGreen = isInactive ? '#64748b' : '#10b981';
  const textColorOrange = isInactive ? '#64748b' : '#f59e0b';
  const textColorDim = isInactive ? '#64748b' : 'var(--text-dim)';
  const textColorMuted = isInactive ? '#64748b' : 'var(--text-muted)';

  return (
    <div
      className={`timeline-hero glass-panel ${collapsed ? 'hero-collapsed' : ''}`}
      style={{
        borderLeft: `4px solid ${headerColor}`,
        '--active-timeline-color': headerColor,
        padding: collapsed ? '12px 18px' : '16px 20px',
        marginBottom: '10px',
        transition: 'padding 0.2s ease, box-shadow 0.2s ease, filter 0.3s ease',
        boxShadow: 'var(--shadow-sm)',
        filter: isInactive ? 'grayscale(85%) opacity(0.85)' : 'none'
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
              color: textColorMain,
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
              background: isInactive ? 'rgba(148, 163, 184, 0.12)' : 'rgba(99, 102, 241, 0.12)',
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
              <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: textColorMain }}>
                {timeline.name}
              </h1>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: isInactive ? 'rgba(148, 163, 184, 0.15)' : 'rgba(99, 102, 241, 0.12)',
                  color: headerColor,
                  border: `1px solid ${headerColor}44`,
                  textTransform: 'uppercase'
                }}
              >
                {t('loanHeader.loanBadge') || 'Empréstimo'}
              </span>

              {/* Switch de Ativar / Desativar Timeline */}
              {(onToggleStatus || onEdit) && (
                <div
                  title={isInactive ? (t('loanHeader.activateTitle') || "Ativar empréstimo (inclui-o nos totais do balanço)") : (t('loanHeader.deactivateTitle') || "Desativar empréstimo (remover temporariamente dos totais do balanço)")}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginLeft: '4px'
                  }}
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!isInactive}
                    onClick={() => {
                      const newStatus = isInactive ? 'active' : 'inactive';
                      if (onToggleStatus) {
                        onToggleStatus(timeline, newStatus);
                      } else if (onEdit) {
                        onEdit({ ...timeline, status: newStatus });
                      }
                    }}
                    style={{
                      width: '36px',
                      height: '20px',
                      borderRadius: '9999px',
                      background: isInactive
                        ? 'rgba(148, 163, 184, 0.3)'
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.25s ease, box-shadow 0.25s ease',
                      padding: 0,
                      boxShadow: isInactive
                        ? 'none'
                        : '0 0 8px rgba(16, 185, 129, 0.4)',
                      flexShrink: 0
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        position: 'absolute',
                        top: '3px',
                        left: isInactive ? '3px' : '19px',
                        transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                      }}
                    />
                  </button>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: isInactive ? 'var(--text-muted)' : '#10b981',
                    userSelect: 'none'
                  }}>
                    {isInactive ? (t('loanHeader.statusInactive') || 'Inativo') : (t('loanHeader.statusActive') || 'Ativo')}
                  </span>
                </div>
              )}
            </div>
            {timeline.description && (
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: textColorMuted }}>
                {timeline.description}
              </p>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title={t('loanHeader.editContractTitle') || "Timeline Settings"}
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
              onClick={onDelete}
              title={t('loanHeader.deleteContractTitle') || "Eliminar este contrato de empréstimo e todas as suas prestações associadas"}
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
              <span>{t('loanHeader.deleteContract') || 'Excluir'}</span>
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
              <div style={{ fontSize: '0.74rem', color: textColorDim, textTransform: 'uppercase', fontWeight: '700' }}>
                {t('loanHeader.remainingDebt') || 'Saldo Devedor'}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: textColorLight }}>
                {formatCurrency(loanMetrics.remaining_debt ?? loanMetrics.remainingBalance ?? 0)}
              </div>
              <div style={{ fontSize: '0.72rem', color: textColorMuted }}>
                {t('loanHeader.capitalStillDue') || 'Capital ainda devido'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.74rem', color: textColorDim, textTransform: 'uppercase', fontWeight: '700' }}>
                {t('loanHeader.amortizedCapital') || 'Capital Amortizado'}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: textColorGreen }}>
                {formatCurrency(loanMetrics.amortized_capital ?? loanMetrics.paid_capital ?? 0)}
              </div>
              <div style={{ fontSize: '0.72rem', color: textColorMuted }}>
                {(t('loanHeader.ofOriginalCapital') || '{percent}% do capital original').replace('{percent}', progressPercent)}
              </div>
            </div>
          </div>

          {/* Barra de Progresso de Amortização */}
          <div className="timeline-progress-container">
            <div className="progress-header" style={{ fontSize: '0.72rem', marginBottom: '3px', color: textColorMuted }}>
              <span>{t('loanHeader.progressTitle') || 'Progresso de Amortização do Capital'}</span>
              <span>{(t('loanHeader.percentAmortized') || '{percent}% amortizado').replace('{percent}', progressPercent)}</span>
            </div>
            <div className="progress-track" style={{ height: '6px' }}>
              <div
                className="progress-fill"
                style={{
                  width: `${progressPercent}%`,
                  background: isInactive ? '#94a3b8' : 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)'
                }}
              />
            </div>
          </div>

          {/* Seção 2: Parcelas, Quitação Prevista, Prestação Atual, Próximo Vencimento */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: textColorDim, textTransform: 'uppercase', fontWeight: '700' }}>
                {t('loanHeader.installments') || 'Parcelas'}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: textColorMain }}>
                {loanMetrics.paid_installments ?? 0} / {loanMetrics.total_installments ?? 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: textColorMuted }}>
                {(t('loanHeader.installmentsRemaining') || '{count} restantes').replace('{count}', loanMetrics.remaining_installments ?? 0)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: textColorDim, textTransform: 'uppercase', fontWeight: '700' }}>
                {t('loanHeader.estimatedPayoff') || 'Quitação Prevista'}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: textColorMain }}>
                {formatDateShort(loanMetrics.estimated_payoff_date) || '-'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: textColorDim, textTransform: 'uppercase', fontWeight: '700' }}>
                {t('loanHeader.currentInstallment') || 'Prestação Atual'}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: textColorLight }}>
                {formatCurrency(loanMetrics.current_installment_amount ?? 0)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: textColorDim, textTransform: 'uppercase', fontWeight: '700' }}>
                {t('loanHeader.nextDueDate') || 'Próximo Vencimento'}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: textColorMain }}>
                {formatDateShort(loanMetrics.next_due_date) || '-'}
              </div>
            </div>
          </div>

          {/* Seção 3: COMPOSIÇÃO DA DÍVIDA & O QUE JÁ PAGUEI & CUSTO DO EMPRÉSTIMO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
            {/* COMPOSIÇÃO DA DÍVIDA */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: '800', color: textColorLight, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wallet size={14} style={{ color: textColorLight }} />
                <span>{t('loanHeader.debtCompositionTitle') || 'COMPOSIÇÃO DA DÍVIDA'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: textColorDim }}>{t('loanHeader.capitalStillDueLabel') || 'CAPITAL AINDA DEVIDO'}</span>
                  <span style={{ fontWeight: '700', color: textColorMain }}>{formatCurrency(loanMetrics.future_capital ?? 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: textColorDim }}>{t('loanHeader.estimatedFutureInterest') || 'JUROS FUTUROS ESTIMADOS'}</span>
                  <span style={{ fontWeight: '700', color: textColorMain }}>{formatCurrency(loanMetrics.future_interest ?? 0)}</span>
                </div>
                <div style={{ borderTop: '1px dashed var(--border-glass)', pt: '4px', mt: '2px', display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                  <span style={{ color: textColorMain }}>{t('loanHeader.totalFutureToPay') || 'TOTAL FUTURO A PAGAR'}</span>
                  <span style={{ color: textColorLight }}>{formatCurrency(loanMetrics.future_total ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* O QUE JÁ PAGUEI */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: '800', color: textColorGreen, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PieChart size={14} style={{ color: textColorGreen }} />
                <span>{t('loanHeader.whatIPaidTitle') || 'O QUE JÁ PAGUEI'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: textColorDim }}>{t('loanHeader.amortizedCapitalLabel') || 'CAPITAL AMORTIZADO'}</span>
                  <span style={{ fontWeight: '700', color: textColorMain }}>{formatCurrency(loanMetrics.paid_capital ?? loanMetrics.amortized_capital ?? 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: textColorDim }}>{t('loanHeader.interestPaid') || 'JUROS PAGOS'}</span>
                  <span style={{ fontWeight: '700', color: textColorMain }}>{formatCurrency(loanMetrics.paid_interest ?? 0)}</span>
                </div>
                <div style={{ borderTop: '1px dashed var(--border-glass)', pt: '4px', mt: '2px', display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                  <span style={{ color: textColorMain }}>{t('loanHeader.totalAlreadyPaid') || 'TOTAL JÁ PAGO'}</span>
                  <span style={{ color: textColorGreen }}>{formatCurrency(loanMetrics.paid_total ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* CUSTO DO EMPRÉSTIMO */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: '800', color: textColorOrange, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={14} style={{ color: textColorOrange }} />
                <span>{t('loanHeader.loanCostTitle') || 'CUSTO DO EMPRÉSTIMO'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: textColorDim }}>{t('loanHeader.originalCapital') || 'CAPITAL ORIGINAL'}</span>
                  <span style={{ fontWeight: '700', color: textColorMain }}>{formatCurrency(loanMetrics.original_capital ?? loanMetrics.total_debt ?? 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: textColorDim }}>{t('loanHeader.totalEstimatedInterest') || 'JUROS TOTAIS ESTIMADOS'}</span>
                  <span style={{ fontWeight: '700', color: textColorMain }}>{formatCurrency(loanMetrics.total_estimated_interest ?? 0)}</span>
                </div>
                <div style={{ borderTop: '1px dashed var(--border-glass)', pt: '4px', mt: '2px', display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                  <span style={{ color: textColorMain }}>{t('loanHeader.totalLoanCost') || 'CUSTO TOTAL DO EMPRÉSTIMO'}</span>
                  <span style={{ color: textColorOrange }}>{formatCurrency(loanMetrics.total_loan_cost ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
