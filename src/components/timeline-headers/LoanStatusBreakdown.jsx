import React from 'react';
import { CalendarClock, AlertTriangle, CheckCircle2, Scissors, Ban, Zap } from 'lucide-react';
import { TimelineColor } from '../../enums/index.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

// Groups shown for installments and amortizations: [state, icon, color]
const INSTALLMENT_GROUPS = [
  ['pending', CalendarClock, TimelineColor.PRIMARY],
  ['overdue', AlertTriangle, TimelineColor.WARNING],
  ['paid', CheckCircle2, TimelineColor.SUCCESS],
  ['abated', Scissors, TimelineColor.CYAN],
  ['cancelled', Ban, TimelineColor.SLATE]
];
const AMORTIZATION_GROUPS = [
  ['pending', CalendarClock, TimelineColor.PRIMARY],
  ['realized', Zap, TimelineColor.SUCCESS],
  ['cancelled', Ban, TimelineColor.SLATE]
];

function GroupRow({ title, groups, data, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px' }}>
        {groups.map(([state, Icon, color]) => {
          const group = data?.[state] || { count: 0, amount: 0 };
          return (
            <div
              key={state}
              style={{
                padding: '7px 9px',
                borderRadius: '8px',
                border: '1px solid var(--border-glass)',
                background: 'var(--bg-glass)',
                opacity: group.count > 0 ? 1 : 0.55,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                <Icon size={12} style={{ color }} />
                {t(`loanHeader.states.${state}`)}
              </span>
              <span style={{ fontSize: '0.86rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {group.count} · {formatCurrency(group.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Loan movements split by state (shared/finance/loanPosition.js): installments pending / overdue / paid / abated /
 * cancelled, amortizations pending / realized / cancelled, and where the amortized capital came from.
 */
export default function LoanStatusBreakdown({ breakdown, t }) {
  if (!breakdown) return null;
  return (
    <div
      style={{
        marginTop: '12px',
        padding: '12px 14px',
        borderRadius: '10px',
        border: '1px solid var(--border-glass)',
        background: 'var(--bg-glass)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      <GroupRow title={t('loanHeader.installmentsByState')} groups={INSTALLMENT_GROUPS} data={breakdown.installments} t={t} />
      <GroupRow title={t('loanHeader.amortizationsByState')} groups={AMORTIZATION_GROUPS} data={breakdown.amortizations} t={t} />
      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
        {t('loanHeader.capitalSources', {
          installments: formatCurrency(breakdown.capitalFromInstallments),
          amortizations: formatCurrency(breakdown.capitalFromAmortizations)
        })}
      </span>
    </div>
  );
}
