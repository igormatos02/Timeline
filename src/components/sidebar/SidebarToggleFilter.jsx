import React from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import FilterSwitch from './FilterSwitch.jsx';

/**
 * Collapsible sidebar filter with an "all" item and one toggle per option (multi-selection; empty = all,
 * selecting every option goes back to all).
 *
 * Props:
 *   title, allLabel         - section title and label of the "all" item
 *   items                   - [{ id, icon: ComponentType, color, label }]
 *   selected, onChange      - selected ids and setter (receives the next array)
 *   collapsed, onToggleCollapse
 *   onBeforeChange          - optional callback before a change (e.g. scroll to the top)
 */
export default function SidebarToggleFilter({
  title,
  allLabel,
  items,
  selected,
  onChange,
  collapsed = false,
  onToggleCollapse,
  onBeforeChange
}) {
  const toggle = (id) => {
    onBeforeChange?.();
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
    onChange(next.length === items.length ? [] : next);
  };

  return (
    <div className="sidebar-section">
      <div className="sidebar-section-title" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={onToggleCollapse}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ChevronDown
            size={13}
            style={{
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.18s ease',
              color: 'var(--text-muted)'
            }}
          />
          <span>{title}</span>
        </div>
      </div>
      {!collapsed && (
        <div className="sidebar-btn-group">
          <button
            type="button"
            className={`sidebar-filter-item ${selected.length === 0 ? 'active' : ''}`}
            onClick={() => onChange([])}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={13} />
              <span>{allLabel}</span>
            </div>
            <FilterSwitch checked={selected.length === 0} />
          </button>
          {items.map(({ id, icon: ItemIcon, color, label }) => {
            const isSelected = selected.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`sidebar-filter-item ${isSelected ? 'active' : ''}`}
                onClick={() => toggle(id)}
                style={isSelected ? { borderColor: `${color}66` } : {}}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color, display: 'inline-flex', alignItems: 'center' }}>
                    <ItemIcon size={13} />
                  </span>
                  <span>{label}</span>
                </div>
                <FilterSwitch checked={isSelected} color={color} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
