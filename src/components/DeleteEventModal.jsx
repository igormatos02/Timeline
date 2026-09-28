import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, X, Calendar, Repeat, AlertTriangle, Lock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '../utils/formatCurrency';
import { EventRecurrence, EventType, EventDeletionMode, TimelineColor, normalizeRecurrence } from '../enums/index.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { usePermissions } from '../context/PermissionsContext.jsx';
import { isLockedMovement } from '../../shared/finance/corrections.js';

// Categories of one-time movements that were stored with a recurring flag in older data
const ONE_TIME_LEGACY_CATEGORIES = ['saida_esporadica', 'entrada_esporadica', 'amortizacao'];

const seriesKeyOf = (ev) => String(ev?.eventId || ev?.seriesId || String(ev?.id || '').split('_')[0] || '');

/**
 * Deletes an event, or part of a recurring series:
 * - only this occurrence, this month onwards, or the whole series;
 * - effective movements are only deleted by admins (the options are disabled for the other roles, with the
 *   reason), and the admin is warned of how many effective movements will be removed (recorded in the audit log).
 */
export default function DeleteEventModal({
  isOpen,
  onClose,
  event,
  events = [],
  onConfirmDelete
}) {
  const { t, dateLocale } = useTranslation();
  const { canOverride } = usePermissions();

  const isIncome = event?.eventType === EventType.INCOME;
  const isExpense = event?.eventType === EventType.EXPENSE;
  const isInvestment = event?.eventType === EventType.INVESTMENT;

  const normRec = event ? normalizeRecurrence(event) : null;
  const isRecurring = Boolean(event) &&
    (normRec === EventRecurrence.RECURRING || normRec === EventRecurrence.LIMITED || Boolean(event.seriesId)) &&
    normRec !== EventRecurrence.ONCE &&
    !ONE_TIME_LEGACY_CATEGORIES.includes(event.category) &&
    !event.isAmortization;

  // Effective movements touched by each option
  const { occurrenceLocked, fromHereLocked, seriesLocked } = useMemo(() => {
    if (!event) return { occurrenceLocked: [], fromHereLocked: [], seriesLocked: [] };
    const key = seriesKeyOf(event);
    const series = isRecurring
      ? (events || []).filter((ev) => ev && seriesKeyOf(ev) === key && isLockedMovement(ev))
      : [];
    const own = isLockedMovement(event) ? [event] : [];
    return {
      occurrenceLocked: own,
      fromHereLocked: series.filter((ev) => ev.date >= event.date),
      seriesLocked: series.length ? series : own
    };
  }, [event, events, isRecurring]);

  const lockedFor = (mode) => (
    mode === EventDeletionMode.ONLY_THIS ? occurrenceLocked
      : mode === EventDeletionMode.FROM_NOW_ON ? fromHereLocked
        : seriesLocked
  );
  const isModeAllowed = (mode) => canOverride || lockedFor(mode).length === 0;

  const [deletionMode, setDeletionMode] = useState(EventDeletionMode.ONLY_THIS);

  useEffect(() => {
    if (!isOpen) return;
    // Safest allowed option first
    const order = isRecurring
      ? [EventDeletionMode.ONLY_THIS, EventDeletionMode.FROM_NOW_ON, EventDeletionMode.EVERYTHING]
      : [EventDeletionMode.EVERYTHING];
    setDeletionMode(order.find((mode) => canOverride || lockedFor(mode).length === 0) || order[0]);
    // lockedFor only depends on the memoized lists above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, event, isRecurring, canOverride, occurrenceLocked, fromHereLocked, seriesLocked]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const formattedDate = event.date ? format(parseISO(event.date), 'PPP', { locale: dateLocale }) : '';
  const selectedLocked = lockedFor(deletionMode);
  const selectedAllowed = isModeAllowed(deletionMode);
  const lockedTotal = selectedLocked.reduce((sum, ev) => sum + Math.abs(Number(ev.amount || 0)), 0);

  const handleDelete = () => {
    if (!selectedAllowed) return;
    if (onConfirmDelete) {
      onConfirmDelete(event.id, deletionMode, { event, deletionMode });
    }
    onClose();
  };

  const scopeOption = (mode, titleKey, descKey) => {
    const allowed = isModeAllowed(mode);
    const isSelected = deletionMode === mode;
    const locked = lockedFor(mode);
    return (
      <div
        key={mode}
        onClick={() => allowed && setDeletionMode(mode)}
        title={allowed ? undefined : t('deleteEventModal.lockedOption', { count: locked.length })}
        style={{
          background: isSelected ? `${TimelineColor.EXPENSE}1f` : 'var(--bg-app)',
          border: isSelected ? `2px solid ${TimelineColor.EXPENSE}` : '1px solid var(--border-glass)',
          borderRadius: '10px',
          padding: '10px 14px',
          cursor: allowed ? 'pointer' : 'not-allowed',
          opacity: allowed ? 1 : 0.55,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'all 0.15s ease'
        }}
      >
        <input
          type="radio"
          name="deletionMode"
          checked={isSelected}
          disabled={!allowed}
          onChange={() => allowed && setDeletionMode(mode)}
          style={{ accentColor: TimelineColor.EXPENSE, cursor: allowed ? 'pointer' : 'not-allowed' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.84rem', fontWeight: '700', color: isSelected ? TimelineColor.EXPENSE : 'var(--text-main)' }}>
            {t(titleKey)}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t(descKey)}</span>
          {!allowed && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: '700', color: TimelineColor.WARNING }}>
              <Lock size={11} /> {t('deleteEventModal.lockedOption', { count: locked.length })}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '500px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: `${TimelineColor.EXPENSE}26`,
                border: `1px solid ${TimelineColor.EXPENSE}4d`,
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

          <button type="button" className="modal-close-btn" onClick={onClose} aria-label={t('common.close')}>
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
                  background: 'var(--primary-glow)',
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

        {/* Scope of the deletion */}
        {isRecurring ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {scopeOption(EventDeletionMode.ONLY_THIS, 'deleteEventModal.onlyThisTitle', 'deleteEventModal.onlyThisDesc')}
            {scopeOption(EventDeletionMode.FROM_NOW_ON, 'deleteEventModal.fromNowOnTitle', 'deleteEventModal.fromNowOnDesc')}
            {scopeOption(EventDeletionMode.EVERYTHING, 'deleteEventModal.everythingTitle', 'deleteEventModal.everythingDesc')}
          </div>
        ) : (
          <p style={{ margin: '0 0 14px 0', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
            {t('deleteEventModal.confirmSingle')}
          </p>
        )}

        {/* Admins deleting effective movements: what disappears, and that it is recorded */}
        {canOverride && selectedLocked.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              padding: '10px 12px',
              marginBottom: '16px',
              borderRadius: '10px',
              background: `${TimelineColor.WARNING}1f`,
              border: `1px solid ${TimelineColor.WARNING}59`,
              fontSize: '0.8rem',
              color: 'var(--text-main)'
            }}
          >
            <AlertTriangle size={16} style={{ color: TimelineColor.WARNING, flexShrink: 0, marginTop: '1px' }} />
            <span>{t('deleteEventModal.effectiveWarning', { count: selectedLocked.length, amount: formatCurrency(lockedTotal) })}</span>
          </div>
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
            disabled={!selectedAllowed}
            style={{
              background: TimelineColor.EXPENSE,
              color: TimelineColor.WHITE,
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 18px',
              fontSize: '0.86rem',
              fontWeight: '700',
              cursor: selectedAllowed ? 'pointer' : 'not-allowed',
              opacity: selectedAllowed ? 1 : 0.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: `0 4px 14px ${TimelineColor.EXPENSE}59`,
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
