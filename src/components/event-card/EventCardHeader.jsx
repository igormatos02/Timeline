import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { hexToRgba } from './cardUtils.js';
import { PersonType, TimelineColor } from '../../enums/index.js';
import { ArrowUpRight, BookOpen, Building2, Check, CheckCircle2, CheckSquare, FileCheck2, Flag, ListTree, PiggyBank, Repeat, Sparkles, Tag, User, UserCheck, X, Zap } from 'lucide-react';
import CopyIdButton from '../ui/CopyIdButton.jsx';
import { formatCurrency } from '../../utils/formatCurrency';
import EventCategoryBadge from './EventCategoryBadge.jsx';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function EventCardHeader() {
  const {
    abatedBreakdown,
    canEdit,
    cardTheme,
    event,
    handleCancelTitle,
    handleSaveTitle,
    isAmortization,
    isAmortized,
    isAnchorCard,
    isCancelled,
    isCompleted,
    isEditingTitle,
    isFlatPositive,
    isFollowupEvent,
    isLoanInstallment,
    isLockedPositive,
    isObligationEvent,
    isOutflowReference,
    isRecurring,
    isRegisterEvent,
    isTodoEvent,
    isVirtual,
    isVirtualWithdrawal,
    obligationPerson,
    onNavigateToTimeline,
    openOutflowReferenceOrigin,
    originInfo,
    outflowReferenceInfo,
    setIsEditingTitle,
    setTempTitle,
    t,
    tempTitle,
    virtualWithdrawalDisplayTitle
  } = useEventCard();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
        width: '100%',
        marginBottom: '2px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        {/* Ícone de Único, Recorrente ou Poupança/Retirada */}
        <span
          title={isVirtualWithdrawal ? t('withdrawalModal.depositBadge') : (isRecurring ? t('recurrence.recurring') : t('recurrence.once'))}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isFlatPositive ? TimelineColor.WHITE : (isVirtualWithdrawal ? TimelineColor.INVESTMENT : 'var(--primary-light)'),
            opacity: isFlatPositive ? 1 : 0.85,
            flexShrink: 0
          }}
        >
          {isVirtualWithdrawal ? (
            <PiggyBank size={14} strokeWidth={2.2} />
          ) : outflowReferenceInfo ? (
            <outflowReferenceInfo.Icon size={14} strokeWidth={2.2} style={{ color: isFlatPositive ? TimelineColor.WHITE : outflowReferenceInfo.color }} />
          ) : isRecurring ? (
            <Repeat size={14} strokeWidth={2.2} />
          ) : isRegisterEvent ? (
            <BookOpen size={14} strokeWidth={2.2} />
          ) : isTodoEvent ? (
            <CheckSquare size={14} strokeWidth={2.2} />
          ) : isFollowupEvent ? (
            isAnchorCard ? (
              <Flag size={14} strokeWidth={2.2} style={{ color: TimelineColor.WHITE }} />
            ) : isCompleted ? (
              <CheckCircle2 size={14} strokeWidth={2.2} style={{ color: isFlatPositive ? TimelineColor.WHITE : TimelineColor.SUCCESS }} />
            ) : (
              <ListTree size={14} strokeWidth={2.2} style={{ color: TimelineColor.FOLLOWUP }} />
            )
          ) : isAmortization ? (
            <Zap size={14} strokeWidth={2.2} style={{ color: TimelineColor.WHITE }} />
          ) : (
            <Zap size={14} strokeWidth={2.2} />
          )}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
              {isVirtualWithdrawal && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '2px 7px',
                    borderRadius: '5px',
                    background: isFlatPositive ? `${TimelineColor.WHITE}38` : hexToRgba(TimelineColor.INCOME, 0.16),
                    color: isFlatPositive ? TimelineColor.WHITE : TimelineColor.INCOME,
                    border: isFlatPositive ? `1px solid ${TimelineColor.WHITE}59` : `1px solid ${hexToRgba(TimelineColor.INCOME, 0.38)}`
                  }}
                >
                  {t('withdrawalModal.depositBadge')}
                </span>
              )}

              {outflowReferenceInfo && (
                <button
                  type="button"
                  onClick={openOutflowReferenceOrigin}
                  title={t('outflowReference.goToOrigin', { origin: outflowReferenceInfo.originName })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '2px 7px',
                    borderRadius: '5px',
                    cursor: onNavigateToTimeline ? 'pointer' : 'default',
                    background: isFlatPositive ? 'var(--bg-glass)' : hexToRgba(outflowReferenceInfo.color, 0.14),
                    color: isFlatPositive ? TimelineColor.WHITE : outflowReferenceInfo.color,
                    border: isFlatPositive ? '1px solid var(--border-glass)' : `1px solid ${hexToRgba(outflowReferenceInfo.color, 0.38)}`
                  }}
                >
                  <span>{outflowReferenceInfo.label}</span>
                  <span style={{ opacity: 0.75, textTransform: 'none', fontWeight: '700' }}>· {outflowReferenceInfo.originName}</span>
                  <ArrowUpRight size={11} strokeWidth={2.5} />
                </button>
              )}

              {/* Título do evento limpo e editável ao clicar */}
              {isEditingTitle && !isLockedPositive && !isCancelled ? (
                <form
                  onSubmit={handleSaveTitle}
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: '120px', margin: 0, padding: 0 }}
                >
                  <input
                    type="text"
                    autoFocus
                    value={tempTitle}
                    onFocus={(e) => e.target.select()}
                    onBlur={handleSaveTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') handleCancelTitle(e);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="editable-title-input"
                    style={{
                      margin: 0,
                      padding: '2px 6px',
                      fontSize: '0.98rem',
                      fontWeight: '700',
                      color: isFlatPositive ? TimelineColor.WHITE : 'var(--text-main)',
                      background: isFlatPositive ? 'var(--bg-shade)' : 'var(--bg-glass-input)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '4px',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                  <button
                    type="submit"
                    title={t('common.save')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: isFlatPositive ? TimelineColor.WHITE : TimelineColor.SUCCESS }}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelTitle}
                    title={t('common.cancel')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: isFlatPositive ? TimelineColor.WHITE : 'var(--text-muted)' }}
                  >
                    <X size={14} />
                  </button>
                </form>
              ) : (
                <h3
                  onClick={() => {
                    if (isOutflowReference) {
                      openOutflowReferenceOrigin();
                      return;
                    }
                    if (isAmortized || isAnchorCard || isVirtual || isLockedPositive || isCancelled) return;
                    if (isLoanInstallment && originInfo && onNavigateToTimeline) {
                      onNavigateToTimeline(originInfo.id);
                    } else if (canEdit) {
                      setIsEditingTitle(true);
                    }
                  }}
                  title={
                    isLockedPositive
                      ? t('timeline.lockedPositiveNotice')
                      : isVirtualWithdrawal
                        ? virtualWithdrawalDisplayTitle
                        : outflowReferenceInfo
                          ? t('outflowReference.goToOrigin', { origin: outflowReferenceInfo.originName })
                          : isVirtual
                          ? undefined
                          : isAmortized
                            ? t('backend.event.amortizedTooltip')
                            : isLoanInstallment
                              ? t('backend.event.loanInstallmentTooltip', { label: originInfo ? originInfo.label : t('loans.loan') })
                              : isRecurring
                                ? t('backend.event.editNameRecurring')
                                : t('backend.event.editName')
                  }
                  style={{
                    margin: 0,
                    fontSize: '0.98rem',
                    fontWeight: '700',
                    color: isFlatPositive ? TimelineColor.WHITE : ((isAmortized || isCancelled) ? 'var(--text-dim)' : 'var(--text-main)'),
                    textDecoration: (isAmortized || isCancelled) ? 'line-through' : 'none',
                    cursor: isOutflowReference ? 'pointer' : ((isAmortized || isAnchorCard || isVirtual || isLockedPositive || isCancelled) ? 'default' : 'pointer')
                  }}
                >
                  {isVirtualWithdrawal
                    ? virtualWithdrawalDisplayTitle
                    : (event.title || '').replace(/^Retirada:\s*/i, '').replace(/^Withdrawal:\s*/i, '').replace(/\s*\([\d.,\s€]+?\)\s*$/i, '')
                  }
                </h3>
              )}

              {/* Copy event id (same as the timeboard / timeline headers) */}
              {!isEditingTitle && !isVirtual && event.id && (
                <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                  <CopyIdButton id={event.id} />
                </span>
              )}

              {/* Badge de Categoria logo após o botão de copiar */}
              <EventCategoryBadge onPositiveCard={isFlatPositive} />

              {/* Labels / Tags next to Title */}
              <div className="tag-list" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                {/* Custom Labels / Etiquetas */}
                {event.labels && event.labels.map((lbl, i) => (
                  <span
                    key={i}
                    className={isFlatPositive ? '' : 'event-tag'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.70rem',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      background: isFlatPositive ? `${TimelineColor.WHITE}33` : undefined,
                      color: isFlatPositive ? TimelineColor.WHITE : undefined,
                      border: isFlatPositive ? `1px solid ${TimelineColor.WHITE}59` : undefined
                    }}
                  >
                    <Tag size={10} style={{ color: isFlatPositive ? TimelineColor.WHITE : undefined }} /> {lbl}
                  </span>
                ))}

                {/* Amortized badge */}
                {isAmortized && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: `${TimelineColor.EMERALD}24`,
                        color: TimelineColor.EMERALD,
                        border: `1px solid ${TimelineColor.EMERALD}59`,
                        padding: '2px 7px',
                        borderRadius: '5px',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <CheckCircle2 size={11} /> Abatida (Total Pago: 0,00 €)
                    </span>
                    {abatedBreakdown && abatedBreakdown.origInterest > 0 && (
                      <span
                        style={{
                          background: `${TimelineColor.PRIMARY}1f`,
                          color: 'var(--primary-light)',
                          border: `1px solid ${TimelineColor.PRIMARY}4c`,
                          padding: '2px 7px',
                          borderRadius: '5px',
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Sparkles size={11} /> Poupança: +{formatCurrency(abatedBreakdown.origInterest)} em juros
                      </span>
                    )}
                  </div>
                )}

                {event.author && (
                  <span className="event-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.70rem', padding: '2px 7px' }}>
                    <User size={10} /> {event.author}
                  </span>
                )}
              </div>
            </div>

            {/* Informações da Obrigação à direita */}
            {isObligationEvent && (() => {
                const personDisplayName = obligationPerson?.name || obligationPerson?.personName || event.obligationPersonName || event.obligation_person_name || '';
                const personIdCode = obligationPerson?.obligatorIdentification || obligationPerson?.obligator_identification || obligationPerson?.taxId || obligationPerson?.tax_id || event.obligatorIdentification || event.obligator_identification || event.obligationIdentifier || event.obligation_identifier || '';
                const personType = obligationPerson?.type || PersonType.PERSON;

                return (
                  <div
                    style={{
                      marginLeft: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      gap: '2px',
                      flexShrink: 0,
                      textAlign: 'right'
                    }}
                  title={
                    personDisplayName
                      ? `Obrigação: ${personIdCode ? `${personIdCode} - ` : ''}${personDisplayName} (${personType === PersonType.ORGANIZATION
                        ? (t('timeboardSettings.entities.types.organization') || 'Empresa')
                        : personType === PersonType.MEMBER
                          ? (t('timeboardSettings.entities.types.member') || 'Membro')
                          : (t('timeboardSettings.entities.types.person') || 'Pessoa')
                      })`
                      : (t('modal.obligation') || 'Obrigação')
                  }
                >
                  {/* Linha de cima: Person Name - bold */}
                  {personDisplayName ? (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.84rem',
                        fontWeight: '700',
                        color: isFlatPositive ? TimelineColor.WHITE : 'var(--text-main)',
                        lineHeight: 1.2
                      }}
                    >
                      {personType === PersonType.ORGANIZATION ? (
                        <Building2 size={13} style={{ color: cardTheme.color || TimelineColor.AMBER, flexShrink: 0 }} />
                      ) : personType === PersonType.MEMBER ? (
                        <UserCheck size={13} style={{ color: cardTheme.color || TimelineColor.AMBER, flexShrink: 0 }} />
                      ) : (
                        <User size={13} style={{ color: cardTheme.color || TimelineColor.AMBER, flexShrink: 0 }} />
                      )}
                      <span>{personDisplayName}</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        color: cardTheme.color || TimelineColor.AMBER,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        lineHeight: 1.2
                      }}
                    >
                      <FileCheck2 size={12} style={{ color: cardTheme.color || TimelineColor.AMBER, flexShrink: 0 }} />
                      <span>{t('modal.obligation') || 'Obrigação'}</span>
                    </div>
                  )}

                  {/* Linha de baixo: Obligation ID - sem negrito */}
                  {personIdCode && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.74rem',
                        fontWeight: '400',
                        color: isFlatPositive ? `${TimelineColor.WHITE}b2` : 'var(--text-muted)',
                        lineHeight: 1.2
                      }}
                    >
                      <FileCheck2 size={11} style={{ opacity: 0.7, flexShrink: 0 }} />
                      <span>{personIdCode}</span>
                    </div>
                  )}
                </div>
              );
            })()}
        </div>
      </div>
    </div>
  );
}
