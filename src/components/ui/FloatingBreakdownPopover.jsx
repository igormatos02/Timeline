import React, { useEffect, useRef } from 'react';
import { Plus, Trash2, X, Scissors } from 'lucide-react';
import { generateUUID } from '../../utils/uuid.js';
import { TimelineColor } from '../../enums/index.js';

export default function FloatingBreakdownPopover({
  isOpen,
  onClose,
  items = [],
  onChange,
  accent = TimelineColor.EMERALD,
  t,
  initialAmount = ''
}) {
  const popoverRef = useRef(null);
  const nameInputRefs = useRef({});
  const focusTargetIdRef = useRef(null);

  // Auto-initialize first item if empty when opening, and set focus target
  useEffect(() => {
    if (!isOpen) return;

    if (items.length === 0) {
      const curVal = initialAmount !== '' && !isNaN(initialAmount) ? parseFloat(initialAmount) : '';
      const firstId = generateUUID();
      focusTargetIdRef.current = firstId;
      onChange([
        { id: firstId, name: '', amount: curVal !== '' && curVal > 0 ? curVal : '' }
      ]);
    } else {
      const targetId = items[items.length - 1]?.id || items[0]?.id;
      if (targetId) {
        focusTargetIdRef.current = targetId;
      }
    }
  }, [isOpen]);

  // Focus the designated input whenever target is set
  useEffect(() => {
    if (isOpen && focusTargetIdRef.current) {
      const targetId = focusTargetIdRef.current;
      const timer = setTimeout(() => {
        if (nameInputRefs.current[targetId]) {
          nameInputRefs.current[targetId].focus();
          focusTargetIdRef.current = null;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, items]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalAmount = items.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0);

  const addItem = () => {
    const newId = generateUUID();
    focusTargetIdRef.current = newId;
    if (items.length === 0) {
      const curVal = initialAmount !== '' && !isNaN(initialAmount) ? parseFloat(initialAmount) : '';
      onChange([
        { id: newId, name: '', amount: curVal !== '' && curVal > 0 ? curVal : '' }
      ]);
    } else {
      onChange([
        ...items,
        { id: newId, name: '', amount: '' }
      ]);
    }
  };

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        zIndex: 100,
        width: '360px',
        maxWidth: '92vw',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-glass)',
        borderRadius: '12px',
        padding: '14px',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Scissors size={14} style={{ color: accent, transform: 'rotate(-45deg)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-main)' }}>
            {t('modal.subparts')} {items.length > 0 ? `(${items.length})` : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px'
          }}
          aria-label={t('common.close')}
        >
          <X size={15} />
        </button>
      </div>

      {/* Subparts List */}
      {items.length === 0 ? (
        <div style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          {t('modal.subpartsEmpty')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', paddingRight: '2px' }}>
          {items.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.3fr 1fr 28px',
                gap: '8px',
                alignItems: 'center'
              }}
            >
              <input
                ref={(el) => {
                  if (el) nameInputRefs.current[item.id] = el;
                  else delete nameInputRefs.current[item.id];
                }}
                type="text"
                className="form-input"
                style={{
                  height: '34px',
                  padding: '0 8px',
                  fontSize: '0.82rem',
                  borderRadius: '6px'
                }}
                placeholder={t('modal.partNamePlaceholder', { index: idx + 1 })}
                value={item.name}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange(items.map((it, i) => (i === idx ? { ...it, name: val } : it)));
                }}
              />
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="form-input"
                  style={{
                    height: '34px',
                    padding: '0 8px 0 20px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    borderRadius: '6px'
                  }}
                  value={item.amount !== undefined ? item.amount : ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange(items.map((it, i) => (i === idx ? { ...it, amount: val } : it)));
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.72rem',
                    color: accent,
                    fontWeight: '800',
                    pointerEvents: 'none'
                  }}
                >
                  €
                </span>
              </div>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: TimelineColor.ROSE,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '4px'
                }}
                title={t('modal.removeSubpart')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Button & Footer Total */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border-glass)' }}>
        <button
          type="button"
          onClick={addItem}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            borderRadius: '6px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            color: accent,
            fontSize: '0.75rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <Plus size={13} />
          <span>{items.length === 0 ? t('modal.splitIntoSubparts') : t('modal.addSubpart')}</span>
        </button>

        {items.length > 0 && (
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginRight: '6px' }}>
              {t('modal.subpartsTotal')}:
            </span>
            <span style={{ fontSize: '0.86rem', fontWeight: '800', color: accent }}>
              {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
