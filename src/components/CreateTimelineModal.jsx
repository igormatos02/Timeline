import React, { useState, useEffect } from 'react';
import { X, Sparkles, FolderPlus, Edit2 } from 'lucide-react';
import { TIMELINE_TYPES, TIMELINE_STATUSES } from '../data/mockTimelines';

export default function CreateTimelineModal({
  isOpen,
  onClose,
  onSave,
  initialData
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '2026-08-01',
    endDate: '2026-09-30',
    status: 'Em Progresso',
    type: 'Tecnologia',
    color: '#6366f1'
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        description: '',
        startDate: '2026-08-01',
        endDate: '2026-09-30',
        status: 'Em Progresso',
        type: 'Tecnologia',
        color: '#6366f1'
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
    onClose();
  };

  const isEditing = Boolean(initialData && initialData.id);

  const colors = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#f59e0b', // Amber
    '#a855f7', // Purple
    '#3b82f6'  // Blue
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isEditing ? <Edit2 size={20} className="text-primary" /> : <FolderPlus size={20} className="text-primary" />}
            <h2 className="modal-title">
              {isEditing ? 'Editar Timeline' : 'Criar Nova Timeline'}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Timeline Name */}
          <div className="form-group">
            <label className="form-label">Nome da Timeline *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Lançamento da Nova App Mobile"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea
              className="form-textarea"
              placeholder="Descreva o objetivo e escopo desta linha temporal..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Type & Status */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo / Categoria</label>
              <select
                className="form-select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                {TIMELINE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {TIMELINE_STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Start & End Dates */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Data de Início</label>
              <input
                type="date"
                className="form-input"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Data de Fim</label>
              <input
                type="date"
                className="form-input"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Color Accent */}
          <div className="form-group">
            <label className="form-label">Cor de Destaque</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              {colors.map((c) => (
                <div
                  key={c}
                  onClick={() => setFormData({ ...formData, color: c })}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: formData.color === c ? '3px solid #ffffff' : '2px solid transparent',
                    boxShadow: formData.color === c ? `0 0 12px ${c}` : 'none'
                  }}
                />
              ))}
            </div>
          </div>

          <div className="form-footer">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              <Sparkles size={16} />
              <span>{isEditing ? 'Guardar Alterações' : 'Criar Timeline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
