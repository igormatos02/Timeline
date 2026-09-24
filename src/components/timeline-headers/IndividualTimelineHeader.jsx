import React, { useState, useMemo } from 'react';
import { AlertCircle, CheckCircle2, FileCheck, Printer, Wallet, PiggyBank } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { EventStatus, TimelineColor, getDefaultTimelineColor, isCancelledStatus, isPositiveStatus } from '../../enums/index.js';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPaletteTheme } from '../../../shared/config/colorPalettes.js';
import { PieDonut, DonutLegend } from '../ui/DonutChart.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import EntityViewSwitch from '../ui/EntityViewSwitch.jsx';

// An obligation is open (overdue or pending) when it is not completed, cancelled or deleted.
const isOpenObligation = (ev) => {
  if (!ev || ev.isDeleted) return false;
  if (ev.status === EventStatus.DELETED) return false;
  if (isCancelledStatus(ev.status)) return false;
  if (isPositiveStatus(ev.status) || ev.isCompleted) return false;
  return true;
};

export default function IndividualTimelineHeader({
  timeline,
  entityEvents = [],
  entityYearEvents = [],
  selectedEntity = null,
  selectedEntityId,
  isIndividualView,
  onToggleIndividualView,
  onOpenClearance,
  onOpenHistory,
  timeboardSummary = null
}) {
  const { t } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(false);

  const { debtBalance, openCount } = useMemo(() => {
    const open = (entityEvents || []).filter(isOpenObligation);
    const total = open.reduce((sum, ev) => sum + Math.abs(Number(ev.amount || 0)), 0);
    return { debtBalance: total, openCount: open.length };
  }, [entityEvents]);

  // Current calendar year progress: planned vs realized vs remaining
  const { plannedYear, realizedYear, remainingYear, realizedPct } = useMemo(() => {
    let planned = 0;
    let realized = 0;
    (entityYearEvents || []).forEach((ev) => {
      if (!ev || ev.isDeleted || ev.status === EventStatus.DELETED || isCancelledStatus(ev.status)) return;
      const amt = Math.abs(Number(ev.amount || 0));
      planned += amt;
      if (isPositiveStatus(ev.status) || ev.isCompleted) realized += amt;
    });
    const pct = planned > 0 ? Math.min(100, Math.round((realized / planned) * 100)) : 0;
    return { plannedYear: planned, realizedYear: realized, remainingYear: Math.max(0, planned - realized), realizedPct: pct };
  }, [entityYearEvents]);

  // Current accumulation: everything already realized by the entity (from the timeline's compute start)
  const currentAccumulation = useMemo(() => (entityEvents || []).reduce((sum, ev) => {
    if (!ev || ev.isDeleted || ev.status === EventStatus.DELETED || isCancelledStatus(ev.status)) return sum;
    if (!(isPositiveStatus(ev.status) || ev.isCompleted)) return sum;
    return sum + Math.abs(Number(ev.amount || 0));
  }, 0), [entityEvents]);

  const paletteTheme = useMemo(
    () => getPaletteTheme(timeline?.color, getDefaultTimelineColor(timeline?.type)),
    [timeline?.color, timeline?.type]
  );

  if (!timeline) return null;

  const currentYear = new Date().getFullYear();
  const yearItems = [
    {
      name: t('individualHeader.realizedYear', { year: currentYear }),
      amount: realizedYear,
      percent: realizedPct,
      color: paletteTheme.primary
    },
    {
      name: t('individualHeader.remainingYear', { year: currentYear }),
      amount: remainingYear,
      percent: plannedYear > 0 ? Math.max(0, 100 - realizedPct) : 0,
      color: paletteTheme.light || paletteTheme.secondary
    }
  ];

  const headerColor = timeline.color || getDefaultTimelineColor(timeline.type);
  const hasDebt = debtBalance > 0;
  const debtColor = hasDebt ? TimelineColor.DANGER : TimelineColor.SUCCESS;
  const entityName = selectedEntity?.name || String(selectedEntityId || '');

  return (
    <HeaderShell
      timeline={timeline}
      collapsed={collapsed}
      onToggle={() => setIsCollapsed((prev) => !prev)}
      headerColor={headerColor}
      left={
        <HeaderTitleBlock
          color={headerColor}
          name={timeline.name}
          description={timeline.description}
          id={timeline.id}
        />
      }
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {onOpenHistory && (
            <button
              type="button"
              id="individual-print-history"
              className="btn btn-secondary btn-sm"
              onClick={onOpenHistory}
              title={t('individualHeader.printHistory')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={14} />
              <span>{t('individualHeader.printHistory')}</span>
            </button>
          )}
          {onOpenClearance && (
            <button
              type="button"
              id="individual-get-clearance"
              className="btn btn-primary btn-sm"
              onClick={onOpenClearance}
              disabled={hasDebt}
              title={hasDebt ? t('individualHeader.getClearanceDisabled') : t('individualHeader.getClearance')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: hasDebt ? 0.5 : 1,
                cursor: hasDebt ? 'not-allowed' : 'pointer'
              }}
            >
              <FileCheck size={14} />
              <span>{t('individualHeader.getClearance')}</span>
            </button>
          )}
          <EntityViewSwitch
            selectedEntityId={selectedEntityId}
            isIndividualView={isIndividualView}
            onToggle={onToggleIndividualView}
          />
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', paddingTop: '12px' }}>
        {/* Saldo Devedor: sum of overdue + pending obligations for the selected entity */}
        <div
          style={{
            background: 'var(--bg-glass)',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid var(--border-glass)',
            borderLeft: `3px solid ${debtColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {hasDebt
              ? <AlertCircle size={14} style={{ color: debtColor }} />
              : <CheckCircle2 size={14} style={{ color: debtColor }} />}
            <span>{t('individualHeader.debtBalance')}</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: debtColor, lineHeight: 1.1 }}>
            {formatCurrency(debtBalance)}
          </div>
          <div style={{ fontSize: '0.74rem', color: hasDebt ? 'var(--text-dim)' : debtColor, lineHeight: 1.3 }}>
            {hasDebt
              ? t('individualHeader.debtBalanceHint', { count: openCount })
              : t('individualHeader.noPendingObligations', { name: entityName })}
          </div>
        </div>

        {/* Acumulação atual + ano corrente (planeado, realizado e em falta) da entidade selecionada */}
        <div
          style={{
            background: 'var(--bg-glass)',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('incomeHeader.currentAccumulationTitle')}
            </span>
            <span style={{ fontSize: '0.96rem', fontWeight: '800', color: currentAccumulation > 0 ? TimelineColor.SUCCESS : 'var(--text-main)' }}>
              {formatCurrency(currentAccumulation)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.74rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>
              {t('individualHeader.plannedYear', { year: currentYear })}
            </span>
            <strong style={{ color: 'var(--text-main)', fontSize: '0.86rem' }}>
              {formatCurrency(plannedYear)}
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
            <PieDonut
              items={yearItems}
              centerLabel={`${realizedPct}%`}
              centerColor={paletteTheme.primary}
              empty={plannedYear === 0}
            />
            <DonutLegend
              items={yearItems}
              nameFormatter={(item) => `${item.name}: ${formatCurrency(item.amount)}`}
            />
          </div>
        </div>

        {/* Resumo do condomínio (apenas para utilizadores com papel individual) */}
        {timeboardSummary && (
          <div
            style={{
              background: 'var(--bg-glass)',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('individualHeader.timeboardSummaryTitle')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                <Wallet size={14} style={{ color: timeboardSummary.netBalance >= 0 ? TimelineColor.SUCCESS : TimelineColor.DANGER }} />
                {t('balanceHeader.netRealizedAccumulated')}
              </span>
              <strong style={{ fontSize: '1.1rem', fontWeight: '800', color: timeboardSummary.netBalance >= 0 ? TimelineColor.SUCCESS : TimelineColor.DANGER }}>
                {formatCurrency(timeboardSummary.netBalance)}
              </strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                <PiggyBank size={14} style={{ color: TimelineColor.INVESTMENT }} />
                {t('balanceHeader.inAccount')}
              </span>
              <strong style={{ fontSize: '1.1rem', fontWeight: '800', color: TimelineColor.INVESTMENT }}>
                {formatCurrency(timeboardSummary.savedBalance)}
              </strong>
            </div>
          </div>
        )}
      </div>
    </HeaderShell>
  );
}
