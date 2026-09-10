import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { EventStatus, EventType, AmortizationStrategy } from '../../enums/index.js';
import { useModalEscape } from '../../hooks/useModalEscape.js';
import ModalShell from '../ui/ModalShell.jsx';
import EuroInput from '../ui/EuroInput.jsx';
import ObligationSelector from '../ObligationSelector.jsx';

export default function LoanEventModal({
  isOpen, onClose, onSave, initialData, defaultDate, timeline, timeboardId
}) {
  const [obligationError, setObligationError] = useState(false);
  const [formData, setFormData] = useState({
    title: 'Amortização Extraordinária', date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
    amount: '', isAmortization: true, amortizationStrategy: AmortizationStrategy.TERM_REDUCTION,
    status: EventStatus.PAID, notes: '', isObligation: false, obligationPersonId: ''
  });

  useModalEscape(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    if (initialData) {
      setFormData({
        title: initialData.title || 'Amortização Extraordinária',
        date: initialData.date || defaultDate || today,
        amount: initialData.amount !== undefined ? initialData.amount : '',
        isAmortization: Boolean(initialData.isAmortization ?? true),
        amortizationStrategy: initialData.amortizationStrategy || AmortizationStrategy.TERM_REDUCTION,
        status: initialData.status || EventStatus.PAID, notes: initialData.notes || '',
        isObligation: Boolean(initialData.isObligation || initialData.is_obligation),
        obligationPersonId: initialData.obligationPersonId || initialData.obligation_person_id || ''
      });
    } else {
      setFormData({
        title: 'Amortização Extraordinária', date: defaultDate || today, amount: '',
        isAmortization: true, amortizationStrategy: AmortizationStrategy.TERM_REDUCTION,
        status: EventStatus.PAID, notes: '', isObligation: false, obligationPersonId: ''
      });
    }
  }, [initialData, defaultDate, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(formData.amount) || 0;
    if (numAmount <= 0) return;
    if (formData.isObligation && !formData.obligationPersonId) {
      setObligationError(true); return;
    }
    setObligationError(false);
    onSave({
      ...(initialData || {}),
      title: formData.title.trim() || 'Amortização de Empréstimo',
      date: formData.date, amount: numAmount,
      isAmortization: formData.isAmortization,
      amortizationStrategy: formData.amortizationStrategy,
      status: formData.status, eventType: EventType.AMORTIZATION,
      category: 'amortizacao', timelineId: timeline?.id,
      timelineOriginId: timeline?.id, notes: formData.notes,
      isObligation: formData.isObligation,
      obligationPersonId: formData.isObligation ? formData.obligationPersonId : null
    });
    onClose();
  };

  const accent = '#818cf8';

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} onSubmit={handleSubmit} accent={accent}
      maxWidth="640px"
      icon={CreditCard} title={initialData ? 'Editar Amortização' : 'Nova Amortização'}
      subtitle={timeline?.name || 'Empréstimo'}
      footer={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '8px' }}>Cancelar</button>
          <button type="submit" className="btn btn-primary btn-sm"
            style={{ background: '#10b981', borderColor: '#10b981', padding: '8px 20px', borderRadius: '8px', fontWeight: '800' }}>
            Confirmar Amortização
          </button>
        </>
      }
    >
        <EuroInput label="Valor a Amortizar (€) *" value={formData.amount} accent="#10b981"
          min="0.01" marginBottom="16px" fontSize="1.1rem"
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
            Estratégia de Redução
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { strategy: AmortizationStrategy.TERM_REDUCTION, label: 'Reduzir Prazo', icon: Clock, color: '#10b981' },
              { strategy: AmortizationStrategy.INSTALLMENT_REDUCTION, label: 'Reduzir Prestação', icon: TrendingDown, color: '#818cf8' }
            ].map(({ strategy, label, icon: SIcon, color }) => {
              const isSelected = formData.amortizationStrategy === strategy;
              return (
                <button key={strategy} type="button"
                  onClick={() => setFormData({ ...formData, amortizationStrategy: strategy })}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    padding: '10px', borderRadius: '8px',
                    border: isSelected ? `1px solid ${color}` : '1px solid var(--border-glass)',
                    background: isSelected ? `${color}26` : 'var(--bg-app)',
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
            Data da Amortização *
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
