import React, { useState, useMemo, useEffect } from 'react';
import { ArrowDownRight, Check, PiggyBank, FileText } from 'lucide-react';
import { format, parseISO, getDaysInMonth } from 'date-fns';
import ModalShell from './ui/ModalShell.jsx';
import EuroInput from './ui/EuroInput.jsx';
import DayPickerPopover from './ui/DayPickerPopover.jsx';
import {
  EventType,
  EventStatus,
  EventRecurrence,
  EventPeriodicity,
  InvestmentEventCategory,
  TimelineColor,
  isCancelledStatus,
  isPositiveStatus
} from '../enums/index.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { formatCurrency } from '../utils/formatCurrency.js';
import { generateUUID } from '../utils/uuid.js';

export function calculatePocketAvailableBalance(pocket, events = [], upToDate = null, excludeEventId = null) {
  if (!pocket) return 0;
  const pInitial = Number(pocket.initial_value ?? pocket.initialValue ?? 0);
  let contributed = 0;

  (events || []).forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
    if (excludeEventId && (ev.id === excludeEventId || ev.eventId === excludeEventId)) return;

    if (ev.pocketId === pocket.id || ev.pocket_id === pocket.id) {
      if (!upToDate || ev.date <= upToDate) {
        const isWithdrawal = Boolean(
          ev.isWithdrawal ||
          ev.eventType === EventType.WITHDRAWAL ||
          ev.eventType === EventType.EXPENSE ||
          ev.isExpense ||
          Number(ev.amount || 0) < 0
        );
        const multiplier = isWithdrawal ? -1 : 1;
        const amt = Math.abs(Number(ev.amount || 0));

        const isRealized = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
        const isExternal = Boolean(ev.isExternal || ev.is_external);
        if (isRealized || isExternal) {
          contributed += multiplier * amt;
        }
      }
    }
  });

  return Math.max(0, pInitial + contributed);
}

