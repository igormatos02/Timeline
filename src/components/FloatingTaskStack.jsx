import React, { useState } from 'react';
import { Layers, Plus, CheckCircle2, Circle, Clock, Tag, Sparkles, Pin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingTaskStack({
  pendingTasks,
  onCompleteTask,
  onAddFloatingTask,
  onDeleteTask
}) {
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleQuickAdd = (e) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    onAddFloatingTask({
      title: quickTaskTitle.trim(),
      description: 'Tarefa criada diretamente na pilha flutuante do topo da timeline.',
      category: 'tarefa',
      status: 'Em Progresso',
      priority: 'Média',
      isCompleted: false,
      date: '2026-08-21', // today
      labels: ['Trabalho']
    });

    setQuickTaskTitle('');
    setIsAdding(false);
  };

  return (
    <div className="floating-stack-wrapper glass-panel" style={{ marginBottom: '28px', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #f59e0b' }}>
      <div className="stack-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pin size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Pilha de Tarefas Pendentes <span className="badge badge-planned">{pendingTasks.length} pendente(s)</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Permanecem no topo da timeline até serem concluídas. Ao marcar como concluída, a tarefa fixar-se-á na data respetiva.
            </p>
          </div>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setIsAdding(!isAdding)}
          style={{ borderColor: 'rgba(245, 158, 11, 0.3)', color: '#fcd34d' }}
        >
          <Plus size={15} />
          <span>{isAdding ? 'Fechar' : 'Nova Tarefa'}</span>
        </button>
      </div>

      {/* Quick Add Form */}
      {isAdding && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          onSubmit={handleQuickAdd}
          style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}
        >
          <input
            type="text"
            className="form-input"
            placeholder="Digite o título da tarefa pendente..."
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
            Adicionar à Pilha
          </button>
        </motion.form>
      )}

      {/* Pending Tasks Stack Grid */}
      {pendingTasks.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <AnimatePresence>
            {pendingTasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card"
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  background: 'rgba(245, 158, 11, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <button
                    type="button"
                    onClick={() => onCompleteTask(task.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s'
                    }}
                    title="Concluir tarefa (Fixará a tarefa na data de hoje)"
                  >
                    <Circle size={20} style={{ color: '#f59e0b' }} />
                  </button>

                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#fff' }}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {task.description}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {task.labels && task.labels.map((lbl, idx) => (
                    <span key={idx} className="event-tag" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d' }}>
                      #{lbl}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => onCompleteTask(task.id)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#fcd34d', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                  >
                    <CheckCircle2 size={13} /> Concluir e Fixar
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px' }}>
          🎉 Nenhuma tarefa pendente na pilha! Todas as tarefas concluídas estão fixadas nas suas respetivas datas na timeline.
        </div>
      )}
    </div>
  );
}
