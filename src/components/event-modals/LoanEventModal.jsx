import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { EventStatus, EventType, AmortizationStrategy, TimelineColor } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { useModalEscape } from '../../hooks/useModalEscape.js';
import ModalShell from '../ui/ModalShell.jsx';
import EuroInput from '../ui/EuroInput.jsx';
import ObligationSelector from '../ObligationSelector.jsx';

export default function LoanEventModal({
  isOpen, onClose, onSave, initialData, defaultDate, timeline, timeboardId
}) {
  const { t } = useTranslation();
  const [obligationError, setObligationError] = useState(false);
  const [formData, setFormData] = useState({
    title: t('amortizationModal.title'), date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
    amount: '', isAmortization: true, amortizationStrategy: AmortizationStrategy.TERM_REDUCTION,
    status: EventStatus.PENDING, notes: '', isObligation: false, obligationPersonId: ''
  });

  useModalEscape(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const targetDate = initialData?.date || defaultDate || today;
    const isFutureDate = Boolean(targetDate && targetDate > today);

    if (initialData) {
      const isPositive = initialData.status === EventStatus.PAID || initialData.status === EventStatus.AMORTIZED;
      const initialStatus = isFutureDate ? EventStatus.PENDING : (isPositive ? EventStatus.AMORTIZED : (initialData.status || EventStatus.PENDING));
      setFormData({
        title: initialData.title || t('amortizationModal.title'),
        date: targetDate,
        amount: initialData.amount !== undefined ? initialData.amount : '',
        isAmortization: Boolean(initialData.isAmortization ?? true),
        amortizationStrategy: initialData.amortizationStrategy || AmortizationStrategy.TERM_REDUCTION,
        status: initialStatus,
        notes: initialData.notes || '',
        isObligation: Boolean(initialData.isObligation || initialData.is_obligation),
        obligationPersonId: initialData.obligationPersonId || initialData.obligation_person_id || ''
      });
    } else {
      setFormData({
        title: t('amortizationModal.title'),
        date: targetDate,
        amount: '',
        isAmortization: true,
        amortizationStrategy: AmortizationStrategy.TERM_REDUCTION,
        status: EventStatus.PENDING,
        notes: '',
        isObligation: false,
        obligationPersonId: ''
      });
    }
  }, [initialData, defaultDate, isOpen, t]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(formData.amount) || 0;
    if (numAmount <= 0) return;
    if (formData.isObligation && !formData.obligationPersonId) {
      setObligationError(true); return;
    }
    setObligationError(false);
    const today = format(new Date(), 'yyyy-MM-dd');
    const isFutureDate = Boolean(formData.date && formData.date > today);
    const finalStatus = isFutureDate ? EventStatus.PENDING : (formData.status || EventStatus.AMORTIZED);

    onSave({
      ...(initialData || {}),
      title: formData.title.trim() || t('amortizationModal.title'),
      date: formData.date, amount: numAmount,
      isAmortization: formData.isAmortization,
      amortizationStrategy: formData.amortizationStrategy,
      status: finalStatus,
      isCompleted: !isFutureDate && (finalStatus === EventStatus.AMORTIZED || finalStatus === EventStatus.PAID),
      eventType: EventType.AMORTIZATION,
      category: 'amortizacao', timelineId: timeline?.id,
      timelineOriginId: timeline?.id, notes: formData.notes,
      isObligation: formData.isObligation,
      obligationPersonId: formData.isObligation ? formData.obligationPersonId : null
    });
    onClose();
  };

  const accent = TimelineColor.PRIMARY_LIGHT;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} onSubmit={handleSubmit} accent={accent}
      maxWidth="640px"
      icon={CreditCard} title={initialData ? t('amortizationModal.editTitle') : t('amortizationModal.title')}
      subtitle={timeline?.name || ''}
      footer={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '8px' }}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary btn-sm"
            style={{ background: TimelineColor.SUCCESS, borderColor: TimelineColor.SUCCESS, padding: '8px 20px', borderRadius: '8px', fontWeight: '800' }}>
            {initialData ? t('amortizationModal.saveChanges') : t('amortizationModal.confirmAmortization')}
          </button>
        </>
      }
    >
        <EuroInput label={t('amortizationModal.amountLabel')} value={formData.amount} accent={TimelineColor.SUCCESS}
          min="0.01" marginBottom="16px" fontSize="1.1rem"
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
            {t('amortizationModal.strategyLabel')}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { strategy: AmortizationStrategy.TERM_REDUCTION, label: t('amortizationModal.reduceTermTitle'), icon: Clock, color: TimelineColor.SUCCESS },
              { strategy: AmortizationStrategy.INSTALLMENT_REDUCTION, label: t('amortizationModal.reduceInstallmentTitle'), icon: TrendingDown, color: TimelineColor.PRIMARY_LIGHT }
            ].map(({ strategy, label, icon: SIcon, color }) => {
              const isSelected = formData.amortizationStrategy === strategy;
              return (
                <button key={strategy} type="button"
                  onClick={() => setFormData({ ...formData, amortizationStrategy: strategy })}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    padding: '10px', borderRadius: '8px',
                    border: isSelected ? `1px solid ${color}` : '1px solid var(--border-glass)',
                    background: isSelected ? 'var(--bg-card)' : 'var(--bg-app)',
                    color: isSelected ? color : 'var(--text-muted)',
                    fontSize: '0.76rem', fontWeight: isSelected ? '800' : '600', cursor: 'pointer'
                  }}>
                  <SIcon size={16} /><span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
            {t('common.date')} *
          </label>
          <input type="date" required value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="form-input"
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', boxSizing: 'border-box' }} />
        </div>

        <ObligationSelector
          isObligation={formData.isObligation}
          obligationPersonId={formData.obligationPersonId}
          onToggleObligation={(val) => {
            setFormData((prev) => ({ ...prev, isObligation: val, obligationPersonId: val ? prev.obligationPersonId : '' }));
            if (!val) setObligationError(false);
          }}
          onSelectPerson={(personId) => {
            setFormData((prev) => ({ ...prev, obligationPersonId: personId }));
            if (personId) setObligationError(false);
          }}
          timeboardId={timeboardId || timeline?.timeboardId || timeline?.timeboard_id}
          accentColor={accent}
          showError={obligationError}
        />
    </ModalShell>
  );
}

