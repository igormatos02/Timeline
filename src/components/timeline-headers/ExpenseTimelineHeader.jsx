import React, { useState } from 'react';
import {
  ShoppingCart,
  Sparkles,
  Clock,
  TrendingDown,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';
import { formatCurrency } from '../../utils/loanCalculations';

export default function ExpenseTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  onEdit,
  onDelete,
  onAddEvent,
  activeViewMode = 'summary',
  setActiveViewMode
}) {
  const [collapsed, setIsCollapsed] = useState(false);

  if (!timeline) return null;

  const headerColor = timeline.color || '#f43f5e';
  const metrics = timeline.metrics || {};

  return (
    <div
      className={`timeline-hero glass-panel ${collapsed ? 'hero-collapsed' : ''}`}
      style={{
        borderLeft: `4px solid ${headerColor}`,
        '--active-timeline-color': headerColor,
        padding: collapsed ? '12px 18px' : '16px 20px',
        marginBottom: '10px',
        transition: 'padding 0.2s ease, box-shadow 0.2s ease',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* 🏷️ Topo: Título, Ícone e Ações */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: collapsed ? '0' : '12px',
          borderBottom: collapsed ? 'none' : '1px solid var(--border-glass)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setIsCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir cabeçalho" : "Recolher cabeçalho"}
            title={collapsed ? "Expandir cabeçalho" : "Recolher cabeçalho"}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, transform 0.2s ease',
              flexShrink: 0
            }}
          >
            {collapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
          </button>

          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'rgba(244, 63, 94, 0.12)',
              color: headerColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${headerColor}33`,
              flexShrink: 0
            }}
          >
            <ShoppingCart size={18} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {timeline.name}
              </h1>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(244, 63, 94, 0.12)',
                  color: headerColor,
                  border: `1px solid ${headerColor}44`,
                  textTransform: 'uppercase'
                }}
              >
                Gastos e Despesas
              </span>
            </div>
            {timeline.description && (
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {timeline.description}
              </p>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onAddEvent && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onAddEvent}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '700'
              }}
            >
              <Plus size={14} />
              <span>Novo Gasto</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onEdit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}
            >
              <Edit3 size={13} />
              <span>Editar</span>
            </button>
          )}

          {onDelete && !timeline.isSystemDefault && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={onDelete}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}
            >
              <Trash2 size={13} />
              <span>Excluir</span>
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo Expandido com Métricas de Despesas */}
      {!collapsed && (
        <div style={{ paddingTop: '14px' }}>
          {setActiveViewMode && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '3px',
                  gap: '3px',
                  height: '32px',
                  alignItems: 'center'
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveViewMode('summary')}
                  className={`btn-view-toggle ${activeViewMode === 'summary' ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: activeViewMode === 'summary' ? '800' : '600',
                    cursor: 'pointer',
                    background: activeViewMode === 'summary' ? 'rgba(244, 63, 94, 0.18)' : 'transparent',
                    color: activeViewMode === 'summary' ? '#f43f5e' : 'var(--text-muted)'
                  }}
                >
                  <Layers size={13} />
                  <span>Resumo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewMode('graph')}
                  className={`btn-view-toggle ${activeViewMode === 'graph' ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: activeViewMode === 'graph' ? '800' : '600',
                    cursor: 'pointer',
                    background: activeViewMode === 'graph' ? 'rgba(244, 63, 94, 0.18)' : 'transparent',
                    color: activeViewMode === 'graph' ? '#f43f5e' : 'var(--text-muted)'
                  }}
                >
                  <Sparkles size={13} />
                  <span>Evolução</span>
                </button>
              </div>
            </div>
          )}

          <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
            {/* Pago este Mês */}
            <div className="meta-item" style={{ padding: '6px 10px' }}>
              <div className="meta-icon-box" style={{ color: '#f43f5e' }}>
                <ShoppingCart size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span className="meta-label" style={{ fontSize: '0.7rem' }}>Pago este Mês</span>
                  <span style={{ color: '#f43f5e', fontSize: '0.94rem', fontWeight: '800' }}>
                    {formatCurrency(metrics.currentMonthExpensesPaid ?? 0)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '0.67rem', color: 'var(--text-dim)' }}>Gastos:</span>
                    <span style={{ color: '#f43f5e', fontSize: '0.74rem', fontWeight: '700' }}>
                      {formatCurrency(metrics.currentMonthExpensesOnlyPaid ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Projeção Anual */}
            <div className="meta-item" style={{ padding: '6px 10px' }}>
              <div className="meta-icon-box" style={{ color: '#f59e0b' }}>
                <Sparkles size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span className="meta-label" style={{ fontSize: '0.7rem' }}>Projeção Anual</span>
                  <span style={{ fontSize: '0.94rem', fontWeight: '800', color: '#f59e0b' }}>
                    {formatCurrency(metrics.annualProjectedExpenses ?? metrics.projectedAnnualExpenses ?? 0)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '0.67rem', color: 'var(--text-dim)' }}>Gastos Previstos:</span>
                    <span style={{ color: '#f43f5e', fontSize: '0.74rem', fontWeight: '700' }}>
                      {formatCurrency(metrics.annualProjectedExpensesOnly ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Acumulado Projetado */}
            <div className="meta-item" style={{ padding: '6px 10px' }}>
              <div className="meta-icon-box" style={{ color: '#fb7185' }}>
                <Clock size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span className="meta-label" style={{ fontSize: '0.7rem' }}>Total Acumulado Projetado</span>
                  <span style={{ color: '#fb7185', fontSize: '0.94rem', fontWeight: '800' }}>
                    -{formatCurrency(metrics.totalPlannedExpensesUpToCurrent ?? 0)}
                  </span>
                </div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Até ao mês atual
                </div>
              </div>
            </div>

            {/* Total Acumulado Realizado */}
            <div className="meta-item" style={{ padding: '6px 10px' }}>
              <div className="meta-icon-box" style={{ color: '#f43f5e' }}>
                <TrendingDown size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span className="meta-label" style={{ fontSize: '0.7rem' }}>Total Acumulado Realizado</span>
                  <span style={{ color: '#f43f5e', fontSize: '0.94rem', fontWeight: '800' }}>
                    -{formatCurrency(metrics.totalPaidExpenses ?? 0)}
                  </span>
                </div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Do início até ao mês atual
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
