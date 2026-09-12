import React, { useState, useEffect } from 'react';
import { Sparkles, DollarSign, Calendar, FileText, X, TrendingDown, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../utils/formatCurrency';
import { EventStatus, AmortizationStrategy, AmortizationEventCategory } from '../enums/index.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function AmortizationModal({ isOpen, onClose, onSave, remainingBalance, defaultDate = null, initialEvent = null }) {
  const { t } = useTranslation();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(defaultDate || todayStr);
  const [strategy, setStrategy] = useState(AmortizationStrategy.REDUCE_TERM);
  const [status, setStatus] = useState(EventStatus.AMORTIZED);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialEvent) {
      setAmount(initialEvent.amount || initialEvent.amortizationAmount || '');
      setDate(initialEvent.date || defaultDate || todayStr);
      const eventStrategy =
        initialEvent.strategy ||
        initialEvent.amortizationStrategy ||
        (initialEvent.category === AmortizationEventCategory.REDUCE_INSTALLMENT
          ? AmortizationStrategy.REDUCE_INSTALLMENT
          : AmortizationStrategy.REDUCE_TERM);
      setStrategy(eventStrategy);
      const isAmortized = initialEvent.status === EventStatus.AMORTIZED;
      setStatus(isAmortized ? EventStatus.AMORTIZED : EventStatus.PENDING);
      setNotes(initialEvent.notes || (initialEvent.description && !initialEvent.description.startsWith('Amortização extraordinária') ? initialEvent.description : ''));
    } else {
      if (defaultDate) setDate(defaultDate);
      setAmount('');
      setStrategy(AmortizationStrategy.REDUCE_TERM);
      setStatus(EventStatus.AMORTIZED);
      setNotes('');
    }
  }, [defaultDate, isOpen, initialEvent]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    onSave({
      id: initialEvent?.id,
      amount: numAmount,
      date,
      strategy,
      status,
      notes: notes.trim()
    });

    setAmount('');
    setNotes('');
    setStatus(EventStatus.AMORTIZED);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--success-glow)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={20} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.25rem' }}>
                {initialEvent ? t('amortizationModal.editTitle') : t('amortizationModal.title')}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {initialEvent ? t('amortizationModal.editSubtitle') : t('amortizationModal.subtitle')}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {remainingBalance !== undefined && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid var(--border-glass-glow)', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t('amortizationModal.currentRemainingBalance')}</span>
            <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--primary-light)' }}>{formatCurrency(remainingBalance)}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Valor da Amortização */}
          <div className="form-group">
            <label className="form-label">{t('amortizationModal.amountLabel')}</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontWeight: '700' }}>€</span>
              <input
                type="number"
                step="0.01"
                min="1"
                max={remainingBalance || 1000000}
                required
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '1.05rem', fontWeight: '700' }}
                placeholder={t('amortizationModal.amountPlaceholder')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Estratégia de Amortização */}
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">{t('amortizationModal.strategyLabel')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
              <div
                onClick={() => setStrategy(AmortizationStrategy.REDUCE_TERM)}
                style={{
                  padding: '14px 12px',
                  borderRadius: '10px',
                  border: `2px solid ${strategy === AmortizationStrategy.REDUCE_TERM ? 'var(--primary)' : 'var(--border-glass)'}`,
                  background: strategy === AmortizationStrategy.REDUCE_TERM ? 'var(--primary-glow)' : 'var(--bg-glass)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '0.9rem', color: strategy === AmortizationStrategy.REDUCE_TERM ? 'var(--primary-light)' : 'var(--text-main)' }}>
                  <Clock size={16} /> {t('amortizationModal.reduceTermTitle')}
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
                  {t('amortizationModal.reduceTermDesc')}
                </p>
              </div>

              <div
                onClick={() => setStrategy(AmortizationStrategy.REDUCE_INSTALLMENT)}
                style={{
                  padding: '14px 12px',
                  borderRadius: '10px',
                  border: `2px solid ${strategy === AmortizationStrategy.REDUCE_INSTALLMENT ? 'var(--success)' : 'var(--border-glass)'}`,
                  background: strategy === AmortizationStrategy.REDUCE_INSTALLMENT ? 'var(--success-glow)' : 'var(--bg-glass)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '0.9rem', color: strategy === AmortizationStrategy.REDUCE_INSTALLMENT ? 'var(--success)' : 'var(--text-main)' }}>
                  <TrendingDown size={16} /> {t('amortizationModal.reduceInstallmentTitle')}
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
                  {t('amortizationModal.reduceInstallmentDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* Estado Inicial da Amortização */}
          <div className="form-group" style={{ marginTop: '14px' }}>
            <label className="form-label">{t('amortizationModal.initialStatusLabel')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setStatus(EventStatus.AMORTIZED)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: status === EventStatus.AMORTIZED ? '2px solid var(--success)' : '1px solid var(--border-glass)',
                  background: status === EventStatus.AMORTIZED ? 'var(--success-glow)' : 'var(--bg-glass)',
                  color: status === EventStatus.AMORTIZED ? 'var(--success)' : 'var(--text-dim)',
                  fontWeight: '700',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <span>✓ {t('status.amortized')}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus(EventStatus.PENDING)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: status === EventStatus.PENDING ? '2px solid var(--warning)' : '1px solid var(--border-glass)',
                  background: status === EventStatus.PENDING ? 'rgba(245, 158, 11, 0.16)' : 'var(--bg-glass)',
                  color: status === EventStatus.PENDING ? 'var(--warning)' : 'var(--text-dim)',
                  fontWeight: '700',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <span>⏳ {t('status.pending')}</span>
              </button>
            </div>
          </div>

          {/* Notas Opcionais */}
          <div className="form-group" style={{ marginTop: '14px' }}>
            <label className="form-label">{t('amortizationModal.notesLabel')}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t('amortizationModal.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, var(--success) 0%, var(--accent-emerald) 100%)', boxShadow: '0 4px 14px var(--shadow-glow-emerald)' }}>
              {initialEvent ? t('amortizationModal.saveChanges') : t('amortizationModal.confirmAmortization')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
