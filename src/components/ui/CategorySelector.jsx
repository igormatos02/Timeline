import React from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export default function CategorySelector({
  value, onChange, categoryMeta, accent = '#10b981',
  translationPrefix = 'CATEGORY', t, label = 'Categoria',
  isOpen, onToggle
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const open = isOpen !== undefined ? isOpen : internalOpen;
  const toggle = onToggle || (() => setInternalOpen(!internalOpen));

  const currentMeta = categoryMeta[value] || categoryMeta[Object.keys(categoryMeta)[0]];
  const CurrentIcon = currentMeta?.icon;

  return (
    <div style={{ marginBottom: '14px', position: 'relative' }}>
      <label style={{
        display: 'block', fontSize: '0.78rem', fontWeight: '700',
        marginBottom: '6px', color: 'var(--text-main)'
      }}>{label}</label>

      <button type="button" onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderRadius: '10px',
          background: 'var(--bg-glass, rgba(255,255,255,0.03))',
          border: open ? `1px solid ${accent}` : '1px solid var(--border-glass)',
          boxShadow: open ? `0 0 12px ${accent}33` : 'none',
          color: 'var(--text-main)', cursor: 'pointer',
          transition: 'all 0.2s ease', boxSizing: 'border-box'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {CurrentIcon && (
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: currentMeta.bg, color: currentMeta.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <CurrentIcon size={16} />
            </div>
          )}
          <span style={{ fontSize: '0.86rem', fontWeight: '700', color: 'var(--text-main)' }}>
            {t(`${translationPrefix}.${value}`) || value}
          </span>
        </div>
        <ChevronDown size={16} style={{
          color: 'var(--text-muted)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px',
          background: 'var(--bg-card, #131722)',
          border: `1px solid ${accent}59`, borderRadius: '12px',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.85)',
          padding: '12px', zIndex: 100,
          backdropFilter: 'blur(16px)', maxHeight: '260px',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <Search size={14} style={{
              position: 'absolute', left: '10px', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-dim)'
            }} />
            <input type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('sidebar.search') || 'Buscar categoria...'}
              style={{
                width: '100%', padding: '6px 10px 6px 30px',
                fontSize: '0.78rem', borderRadius: '6px',
                background: 'var(--bg-glass, rgba(255,255,255,0.05))',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-main)', outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{
            overflowY: 'auto', flex: 1, display: 'grid',
            gridTemplateColumns: '1fr 1fr', gap: '6px', paddingRight: '4px'
          }}>
            {Object.entries(categoryMeta)
              .filter(([_, meta]) => {
                if (!search.trim()) return true;
                const label = t(`${translationPrefix}.${meta.key || _}`) || meta.key || _;
                return label.toLowerCase().includes(search.toLowerCase());
              })
              .map(([catVal, meta]) => {
                const IconComp = meta.icon;
                const isSelected = value === catVal;
                return (
                  <button key={catVal} type="button"
                    onClick={() => {
                      onChange(catVal);
                      setSearch('');
                      if (typeof onToggle === 'function') onToggle();
                      else setInternalOpen(false);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '8px', padding: '6px 10px', borderRadius: '8px',
                      border: isSelected ? `1px solid ${meta.color}` : '1px solid transparent',
                      background: isSelected ? meta.bg : 'rgba(255, 255, 255, 0.02)',
                      color: isSelected ? meta.color : 'var(--text-main)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '6px',
                        background: meta.bg, color: meta.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <IconComp size={12} />
                      </div>
                      <span style={{
                        fontSize: '0.76rem', fontWeight: isSelected ? '700' : '500',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {t(`${translationPrefix}.${catVal}`) || catVal}
                      </span>
                    </div>
                    {isSelected && <Check size={14} style={{ color: meta.color, flexShrink: 0 }} />}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
