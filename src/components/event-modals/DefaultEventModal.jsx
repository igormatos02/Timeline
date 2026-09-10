import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { EventStatus, EventType } from '../../enums/index.js';
import { useModalEscape } from '../../hooks/useModalEscape.js';
import ModalShell from '../ui/ModalShell.jsx';
import ObligationSelector from '../ObligationSelector.jsx';

export default function DefaultEventModal({
  isOpen, onClose, onSave, initialData, defaultDate, timeline, timeboardId
}) {
  const [obligationError, setObligationError] = useState(false);
  const [formData, setFormData] = useState({
    title: '', date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
    amount: '', status: EventStatus.PENDING, notes: '',
    isObligation: false, obligationPersonId: ''
  });

  useModalEscape(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        date: initialData.date || defaultDate || today,
        amount: initialData.amount !== undefined ? initialData.amount : '',
        status: initialData.status || EventStatus.PENDING,
        notes: initialData.notes || '',
        isObligation: Boolean(initialData.isObligation || initialData.is_obligation),
        obligationPersonId: initialData.obligationPersonId || initialData.obligation_person_id || ''
      });
    } else {
      setFormData({
        title: '', date: defaultDate || today, amount: '',
        status: EventStatus.PENDING, notes: '',
        isObligation: false, obligationPersonId: ''
      });
    }
  }, [initialData, defaultDate, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    if (formData.isObligation && !formData.obligationPersonId) {
      setObligationError(true); return;
    }
    setObligationError(false);
    onSave({
      ...(initialData || {}),
      title: formData.title.trim(), date: formData.date,
      amount: parseFloat(formData.amount) || 0,
      status: initialData ? (initialData.status || EventStatus.PENDING) : EventStatus.PENDING,
      eventType: EventType.GENERIC, timelineId: timeline?.id,
      timelineOriginId: timeline?.id, notes: formData.notes,
      isObligation: formData.isObligation,
      obligationPersonId: formData.isObligation ? formData.obligationPersonId : null
    });
    onClose();
  };

  const accent = 'var(--primary, #3b82f6)';

  return (
    <ModalShell
      isOpen={isOpen} onClose={onClose} onSubmit={handleSubmit} accent={accent}
      maxWidth="640px" showBorderGlow={false}
      icon={Calendar} title={initialData ? 'Editar Evento' : 'Novo Evento'}
      subtitle={timeline?.name}
      footer={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '8px' }}>Cancelar</button>
          <button type="submit" className="btn btn-primary btn-sm"
            style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: '800' }}>Salvar</button>
        </>
      }
    >
      <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>Título *</label>
          <input type="text" required value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="form-input"
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>Data *</label>
          <input type="date" required value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="form-input"
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>Valor (€) (Opcional)</label>
          <input type="number" step="0.01" value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
