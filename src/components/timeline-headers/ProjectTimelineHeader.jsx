import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Settings
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { EventStatus, TimelineColor } from '../../enums/index.js';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';

export default function ProjectTimelineHeader({
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

  const headerColor = timeline.color || TimelineColor.PROJECT;
  const totalTasks = events.length;
  const completedTasks = events.filter((e) => e.isCompleted || e.status === EventStatus.COMPLETED).length;
  const pendingTasks = totalTasks - completedTasks;

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
          {onAddEvent && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onAddEvent}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '700'
              }}
            >
              <Plus size={14} />
              <span>{t('projectHeader.newTaskMilestone')}</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title={t('timeline.editTimeline')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                color: 'var(--primary-light)',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <Settings size={15} />
            </button>
          )}

          {onDelete && !timeline.isSystemDefault && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => onDelete && onDelete(timeline)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}
            >
              <Trash2 size={13} />
              <span>{t('buttons.delete')}</span>
            </button>
          )}
        </div>
      }
    >
      {/* Metrics Summary Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          paddingTop: '12px',
          marginTop: '8px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-main)' }}>
          <Sparkles size={14} style={{ color: headerColor }} />
          <span>{t('projectHeader.totalTasks')}</span>
          <strong>{totalTasks}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: TimelineColor.SUCCESS }}>
          <CheckCircle2 size={14} />
          <span>{t('projectHeader.completed')}</span>
          <strong>{completedTasks}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: TimelineColor.PURPLE }}>
          <Clock size={14} />
          <span>{t('projectHeader.inProgressPending')}</span>
          <strong>{pendingTasks}</strong>
        </div>
      </div>
    </HeaderShell>
  );
}

