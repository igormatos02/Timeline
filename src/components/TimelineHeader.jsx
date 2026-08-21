import React from 'react';
import { Calendar, Tag, Activity, Clock, Edit2, Trash2, CheckCircle2, AlertCircle, PlayCircle, PauseCircle } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function TimelineHeader({ timeline, onEdit, onDelete }) {
  if (!timeline) return null;

  // Format dates safely
  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), "d 'de' MMMM, yyyy", { locale: pt });
    } catch {
      return dateStr;
    }
  };

  // Status Badge Class & Icon
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Concluído':
        return { cls: 'badge-completed', icon: <CheckCircle2 size={12} /> };
      case 'Planeado':
        return { cls: 'badge-planned', icon: <AlertCircle size={12} /> };
      case 'Em Pausa':
        return { cls: 'badge-paused', icon: <PauseCircle size={12} /> };
      default:
        return { cls: 'badge-in-progress', icon: <PlayCircle size={12} /> };
    }
  };

  const statusInfo = getStatusBadge(timeline.status);

  // Calculate duration and progress %
  let totalDays = 0;
  let progressPercent = 0;
  try {
    const start = parseISO(timeline.startDate);
    const end = parseISO(timeline.endDate);
    const today = new Date('2026-08-21'); // Current app context today
    totalDays = Math.max(1, differenceInDays(end, start));
    const elapsedDays = Math.max(0, differenceInDays(today, start));
    progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  } catch (err) {
    progressPercent = 50;
  }

  return (
    <div
      className="timeline-hero glass-panel"
      style={{ '--active-timeline-color': timeline.color || '#6366f1' }}
    >
      <div className="hero-top">
        <div className="hero-title-group">
          <div className="hero-badges">
            <span className={`badge ${statusInfo.cls}`}>
              {statusInfo.icon} {timeline.status}
            </span>
            <span className="badge badge-type">
              <Tag size={12} /> {timeline.type}
            </span>
          </div>
          <h1 className="hero-name">{timeline.name}</h1>
          <p className="hero-description">{timeline.description}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onEdit}
            title="Editar detalhes da timeline"
          >
            <Edit2 size={15} />
            <span>Editar</span>
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={onDelete}
            style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            title="Eliminar timeline"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="hero-meta-grid">
        <div className="meta-item">
          <div className="meta-icon-box">
            <Calendar size={18} />
          </div>
          <div>
            <div className="meta-label">Data de Início</div>
            <div className="meta-value">{formatDate(timeline.startDate)}</div>
          </div>
        </div>

        <div className="meta-item">
          <div className="meta-icon-box" style={{ color: '#06b6d4' }}>
            <Calendar size={18} />
          </div>
          <div>
            <div className="meta-label">Data de Fim</div>
            <div className="meta-value">{formatDate(timeline.endDate)}</div>
          </div>
        </div>

        <div className="meta-item">
          <div className="meta-icon-box" style={{ color: '#10b981' }}>
            <Clock size={18} />
          </div>
          <div>
            <div className="meta-label">Duração Total</div>
            <div className="meta-value">{totalDays} dias</div>
          </div>
        </div>

        <div className="meta-item">
          <div className="meta-icon-box" style={{ color: '#ec4899' }}>
            <Activity size={18} />
          </div>
          <div>
            <div className="meta-label">Eventos Registados</div>
            <div className="meta-value">{timeline.events ? timeline.events.length : 0} marcos</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="timeline-progress-container">
        <div className="progress-header">
          <span>Progresso Temporal</span>
          <span>{progressPercent}% decorrido</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progressPercent}%`, background: timeline.color || '#6366f1' }}
          />
        </div>
      </div>
    </div>
  );
}
