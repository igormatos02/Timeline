import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { hexToRgba } from './cardUtils.js';
import { MovementKind, TimelineColor, TimelineType, getFixedTimelineColor } from '../../enums/index.js';
import { getPaletteGradient } from '../../../shared/config/colorPalettes.js';
import EventCardHeader from './EventCardHeader.jsx';
import EventReceiptRef from './EventReceiptRef.jsx';
import StatusDropdownButton from './StatusDropdownButton.jsx';
import { ArrowDownLeft, Ban, Banknote, CheckCircle2, Lock } from 'lucide-react';
import ReceiptDateEditor from './ReceiptDateEditor.jsx';
import ReceiptNumberEditor from './ReceiptNumberEditor.jsx';
import EventCategoryPicker from './EventCategoryPicker.jsx';
import EditableAmount from './EditableAmount.jsx';
import EventCategoryBadge from './EventCategoryBadge.jsx';
import EventActionButtons from './EventActionButtons.jsx';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function IncomeEventBody() {
  const {
    event,
    isCancelled,
    isFutureMonth,
    isOverdueIncome,
    isReceivedIncome,
    isTogglingStatus,
    isVirtual,
    isVirtualWithdrawal,
    paletteTheme,
    t
  } = useEventCard();

  const isWithdrawal = Boolean(isVirtualWithdrawal || event?.referenceKind === MovementKind.WITHDRAWAL || event?.isWithdrawal);

  // A withdrawal from savings uses the card palette (see TimelineEventCard baseItemColor), an income the green
  const incomeGradient = getPaletteGradient(isWithdrawal ? paletteTheme.primary : TimelineColor.INCOME);
  const cashColor = getFixedTimelineColor(TimelineType.WALLET);
  const incomeAccentColor = isWithdrawal ? paletteTheme.primary : TimelineColor.SUCCESS;

  return (
    <div
      className={`loan-breakdown-strip ${isReceivedIncome ? 'flat-positive-card flat-positive-income' : ''}`}
      style={{
        background: isReceivedIncome
          ? incomeGradient
          : 'transparent',
        border: isReceivedIncome ? `1px solid ${TimelineColor.WHITE}40` : '1px solid var(--border-glass)',
        borderRadius: '8px',
        padding: '8px 10px',
        margin: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        color: isReceivedIncome ? TimelineColor.WHITE : 'inherit',
        boxShadow: isReceivedIncome ? `0 4px 14px ${hexToRgba(incomeAccentColor, 0.35)}` : 'none'
      }}
    >
      {/* Parte Superior: Informações do Evento */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          color: isReceivedIncome ? TimelineColor.WHITE : 'inherit'
        }}
      >
        {/* Linha 1: [icone] [titulo do evento] [lables] */}
        <EventCardHeader />

        {/* Linha 2: [recibo/data de pagamento] (left) e [b status] (right, apenas não virtual) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <EventReceiptRef onPositiveCard={isReceivedIncome} />
            {/* Income received in cash (the wallet), the counterpart of the account's "External deposit" tag */}
            {!isWithdrawal && !isVirtual && (
              <div style={{ display: 'flex', alignItems: 'center', borderLeft: isReceivedIncome ? `1px solid ${TimelineColor.WHITE}4c` : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                <span
                  style={{
                    background: isReceivedIncome ? `${TimelineColor.WHITE}33` : hexToRgba(cashColor, 0.14),
                    color: isReceivedIncome ? TimelineColor.WHITE : cashColor,
                    border: isReceivedIncome ? `1px solid ${TimelineColor.WHITE}59` : `1px solid ${hexToRgba(cashColor, 0.35)}`,
                    padding: '2px 7px',
                    borderRadius: '5px',
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={t('modal.cashIncomeHint')}
                >
                  <Banknote size={10} strokeWidth={2.5} />
                  <span>{t('modal.cashIncome')}</span>
                </span>
              </div>
            )}
          </div>
          {/* A withdrawal from savings shows its status read-only: it changes in the savings timeline */}
          {(!isVirtual || isWithdrawal) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <StatusDropdownButton readOnly={isVirtual} buttonProps={{
                className: 'btn btn-sm',
                title: t('timeline.clickToChangeStatus'),
                style: {
                  background: isCancelled
                    ? `${TimelineColor.SLATE_LIGHT}26`
                    : isReceivedIncome
                      ? incomeGradient
                      : 'var(--primary)',
                  color: isCancelled
                    ? TimelineColor.SLATE
                    : TimelineColor.WHITE,
                  border: isCancelled
                    ? `1px solid ${TimelineColor.SLATE_LIGHT}59`
                    : isReceivedIncome
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
                  boxShadow: isCancelled || isReceivedIncome
                    ? 'none'
                    : `0 2px 8px ${TimelineColor.PRIMARY}59`
                }
              }} children={isFutureMonth ? (
                <>
                  <ArrowDownLeft size={13} style={{ color: isReceivedIncome ? `${TimelineColor.WHITE}d9` : TimelineColor.WHITE }} />
                  <span style={{ color: TimelineColor.WHITE }}>{isReceivedIncome ? t(isWithdrawal ? 'status.withdrawn' : 'status.received') : t(isWithdrawal ? 'status.toWithdraw' : 'status.actionReceive')}</span>
                </>
              ) : isCancelled ? (
                <>
                  <Ban size={13} style={{ color: TimelineColor.SLATE }} />
                  <span>{t('status.cancelled')}</span>
                </>
              ) : isReceivedIncome ? (
                <>
                  <CheckCircle2 size={13} style={{ color: TimelineColor.WHITE }} />
                  <span style={{ color: TimelineColor.WHITE }}>{t(isWithdrawal ? 'status.withdrawn' : 'status.received')}</span>
                  <Lock size={11} style={{ color: TimelineColor.WHITE, marginLeft: '2px' }} />
                </>
              ) : (
                <>
                  <ArrowDownLeft size={13} style={{ color: TimelineColor.WHITE }} />
                  <span>{t(isWithdrawal ? 'status.toWithdraw' : 'status.actionReceive')}</span>
                </>
              )} />
            </div>
          )}
        </div>
        <ReceiptDateEditor />
        <ReceiptNumberEditor />
        <EventCategoryPicker />
      </div>

      {/* Parte Inferior: [Valor] (left) e [event action buttons] (right) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
        marginTop: '-1px',
        paddingTop: '6px',
        borderTop: isReceivedIncome ? `1px solid ${TimelineColor.WHITE}33` : '1px solid var(--border-glass)',
        color: isReceivedIncome ? TimelineColor.WHITE : 'inherit'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <EditableAmount prefix={'+'} defaultColor={isCancelled ? TimelineColor.SLATE : isReceivedIncome ? TimelineColor.WHITE : incomeAccentColor} />
          <EventCategoryBadge onPositiveCard={isReceivedIncome} />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <EventActionButtons />
        </div>
      </div>
    </div>
  );
}
