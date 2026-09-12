import React, { useState } from 'react';
import {
  Plus,
  Circle,
  Clock,
  Pin,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInDays, parseISO, format } from 'date-fns';
import { EventPriority, EventStatus, EventType, TimelineColor } from '../enums/index.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

// Calcula quantos dias tem a tarefa desde a data de criação
function getTaskAge(dateStr, t) {
  if (!dateStr) return null;
  try {
    const today = new Date();
    const created = parseISO(dateStr);
    const days = differenceInDays(today, created);
    if (days === 0) return t('floatingTasks.today');
    if (days === 1) return t('floatingTasks.yesterday');
    if (days < 0) return null;
    return t('floatingTasks.daysAgo', { days });
  } catch {
    return null;
  }
}

export default function FloatingTaskStack({
  pendingTasks,
  onCompleteTask,
  onAddFloatingTask,
  onDeleteTask,
  onUpdatePriority,
  onToggleTask,
  onAddChecklistItem,
  onDeleteChecklistItem
}) {
  const { t } = useTranslation();
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [expandedChecklists, setExpandedChecklists] = useState({});
  const [newItemInputs, setNewItemInputs] = useState({});

  const priorities = [
    { id: EventPriority.URGENT, label: t('floatingTasks.priorityUrgent'), color: TimelineColor.DANGER, bg: 'rgba(239, 68, 68, 0.12)' },
    { id: EventPriority.NORMAL, label: t('floatingTasks.priorityNormal'), color: TimelineColor.AMBER, bg: 'rgba(245, 158, 11, 0.12)' },
    { id: EventPriority.LOW, label: t('floatingTasks.priorityLow'), color: TimelineColor.SUCCESS, bg: 'rgba(16, 185, 129, 0.12)' }
  ];

  const toggleChecklist = (taskId) => {
    setExpandedChecklists((prev) => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleQuickAdd = (e) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    onAddFloatingTask({
      title: quickTaskTitle.trim(),
      description: t('floatingTasks.defaultDescription'),
      category: EventType.TODO,
      status: EventStatus.IN_PROGRESS,
      priority: EventPriority.NORMAL,
      isCompleted: false,
      date: format(new Date(), 'yyyy-MM-dd'),
      labels: [],
      tasks: []
    });

    setQuickTaskTitle('');
    setIsAdding(false);
  };

  return (
    <div
      className="floating-stack-wrapper glass-panel"
      style={{
        marginBottom: '28px',
        padding: '20px',
        borderRadius: '16px',
        borderLeft: `4px solid ${TimelineColor.AMBER}`
      }}
    >
      <div
        className="stack-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: TimelineColor.AMBER,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Pin size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {t('floatingTasks.title')}{' '}
              <span className="badge badge-planned">
                {t('floatingTasks.pendingCount', { count: pendingTasks.length })}
              </span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {t('floatingTasks.description')}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setIsAdding(!isAdding)}
          style={{ borderColor: 'rgba(245, 158, 11, 0.3)', color: TimelineColor.AMBER }}
        >
          <Plus size={15} />
          <span>{isAdding ? t('floatingTasks.close') : t('floatingTasks.newTask')}</span>
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
            placeholder={t('floatingTasks.inputPlaceholder')}
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            style={{ background: 'linear-gradient(135deg, var(--warning) 0%, var(--warning-hover) 100%)' }}
          >
            {t('floatingTasks.addToStack')}
          </button>
        </motion.form>
      )}

      {/* Pending Tasks Stack Grid */}
      {pendingTasks.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <AnimatePresence>
            {pendingTasks.map((task) => {
              const subtasks = task.tasks || [];
              const completedSubtasks = subtasks.filter((item) => item.completed).length;
              const isExpanded = !!expandedChecklists[task.id];
              const ageStr = getTaskAge(task.date, t);

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card"
                  style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    background: 'rgba(245, 158, 11, 0.04)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Main Task Header Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Left: Complete checkbox + Title + Description + Age */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 240px' }}>
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
                          transition: 'all 0.2s',
                          padding: '2px'
                        }}
                        title={t('floatingTasks.completeTooltip')}
                      >
                        <Circle size={20} style={{ color: TimelineColor.AMBER }} />
                      </button>

                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                          {task.title}
                        </div>
                        {task.description && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {task.description}
                          </div>
                        )}
                        {ageStr && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <Clock size={11} style={{ color: TimelineColor.AMBER }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: '600', color: TimelineColor.AMBER }}>
                              {t('floatingTasks.age', { age: ageStr })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Priority Selector + Checklist Toggle + Labels + Action Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Priority Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {priorities.map((p) => {
                          const isActive = (task.priority || EventPriority.NORMAL) === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => onUpdatePriority && onUpdatePriority(task.id, p.id)}
                              title={t('floatingTasks.priorityTitle', { priority: p.label })}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                border: `1px solid ${isActive ? p.color : 'transparent'}`,
                                background: isActive ? p.bg : 'transparent',
                                color: isActive ? p.color : 'var(--text-dim)',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Checklist Accordion Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleChecklist(task.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: isExpanded ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-glass)',
                          color: isExpanded ? 'var(--primary-light)' : 'var(--text-muted)',
                          border: `1px solid ${isExpanded ? 'var(--border-glass-glow)' : 'var(--border-glass)'}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                        title={isExpanded ? t('floatingTasks.collapseChecklist') : t('floatingTasks.expandChecklist')}
                      >
                        <CheckSquare
                          size={13}
                          style={{
                            color: subtasks.length > 0 && completedSubtasks === subtasks.length ? 'var(--accent-emerald)' : 'inherit'
                          }}
                        />
                        <span>
                          {t('floatingTasks.checklist')}{' '}
                          {subtasks.length > 0 ? `(${completedSubtasks}/${subtasks.length})` : ''}
                        </span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>

                      {task.labels &&
                        task.labels.map((lbl, idx) => (
                          <span
                            key={idx}
                            className="event-tag"
                            style={{ background: 'rgba(245, 158, 11, 0.15)', color: TimelineColor.AMBER }}
                          >
                            #{lbl}
                          </span>
                        ))}

                      <button
                        type="button"
                        onClick={() => onCompleteTask(task.id)}
                        className="btn btn-outline btn-sm"
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 10px',
                          color: TimelineColor.AMBER,
                          borderColor: 'rgba(245, 158, 11, 0.3)'
                        }}
                      >
                        <CheckCircle2 size={13} /> {t('floatingTasks.completeAndPin')}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Checklist Drawer */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          overflow: 'hidden',
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid var(--border-glass)'
                        }}
                      >
                        {/* Checklist items list */}
                        {subtasks.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                            {subtasks.map((st, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  background: 'var(--bg-glass)',
                                  border: '1px solid var(--border-glass)',
                                  transition: 'background 0.15s'
                                }}
                              >
                                <div
                                  onClick={() => onToggleTask && onToggleTask(task.id, idx)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    flex: 1
                                  }}
                                >
                                  <div
                                    className="task-checkbox"
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '4px',
                                      background: st.completed ? 'var(--accent-emerald)' : 'transparent',
                                      borderColor: st.completed ? 'var(--accent-emerald)' : 'var(--border-glass-glow)',
                                      color: 'var(--text-main)',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}
                                  >
                                    {st.completed && '✓'}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: '0.83rem',
                                      textDecoration: st.completed ? 'line-through' : 'none',
                                      color: st.completed ? 'var(--text-dim)' : 'var(--text-main)'
                                    }}
                                  >
                                    {st.text}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => onDeleteChecklistItem && onDeleteChecklistItem(task.id, idx)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-dim)',
                                    cursor: 'pointer',
                                    padding: '3px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title={t('floatingTasks.deleteChecklistItem')}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '8px', fontStyle: 'italic' }}>
                            {t('floatingTasks.noChecklistItems')}
                          </div>
                        )}

                        {/* Inline input to add a checklist item */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const val = newItemInputs[task.id] || '';
                            if (!val.trim()) return;
                            onAddChecklistItem && onAddChecklistItem(task.id, val.trim());
                            setNewItemInputs((prev) => ({ ...prev, [task.id]: '' }));
                          }}
                          style={{ display: 'flex', gap: '8px' }}
                        >
                          <input
                            type="text"
                            placeholder={t('floatingTasks.addChecklistPlaceholder')}
                            value={newItemInputs[task.id] || ''}
                            onChange={(e) => setNewItemInputs((prev) => ({ ...prev, [task.id]: e.target.value }))}
                            style={{
                              flex: 1,
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              background: 'var(--bg-glass)',
                              border: '1px solid var(--border-glass)',
                              borderRadius: '6px',
                              color: 'var(--text-main)',
                              outline: 'none'
                            }}
                          />
                          <button
                            type="submit"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 12px', fontSize: '0.75rem', gap: '4px' }}
                          >
                            <Plus size={13} /> {t('buttons.add')}
                          </button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px' }}>
          {t('floatingTasks.emptyStack')}
        </div>
      )}
    </div>
  );
}
