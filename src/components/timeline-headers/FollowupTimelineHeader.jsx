import React, { useState, useMemo } from 'react';
import {
  ListTree,
  Plus,
  Settings,
  CheckCircle2,
  Clock,
  CheckSquare,
  Sparkles,
  Layers
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { FollowupStatus, TimelineColor } from '../../enums/index.js';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import { DonutChart, PieDonut, DonutLegend } from '../ui/DonutChart.jsx';

import EntityViewSwitch from '../ui/EntityViewSwitch.jsx';

export default function FollowupTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  filteredEvents,
  onEdit,
  selectedEntityId,
  isIndividualView,
  onToggleIndividualView,
  onDelete,
  onAddEvent
}) {
  const { t } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(true);

  const headerColor = timeline?.color || TimelineColor.FOLLOWUP;
  const rawEventsList = filteredEvents !== undefined ? filteredEvents : (timeline?.events || events || []);

  const followupList = useMemo(() => {
    return rawEventsList.filter((ev) => {
      if (!ev || ev.isDeleted) return false;
      const evTimelineId = ev.timelineId || ev.timeline_id;
      if (evTimelineId && timeline?.id && String(evTimelineId) !== String(timeline.id)) {
        return false;
      }
      return true;
    });
  }, [rawEventsList, timeline?.id]);

  // Unique active followups (ignoring anchor positions for overall counts if paired)
  const activeFollowups = useMemo(() => {
    return followupList.filter((item) => !item.isAnchorVisible || item.position === 1 || item.position === undefined);
  }, [followupList]);

  const totalCount = activeFollowups.length;
  const finishedList = activeFollowups.filter((item) => item.status === FollowupStatus.FINISHED || item.isFinished || item.isCompleted);
  const finishedCount = finishedList.length;
  const inProgressCount = totalCount - finishedCount;
  const completionRate = totalCount > 0 ? Math.round((finishedCount / totalCount) * 100) : 0;

  // Total subtasks / breakdown items calculations
  const subtasksStats = useMemo(() => {
    let totalSubtasks = 0;
    let completedSubtasks = 0;

    activeFollowups.forEach((f) => {
      const items = Array.isArray(f.breakdownItems) ? f.breakdownItems : (Array.isArray(f.breakdown_items) ? f.breakdown_items : []);
      totalSubtasks += items.length;
      completedSubtasks += items.filter((s) => s.status === 'finished' || s.status === 'completed').length;
    });

    const rate = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
    return { totalSubtasks, completedSubtasks, rate };
  }, [activeFollowups]);

  // Donut segments for status distribution
  const statusSegments = useMemo(() => {
    if (totalCount === 0) return [];
    return [
      {
        name: t('followupHeader.finished'),
        amount: finishedCount,
        count: finishedCount,
        percent: completionRate,
        color: TimelineColor.SUCCESS
      },
      {
        name: t('followupHeader.inProgress'),
        amount: inProgressCount,
        count: inProgressCount,
        percent: 100 - completionRate,
        color: TimelineColor.FOLLOWUP
      }
    ].filter((s) => s.count > 0);
  }, [finishedCount, inProgressCount, totalCount, completionRate, t]);

  if (!timeline) return null;

  return (
    <HeaderShell
      timeline={timeline}
      collapsed={collapsed}
      onToggle={() => setIsCollapsed(!collapsed)}
      headerColor={headerColor}
      left={
        <HeaderTitleBlock
          color={headerColor}
          name={timeline.name || t('followupHeader.defaultTitle')}
          description={t('followupHeader.followupsCount', { count: totalCount })}
          icon={<ListTree size={16} style={{ color: headerColor }} />}
          badge={t('followupHeader.badge')}
          onOpenSettings={onEdit}
        />
      }
      right={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
    >
      {!collapsed && (
        <div className="hero-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '12px' }}>
          {/* Card 1: Status Donut Chart */}
          <div className="meta-item" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px' }}>
            <PieDonut
              items={statusSegments}
              centerLabel={`${completionRate}%`}
              centerColor={headerColor}
              size={52}
              strokeWidth={8}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <span className="meta-label" style={{ fontSize: '0.72rem' }}>{t('followupHeader.statusDistribution')}</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>{t('followupHeader.finished')}:</span>
                <strong style={{ color: TimelineColor.SUCCESS }}>{finishedCount}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>{t('followupHeader.inProgress')}:</span>
                <strong style={{ color: TimelineColor.FOLLOWUP }}>{inProgressCount}</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Subtasks Completion */}
          <div className="meta-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
            <div className="meta-icon-box" style={{ background: 'rgba(6, 182, 212, 0.12)', color: TimelineColor.FOLLOWUP }}>
              <CheckSquare size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <span className="meta-label" style={{ fontSize: '0.72rem' }}>{t('followupHeader.subtasksRate')}</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="meta-value" style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main)' }}>
                  {subtasksStats.completedSubtasks} / {subtasksStats.totalSubtasks}
                </span>
                <span style={{ fontSize: '0.76rem', fontWeight: '800', color: subtasksStats.rate === 100 ? TimelineColor.SUCCESS : TimelineColor.FOLLOWUP }}>
                  {subtasksStats.rate}%
                </span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'var(--border-glass)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                <div
                  style={{
                    width: `${subtasksStats.rate}%`,
                    height: '100%',
                    background: subtasksStats.rate === 100 ? TimelineColor.SUCCESS : headerColor,
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Total Follow-ups summary */}
          <div className="meta-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
            <div className="meta-icon-box" style={{ background: 'rgba(16, 185, 129, 0.12)', color: TimelineColor.SUCCESS }}>
              <CheckCircle2 size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="meta-label" style={{ fontSize: '0.72rem' }}>{t('followupHeader.progress')}</span>
              <span className="meta-value" style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {finishedCount} / {totalCount}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                {t('followupHeader.followupsCount', { count: totalCount })}
              </span>
            </div>
          </div>
        </div>
      )}
    </HeaderShell>
  );
}
