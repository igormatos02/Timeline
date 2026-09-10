import React, { useState, useEffect } from 'react';
import { Scale, DollarSign, ShoppingCart, PiggyBank, Repeat, Zap, Calendar } from 'lucide-react';
import { format, parseISO, addMonths } from 'date-fns';
import { TimelineType, EventStatus, EventPeriodicity, EventType } from '../../enums/index.js';
import { useModalEscape } from '../../hooks/useModalEscape.js';
import ModalShell from '../ui/ModalShell.jsx';
import EuroInput from '../ui/EuroInput.jsx';
import ObligationSelector from '../ObligationSelector.jsx';

const MOVEMENT_TYPES = [
  { id: 'entrada', label: 'Entrada', color: '#10b981', icon: DollarSign },
  { id: 'saida', label: 'Gasto / Saída', color: '#f43f5e', icon: ShoppingCart },
  { id: 'investimento', label: 'Investimento', color: '#6366f1', icon: PiggyBank }
];

export default function BalanceEventModal({
  isOpen, onClose, onSave, initialData, defaultDate, timeline,
  allTimelines = [], timeboardId
}) {
  const [movementType, setMovementType] = useState('entrada');
  const [targetTimelineId, setTargetTimelineId] = useState('');
  const [obligationError, setObligationError] = useState(false);
  const [formData, setFormData] = useState({
    title: '', date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
    dayOfMonth: 1, time: '09:00', status: EventStatus.PENDING,
    periodicity: EventPeriodicity.RECURRENT, recurrenceEndDate: '',
    amount: '', labelsInput: '', isObligation: false, obligationPersonId: ''
  });

  useModalEscape(isOpen, onClose);

  const relevantTimelines = React.useMemo(() => {
    const targetType = movementType === 'saida'
      ? TimelineType.EXPENSE
      : movementType === 'investimento'
        ? TimelineType.INVESTMENT
        : TimelineType.INCOME;
    return allTimelines.filter((tl) => tl.type === targetType);
  }, [allTimelines, movementType]);

  useEffect(() => {
    if (relevantTimelines.length > 0 && !targetTimelineId) {
      setTargetTimelineId(relevantTimelines[0].id);
    }
  }, [relevantTimelines, targetTimelineId]);

  useEffect(() => {
    if (!isOpen) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const targetDate = initialData?.date || defaultDate || today;

    let parsedDay = 1;
    try {
      const d = parseISO(targetDate);
      if (!isNaN(d.getDate())) parsedDay = d.getDate();
    } catch { parsedDay = 1; }

    if (initialData) {
      let initType = 'entrada';
      if (initialData.isExpense || initialData.eventType === EventType.EXPENSE) initType = 'saida';
      else if (initialData.isInvestment || initialData.eventType === EventType.INVESTMENT) initType = 'investimento';

      setMovementType(initType);
      setFormData({
        title: initialData.title || '', date: targetDate, dayOfMonth: parsedDay,
        time: initialData.time || '09:00', status: initialData.status || EventStatus.PENDING,
        periodicity: initialData.periodicity || EventPeriodicity.RECURRENT,
        recurrenceEndDate: initialData.recurrenceEndDate || initialData.endDate || '',
        amount: initialData.amount !== undefined ? initialData.amount : '',
        labelsInput: Array.isArray(initialData.labels) ? initialData.labels.join(', ') : '',
        isObligation: Boolean(initialData.isObligation || initialData.is_obligation),
        obligationPersonId: initialData.obligationPersonId || initialData.obligation_person_id || ''
      });
      setTargetTimelineId(initialData.timelineId || '');
    } else {
      let defaultEndMonth = format(addMonths(parseISO(targetDate), 6), 'yyyy-MM');
      setFormData({
        title: '', date: targetDate, dayOfMonth: parsedDay, time: '09:00',
        status: EventStatus.PENDING, periodicity: EventPeriodicity.RECURRENT,
        recurrenceEndDate: defaultEndMonth, amount: '', labelsInput: '',
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

    let finalDate = formData.date;
    try {
      const [y, m] = formData.date.split('-');
      finalDate = `${y}-${m}-${String(formData.dayOfMonth).padStart(2, '0')}`;
    } catch { }

    const numAmount = parseFloat(formData.amount) || 0;
    const labels = formData.labelsInput
      ? formData.labelsInput.split(',').map((l) => l.trim()).filter(Boolean)
      : [];

    const isExp = movementType === 'saida';
    const isInv = movementType === 'investimento';
    const defaultInitialStatus = isInv ? EventStatus.PLANNED : EventStatus.PENDING;

    onSave({
      ...(initialData || {}),
      title: formData.title.trim(), date: finalDate, time: formData.time,
      status: initialData ? (initialData.status || defaultInitialStatus) : defaultInitialStatus,
      periodicity: formData.periodicity,
      recurrenceEndDate: formData.periodicity === EventPeriodicity.PERIOD ? formData.recurrenceEndDate : null,
      amount: numAmount,
      eventType: isExp ? EventType.EXPENSE : isInv ? EventType.INVESTMENT : EventType.INCOME,
      timelineId: targetTimelineId || timeline?.id,
      timelineOriginId: targetTimelineId || timeline?.id,
      labels,
      isObligation: formData.isObligation,
      obligationPersonId: formData.isObligation ? formData.obligationPersonId : null
    });
    onClose();
  };

  const accentColor = movementType === 'saida' ? '#f43f5e' : movementType === 'investimento' ? '#6366f1' : '#10b981';

  return (
    <ModalShell
      isOpen={isOpen} onClose={onClose} onSubmit={handleSubmit} accent={accentColor}
      icon={Scale} title={initialData ? 'Editar Movimento' : 'Novo Movimento Financeiro'}
      subtitle="Balanço Consolidado"
      footer={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '8px' }}>Cancelar</button>
          <button type="submit" className="btn btn-primary btn-sm"
            style={{ background: accentColor, borderColor: accentColor, padding: '8px 20px', borderRadius: '8px', fontWeight: '800' }}>
            {initialData ? 'Salvar Alterações' : 'Adicionar Movimento'}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
          Tipo de Movimento
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {MOVEMENT_TYPES.map((m) => {
            const isSelected = movementType === m.id;
            const MIcon = m.icon;
            return (
              <button key={m.id} type="button"
                onClick={() => { setMovementType(m.id); setTargetTimelineId(''); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  padding: '8px', borderRadius: '8px',
                  border: isSelected ? `1px solid ${m.color}` : '1px solid var(--border-glass)',
                  background: isSelected ? `${m.color}22` : 'var(--bg-app)',
                  color: isSelected ? m.color : 'var(--text-muted)',
                  fontSize: '0.78rem', fontWeight: isSelected ? '800' : '600', cursor: 'pointer'
                }}>
                <MIcon size={14} /><span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {relevantTimelines.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              Timeline de Destino
            </label>
            <select value={targetTimelineId}
              onChange={(e) => setTargetTimelineId(e.target.value)}
              className="form-select"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', boxSizing: 'border-box' }}>
              {relevantTimelines.map((tl) => (
                <option key={tl.id} value={tl.id}>{tl.name}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
            Título do Movimento *
          </label>
          <input type="text" required placeholder="Ex: Salário, Aluguel, Aporte Poupança..."
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="form-input"
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', boxSizing: 'border-box' }} />
        </div>

        <EuroInput label="Valor (€) *" value={formData.amount} accent={accentColor}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />

        {!initialData && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
              Periodicidade
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: EventPeriodicity.RECURRENT, label: 'Recorrente', icon: <Repeat size={13} /> },
                { id: EventPeriodicity.UNIQUE, label: 'Pontual', icon: <Zap size={13} /> },
                { id: EventPeriodicity.PERIOD, label: 'Período', icon: <Calendar size={13} /> }
              ].map((p) => {
                const isSelected = formData.periodicity === p.id;
                return (
                  <button key={p.id} type="button"
                    onClick={() => setFormData({ ...formData, periodicity: p.id })}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      padding: '8px', borderRadius: '8px',
                      border: isSelected ? `1px solid ${accentColor}` : '1px solid var(--border-glass)',
                      background: isSelected ? `${accentColor}22` : 'var(--bg-app)',
                      color: isSelected ? accentColor : 'var(--text-muted)',
                      fontSize: '0.78rem', fontWeight: isSelected ? '800' : '600', cursor: 'pointer'
                    }}>
                    {p.icon}<span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
            Dia do Mês
          </label>
          <input type="number" min="1" max="31" value={formData.dayOfMonth}
            onChange={(e) => setFormData({ ...formData, dayOfMonth: Number(e.target.value) })}
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
          accentColor={accentColor}
          showError={obligationError}
        />
    </ModalShell>
  );
}