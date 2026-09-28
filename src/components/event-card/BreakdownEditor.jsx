import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { TimelineColor } from '../../enums/index.js';
import { Check, Layers, Plus, Trash2, X } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function BreakdownEditor() {
  const {
    canEditAmount,
    draftSubparts,
    editingSubpartIdx,
    event,
    handleCancelDesmembramento,
    handleDraftAddSubpart,
    handleDraftDeleteSubpart,
    handleDraftUpdateAmount,
    handleDraftUpdateName,
    handleSaveDesmembramento,
    hasBreakdown,
    isRecurring,
    newSubpartAmount,
    newSubpartName,
    onUpdateEventDirect,
    propagateSubsequent,
    setEditingSubpartIdx,
    setIsDesmembramentoExpanded,
    setNewSubpartAmount,
    setNewSubpartName,
    setPropagateSubsequent
  } = useEventCard();

  const pendingAmount = Number(newSubpartAmount) || 0;
  const totalCalculated = draftSubparts.reduce((acc, it) => acc + (Number(it.amount) || 0), 0) + (newSubpartName.trim() ? pendingAmount : 0);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        marginTop: '8px',
        padding: '14px',
        background: `${TimelineColor.WHITE}08`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--primary-light)' }}>
          <Layers size={15} style={{ color: 'var(--primary-light)' }} />
          <span>Desmembramento do Valor ({draftSubparts.length} subpartes)</span>
        </div>
        <button
          type="button"
          onClick={handleCancelDesmembramento}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            fontSize: '0.74rem',
            padding: '2px 6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }}
          title="Cancelar alterações"
        >
          <X size={13} />
          <span>Cancelar</span>
        </button>
      </div>

      {/* Total Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: `${TimelineColor.PRIMARY}14`,
          border: `1px solid ${TimelineColor.PRIMARY}40`,
          borderRadius: '8px'
        }}
      >
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
            Total Acumulado das Subpartes
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            A soma das subpartes definirá a totalidade desta entrada ao salvar
          </div>
        </div>
        <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary-light)' }}>
          {formatCurrency(totalCalculated)}
        </span>
      </div>

      {/* List of draft subparts */}
      {draftSubparts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {draftSubparts.map((item, idx) => (
            <div
              key={item.id || idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '4px 0px',
                background: 'transparent',
                borderBottom: `3px solid ${TimelineColor.PRIMARY_LIGHT}a6`,
                width: '100%'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
                <input
                  type="text"
                  disabled={!canEditAmount}
                  value={item.name}
                  onFocus={(e) => {
                    e.target.select();
                    setEditingSubpartIdx(idx);
                  }}
                  onBlur={() => setEditingSubpartIdx(null)}
                  onChange={(e) => handleDraftUpdateName(idx, e.target.value)}
                  placeholder="Nome da subparte..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    padding: '2px 0',
                    color: 'var(--text-main)',
                    fontSize: '0.86rem',
                    fontWeight: '700'
                  }}
                />
                {canEditAmount && editingSubpartIdx === idx && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setEditingSubpartIdx(null)}
                    style={{
                      background: TimelineColor.EMERALD,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '2px 5px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                    title="Confirmar nome da subparte"
                  >
                    <Check size={11} strokeWidth={3} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  disabled={!canEditAmount}
                  className="inline-amount-input"
                  value={item.amount !== undefined ? item.amount : ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleDraftUpdateAmount(idx, e.target.value)}
                  style={{
                    width: '75px',
                    fontSize: '0.86rem',
                    textAlign: 'right',
                    fontWeight: '700',
                    padding: '2px 0'
                  }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-dim)' }}>€</span>
                {canEditAmount && (
                  <button
                    type="button"
                    onClick={(e) => handleDraftDeleteSubpart(idx, e)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                    title="Eliminar esta subparte"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Subpart Form */}
      {canEditAmount && (
        <form
          onSubmit={handleDraftAddSubpart}
          style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '6px', marginTop: '6px' }}
        >
          <input
            type="text"
            placeholder="Nome da subparte (ex: Restaurante)"
            value={newSubpartName}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setNewSubpartName(e.target.value)}
            style={{
              background: 'var(--bg-shade)',
              border: '1px solid var(--border-glass)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '0.78rem',
              color: 'var(--text-main)',
              outline: 'none'
            }}
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Valor (€)"
            value={newSubpartAmount}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setNewSubpartAmount(e.target.value)}
            style={{
              background: 'var(--bg-shade)',
              border: '1px solid var(--border-glass)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '0.78rem',
              color: 'var(--text-main)',
              outline: 'none',
              fontWeight: '700'
            }}
          />
          <button
            type="submit"
            disabled={!newSubpartName.trim()}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '4px 12px',
              fontSize: '0.74rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Adicionar mais uma subparte à lista"
          >
            <Plus size={13} />
            <span>Adicionar</span>
          </button>
        </form>
      )}

      {/* Footer Actions: Switch Subsequentes, Salvar e Cancelar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--border-glass)' }}>
        {isRecurring ? (
          <label
            title="Ativar para aplicar este desmembramento a todos os meses subsequentes ao salvar"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.72rem',
              fontWeight: '600',
              color: propagateSubsequent ? 'var(--primary-light)' : 'var(--text-dim)',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <input
              type="checkbox"
              checked={propagateSubsequent}
              onChange={(e) => setPropagateSubsequent(e.target.checked)}
            />
            <span>Mudar subsequentes</span>
          </label>
        ) : <div />}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {canEditAmount && (draftSubparts.length > 0 || hasBreakdown) && (
            <button
              type="button"
              onClick={() => {
                if (onUpdateEventDirect) {
                  onUpdateEventDirect({
                    ...event,
                    breakdownItems: undefined,
                    propagateForward: isRecurring ? propagateSubsequent : false
                  });
                }
                setIsDesmembramentoExpanded(false);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: TimelineColor.DANGER,
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: '600',
                textDecoration: 'underline',
                marginRight: '6px'
              }}
            >
              Voltar a Valor Único
            </button>
          )}
          <button
            type="button"
            onClick={handleCancelDesmembramento}
            className="btn btn-secondary btn-sm"
            style={{
              fontSize: '0.74rem',
              padding: '5px 12px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <X size={13} />
            <span>Cancelar</span>
          </button>
          <button
            type="button"
            onClick={handleSaveDesmembramento}
            className="btn btn-primary btn-sm"
            style={{
              fontSize: '0.74rem',
              padding: '5px 14px',
              borderRadius: '6px',
              background: TimelineColor.EMERALD,
              color: TimelineColor.WHITE,
              border: 'none',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: `0 2px 10px ${TimelineColor.EMERALD}4c`
            }}
          >
            <Check size={14} strokeWidth={2.5} />
            <span>Salvar Desmembramento</span>
          </button>
        </div>
      </div>
    </div>
  );
      }
