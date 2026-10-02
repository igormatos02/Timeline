import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { pendingStatusFor } from '../../../shared/finance/statusRules.js';
import { DiaryPublishStatus, EventStatus, TimelineColor, isCancelledStatus, isPositiveStatus } from '../../enums/index.js';
import { Ban, CheckCircle2, Edit3, FileText, Layers, Lock, Printer, Trash2, Undo2, Wrench, Zap } from 'lucide-react';
import { effectiveStatusFor } from '../../../shared/finance/statusRules.js';
import CancelEventConfirmModal from '../CancelEventConfirmModal.jsx';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function EventActionButtons() {
  const {
    blocksChanges,
    canChangeStatus,
    canEdit,
    canOverride,
    correctEvent,
    currentMonthEndStr,
    effectiveStatus,
    event,
    getCardNotes,
    handleCancelDesmembramento,
    handlePayUpToHereClick,
    handleStatusToggle,
    isAnchorCard,
    isCancelConfirmOpen,
    isCancelled,
    isCancelledPost,
    isCompleted,
    isCondoPost,
    isDesmembramentoExpanded,
    isFlatPositive,
    isFollowupEvent,
    isLoanInstallment,
    isLockedPositive,
    isNotesExpanded,
    isPaidLoan,
    isPayingUpToHere,
    isReadOnly,
    isRecurringEvent,
    isRevertConfirmOpen,
    isTogglingStatus,
    isVirtual,
    localAuto,
    obligationPerson,
    onDelete,
    onEdit,
    onPayUpToHere,
    onPrintReceipt,
    onToggleLoanPayment,
    onUpdateEventDirect,
    openDesmembramento,
    setIsCancelConfirmOpen,
    setIsNotesExpanded,
    setIsRevertConfirmOpen,
    setLocalAuto,
    setLocalStatus,
    setPostPublishStatus,
    t,
    todayStr
  } = useEventCard();

    if (isVirtual) return null;
    return (
      <div className="event-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      {/* Botão Pagar até aqui para parcelas de empréstimo / dívida em aberto (apenas até ao mês atual) */}
      {isLoanInstallment && !isPaidLoan && onPayUpToHere && (event.date <= currentMonthEndStr) && (
        <button
          type="button"
          disabled={isPayingUpToHere}
          className="btn btn-secondary btn-sm"
          onClick={handlePayUpToHereClick}
          style={{
            padding: '3px 8px',
            fontSize: '0.72rem',
            gap: '4px',
            background: `${TimelineColor.EMERALD}24`,
            color: TimelineColor.EMERALD,
            border: `1px solid ${TimelineColor.EMERALD}59`,
            fontWeight: '700',
            borderRadius: '5px',
            cursor: isPayingUpToHere ? 'not-allowed' : 'pointer',
            opacity: isPayingUpToHere ? 0.6 : 1,
            pointerEvents: isPayingUpToHere ? 'none' : 'auto',
            transition: 'all 0.15s ease'
          }}
          title={t('buttons.payUpToHereTitle')}
        >
          <CheckCircle2 size={12} style={{ color: TimelineColor.EMERALD }} />
          <span>{t('buttons.payUpToHere')}</span>
        </button>
      )}

      {/* Botão de Notas (também disponível para utilizadores só de leitura) */}
      {(onEdit || isReadOnly || canChangeStatus) && !isAnchorCard && !isCondoPost && (() => {
        const allNotes = getCardNotes();
        const hasNotes = allNotes.length > 0;

        return (
          <button
            type="button"
            className="action-icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsNotesExpanded(!isNotesExpanded);
            }}
            title={hasNotes ? `${t('actionNotes')} (${allNotes.length})` : t('actionAddNote')}
            style={{
              color: hasNotes ? (isFlatPositive ? TimelineColor.WHITE : TimelineColor.WARNING) : (isFlatPositive ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)'),
              background: hasNotes ? (isFlatPositive ? `${TimelineColor.WHITE}40` : `${TimelineColor.AMBER}24`) : 'transparent',
              border: hasNotes ? (isFlatPositive ? `1px solid ${TimelineColor.WHITE}66` : `1px solid ${TimelineColor.AMBER}59`) : '1px solid transparent',
              borderRadius: '5px',
              padding: '3px 5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <FileText size={13} />
            {hasNotes && (
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: isFlatPositive ? TimelineColor.WHITE : TimelineColor.WARNING }}>
                {allNotes.length}
              </span>
            )}
          </button>
        );
      })()}

      {/* Botão de Desmembrar Valor */}
      {!isLoanInstallment && !isFollowupEvent && !isAnchorCard && !isCondoPost && !isVirtual && !isLockedPositive && !isCancelled && (onUpdateEventDirect || onEdit) && (() => {
        const allSubparts = Array.isArray(event.breakdownItems) ? event.breakdownItems : [];
        const hasBreakdown = allSubparts.length > 0;

        return (
          <button
            type="button"
            className="action-icon-btn"
            onClick={(e) => {
              if (isDesmembramentoExpanded) {
                handleCancelDesmembramento(e);
              } else {
                openDesmembramento(e);
              }
            }}
            title={hasBreakdown ? t('actionBreakdown', { count: allSubparts.length }) : t('actionSplitValue')}
            style={{
              color: hasBreakdown ? 'var(--primary-light)' : 'var(--text-dim)',
              background: hasBreakdown ? `${TimelineColor.PRIMARY}24` : 'transparent',
              border: hasBreakdown ? `1px solid ${TimelineColor.PRIMARY}59` : '1px solid transparent',
              borderRadius: '5px',
              padding: '3px 5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Layers size={13} />
            {hasBreakdown && (
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                {allSubparts.length}
              </span>
            )}
          </button>
        );
      })()}

      {/* Botão / Indicador de Evento Automático (Apenas para Eventos Recorrentes / Parcelamentos e não trancados/cancelados) */}
      {isRecurringEvent && canEdit && !isLockedPositive && !isCancelled && (
        <button
          type="button"
          className="action-icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (!onUpdateEventDirect) return;
            const nextAuto = !localAuto;
            setLocalAuto(nextAuto);

            const targetSeriesKey = event.seriesId || event.eventId;

            let newStatus = event.status;
            let newIsCompleted = Boolean(event.isCompleted);

            if (nextAuto) {
              const isPastOrToday = Boolean(event.date && event.date <= todayStr);
              if (isPastOrToday && !isCancelledStatus(event.status) && event.status !== EventStatus.DELETED) {
                // Shared status words (shared/finance/statusRules.js)
                newStatus = effectiveStatusFor(event);
                newIsCompleted = true;
              }
              setLocalStatus(newStatus);
            }

            onUpdateEventDirect({
              ...event,
              seriesId: targetSeriesKey,
              automatic: nextAuto,
              isAutomatic: nextAuto,
              status: newStatus,
              isCompleted: newIsCompleted,
              updateScope: 'all_series'
            });
          }}
          title={localAuto ? t('backend.event.autoMovementActiveTitle') : t('backend.event.autoMovementManualTitle')}
          style={{
            color: localAuto ? TimelineColor.WARNING : 'var(--text-dim)',
            background: localAuto ? `${TimelineColor.AMBER}29` : 'transparent',
            border: localAuto ? `1px solid ${TimelineColor.AMBER}66` : '1px solid transparent',
            borderRadius: '5px',
            padding: '2px 5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Zap size={12} fill={localAuto ? TimelineColor.WARNING : 'none'} />
          {localAuto && (
            <span style={{ fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.02em', color: TimelineColor.WARNING }}>
              AUTO
            </span>
          )}
        </button>
      )}

      {/* Botão Cancelar / Reativar Post (condoflow): reativar volta a "não publicado" */}
      {isCondoPost && onUpdateEventDirect && (
        <button
          type="button"
          className="action-icon-btn"
          onClick={(e) => setPostPublishStatus(e, isCancelledPost ? DiaryPublishStatus.UNPUBLISHED : DiaryPublishStatus.CANCELLED)}
          title={isCancelledPost ? t('actionReactivateEvent') : t('actionCancelEvent')}
          style={{
            padding: '3px 5px',
            borderRadius: '5px',
            color: isCancelledPost ? TimelineColor.WARNING : 'var(--text-dim)',
            background: isCancelledPost ? `${TimelineColor.WARNING}24` : 'transparent',
            border: `1px solid ${isCancelledPost ? `${TimelineColor.WARNING}59` : 'transparent'}`,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          <Ban size={13} />
        </button>
      )}

      {/* "Correct" an effective movement: pre-filled form; the original is cancelled when the correction is saved */}
      {isLockedPositive && !isCancelled && !blocksChanges && correctEvent && (
        <button
          type="button"
          className="action-icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            correctEvent(event);
          }}
          title={t('actionCorrectEventHint')}
          style={{
            padding: '3px 7px',
            borderRadius: '5px',
            color: isFlatPositive ? TimelineColor.WHITE : TimelineColor.WARNING,
            background: isFlatPositive ? `${TimelineColor.WHITE}33` : `${TimelineColor.WARNING}1f`,
            border: `1px solid ${isFlatPositive ? `${TimelineColor.WHITE}59` : `${TimelineColor.WARNING}59`}`,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.68rem',
            fontWeight: '700'
          }}
        >
          <Wrench size={12} />
          <span>{t('actionCorrectEvent')}</span>
        </button>
      )}

      {/* Botão Cancelar Evento: pede confirmação; um evento cancelado não pode ser reativado */}
      {!isAnchorCard && !isLoanInstallment && !isCondoPost && onToggleLoanPayment && canEdit && (isCancelled ? (
        <span
          className="action-icon-btn"
          title={t('cancelEventConfirm.locked')}
          style={{
            padding: '3px 5px',
            borderRadius: '5px',
            color: isFlatPositive ? TimelineColor.WHITE : TimelineColor.WARNING,
            background: isFlatPositive ? `${TimelineColor.WHITE}40` : `${TimelineColor.WARNING}24`,
            border: `1px solid ${isFlatPositive ? `${TimelineColor.WHITE}66` : `${TimelineColor.WARNING}59`}`,
            cursor: 'default',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          <Ban size={13} />
        </span>
      ) : (
        <>
          <button
            type="button"
            className="action-icon-btn"
            disabled={isTogglingStatus}
            onClick={(e) => {
              e.stopPropagation();
              setIsCancelConfirmOpen(true);
            }}
            title={t('actionCancelEvent')}
            style={{
              padding: '3px 5px',
              borderRadius: '5px',
              color: isFlatPositive ? TimelineColor.WHITE : 'var(--text-dim)',
              background: 'transparent',
              border: '1px solid transparent',
              cursor: isTogglingStatus ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            <Ban size={13} style={{ color: isFlatPositive ? TimelineColor.WHITE : undefined }} />
          </button>
          <CancelEventConfirmModal
            isOpen={isCancelConfirmOpen}
            eventTitle={event.title || event.name}
            onClose={() => setIsCancelConfirmOpen(false)}
            onConfirm={() => handleStatusToggle(null, EventStatus.CANCELLED)}
          />
        </>
      ))}

      {/* Botão Imprimir Recibo */}
      {onPrintReceipt && (isPositiveStatus(effectiveStatus) || isCompleted) && !isCancelled && (
        <button
          type="button"
          className="action-icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            onPrintReceipt(event, obligationPerson);
          }}
          title={t('receipt.printReceipt')}
          style={{
            padding: '3px 5px',
            borderRadius: '5px',
            color: isFlatPositive ? TimelineColor.WHITE : 'var(--primary-light)',
            background: isFlatPositive ? `${TimelineColor.WHITE}38` : `${TimelineColor.PRIMARY}26`,
            border: isFlatPositive ? `1px solid ${TimelineColor.WHITE}59` : `1px solid ${TimelineColor.PRIMARY}59`,
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          <Printer size={13} style={{ color: isFlatPositive ? TimelineColor.WHITE : 'var(--primary-light)' }} />
        </button>
      )}

      {/* Admins can revert an effective movement to pending (confirmation; recorded in the audit log) */}
      {isLockedPositive && !isCancelled && canOverride && onToggleLoanPayment && (
        <>
          <button
            type="button"
            className="action-icon-btn"
            disabled={isTogglingStatus}
            onClick={(e) => {
              e.stopPropagation();
              setIsRevertConfirmOpen(true);
            }}
            title={t('timeline.revertToPendingHint')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 5px',
              borderRadius: '5px',
              color: isFlatPositive ? TimelineColor.WHITE : 'var(--text-dim)',
              background: 'transparent',
              border: '1px solid transparent',
              cursor: isTogglingStatus ? 'wait' : 'pointer'
            }}
          >
            <Undo2 size={13} />
          </button>
          <CancelEventConfirmModal
            isOpen={isRevertConfirmOpen}
            eventTitle={event.title || event.name}
            onClose={() => setIsRevertConfirmOpen(false)}
            onConfirm={() => handleStatusToggle(null, pendingStatusFor(event))}
            titleKey="revertEventConfirm.title"
            messageKey="revertEventConfirm.message"
            confirmKey="revertEventConfirm.confirm"
            icon={Undo2}
            color={TimelineColor.WARNING}
          />
        </>
      )}

      {/* Lock of effective movements: only admins can revert or delete them (explained on hover) */}
      {isLockedPositive && !isReadOnly && !canOverride && (
        <span
          title={t('timeline.lockedPositiveNoticeNonAdmin')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 5px',
            borderRadius: '5px',
            color: isFlatPositive ? TimelineColor.WHITE : 'var(--text-dim)',
            opacity: 0.9
          }}
        >
          <Lock size={13} />
        </span>
      )}

      {/* Botão Editar Evento - Não permitido para parcelas de empréstimo, eventos virtuais ou eventos trancados/cancelados */}
      {onEdit && !isLoanInstallment && !isVirtual && !isLockedPositive && !isCancelled && (
        <button
          type="button"
          className="action-icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(event);
          }}
          title={t('actionEdit')}
          style={{
            padding: '3px 5px',
            borderRadius: '5px',
            color: isFlatPositive ? TimelineColor.WHITE : undefined
          }}
        >
          <Edit3 size={13} style={{ color: isFlatPositive ? TimelineColor.WHITE : undefined }} />
        </button>
      )}

      {/* Botão Eliminar Evento - Não permitido para parcelas de empréstimo ou eventos virtuais */}
      {/* Effective movements are only deleted by admins (recorded in the audit log) */}
      {onDelete && !isLoanInstallment && !isVirtual && (!isLockedPositive || canOverride) && (
        <button
          type="button"
          className="action-icon-btn delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(event);
          }}
          title={t('actionDelete')}
          style={{
            padding: '3px 5px',
            borderRadius: '5px',
            color: isFlatPositive ? `${TimelineColor.WHITE}e6` : undefined
          }}
        >
          <Trash2 size={13} style={{ color: isFlatPositive ? `${TimelineColor.WHITE}e6` : undefined }} />
        </button>
      )}
    </div>
  );
}
