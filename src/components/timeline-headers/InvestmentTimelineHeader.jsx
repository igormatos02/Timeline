import React, { useState } from 'react';
import {
  PiggyBank,
  DollarSign,
  Landmark,
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';
import { formatCurrency } from '../../utils/loanCalculations';

export default function InvestmentTimelineHeader({
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

  const headerColor = timeline.color || '#6366f1';
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
              background: 'rgba(99, 102, 241, 0.12)',
              color: headerColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${headerColor}33`,
              flexShrink: 0
            }}
          >
            <PiggyBank size={18} />
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
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: headerColor,
                  border: `1px solid ${headerColor}44`,
                  textTransform: 'uppercase'
                }}
              >
                Investimentos
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
              <span>Novo Aporte</span>
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

      {/* Conteúdo Expandido com Métricas de Investimentos */}
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
                    background: activeViewMode === 'summary' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                    color: activeViewMode === 'summary' ? '#6366f1' : 'var(--text-muted)'
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
                    background: activeViewMode === 'graph' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                    color: activeViewMode === 'graph' ? '#6366f1' : 'var(--text-muted)'
                  }}
                >
                  <Sparkles size={13} />
                  <span>Evolução</span>
                </button>
              </div>
            </div>
          )}

          <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
            {/* Valor em Investimentos */}
            <div className="meta-item" style={{ padding: '6px 10px' }}>
              <div className="meta-icon-box" style={{ color: '#6366f1' }}>
                <DollarSign size={16} />
              </div>
              <div>
                <div className="meta-label" style={{ fontSize: '0.7rem' }}>Valor em Investimentos</div>
                <div className="meta-value" style={{ color: 'var(--primary-light)', fontSize: '0.94rem', fontWeight: '800' }}>
                  {formatCurrency(metrics.totalInvestedMarket ?? ((metrics.totalInvested ?? 0) + (metrics.totalPatrimonioGain || 0)))}
                </div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Investido: {formatCurrency(metrics.totalInvested ?? 0)}
                </div>
              </div>
            </div>

            {/* Total Poupança */}
            <div className="meta-item" style={{ padding: '6px 10px' }}>
              <div className="meta-icon-box" style={{ color: '#10b981' }}>
                <PiggyBank size={16} />
              </div>
              <div>
                <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Poupança</div>
                <div className="meta-value" style={{ color: '#10b981', fontSize: '0.94rem', fontWeight: '800' }}>
                  {formatCurrency(metrics.totalPoupanca ?? 0)}
                </div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Reserva e liquidez</div>
              </div>
            </div>

            {/* Total Património */}
            <div className="meta-item" style={{ padding: '6px 10px' }}>
              <div className="meta-icon-box" style={{ color: '#a855f7' }}>
                <Landmark size={16} />
              </div>
              <div>
                <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Património</div>
                <div className="meta-value" style={{ color: '#c084fc', fontSize: '0.94rem', fontWeight: '800' }}>
                  {formatCurrency(metrics.totalPatrimonio ?? 0)}
                </div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Bens e ativos</div>
              </div>
            </div>

            {/* Total Outros */}
            <div className="meta-item" style={{ padding: '6px 10px' }}>
              <div className="meta-icon-box" style={{ color: '#38bdf8' }}>
                <Sparkles size={16} />
              </div>
              <div>
                <div className="meta-label" style={{ fontSize: '0.7rem' }}>Total Outros</div>
                <div className="meta-value" style={{ color: '#38bdf8', fontSize: '0.94rem', fontWeight: '800' }}>
                  {formatCurrency(metrics.totalOutros ?? 0)}
                </div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Fundos / Ações / Outros</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