export default function WithdrawalModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  defaultDate = null,
  defaultPocketId = null,
  pockets = [],
  timeline = null,
  events = []
}) {
  const { t, dateLocale } = useTranslation();

  const isEditing = Boolean(initialData && initialData.id);

  // Locked target pocket based on where the button was clicked
  const targetPocketId = useMemo(() => {
    if (initialData?.pocketId || initialData?.pocket_id) {
      return initialData.pocketId || initialData.pocket_id;
    }
    if (defaultPocketId) return defaultPocketId;
    return pockets.length > 0 ? pockets[0].id : '';
  }, [initialData, defaultPocketId, pockets]);

  const selectedPocket = useMemo(() => {
    return pockets.find((p) => p.id === targetPocketId) || pockets[0] || null;
  }, [pockets, targetPocketId]);

  // Locked base month and year from the trigger context
  const baseDateStr = useMemo(() => {
    return initialData?.date || defaultDate || format(new Date(), 'yyyy-MM-dd');
  }, [initialData?.date, defaultDate]);

  const baseMonthKey = useMemo(() => {
    return baseDateStr.substring(0, 7);
  }, [baseDateStr]);

  const initialDay = useMemo(() => {
    try {
      const parsed = parseISO(baseDateStr);
      return Number(format(parsed, 'd'));
    } catch {
      return 1;
    }
  }, [baseDateStr]);

  const [title, setTitle] = useState(
    initialData?.title || initialData?.name || ''
  );
  const [amount, setAmount] = useState(
    initialData?.amount ? Math.abs(Number(initialData.amount)).toString() : ''
  );
  const [dayOfMonth, setDayOfMonth] = useState(initialDay);
  const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || initialData?.name || '');
      setAmount(initialData?.amount ? Math.abs(Number(initialData.amount)).toString() : '');
      setDayOfMonth(initialDay);
      setIsDayPickerOpen(false);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, initialData, initialDay]);

  const maxAvailable = useMemo(() => {
    if (!selectedPocket) return 0;
    return calculatePocketAvailableBalance(
      selectedPocket,
      events,
      null,
      initialData?.id || null
    );
  }, [selectedPocket, events, initialData?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t('validation.titleRequired'));
      return;
    }

    if (!selectedPocket) {
      setError(t('withdrawalModal.noBalanceError'));
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || Number.isNaN(numAmount) || numAmount <= 0) {
      setError(t('validation.amountRequired'));
      return;
    }

    if (numAmount > maxAvailable + 0.001) {
      setError(t('withdrawalModal.amountExceedsError', { max: formatCurrency(maxAvailable) }));
      return;
    }

    const maxDays = getDaysInMonth(parseISO(`${baseMonthKey}-01`));
    const safeDay = Math.min(maxDays, Math.max(1, Number(dayOfMonth) || 1));
    const finalDateStr = `${baseMonthKey}-${String(safeDay).padStart(2, '0')}`;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isCompleted = finalDateStr <= todayStr;

    const payload = {
      ...(initialData || {}),
      id: initialData?.id || generateUUID(),
      title: trimmedTitle,
      name: trimmedTitle,
      amount: -Math.abs(numAmount),
      date: finalDateStr,
      dayOfMonth: safeDay,
      pocketId: selectedPocket.id,
      pocket_id: selectedPocket.id,
      pocketName: selectedPocket.name,
      category: InvestmentEventCategory.OTHER,
      eventType: EventType.WITHDRAWAL,
      recurrence: EventRecurrence.ONCE,
      periodicity: EventPeriodicity.NONE,
      isWithdrawal: true,
      isInvestment: true,
      isRecurring: false,
      status: isCompleted ? EventStatus.WITHDRAWN : EventStatus.PLANNED,
      isCompleted,
      timelineId: timeline?.id || initialData?.timelineId || null
    };

    try {
      setLoading(true);
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err?.message || t('toast.eventSaveError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      accent={TimelineColor.DANGER}
      icon={ArrowDownRight}
      title={isEditing ? t('withdrawalModal.editTitle') : t('withdrawalModal.title')}
      subtitle={selectedPocket?.name || timeline?.name || t('withdrawalModal.subtitle')}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={loading}
          >
            {t('buttons.cancel')}
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            style={{
              background: TimelineColor.DANGER,
              borderColor: TimelineColor.DANGER,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            disabled={loading || maxAvailable <= 0}
          >
            {isEditing ? <Check size={14} /> : <ArrowDownRight size={14} />}
            <span>{isEditing ? t('withdrawalModal.saveButton') : t('withdrawalModal.confirmButton')}</span>
          </button>
        </>
      }
    >
      {error && (
        <div
          style={{
            padding: '10px 14px',
            marginBottom: '16px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: TimelineColor.DANGER,
            fontSize: '0.8rem',
            fontWeight: '600'
          }}
        >
          {error}
        </div>
      )}

      {/* Indicador Fixo do Cofrinho de Origem */}
      {selectedPocket && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 12px',
            borderRadius: '8px',
            background: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            marginBottom: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PiggyBank size={15} style={{ color: TimelineColor.INVESTMENT }} />
            <span style={{ fontSize: '0.86rem', fontWeight: '700', color: 'var(--text-main)' }}>
              {selectedPocket.name}
            </span>
          </div>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: '700',
              color: TimelineColor.INVESTMENT,
              background: 'rgba(139, 92, 246, 0.15)',
              padding: '2px 8px',
              borderRadius: '6px'
            }}
          >
            {formatCurrency(maxAvailable)}
          </span>
        </div>
      )}

      {/* 1. Primeiro Campo: Descrição / Título da Retirada */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
          <FileText size={13} style={{ color: 'var(--text-muted)' }} />
          <label
            style={{
              fontSize: '0.78rem',
              fontWeight: '700',
              color: 'var(--text-main)'
            }}
          >
            {t('withdrawalModal.titleLabel')}
          </label>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('withdrawalModal.titlePlaceholder')}
          className="form-input"
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            color: 'var(--text-main)',
            boxSizing: 'border-box'
          }}
          autoFocus
          required
        />
      </div>

      {/* 2. Segundo Campo: Valor do Resgate (Amount) com limite máximo */}
      <div style={{ marginBottom: '14px' }}>
        <EuroInput
          label={t('withdrawalModal.amountLabel')}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          accent={TimelineColor.DANGER}
          placeholder="0.00"
          min="0.01"
          step="0.01"
          marginBottom="4px"
          labelExtra={
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: '700',
                color: maxAvailable > 0 ? TimelineColor.DANGER : 'var(--text-dim)'
              }}
            >
              {t('withdrawalModal.maxAvailable', { amount: formatCurrency(maxAvailable) })}
            </span>
          }
        />
        {maxAvailable <= 0 && (
          <p style={{ margin: '4px 0 0 0', fontSize: '0.72rem', color: TimelineColor.DANGER, fontWeight: '600' }}>
            {t('withdrawalModal.noBalanceError')}
          </p>
        )}
      </div>

      {/* 3. Terceiro Campo: Seleção do Dia de Vencimento (DayPickerPopover) */}
      <DayPickerPopover
        value={dayOfMonth}
        onChange={(d) => setDayOfMonth(d)}
        accent={TimelineColor.DANGER}
        dateLocale={dateLocale}
        baseDate={`${baseMonthKey}-01`}
        label={t('withdrawalModal.dayLabel')}
        isOpen={isDayPickerOpen}
        onToggle={() => setIsDayPickerOpen(!isDayPickerOpen)}
      />
    </ModalShell>
  );
}
