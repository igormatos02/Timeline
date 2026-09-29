import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { hexToRgba } from './cardUtils.js';
import { TimelineColor } from '../../enums/index.js';
import EventCardHeader from './EventCardHeader.jsx';
import { formatCurrency } from '../../utils/formatCurrency';
import { ArrowUpRight, Ban, CheckCircle2 } from 'lucide-react';
import StatusDropdownButton from './StatusDropdownButton.jsx';
import EventActionButtons from './EventActionButtons.jsx';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function LoanInstallmentBody() {
  const {
    abatedBreakdown,
    event,
    isAmortized,
    isCancelled,
    isFutureMonth,
    isOverdueLoan,
    isPaidLoan,
    isTogglingStatus,
    paletteTheme,
    reducedBreakdown,
    t
  } = useEventCard();

  return (
    <div
      className={`loan-breakdown-strip ${isPaidLoan ? 'flat-positive-card flat-positive-loan' : ''}`}
      style={{
        background: isPaidLoan
          ? `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`
          : 'transparent',
        border: isPaidLoan ? `1px solid ${TimelineColor.WHITE}40` : '1px solid var(--border-glass)',
        borderRadius: '8px',
        padding: '8px 10px',
        margin: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        color: isPaidLoan ? TimelineColor.WHITE : 'inherit',
        boxShadow: isPaidLoan ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}` : 'none'
      }}
    >
      {/* Linha 1: [icone] [titulo do evento] [lables] */}
      <EventCardHeader />

      {/* Linha 2: [motivo & decomposição] (left) e [b status] (right) */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingBottom: '0px' }}>
          <span style={{ fontSize: '0.7rem', color: isPaidLoan ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700', lineHeight: 1 }}>
            {isAmortized ? t('loanCard.totalPaid') : t('loanCard.totalInstallment')}
          </span>

          {reducedBreakdown && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isPaidLoan ? `1px solid ${TimelineColor.WHITE}4c` : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
              <span style={{ fontSize: '0.68rem', color: isPaidLoan ? `${TimelineColor.WHITE}d9` : TimelineColor.INCOME, textTransform: 'uppercase', fontWeight: '700' }}>
                {t('loanCard.totalAmortized')}:
              </span>
              <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isPaidLoan ? TimelineColor.WHITE : TimelineColor.INCOME }} title="Valor abatido/poupado nesta prestação">
                +{formatCurrency(reducedBreakdown.amortizedAmount)}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isPaidLoan ? `1px solid ${TimelineColor.WHITE}4c` : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
            <span style={{ fontSize: '0.68rem', color: isPaidLoan ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
              {isAmortized ? t('loanCard.capitalAbated') : t('loanCard.capitalDebt')}:
            </span>
            <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isPaidLoan ? TimelineColor.WHITE : (isAmortized ? 'var(--text-dim)' : 'var(--text-main)') }}>
              {isAmortized
                ? formatCurrency(abatedBreakdown?.origCapital || event.originalInstallmentCapital || 0)
                : formatCurrency(event.installmentCapital ?? event.principalAmount ?? event.principal_amount ?? 0)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isPaidLoan ? `1px solid ${TimelineColor.WHITE}4c` : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
            <span style={{ fontSize: '0.68rem', color: isPaidLoan ? `${TimelineColor.WHITE}d9` : (isAmortized ? TimelineColor.INCOME : 'var(--text-dim)'), textTransform: 'uppercase', fontWeight: '700' }}>
              {isAmortized ? t('loanCard.interestSaved') : t('loanCard.interest')}:
            </span>
            <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isPaidLoan ? TimelineColor.WHITE : (isAmortized ? TimelineColor.INCOME : TimelineColor.WARNING) }}>
              {isAmortized
                ? `+${formatCurrency(abatedBreakdown?.origInterest || event.savedInterest || event.originalInstallmentInterest || 0)}`
                : formatCurrency(event.installmentInterest ?? event.interestPortion ?? event.interest_portion ?? 0)}
            </span>
          </div>

          {!isAmortized && ((event.installmentFee ?? event.taxAmount ?? event.tax_amount ?? 0) > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isPaidLoan ? `1px solid ${TimelineColor.WHITE}4c` : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
              <span style={{ fontSize: '0.68rem', color: isPaidLoan ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                {t('loanCard.stampTax')}:
              </span>
              <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isPaidLoan ? TimelineColor.WHITE : TimelineColor.PURPLE }}>
                {formatCurrency(event.installmentFee ?? event.taxAmount ?? event.tax_amount ?? 0)}
              </span>
            </div>
          )}

          {(event.balanceAfter !== undefined || event.remainingDebtAfter !== undefined || event.remaining_debt_after !== undefined) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isPaidLoan ? `1px solid ${TimelineColor.WHITE}4c` : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
              <span style={{ fontSize: '0.68rem', color: isPaidLoan ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                {t('loanCard.remainingDebt')}:
              </span>
              <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isPaidLoan ? TimelineColor.WHITE : (isAmortized ? TimelineColor.SLATE : 'var(--primary-light)') }}>
                {formatCurrency(event.balanceAfter !== undefined ? event.balanceAfter : (event.remainingDebtAfter !== undefined ? event.remainingDebtAfter : (event.remaining_debt_after || 0)))}
              </span>
            </div>
          )}
        </div>

        {/* Inline Loan Payment Fast Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          {isAmortized ? (
            <div
              style={{
                background: `${TimelineColor.SLATE_LIGHT}1f`,
                color: TimelineColor.SLATE,
                border: `1px solid ${TimelineColor.SLATE_LIGHT}4c`,
                borderRadius: '9999px',
                padding: '4px 12px',
                fontSize: '0.76rem',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'not-allowed',
                userSelect: 'none'
              }}
              title="Parcela abatida por amortização extraordinária antecipada."
            >
              <CheckCircle2 size={13} style={{ color: TimelineColor.SLATE }} />
              <span>{t('status.abated')}</span>
            </div>
          ) : (
            <StatusDropdownButton buttonProps={{
                className: 'btn btn-sm',
                title: t('timeline.clickToChangeStatus'),
                style: {
                  background: isCancelled
                    ? `${TimelineColor.SLATE_LIGHT}26`
                    : isPaidLoan
                      ? `${TimelineColor.WHITE}40`
                      : 'var(--primary)',
                  color: isCancelled
                    ? TimelineColor.SLATE
                    : TimelineColor.WHITE,
                  border: isCancelled
                    ? `1px solid ${TimelineColor.SLATE_LIGHT}59`
                    : isPaidLoan
                      ? `1px solid ${TimelineColor.WHITE}66`
                      : '1px solid transparent',
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  minWidth: '110px',
                  height: '26px',
                  boxSizing: 'border-box',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  cursor: isTogglingStatus ? 'wait' : 'pointer',
                  opacity: isTogglingStatus ? 0.6 : 1,
                  pointerEvents: isTogglingStatus ? 'none' : 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                  boxShadow: isCancelled || isPaidLoan
                    ? 'none'
                    : `0 2px 8px ${TimelineColor.PRIMARY}59`
                }
              }} children={isFutureMonth ? (
                <>
                  <ArrowUpRight size={13} style={{ color: isPaidLoan ? `${TimelineColor.WHITE}d9` : TimelineColor.WHITE }} />
                  <span style={{ color: TimelineColor.WHITE }}>{isPaidLoan ? t('status.settled') : t('status.actionPay')}</span>
                </>
              ) : isCancelled ? (
                <>
                  <Ban size={13} style={{ color: TimelineColor.SLATE }} />
                  <span>{t('status.cancelled')}</span>
                </>
              ) : isPaidLoan ? (
                <>
                  <CheckCircle2 size={13} style={{ color: TimelineColor.WHITE }} />
                  <span style={{ color: TimelineColor.WHITE }}>{t('status.settled')}</span>
                </>
              ) : (
                <>
                  <ArrowUpRight size={13} style={{ color: TimelineColor.WHITE }} />
                  <span>{t('status.actionPay')}</span>
                </>
              )} />
          )}
        </div>
      </div>

      {/* Linha 3: [Valor] (left) e [event action buttons] (right) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
        marginTop: '-1px',
        paddingTop: '6px',
        borderTop: isPaidLoan ? `1px solid ${TimelineColor.WHITE}33` : '1px solid var(--border-glass)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isAmortized ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>
                {formatCurrency(abatedBreakdown?.origTotal || event.originalInstallmentAmount || event.originalAmount || 0)}
              </span>
              <span style={{ fontSize: '0.94rem', fontWeight: '800', color: TimelineColor.INCOME }}>
                {formatCurrency(abatedBreakdown?.origCapital || event.originalInstallmentCapital || 0)}
              </span>
            </div>
          ) : reducedBreakdown ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', color: isPaidLoan ? `${TimelineColor.WHITE}bf` : 'var(--text-dim)', textDecoration: 'line-through' }} title="Valor original antes da amortização extraordinária">
                {formatCurrency(reducedBreakdown.origTotal)}
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: '800', color: isPaidLoan ? TimelineColor.WHITE : 'var(--primary-light)' }} title="Novo valor reduzido da parcela">
                {formatCurrency(reducedBreakdown.currentTotal)}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '1.05rem', fontWeight: '800', color: isPaidLoan ? TimelineColor.WHITE : 'var(--primary-light)' }}>
              {formatCurrency(event.amount)}
            </span>
          )}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <EventActionButtons />
        </div>
      </div>
    </div>
  );
}
