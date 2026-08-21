import React from 'react';
import { Clock, CheckSquare, Edit3, Trash2, User, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TimelineEventCard({
  event,
  onEdit,
  onDelete,
  onToggleTask
}) {
  // Priority Badge Color
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Urgente':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.3)' };
      case 'Alta':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fcd34d', border: 'rgba(245, 158, 11, 0.3)' };
      case 'Média':
        return { bg: 'rgba(99, 102, 241, 0.15)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.3)' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.05)', text: '#9ca3af', border: 'rgba(255, 255, 255, 0.1)' };
    }
  };

  const priorityStyle = getPriorityStyle(event.priority);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="event-card"
    >
      {/* Top Header */}
      <div className="event-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h3 className="event-title">{event.title}</h3>
          {event.priority && (
            <span
              className="badge"
              style={{
                backgroundColor: priorityStyle.bg,
                color: priorityStyle.text,
                borderColor: priorityStyle.border
              }}
            >
              <AlertCircle size={10} /> {event.priority}
            </span>
          )}
        </div>

        {event.time && (
          <div className="event-time-chip">
            <Clock size={13} />
            <span>{event.time}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <p className="event-description">{event.description}</p>
      )}

      {/* Subtasks Checklist */}
      {event.tasks && event.tasks.length > 0 && (
        <div className="event-tasks-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.75rem', color: '#9ca3af' }}>
            <CheckSquare size={13} />
            <span>Checklist ({event.tasks.filter(t => t.completed).length}/{event.tasks.length})</span>
          </div>
          {event.tasks.map((task, idx) => (
            <div
              key={idx}
              className={`task-item ${task.completed ? 'completed' : ''}`}
              onClick={() => onToggleTask && onToggleTask(event.id, idx)}
            >
              <div className="task-checkbox">
                {task.completed && '✓'}
              </div>
              <span>{task.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer Meta & Actions */}
      <div className="event-card-footer">
        <div className="tag-list">
          {event.type && (
            <span className="event-tag" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#c7d2fe' }}>
              {event.type}
            </span>
          )}
          {event.author && (
            <span className="event-tag" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <User size={10} /> {event.author}
            </span>
          )}
          {event.tags && event.tags.map((tag, i) => (
            <span key={i} className="event-tag">#{tag}</span>
          ))}
        </div>

        <div className="event-card-actions">
          <button
            className="action-icon-btn"
            onClick={() => onEdit(event)}
            title="Editar Evento"
          >
            <Edit3 size={15} />
          </button>
          <button
            className="action-icon-btn delete"
            onClick={() => onDelete(event.id)}
            title="Eliminar Evento"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
