import React from 'react';
import {
  Wallet,
  PiggyBank,
  ArrowDownLeft,
  CalendarClock,
  ShoppingCart,
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  TrendingDown,
  Scale,
  Gem
} from 'lucide-react';
import { TimelineColor } from '../../enums/index.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

function Tile({ icon: Icon, color, label, value, detail }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: '10px',
        border: '1px solid var(--border-glass)',
        background: 'var(--bg-glass)',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        minWidth: 0
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)' }}>
        <Icon size={13} style={{ color, flexShrink: 0 }} />
        {label}
      </span>
      <span style={{ fontSize: '1rem', fontWeight: '800', color: value < 0 ? TimelineColor.DANGER : 'var(--text-main)' }}>
        {formatCurrency(value)}
      </span>
      {detail && <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{detail}</span>}
    </div>
  );
}

/**
 * "Where is my money": the 12 answers of shared/finance/moneySummary.js (available, savings and each space,
 * received, expected, spent, transferred, withdrawn, put into savings, paid on loans, amortized, owed) and the wealth.
 *
 * Props: summary (computeMoneySummary result), asOfLabel (e.g. "setembro 2026"), t
 */
export default function MoneySummaryPanel({ summary, asOfLabel, t }) {
  if (!summary) return null;
  const spaceLabel = (space) => (space.isGeneral ? t('account.general') : space.name);
  const spent = summary.spentFromAvailable + summary.spentViaSavings;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {t('moneySummary.title')}
        </span>
        {asOfLabel && <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{t('moneySummary.asOf', { date: asOfLabel })}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
        <Tile icon={Wallet} color={TimelineColor.INCOME} label={t('moneySummary.available')} value={summary.available} />
        <Tile icon={PiggyBank} color={TimelineColor.INVESTMENT} label={t('moneySummary.savings')} value={summary.savingsTotal} />
        <Tile icon={ArrowDownLeft} color={TimelineColor.SUCCESS} label={t('moneySummary.received')} value={summary.received} />
        <Tile icon={CalendarClock} color={TimelineColor.PRIMARY} label={t('moneySummary.expected')} value={summary.expectedToReceive} />
        <Tile
          icon={ShoppingCart}
          color={TimelineColor.EXPENSE}
          label={t('moneySummary.spent')}
          value={spent}
          detail={t('moneySummary.spentDetail', { available: formatCurrency(summary.spentFromAvailable), savings: formatCurrency(summary.spentViaSavings) })}
        />
        <Tile icon={ArrowLeftRight} color={TimelineColor.CYAN} label={t('moneySummary.transferred')} value={summary.transferred} />
        <Tile icon={ArrowDownRight} color={TimelineColor.INCOME} label={t('moneySummary.withdrawn')} value={summary.withdrawn} />
        <Tile
          icon={ArrowUpRight}
          color={TimelineColor.INVESTMENT}
          label={t('moneySummary.putIntoSavings')}
          value={summary.putIntoSavingsInternal}
          detail={summary.putIntoSavingsExternal > 0 ? t('moneySummary.externalDetail', { amount: formatCurrency(summary.putIntoSavingsExternal) }) : null}
        />
        <Tile icon={Landmark} color={TimelineColor.LOAN} label={t('moneySummary.loanPaid')} value={summary.loanPaid} />
        <Tile icon={TrendingDown} color={TimelineColor.SUCCESS} label={t('moneySummary.amortized')} value={summary.amortized} />
        <Tile icon={Scale} color={TimelineColor.DANGER} label={t('moneySummary.owed')} value={summary.owed} />
        <Tile icon={Gem} color={TimelineColor.AMBER} label={t('moneySummary.wealth')} value={summary.wealth} detail={t('moneySummary.wealthDetail')} />
      </div>

      {/* Each space of the account */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)' }}>{t('moneySummary.bySpace')}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {summary.spaces.map((space) => (
            <span
              key={space.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                border: '1px solid var(--border-glass)',
                background: 'var(--bg-glass)',
                fontSize: '0.76rem',
                fontWeight: '700',
                color: 'var(--text-main)'
              }}
            >
              {space.isGeneral ? <Landmark size={12} style={{ color: TimelineColor.INVESTMENT }} /> : <PiggyBank size={12} style={{ color: TimelineColor.INVESTMENT }} />}
              {spaceLabel(space)}
              <span style={{ color: space.balance < 0 ? TimelineColor.DANGER : TimelineColor.INVESTMENT }}>{formatCurrency(space.balance)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
