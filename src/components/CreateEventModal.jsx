import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Trash2, CheckCircle } from 'lucide-react';

export default function CreateEventModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDate
}) {
  const [formData, setFormData] = useState({
    title: '',
    date: defaultDate || '2026-08-21',
    time: '10:00',
    status: 'Em Progresso',
    type: 'Design & Frontend',
    priority: 'Alta',
    description: '',
    author: 'Igor Matos',
    tagsInput: 'UI/UX, Prototype',
    tasks: []
  });

  const [newTaskText, setNewTaskText] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        tagsInput: initialData.tags ? initialData.tags.join(', ') : '',
        tasks: initialData.tasks || []
      });
    } else {
      setFormData({
        title: '',
        date: defaultDate || '2026-08-21',
        time: '10:00',
        status: 'Em Progresso',
        type: 'Design & Frontend',
        priority: 'Alta',
        description: '',
        author: 'Igor Matos',
        tagsInput: '',
        tasks: []
      });
    }
  }, [initialData, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    setFormData({
      ...formData,
      tasks: [...formData.tasks, { text: newTaskText.trim(), completed: false }]
    });
    setNewTaskText('');
  };

  const handleRemoveTask = (idx) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter((_, i) => i !== idx)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) return;

    const tags = formData.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSave({
      ...formData,
      tags
    });
    onClose();
  };

  const isEditing = Boolean(initialData && initialData.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={20} style={{ color: 'var(--primary-light)' }} />
            <h2 className="modal-title">
              {isEditing ? 'Editar Evento' : 'Novo Evento no Dia'}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Título do Evento *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Apresentação da Linha Temporal Vertical"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Date & Time */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Data do Evento *</label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hora</label>
              <input
                type="time"
                className="form-input"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          {/* Priority & Type */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Prioridade</label>
              <select
                className="form-select"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo / Categoria</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: UI/UX, Backend, Reunião"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Descrição detalhada</label>
            <textarea
              className="form-textarea"
              placeholder="Adicione notas, orientações ou contexto sobre este evento..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Checklist Subtasks */}
          <div className="form-group">
            <label className="form-label">Checklist de Tarefas</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Nova tarefa..."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTask();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddTask}
              >
                <Plus size={14} />
              </button>
            </div>

            {formData.tasks && formData.tasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                {formData.tasks.map((task, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.04)',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.82rem'
                    }}
                  >
                    <span>{task.text}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(idx)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags & Author */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tags (separadas por vírgula)</label>
              <input
                type="text"
                className="form-input"
                placeholder="React, CSS, Milestone"
                value={formData.tagsInput}
                onChange={(e) => setFormData({ ...formData, tagsInput: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Autor / Responsável</label>
              <input
                type="text"
                className="form-input"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              />
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
              <CheckCircle size={16} />
              <span>{isEditing ? 'Atualizar Evento' : 'Adicionar Evento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
