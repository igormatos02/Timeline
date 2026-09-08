import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Sparkles,
  Settings
} from 'lucide-react';

export default function ProjectTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  onEdit,
  onDelete,
  onAddEvent
}) {
  const [collapsed, setIsCollapsed] = useState(false);

  if (!timeline) return null;

  const headerColor = timeline.color || '#8b5cf6';
  const totalTasks = events.length;
  const completedTasks = events.filter((e) => e.isCompleted || e.status === 'completed' || e.status === 'Concluído').length;
  const pendingTasks = totalTasks - completedTasks;

  return (
    <div
      className={`timeline-hero glass-panel ${collapsed ? 'hero-collapsed' : ''}`}
      style={{
        borderLeft: `4px solid ${headerColor}`,
        '--active-timeline-color': headerColor,
        padding: collapsed ? '12px 18px' : '16px 20px',
        marginBottom: '10px',
        transition: 'padding 0.2s ease, box-shadow 0.2s ease',
        boxShadow: 'var(--shadow-sm)'
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
          borderBottom: collapsed ? 'none' : '1px solid var(--border-glass)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setIsCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand header' : 'Collapse header'}
            title={collapsed ? 'Expand header' : 'Collapse header'}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, transform 0.2s ease',
              flexShrink: 0
            }}
          >
            {collapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
          </button>

          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: `${headerColor}22`,
              color: headerColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${headerColor}33`,
              flexShrink: 0
            }}
          >
            <FolderKanban size={18} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {timeline.name}
              </h1>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: `${headerColor}18`,
                  color: headerColor,
                  border: `1px solid ${headerColor}44`,
                  textTransform: 'uppercase'
                }}
              >
                Project Roadmap
              </span>
            </div>
            {timeline.description && (
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {timeline.description}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
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
              <span>New Task / Milestone</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title="Timeline Settings"
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
              onClick={onDelete}
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
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Summary Strip */}
      {!collapsed && (
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
            <span>Total Tasks:</span>
            <strong>{totalTasks}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#10b981' }}>
            <CheckCircle2 size={14} />
            <span>Completed:</span>
            <strong>{completedTasks}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#8b5cf6' }}>
            <Clock size={14} />
            <span>In Progress / Pending:</span>
            <strong>{pendingTasks}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
