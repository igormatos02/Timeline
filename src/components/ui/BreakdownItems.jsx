import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { generateUUID } from '../../utils/uuid.js';

export default function BreakdownItems({ items, onChange, accent = '#10b981', t, initialAmount }) {
  const totalAmount = items.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0);

  const addItem = () => {
    if (items.length === 0) {
      const curVal = initialAmount !== '' && !isNaN(initialAmount) ? parseFloat(initialAmount) : '';
      onChange([
        { id: generateUUID(), name: 'Parte 1', amount: curVal !== '' && curVal > 0 ? curVal : '' }
      ]);
    } else {
      onChange([
        ...items,
        { id: generateUUID(), name: `Parte ${items.length + 1}`, amount: '' }
      ]);
    }
  };

  return (
    <div style={{
      padding: '12px', borderRadius: '10px',
      background: 'var(--bg-glass, rgba(255,255,255,0.03))',
      border: '1px solid var(--border-glass)', marginBottom: '16px'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: items.length > 0 ? '10px' : '0'
      }}>
        <span style={{
          fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.04em'
        }}>
          {t('modal.subparts') || 'Subpartes'} {items.length > 0 && `(${items.length})`}
        </span>
        <button type="button" onClick={addItem}
          style={{
            background: `${accent}26`, border: `1px solid ${accent}59`,
            borderRadius: '6px', color: accent, padding: '4px 10px',
            fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}>
          <Plus size={12} />
          {items.length === 0
            ? (t('modal.splitIntoSubparts') || 'Dividir em Subpartes')
            : (t('modal.addSubpart') || 'Adicionar Parte')}
        </button>
      </div>

      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
          {items.map((item, idx) => (
            <div key={item.id} style={{
              display: 'grid', gridTemplateColumns: '1.4fr 1fr 28px',
              gap: '8px', alignItems: 'center'
            }}>
              <input type="text" className="form-input"
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                placeholder={t('modal.partNamePlaceholder', { index: idx + 1 }) || `Nome da parte ${idx + 1}`}
                value={item.name}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange(items.map((it, i) => (i === idx ? { ...it, name: val } : it)));
                }}
              />
              <div style={{ position: 'relative' }}>
                <input type="number" step="0.01" min="0" placeholder="0.00"
                  className="form-input"
                  style={{
                    padding: '6px 10px', fontSize: '0.85rem',
                    fontWeight: '700', paddingLeft: '22px'
                  }}
                  value={item.amount !== undefined ? item.amount : ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange(items.map((it, i) => (i === idx ? { ...it, amount: val } : it)));
                  }}
                />
                <span style={{
                  position: 'absolute', left: '8px', top: '50%',
                  transform: 'translateY(-50%)', fontSize: '0.75rem',
                  color: accent, fontWeight: '800', pointerEvents: 'none'
                }}>€</span>
              </div>
              <button type="button"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                style={{
                  background: 'transparent', border: 'none',
                  color: '#f43f5e', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '4px'
                }}
                title={t('modal.removeSubpart') || 'Remover parte'}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
