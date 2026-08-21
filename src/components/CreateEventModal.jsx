import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Trash2, CheckCircle, Tag, Repeat, Pin, BookOpen } from 'lucide-react';
import { EVENT_CATEGORIES, DEFAULT_LABELS } from '../data/mockTimelines';

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
    category: 'agendamento',
    priority: 'Alta',
    description: '',
    author: 'Igor Matos',
    labelsInput: 'Trabalho',
    tasks: []
  });

  const [newTaskText, setNewTaskText] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        category: initialData.category || 'agendamento',
        labelsInput: initialData.labels ? initialData.labels.join(', ') : '',
        tasks: initialData.tasks || []
      });
    } else {
      setFormData({
        title: '',
        date: defaultDate || '2026-08-21',
        time: '10:00',
        status: 'Em Progresso',
        category: 'agendamento',
        priority: 'Alta',
        description: '',
        author: 'Igor Matos',
        labelsInput: '',
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

  const togglePresetLabel = (labelName) => {
    const currentLabels = formData.labelsInput
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let newLabels;
    if (currentLabels.includes(labelName)) {
      newLabels = currentLabels.filter((l) => l !== labelName);
    } else {
      newLabels = [...currentLabels, labelName];
    }
    setFormData({ ...formData, labelsInput: newLabels.join(', ') });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) return;

    const labels = formData.labelsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const isFloatingTask = formData.category === 'tarefa';

    onSave({
      ...formData,
      labels,
      isCompleted: isFloatingTask ? false : true
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
              {isEditing ? 'Editar Evento' : 'Novo Evento / Tarefa'}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nature Category Selection */}
          <div className="form-group">
            <label className="form-label">Natureza do Evento *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              {EVENT_CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setFormData({ ...formData, category: cat.id })}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: formData.category === cat.id ? `2px solid ${cat.color}` : '1px solid rgba(255,255,255,0.1)',
                    background: formData.category === cat.id ? `${cat.color}22` : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: formData.category === cat.id ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Título *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Aniversário da Equipa / Reunião de Agendamento"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Date & Time */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Data *</label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hora (Opcional)</label>
              <input
                type="time"
                className="form-input"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          {/* Priority */}
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

          {/* Description */}
          <div className="form-group">
            <label className="form-label">
              {formData.category === 'memoria' ? 'Nota da Memória' : 'Descrição / Detalhes'}
            </label>
            <textarea
              className="form-textarea"
              placeholder={
                formData.category === 'memoria'
                  ? 'Escreva a sua nota de memória aqui...'
                  : 'Adicione notas, orientações ou contexto sobre este evento...'
              }
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Preset Labels / Etiquetas */}
          <div className="form-group">
            <label className="form-label">Etiquetas / Labels</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {DEFAULT_LABELS.map((lbl) => {
                const currentLabels = formData.labelsInput.split(',').map((l) => l.trim());
                const isSelected = currentLabels.includes(lbl.name);
                return (
                  <span
                    key={lbl.id}
                    onClick={() => togglePresetLabel(lbl.name)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      background: isSelected ? lbl.color : 'rgba(255,255,255,0.06)',
                      color: isSelected ? '#ffffff' : 'var(--text-muted)',
                      border: `1px solid ${isSelected ? lbl.color : 'rgba(255,255,255,0.1)'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    #{lbl.name}
                  </span>
                );
              })}
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="Digite etiquetas personalizadas separadas por vírgula (ex: Trabalho, URG)"
              value={formData.labelsInput}
              onChange={(e) => setFormData({ ...formData, labelsInput: e.target.value })}
            />
          </div>

          {/* Subtasks Checklist */}
          {formData.category !== 'memoria' && (
            <div className="form-group">
              <label className="form-label">Checklist de Subtarefas</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nova sub-tarefa..."
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
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
          )}

          {/* Author */}
          <div className="form-group">
            <label className="form-label">Autor / Responsável</label>
            <input
              type="text"
              className="form-input"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            />
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
              <span>{isEditing ? 'Guardar Evento' : 'Criar Evento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
