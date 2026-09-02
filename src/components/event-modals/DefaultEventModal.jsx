import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { EventStatus, EventPeriodicity, EventType } from '../../enums/index.js';

export default function DefaultEventModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDate,
  timeline
}) {
  const [formData, setFormData] = useState({
    title: '',
    date: defaultDate || '2026-08-21',
    amount: '',
    status: EventStatus.PENDING,
    notes: ''
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        title: initialData.title || '',
        date: initialData.date || defaultDate || '2026-08-21',
        amount: initialData.amount !== undefined ? initialData.amount : '',
        status: initialData.status || EventStatus.PENDING,
        notes: initialData.notes || ''
      });
    } else {
      setFormData({
        title: '',
        date: defaultDate || '2026-08-21',
        amount: '',
        status: EventStatus.PENDING,
        notes: ''
      });
    }
  }, [initialData, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const eventPayload = {
      ...(initialData || {}),
      title: formData.title.trim(),
      date: formData.date,
      amount: parseFloat(formData.amount) || 0,
      status: formData.status,
      eventType: EventType.GENERIC,
      timelineId: timeline?.id,
      timelineOriginId: timeline?.id,
      notes: formData.notes
    };

    onSave(eventPayload);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          width: '100%',
          background: 'var(--bg-card, #131722)',
          borderRadius: '16px',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
          padding: '24px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'var(--bg-app)', color: 'var(--primary-light)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <Calendar size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {initialData ? 'Editar Evento' : 'Novo Evento'}
              </h3>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {timeline?.name}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="action-icon-btn"
            onClick={onClose}
            aria-label="Fechar"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              Título *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              Data *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="form-input"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              Valor (€) (Opcional)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="form-input"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '8px' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: '800' }}
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
