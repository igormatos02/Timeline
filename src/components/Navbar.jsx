import React from 'react';
import { Clock, Plus, Layers, Calendar, Sparkles, Sun, Moon, LocateFixed } from 'lucide-react';

export default function Navbar({
  timelines,
  activeTimelineId,
  onSelectTimeline,
  onOpenCreateTimeline,
  onOpenCreateEvent,
  onScrollToToday,
  theme,
  onToggleTheme
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
          <Layers size={18} style={{ color: 'var(--primary)' }} />
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
          {/* Botão Ir para Hoje / Atual */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onScrollToToday}
            style={{
              background: 'rgba(99, 102, 241, 0.15)',
              borderColor: 'var(--primary-light)',
              color: 'var(--primary-light)',
              fontWeight: '700'
            }}
            title="Voltar à data de hoje / período atual"
          >
            <LocateFixed size={16} />
            <span>Ir para Hoje</span>
          </button>

          {/* Theme Toggle */}
          <button
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
            aria-label="Alternar tema"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

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

