import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { hexToRgba } from './cardUtils.js';
import { EventType, TimelineColor } from '../../enums/index.js';
import EventCardHeader from './EventCardHeader.jsx';
import EventReceiptRef from './EventReceiptRef.jsx';
import { formatCurrency } from '../../utils/formatCurrency';
import { ArrowRight, Ban, CheckCircle2, Clock, CreditCard, ExternalLink, Landmark, Lock, Target, TrendingUp } from 'lucide-react';
import StatusDropdownButton from './StatusDropdownButton.jsx';
import ReceiptDateEditor from './ReceiptDateEditor.jsx';
import ReceiptNumberEditor from './ReceiptNumberEditor.jsx';
import EventCategoryPicker from './EventCategoryPicker.jsx';
import EditableAmount from './EditableAmount.jsx';
import EventOutflowTypeBadge from './EventOutflowTypeBadge.jsx';
import EventActionButtons from './EventActionButtons.jsx';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function InvestmentEventBody() {
  const {
    activeFinancialTab,
    allEvents,
    effectiveStatusKey,
    event,
    isCancelled,
    isCompletedInvestment,
    isFutureMonth,
    isOverdueInvestment,
    isPocketOutflowEvent,
    isTogglingStatus,
    isTransferEvent,
    paletteTheme,
    t,
    timelineType,
    todayStr,
    walletBankTransfer
  } = useEventCard();

  return (
    <div
      className={`loan-breakdown-strip ${isCompletedInvestment ? 'flat-positive-card flat-positive-investment' : ''}`}
      style={{
        background: isCompletedInvestment
          ? `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`
          : 'transparent',
        border: isCompletedInvestment ? `1px solid ${TimelineColor.WHITE}40` : '1px solid var(--border-glass)',
        borderRadius: '8px',
        padding: '8px 10px',
        margin: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        color: isCompletedInvestment ? TimelineColor.WHITE : 'inherit',
        boxShadow: isCompletedInvestment ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}` : 'none'
      }}
    >
      {/* Linha 1: [icone] [titulo do evento] [lables] */}
      <EventCardHeader />

      {/* Linha 2: [recibo/data & info] (left) e [b status] (right) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingBottom: '0px' }}>
          <EventReceiptRef onPositiveCard={isCompletedInvestment} />

          {event.category === 'investimento_patrimonio' && Number(event.initialInvestedAmount || 0) > 0 && Number(event.amount || 0) > 0 && Number(event.initialInvestedAmount) !== Number(event.amount) && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isCompletedInvestment ? `1px solid ${TimelineColor.WHITE}4c` : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                <span style={{ fontSize: '0.68rem', color: isCompletedInvestment ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                  {t('timeline.acquisition')}:
                </span>
                <span style={{ fontSize: '0.80rem', fontWeight: '700', color: isCompletedInvestment ? TimelineColor.WHITE : 'var(--primary-light)' }}>
                  {formatCurrency(event.initialInvestedAmount)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isCompletedInvestment ? `1px solid ${TimelineColor.WHITE}4c` : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                <span style={{ fontSize: '0.68rem', color: isCompletedInvestment ? TimelineColor.WHITE : (Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? TimelineColor.INCOME : TimelineColor.EXPENSE, textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <TrendingUp size={11} /> {t('timeline.valuation')}:
                </span>
                <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isCompletedInvestment ? TimelineColor.WHITE : (Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? TimelineColor.INCOME : TimelineColor.EXPENSE }}>
                  {(Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? '+' : ''}
                  {formatCurrency(Number(event.amount) - Number(event.initialInvestedAmount))}
                  <span style={{ fontSize: '0.70rem', marginLeft: '4px', fontWeight: '700' }}>
                    ({(Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? '+' : ''}
                    {(((Number(event.amount) - Number(event.initialInvestedAmount)) / Number(event.initialInvestedAmount)) * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
            </>
          )}

          {event.category === 'investimento_patrimonio' && event.linkedLoanTimelineName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isCompletedInvestment ? `1px solid ${TimelineColor.WHITE}4c` : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
              <span style={{ fontSize: '0.68rem', color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.SKY, textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <CreditCard size={11} /> {t('timeline.financing')}:
              </span>
              <span style={{ fontSize: '0.80rem', fontWeight: '700', color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.SKY }}>
                {event.linkedLoanTimelineName}
              </span>
            </div>
          )}

          {!event.pocketId && !event.pocket_id && event.category !== 'investimento_patrimonio' && Number(event.initialInvestedAmount || 0) > 0 && (event.isFirstOccurrence === true || (!event.isProjected && !event.eventId || event.seriesId) || (event.isFirstOccurrence !== false && !event.isProjected)) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isCompletedInvestment ? `1px solid ${TimelineColor.WHITE}4c` : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
              <span style={{ fontSize: '0.68rem', color: isCompletedInvestment ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                {t('timeline.initialContribution')}:
              </span>
              <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isCompletedInvestment ? TimelineColor.WHITE : 'var(--primary-light)' }}>
                {formatCurrency(event.initialInvestedAmount)}
              </span>
            </div>
          )}

          {!event.pocketId && !event.pocket_id && event.category !== 'investimento_patrimonio' && Number(event.targetAmount || 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isCompletedInvestment ? `1px solid ${TimelineColor.WHITE}4c` : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
              <span style={{ fontSize: '0.68rem', color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.INVESTMENT, textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Target size={11} /> {t('timeline.goal')}:
              </span>
              <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.INVESTMENT }}>
                {formatCurrency(event.targetAmount)}
              </span>
            </div>
          )}

          {(event.isExternal || event.is_external) && (
            <div style={{ display: 'flex', alignItems: 'center', borderLeft: isCompletedInvestment ? `1px solid ${TimelineColor.WHITE}4c` : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
              <span
                style={{
                  background: isCompletedInvestment ? `${TimelineColor.WHITE}33` : `${TimelineColor.VIOLET}24`,
                  color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.PRIMARY_LIGHT,
                  border: isCompletedInvestment ? `1px solid ${TimelineColor.WHITE}59` : `1px solid ${TimelineColor.VIOLET}59`,
                  padding: '2px 7px',
                  borderRadius: '5px',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={t('modal.isExternalDepositHint')}
              >
                <ExternalLink size={10} strokeWidth={2.5} />
                <span>{t('modal.externalDeposit')}</span>
              </span>
            </div>
          )}
        </div>

        {/* Status Pill & Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <StatusDropdownButton buttonProps={{
              className: 'btn btn-sm',
              title: t('timeline.clickToChangeStatus'),
              style: {
                background: isCancelled
                  ? `${TimelineColor.SLATE_LIGHT}26`
                  : event.category === 'investimento_patrimonio'
                    ? (event.status === 'Financiado' ? `${TimelineColor.SKY}29` : (isCompletedInvestment ? `${TimelineColor.WHITE}40` : `${TimelineColor.EMERALD}29`))
                    : isCompletedInvestment
                      ? `${TimelineColor.WHITE}40`
                      : 'var(--primary)',
                color: isCancelled
                  ? TimelineColor.SLATE
                  : event.category === 'investimento_patrimonio'
                    ? (event.status === 'Financiado' ? TimelineColor.CYAN : (isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.INCOME))
                    : TimelineColor.WHITE,
                border: isCancelled
                  ? `1px solid ${TimelineColor.SLATE_LIGHT}59`
                  : event.category === 'investimento_patrimonio'
                    ? (event.status === 'Financiado' ? `1px solid ${TimelineColor.SKY}66` : (isCompletedInvestment ? `1px solid ${TimelineColor.WHITE}66` : `1px solid ${TimelineColor.EMERALD}66`))
                    : isCompletedInvestment
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
                boxShadow: isCancelled || isCompletedInvestment
                  ? 'none'
                  : `0 2px 8px ${TimelineColor.PRIMARY}59`
              }
            }} children={isFutureMonth ? (
              <>
                <TrendingUp size={13} style={{ color: isCompletedInvestment ? `${TimelineColor.WHITE}d9` : TimelineColor.WHITE }} />
                <span style={{ color: TimelineColor.WHITE }}>{isCompletedInvestment ? t(`status.${effectiveStatusKey}`) : t('status.actionContribute')}</span>
              </>
            ) : isCancelled ? (
              <>
                <Ban size={13} style={{ color: TimelineColor.SLATE }} />
                <span>{t('status.cancelled')}</span>
              </>
            ) : event.category === 'investimento_patrimonio' ? (
              event.status === 'Financiado' ? (
                <>
                  <CreditCard size={13} style={{ color: TimelineColor.CYAN }} />
                  <span>{t('status.financed')}</span>
                </>
              ) : (
                <>
                  <Landmark size={13} style={{ color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.INCOME }} />
                  <span style={{ color: isCompletedInvestment ? TimelineColor.WHITE : undefined }}>{t('status.paidOff')}</span>
                </>
              )
            ) : isCompletedInvestment ? (
              <>
                <CheckCircle2 size={13} style={{ color: TimelineColor.WHITE }} />
                <span style={{ color: TimelineColor.WHITE }}>{t(`status.${effectiveStatusKey}`)}</span>
                <Lock size={11} style={{ color: TimelineColor.WHITE, marginLeft: '2px' }} />
              </>
            ) : (
              <>
                <TrendingUp size={13} style={{ color: TimelineColor.WHITE }} />
                <span>{t('status.actionContribute')}</span>
              </>
            )} />
        </div>
      </div>
      <ReceiptDateEditor />
      <ReceiptNumberEditor />
      {!walletBankTransfer && <EventCategoryPicker />}

      {/* Linha 3: [Valor] (left) e [event action buttons] (right) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
        marginTop: '-1px',
        paddingTop: '6px',
        borderTop: isCompletedInvestment ? `1px solid ${TimelineColor.WHITE}33` : '1px solid var(--border-glass)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {walletBankTransfer ? (
            // Balance view: one movement between the wallet and the bank, with both ends
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.86rem', fontWeight: '800' }}>
              <span style={{ color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.EXPENSE }}>
                {walletBankTransfer.fromName} -{formatCurrency(Math.abs(Number(event.amount || 0)))}
              </span>
              <ArrowRight size={14} style={{ color: isCompletedInvestment ? TimelineColor.WHITE : 'var(--text-dim)' }} />
              <span style={{ color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.INCOME }}>
                {walletBankTransfer.toName} +{formatCurrency(Math.abs(Number(event.amount || 0)))}
              </span>
            </span>
          ) : event.category === 'investimento_patrimonio' ? (
            <span style={{ fontSize: '1.05rem', fontWeight: '800', color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.INVESTMENT }}>
              +{formatCurrency(event.amount || event.initialInvestedAmount || 0)}
            </span>
          ) : (
            <EditableAmount prefix={isTransferEvent ? '' : (isPocketOutflowEvent ? '-' : '+')} defaultColor={isCancelled
                ? TimelineColor.SLATE
                : isCompletedInvestment
                ? TimelineColor.WHITE
                : isTransferEvent
                ? TimelineColor.CYAN
                : isPocketOutflowEvent
                ? TimelineColor.DANGER
                : TimelineColor.INVESTMENT} />
          )}
          <EventOutflowTypeBadge onPositiveCard={isCompletedInvestment} />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <EventActionButtons />
        </div>
      </div>

      {/* 🎯 Barra de Progresso da Meta de Poupança / Investimento */}
      {!event.pocketId && !event.pocket_id && Number(event.targetAmount || 0) > 0 && (() => {
        const seriesId = event.eventId || event.seriesId || event.id;
        let baseInitial = Number(event.initialInvestedAmount || 0);
        if (!baseInitial) {
          const sourceEv = (allEvents || []).find((ev) => {
            if (!ev || !Number(ev.initialInvestedAmount || 0)) return false;
            return Boolean(
              (ev.eventType === EventType.INVESTMENT || ev.eventType === 'investimento' || ev.isInvestment) &&
              (
                (ev.eventId && (ev.eventId === seriesId || ev.eventId === event.eventId || ev.eventId === event.seriesId)) ||
                (ev.seriesId && (ev.seriesId === seriesId || ev.seriesId === event.seriesId || ev.seriesId === event.eventId)) ||
                (ev.id && (ev.id === seriesId || ev.id === event.eventId || ev.id === event.seriesId)) ||
                (ev.sobrepositionOver && (ev.sobrepositionOver === seriesId || ev.sobrepositionOver === event.eventId || ev.sobrepositionOver === event.seriesId)) ||
                (event.title && ev.title && ev.title.trim().toLowerCase() === event.title.trim().toLowerCase())
              )
            );
          });
          if (sourceEv) {
            baseInitial = Number(sourceEv.initialInvestedAmount || 0);
          }
        }

        const isInvestmentsView = activeFinancialTab === 'investimentos' || timelineType === 'investimentos' || event.timelineOriginId === 'b3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e';
        const isFuture = event.date > todayStr;
        const useForecast = isInvestmentsView && isFuture;

        const isMatchingSeriesEvent = (ev) => {
          if (!ev || !ev.date) return false;
          if (ev.status === 'Cancelado' || ev.status === 'cancelled' || ev.status === 'Excluido' || ev.status === 'deleted' || ev.isDeleted) return false;
          const isInv = ev.eventType === EventType.INVESTMENT || ev.eventType === 'investimento' || ev.isInvestment;
          if (!isInv) return false;
          return Boolean(
            (ev.eventId && (ev.eventId === seriesId || ev.eventId === event.eventId || ev.eventId === event.seriesId)) ||
            (ev.seriesId && (ev.seriesId === seriesId || ev.seriesId === event.seriesId || ev.seriesId === event.eventId)) ||
            (ev.id && (ev.id === seriesId || ev.id === event.eventId || ev.id === event.seriesId)) ||
            (ev.sobrepositionOver && (ev.sobrepositionOver === seriesId || ev.sobrepositionOver === event.eventId || ev.sobrepositionOver === event.seriesId)) ||
            (event.title && ev.title && ev.title.trim().toLowerCase() === event.title.trim().toLowerCase())
          );
        };

        let currentSaved = baseInitial;
        if (useForecast) {
          const priorPlannedAportes = (allEvents || [])
            .filter((ev) => isMatchingSeriesEvent(ev) && ev.date < event.date)
            .reduce((sum, ev) => sum + Number(ev.amount || 0), 0);
          const thisMonthAmount = Number(event.amount || 0);
          currentSaved = baseInitial + priorPlannedAportes + thisMonthAmount;
        } else {
          const priorRealizedAportes = (allEvents || [])
            .filter((ev) => {
              if (!isMatchingSeriesEvent(ev) || ev.date >= event.date) return false;
              return ev.status === 'Investido' || ev.status === 'invested' || ev.status === 'Pago' || ev.status === 'paid' || ev.isCompleted;
            })
            .reduce((sum, ev) => sum + Number(ev.amount || 0), 0);
          const thisMonthRealized = isCompletedInvestment ? Number(event.amount || 0) : 0;
          currentSaved = baseInitial + priorRealizedAportes + thisMonthRealized;
        }

        const targetVal = Number(event.targetAmount);
        const progressPct = Math.min(100, Math.max(0, Math.round((currentSaved / targetVal) * 100)));
        const labelTitle = useForecast
          ? `Previsão de Progresso da Meta (${formatCurrency(currentSaved)} de ${formatCurrency(targetVal)})`
          : `Progresso da Meta (${formatCurrency(currentSaved)} de ${formatCurrency(targetVal)})`;
        const labelPercent = useForecast
          ? (progressPct >= 100 ? '🎉 Meta Atingida (Previsão)!' : `${progressPct}% previsto`)
          : (progressPct >= 100 ? '🎉 Meta Atingida!' : `${progressPct}% alcançado`);

        return (
          <div
            style={{
              width: '100%',
              marginTop: '6px',
              paddingTop: '6px',
              borderTop: `1px solid ${TimelineColor.VIOLET}26`
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                fontWeight: '700',
                color: useForecast ? TimelineColor.PRIMARY_LIGHT : TimelineColor.PRIMARY,
                marginBottom: '4px'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Target size={11} />
                <span>{labelTitle}</span>
              </span>
              <span style={{ color: progressPct >= 100 ? TimelineColor.SUCCESS : TimelineColor.PRIMARY_LIGHT, fontWeight: '800' }}>
                {labelPercent}
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '5px',
                background: `${TimelineColor.SLATE_LIGHT}26`,
                borderRadius: '9999px',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <div
                style={{
                  width: `${progressPct}%`,
                  height: '100%',
                  background: progressPct >= 100
                    ? `linear-gradient(90deg, ${TimelineColor.SUCCESS} 0%, ${TimelineColor.EMERALD} 100%)`
                    : useForecast
                      ? `linear-gradient(90deg, ${TimelineColor.PRIMARY} 0%, ${TimelineColor.PRIMARY_LIGHT} 100%)`
                      : `linear-gradient(90deg, ${TimelineColor.PRIMARY} 0%, ${TimelineColor.PRIMARY_LIGHT} 100%)`,
                  borderRadius: '9999px',
                  transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: `0 0 10px ${TimelineColor.PRIMARY}73`
                }}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
