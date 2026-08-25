import React, { useState, useEffect } from 'react';
import { X, Sparkles, LayoutGrid, Edit2 } from 'lucide-react';

export default function CreateTimeboardModal({
  isOpen,
  onClose,
  onSave,
  initialData
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tenant: 'default',
    type: null
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        description: '',
        tenant: 'default',
        type: null
      });
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    onSave({
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
      tenant: formData.tenant || 'default',
      type: formData.type || null
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {initialData ? <Edit2 size={18} /> : <LayoutGrid size={18} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                {initialData ? 'Editar Timeboard' : 'Novo Timeboard'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {initialData ? 'Atualize as informações do Timeboard' : 'Crie um novo Timeboard para agrupar suas linhas temporais'}
              </p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Nome do Timeboard */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                Nome do Timeboard *
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: Timeboard Principal, Finanças Pessoais, Projetos..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
              />
            </div>

            {/* Descrição */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                Descrição
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Breve descrição dos objetivos ou escopo deste Timeboard..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Tenant */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                Tenant / Workspace
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: default, pessoal, empresa..."
                value={formData.tenant}
                onChange={(e) => setFormData({ ...formData, tenant: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} />
              <span>{initialData ? 'Salvar Alterações' : 'Criar Timeboard'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
