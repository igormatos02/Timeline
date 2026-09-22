import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

export default function HeaderShell({
  collapsed,
  onToggle,
  onToggleCollapse,
  headerColor,
  accentColor,
  left,
  header,
  right,
  actions,
  children,
  toggleColor,
  containerStyle,
  style
}) {
  const { t } = useTranslation();
  const actualOnToggle = onToggle || onToggleCollapse;
  const actualColor = headerColor || accentColor;
  const actualLeft = left || header;
  const actualRight = right || actions;
  const actualStyle = { ...containerStyle, ...style };

  return (
    <div
      className={`timeline-hero glass-panel ${collapsed ? 'hero-collapsed' : ''}`}
      style={{
        '--active-timeline-color': actualColor,
        padding: '14px 20px',
        marginBottom: '10px',
        boxShadow: 'var(--shadow-sm)',
        ...actualStyle
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: collapsed ? '0' : '12px',
          borderBottom: collapsed ? 'none' : `1px solid ${actualColor || 'var(--border-glass)'}`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={actualOnToggle}
            aria-label={collapsed ? t('header.expandHeader') : t('header.collapseHeader')}
            title={collapsed ? t('header.expandHeader') : t('header.collapseHeader')}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              color: toggleColor || 'var(--text-main)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, transform 0.2s ease',
              flexShrink: 0
            }}
          >
            {collapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
          </button>

          {actualLeft}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {actualRight}
        </div>
      </div>

      {!collapsed && children}
    </div>
  );
}