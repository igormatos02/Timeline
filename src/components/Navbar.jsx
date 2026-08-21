import React from 'react';
import { Clock, Plus, Layers, Calendar, Sparkles } from 'lucide-react';

export default function Navbar({
  timelines,
  activeTimelineId,
  onSelectTimeline,
  onOpenCreateTimeline,
  onOpenCreateEvent
}) {
  return (
    <header className="app-header">
      <div className="header-content">
        {/* Brand Logo */}
        <div className="brand-logo">
          <div className="logo-icon">
            <Clock size={22} />
          </div>
          <div>
            <div className="brand-title">
              Chrono Timeline <Sparkles size={16} style={{ color: '#818cf8' }} />
            </div>
            <div className="brand-subtitle">Linha Temporal Vertical</div>
          </div>
        </div>

        {/* Timeline Selector Dropdown */}
        <div className="timeline-selector-wrapper">
          <Layers size={18} style={{ color: '#818cf8' }} />
          <select
            className="timeline-select"
            value={activeTimelineId}
            onChange={(e) => onSelectTimeline(e.target.value)}
          >
            {timelines.map((tl) => (
              <option key={tl.id} value={tl.id}>
                {tl.name} ({tl.status})
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="header-actions">
          <button
            className="btn btn-outline btn-sm"
            onClick={onOpenCreateTimeline}
          >
            <Plus size={16} />
            <span>Nova Timeline</span>
          </button>
          
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onOpenCreateEvent()}
          >
            <Calendar size={16} />
            <span>Novo Evento</span>
          </button>
        </div>
      </div>
    </header>
  );
}
