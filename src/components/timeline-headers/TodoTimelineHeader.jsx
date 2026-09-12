import React, { useState, useMemo } from 'react';
import {
  ListTodo,
  Plus,
  Trash2,
  Settings,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Check,
  Tag
} from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { EventPriority, EventStatus, TimelineColor } from '../../enums/index.js';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import { DonutChart, PieDonut, DonutLegend } from '../ui/DonutChart.jsx';

export default function TodoTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  onEdit,
  onDelete,
  onAddEvent,
  onReset
}) {
  const { t } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(false);

  const headerColor = timeline?.color || TimelineColor.TODO;
  const rawEventsList = timeline?.events || events || [];
  const todoList = useMemo(() => {
    return rawEventsList.filter((ev) => {
      if (!ev || ev.isDeleted) return false;
      const evTimelineId = ev.timelineId || ev.timeline_id;
      if (evTimelineId && timeline?.id && String(evTimelineId) !== String(timeline.id)) {
        return false;
      }
      return true;
    });
  }, [rawEventsList, timeline?.id]);

  // Calculate metrics
  const totalCount = todoList.length;
  const completedList = todoList.filter((item) => item.status === EventStatus.COMPLETED || item.isCompleted);
  const completedCount = completedList.length;
  const pendingCount = totalCount - completedCount;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const urgentCount = todoList.filter(
    (item) => (item.priority || '').toLowerCase() === EventPriority.URGENT || (item.priority || '').toLowerCase() === EventPriority.HIGH
  ).length;

  const obligationsCount = todoList.filter((item) => item.isObligation).length;

  // Status breakdown for Donut chart
  const statusSegments = useMemo(() => {
    if (totalCount === 0) return [];
    return [
      {
        name: t('todoHeader.completed'),
        amount: completedCount,
        count: completedCount,
        percent: completionRate,
        color: TimelineColor.SUCCESS
      },
      {
        name: t('todoHeader.pending'),
        amount: pendingCount,
        count: pendingCount,
        percent: 100 - completionRate,
        color: TimelineColor.BLUE
      }
    ].filter((s) => s.count > 0);
  }, [completedCount, pendingCount, totalCount, completionRate, t]);

  // Priority distribution
  const priorityBreakdown = useMemo(() => {
    const counts = { urgent: 0, high: 0, normal: 0, low: 0 };
    todoList.forEach((item) => {
      const p = (item.priority || EventPriority.NORMAL).toLowerCase();
      if (counts[p] !== undefined) counts[p] += 1;
      else counts.normal += 1;
    });
    return counts;
  }, [todoList]);

  if (!timeline) return null;

  return (
    <HeaderShell
      accentColor={headerColor}
      collapsed={collapsed}
      onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
      style={{ borderTop: `3px solid ${headerColor}` }}
      header={
        <HeaderTitleBlock
          color={headerColor}
          name={timeline.name || t('todoHeader.defaultTitle')}
          description={t('todoHeader.tasksCount', { count: totalCount })}
          id={timeline.id}
        />
      }
      controls={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {onAddEvent && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onAddEvent}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '700',
                background: headerColor,
                borderColor: headerColor
              }}
            >
              <Plus size={15} />
              <span>{t('todoHeader.addTask')}</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onEdit}
              title={t('timeline.editTimeline')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem'
              }}
            >
              <Settings size={14} />
            </button>
          )}

          {onDelete && !timeline.isSystemDefault && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => onDelete && onDelete(timeline)}
              title={t('todoHeader.deleteTitle')}
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
      {!collapsed && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            marginTop: '12px'
          }}
        >
          {/* Card 1: Total & Completion Progress */}
          <div
            className="metric-card"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                {t('todoHeader.progress')}
              </span>
              <CheckCircle2 size={16} style={{ color: TimelineColor.SUCCESS }} />
            </div>
            <div style={{ margin: '8px 0' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {completionRate}%
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {t('todoHeader.tasksCount', { count: completedCount })} / {totalCount}
              </div>
            </div>
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${completionRate}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${TimelineColor.BLUE} 0%, ${TimelineColor.SUCCESS} 100%)`,
                  borderRadius: '3px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>

          {/* Card 2: Pending Tasks */}
          <div
            className="metric-card"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                {t('todoHeader.pending')}
              </span>
              <Clock size={16} style={{ color: TimelineColor.BLUE }} />
            </div>
            <div style={{ margin: '8px 0' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: TimelineColor.BLUE }}>
                {pendingCount}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {t('todoHeader.pending')}
              </div>
            </div>
          </div>

          {/* Card 3: Priority & Obligations */}
          <div
            className="metric-card"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                {t('todoHeader.prioritySummary')}
              </span>
              <AlertTriangle size={16} style={{ color: urgentCount > 0 ? TimelineColor.WARNING : 'var(--text-muted)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0' }}>
              <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: TimelineColor.DANGER, fontSize: '0.74rem', fontWeight: '700' }}>
                {priorityBreakdown.urgent} {t('priority.urgent')}
              </span>
              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: TimelineColor.WARNING, fontSize: '0.74rem', fontWeight: '700' }}>
                {priorityBreakdown.high} {t('priority.high')}
              </span>
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: TimelineColor.BLUE, fontSize: '0.74rem', fontWeight: '700' }}>
                {priorityBreakdown.normal} {t('priority.normal')}
              </span>
            </div>
            {obligationsCount > 0 && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🔒 {obligationsCount}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </HeaderShell>
  );
}

