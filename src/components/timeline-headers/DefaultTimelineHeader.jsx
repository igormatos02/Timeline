import React, { useState } from 'react';
import {
  Plus,
  Settings
} from 'lucide-react';
import { TimelineColor } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';

export default function DefaultTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  onEdit,
  onDelete,
  onAddEvent
}) {
  const { t } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(false);

  if (!timeline) return null;

  const headerColor = timeline.color || TimelineColor.PRIMARY;

  return (
    <HeaderShell
      timeline={timeline}
      collapsed={collapsed}
      onToggle={() => setIsCollapsed(!collapsed)}
      headerColor={headerColor}
      left={
        <HeaderTitleBlock
          color={headerColor}
          name={timeline.name}
          description={timeline.description}
          id={timeline.id}
        />
      }
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title={t('common.edit')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                color: 'var(--primary-light)',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '600',
                transition: 'background-color 0.15s ease, border-color 0.15s ease'
              }}
            >
              <Settings size={14} />
              <span>{t('common.edit')}</span>
            </button>
          )}
        </div>
      }
    />
  );
}

