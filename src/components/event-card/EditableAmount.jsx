import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { formatCurrency } from '../../utils/formatCurrency';
import { TimelineColor } from '../../enums/index.js';
import { Check, Layers, X } from 'lucide-react';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function EditableAmount({ prefix = '', defaultColor = 'var(--text-main)' }) {
  const {
    event,
    handleCancelAmount,
    handleCancelDesmembramento,
    handleSaveAmount,
    hasBreakdown,
    isCancelled,
    isDesmembramentoExpanded,
    isEditingAmount,
    isLockedPositive,
    isReadOnly,
    isRecurring,
    isVirtual,
    openDesmembramento,
    propagateSubsequent,
    setIsEditingAmount,
    setPropagateSubsequent,
    setTempAmount,
    t,
    tempAmount
  } = useEventCard();

  if (isVirtual) {
    return (
      <span
        style={{
          fontSize: '1.05rem',
          fontWeight: '800',
          color: defaultColor,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px'
        }}
      >
        {prefix}{formatCurrency(Math.abs(Number(event.amount || 0)))}
      </span>
    );
  }

  // Se o valor estiver desmembrado em subpartes, o total NÃO é alterado diretamente mas sim pelas subpartes
  if (hasBreakdown) {
    return (
      <span
        onClick={(e) => {
          if (isReadOnly || isLockedPositive || isCancelled) return;
          e.stopPropagation();
          if (isDesmembramentoExpanded) {
            handleCancelDesmembramento(e);
          } else {
            openDesmembramento(e);
          }
        }}
        title={
          (isLockedPositive || isCancelled)
            ? t('timeline.lockedPositiveNotice')
            : t('timeline.breakdownValueTooltip')
        }
        style={{
          fontSize: '1.05rem',
          fontWeight: '800',
          color: defaultColor,
          cursor: (isLockedPositive || isCancelled) ? 'default' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        {prefix}{formatCurrency(Math.abs(Number(event.amount || 0)))}
        <span
          onClick={(e) => {
            if (isReadOnly || isLockedPositive || isCancelled) return;
            e.stopPropagation();
            if (isDesmembramentoExpanded) {
              handleCancelDesmembramento(e);
            } else {
              openDesmembramento(e);
            }
          }}
          style={{
            fontSize: '0.72rem',
            fontWeight: '700',
            color: isDesmembramentoExpanded ? TimelineColor.WHITE : 'var(--primary-light)',
            background: isDesmembramentoExpanded ? 'var(--primary)' : `${TimelineColor.PRIMARY}24`,
            border: `1px solid ${TimelineColor.PRIMARY}66`,
            borderRadius: '9999px',
            padding: '2px 9px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: (isLockedPositive || isCancelled) ? 'default' : 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: isDesmembramentoExpanded ? `0 2px 8px ${TimelineColor.PRIMARY}59` : 'none'
          }}
          title={
            (isLockedPositive || isCancelled)
              ? t('timeline.lockedPositiveNotice')
              : isDesmembramentoExpanded
                ? t('timeline.breakdownCloseTooltip')
                : t('timeline.breakdownOpenTooltip')
          }
        >
          <Layers size={11} />
          <span>{t('timeline.subpartsCount', { count: event.breakdownItems.length })}</span>
          {!isLockedPositive && !isCancelled && (
            <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>{isDesmembramentoExpanded ? '▲' : '▼'}</span>
          )}
        </span>
      </span>
    );
  }

  if (isEditingAmount && !isLockedPositive && !isCancelled) {
    return (
      <form
        onSubmit={handleSaveAmount}
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: 0, padding: 0 }}
      >
        {prefix && (
          <span style={{ fontSize: '1.05rem', fontWeight: '800', color: defaultColor, marginRight: '-2px' }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          step="0.01"
          min="0"
          autoFocus
          className="inline-amount-input"
          value={tempAmount}
          onFocus={(e) => e.target.select()}
          onBlur={handleSaveAmount}
          onChange={(e) => setTempAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancelAmount(e);
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            color: defaultColor,
            borderColor: defaultColor !== 'var(--text-main)' ? defaultColor : `${TimelineColor.WHITE}59`
          }}
        />
        <button
          type="submit"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleSaveAmount}
          style={{
            background: TimelineColor.SUCCESS,
            color: TimelineColor.WHITE,
            border: 'none',
            borderRadius: '4px',
            padding: '4px 6px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center'
          }}
          title={isRecurring && propagateSubsequent ? "Guardar valor (propagando para os meses seguintes)" : "Guardar valor apenas neste mês"}
        >
          <Check size={13} strokeWidth={3} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleCancelAmount}
          style={{
            background: `${TimelineColor.WHITE}1a`,
            color: 'var(--text-dim)',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 6px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center'
          }}
          title="Cancelar"
        >
          <X size={13} strokeWidth={2.5} />
        </button>

        {/* Botão para Desmembrar valor em subpartes */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={openDesmembramento}
          title="Desmembrar valor em subpartes com nomes associados"
          style={{
            background: `${TimelineColor.PRIMARY}24`,
            color: 'var(--primary-light)',
            border: `1px solid ${TimelineColor.PRIMARY}4c`,
            borderRadius: '4px',
            padding: '3px 6px',
            cursor: 'pointer',
            fontSize: '0.7rem',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            marginLeft: '2px'
          }}
        >
          <Layers size={11} />
          <span>Desmembrar</span>
        </button>

        {/* Switch para Mudar os valores subsequentes (Default: true) */}
        {isRecurring && (
          <label
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
            title="Ativar para aplicar este novo valor a todos os meses subsequentes ou desativar para alterar apenas este mês"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.72rem',
              fontWeight: '600',
              color: propagateSubsequent ? 'var(--primary-light)' : 'var(--text-dim)',
              cursor: 'pointer',
              userSelect: 'none',
              background: propagateSubsequent ? `${TimelineColor.PRIMARY}24` : `${TimelineColor.WHITE}0d`,
              border: propagateSubsequent ? `1px solid ${TimelineColor.PRIMARY}59` : '1px solid var(--border-glass)',
              borderRadius: '9999px',
              padding: '2px 8px',
              marginLeft: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            <span
              style={{
                width: '20px',
                height: '11px',
                background: propagateSubsequent ? 'var(--primary)' : `${TimelineColor.SLATE_LIGHT}59`,
                borderRadius: '9999px',
                position: 'relative',
                display: 'inline-block',
                transition: 'background 0.15s ease'
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  background: '#fff',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: propagateSubsequent ? '11px' : '2px',
                  transition: 'left 0.15s ease'
                }}
              />
            </span>
            <input
              type="checkbox"
              checked={propagateSubsequent}
              onChange={(e) => {
                e.stopPropagation();
                setPropagateSubsequent(e.target.checked);
              }}
              style={{ display: 'none' }}
            />
            <span>Mudar subsequentes</span>
          </label>
        )}
      </form>
    );
  }

  return (
    <span
      onClick={(e) => {
        if (isReadOnly || isLockedPositive || isCancelled) return;
        e.stopPropagation();
        setPropagateSubsequent(true);
        setIsEditingAmount(true);
      }}
      title={
        isLockedPositive
          ? t('timeline.lockedPositiveNotice')
          : isRecurring
            ? t('timeline.clickToEditAmountPropagate')
            : t('timeline.clickToEditAmount')
      }
      style={{
        fontSize: '1.05rem',
        fontWeight: '800',
        color: defaultColor,
        cursor: (isLockedPositive || isCancelled) ? 'default' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        textDecoration: isCancelled ? 'line-through' : 'none',
        transition: 'opacity 0.15s ease'
      }}
    >
      {prefix}{formatCurrency(Math.abs(Number(event.amount || 0)))}
    </span>
  );
  }
