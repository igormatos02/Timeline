import React, { useState, useEffect } from 'react';
import { Trash2, X, Calendar, Repeat } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '../utils/formatCurrency';
import { EventRecurrence, EventType, EventDeletionMode, TimelineColor, normalizeRecurrence } from '../enums/index.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function DeleteEventModal({
  isOpen,
  onClose,
  event,
  onConfirmDelete
}) {
  const { t } = useTranslation();

  const isIncome = event?.eventType === EventType.INCOME;
  const isExpense = event?.eventType === EventType.EXPENSE;
  const isInvestment = event?.eventType === EventType.INVESTMENT;
  const isFinancial = isIncome || isExpense || isInvestment;

  const normRec = event ? normalizeRecurrence(event) : null;
  const isRecurring =
    event &&
    (normRec === EventRecurrence.RECURRING || normRec === EventRecurrence.LIMITED || Boolean(event.seriesId)) &&
    normRec !== EventRecurrence.ONCE &&
    event.category !== 'saida_esporadica' &&
    event.category !== 'entrada_esporadica' &&
    event.category !== 'amortizacao' &&
    !event.isAmortization;

  const showScopeOptions = isFinancial || isRecurring;

  const currentMonth = format(new Date(), 'yyyy-MM');
  const eventMonth = event?.date ? event.date.substring(0, 7) : '';
  const isFutureMonth = Boolean(eventMonth && eventMonth > currentMonth);

  const [deletionMode, setDeletionMode] = useState(EventDeletionMode.EVERYTHING);

  useEffect(() => {
    if (isOpen) {
      if (isFutureMonth && showScopeOptions) {
        setDeletionMode(EventDeletionMode.FROM_NOW_ON);
      } else {
        setDeletionMode(EventDeletionMode.EVERYTHING);
      }
    }
  }, [isOpen, event, isFutureMonth, showScopeOptions]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const formattedDate = event.date
    ? format(parseISO(event.date), "d 'de' MMMM 'de' yyyy", { locale: pt })
    : '';

  const handleDelete = () => {
    if (onConfirmDelete) {
      onConfirmDelete(event.id, deletionMode, { event, deletionMode });
    }
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-card"
        style={{ maxWidth: '500px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: TimelineColor.EXPENSE
              }}
            >
              <Trash2 size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                {t('deleteEventModal.title')}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                {t('deleteEventModal.subtitle')}
              </p>
            </div>
          </div>

          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Item Summary Card */}
        <div
          style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <span style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-main)', flex: 1 }}>
              {(event.title || '').replace(/\s*\([\d.,\s€]+?\)\s*$/i, '')}
            </span>
            {event.amount !== undefined && (
              <span
                style={{
                  fontSize: '0.96rem',
                  fontWeight: '800',
                  color: isIncome ? TimelineColor.INCOME : isExpense ? TimelineColor.EXPENSE : isInvestment ? 'var(--primary-light)' : 'var(--text-main)'
                }}
              >
                {isIncome ? '+' : isExpense ? '-' : ''}{formatCurrency(event.amount)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            {formattedDate && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} style={{ color: 'var(--primary-light)' }} />
                {formattedDate}
              </span>
            )}
            {isRecurring && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--primary-light)',
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: '700'
                }}
              >
                <Repeat size={11} /> {t('deleteEventModal.recurringBadge')}
              </span>
            )}
          </div>
        </div>

        {/* Scope Selector Options with EventDeletionMode */}
        {showScopeOptions ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
            {/* Opção 1: Deste mês em diante (EventDeletionMode.FROM_NOW_ON) - Apenas se superior ao mês corrente */}
            {isFutureMonth && (
              <div
                onClick={() => setDeletionMode(EventDeletionMode.FROM_NOW_ON)}
                style={{
                  background: deletionMode === EventDeletionMode.FROM_NOW_ON ? 'rgba(244, 63, 94, 0.12)' : 'var(--bg-app)',
                  border: deletionMode === EventDeletionMode.FROM_NOW_ON ? `2px solid ${TimelineColor.EXPENSE}` : '1px solid var(--border-glass)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="radio"
                  name="deletionMode"
                  checked={deletionMode === EventDeletionMode.FROM_NOW_ON}
                  onChange={() => setDeletionMode(EventDeletionMode.FROM_NOW_ON)}
                  style={{ accentColor: TimelineColor.EXPENSE, cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: '700', color: deletionMode === EventDeletionMode.FROM_NOW_ON ? TimelineColor.EXPENSE : 'var(--text-main)' }}>
                    {t('deleteEventModal.fromNowOnTitle')}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {t('deleteEventModal.fromNowOnDesc')}
                  </span>
                </div>
              </div>
            )}

            {/* Opção 2: Apagar toda a série (EventDeletionMode.EVERYTHING) */}
            <div
              onClick={() => setDeletionMode(EventDeletionMode.EVERYTHING)}
              style={{
                background: deletionMode === EventDeletionMode.EVERYTHING ? 'rgba(220, 38, 38, 0.16)' : 'var(--bg-app)',
                border: deletionMode === EventDeletionMode.EVERYTHING ? `2px solid ${TimelineColor.EXPENSE}` : '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.15s ease'
              }}
            >
              <input
                type="radio"
                name="deletionMode"
                checked={deletionMode === EventDeletionMode.EVERYTHING}
                onChange={() => setDeletionMode(EventDeletionMode.EVERYTHING)}
                style={{ accentColor: TimelineColor.EXPENSE, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: '800', color: deletionMode === EventDeletionMode.EVERYTHING ? TimelineColor.EXPENSE : 'var(--text-main)' }}>
                  {t('deleteEventModal.everythingTitle')}
                </span>
                <span style={{ fontSize: '0.72rem', color: TimelineColor.EXPENSE }}>
                  {t('deleteEventModal.everythingDesc')}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
            {t('deleteEventModal.confirmSingle')}
          </p>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '8px 16px', fontSize: '0.86rem' }}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              background: TimelineColor.EXPENSE,
              color: TimelineColor.WHITE,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 'var(--radius-sm, 8px)',
              padding: '8px 18px',
              fontSize: '0.86rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(244, 63, 94, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <Trash2 size={15} />
            <span>{t('common.delete')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
