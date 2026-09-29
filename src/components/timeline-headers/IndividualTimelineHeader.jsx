import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle2, FileCheck, Printer, Wallet, Landmark } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { BalanceViewMode, EventStatus, TimelineColor, TimelineType, getDefaultTimelineColor, isCancelledStatus, isKindInBalanceViewMode, isPositiveStatus, normalizeTimelineType } from '../../enums/index.js';
import { classifyMovement } from '../../../shared/finance/movements.js';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPaletteTheme } from '../../../shared/config/colorPalettes.js';
import { PieDonut, DonutLegend } from '../ui/DonutChart.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import { useHeaderCollapsed } from '../../context/TimeboardContext.jsx';

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
  // Entity movements in every financial timeline (board total and clearance)
  entityBoardEvents = [],
  allTimelines = [],
  // Side of the entity shown (income side = what it owes, outflow side = what it has to receive)
  entityDirectionMode = BalanceViewMode.INCOME,
  // The owes / has to receive switch, shown next to the actions
  headerSwitch = null,
  onOpenClearance,
  onOpenHistory,
  timeboardSummary = null
}) {
  const { t } = useTranslation();
  const [collapsed, setIsCollapsed] = useHeaderCollapsed();

  // Direction of the figures: what the entity owes (income side) or, on its "to receive" side and in the
  // expense timeline, what is owed to the entity. Both never mix: the wallet holds income and expenses.
  const isPayable = entityDirectionMode === BalanceViewMode.OUTFLOW || normalizeTimelineType(timeline?.type) === TimelineType.EXPENSE;
  const direction = isPayable ? BalanceViewMode.OUTFLOW : BalanceViewMode.INCOME;
  const timelineTypeMap = useMemo(
    () => new Map((allTimelines || []).map((tl) => [String(tl.id), tl.type])),
    [allTimelines]
  );
  const contextEvents = useMemo(
    () => (entityEvents || []).filter((ev) => isKindInBalanceViewMode(classifyMovement(ev, timelineTypeMap).kind, direction)),
    [entityEvents, timelineTypeMap, direction]
  );
  const contextYearEvents = useMemo(
    () => (entityYearEvents || []).filter((ev) => isKindInBalanceViewMode(classifyMovement(ev, timelineTypeMap).kind, direction)),
    [entityYearEvents, timelineTypeMap, direction]
  );

  // Balance: the open amount split by account, named as the user named each timeline
  const isBalanceTimeline = normalizeTimelineType(timeline?.type) === TimelineType.BALANCE;
  const accountBreakdown = useMemo(() => {
    if (!isBalanceTimeline) return [];
    const byAccount = new Map();
    contextEvents.filter(isOpenObligation).forEach((ev) => {
      const ownId = String(ev.timelineId || ev.timeline_id || '');
      const account = (allTimelines || []).find((tl) => String(tl.id) === ownId);
      if (!account) return;
      const entry = byAccount.get(String(account.id)) || { id: account.id, name: account.name, color: account.color, amount: 0 };
      entry.amount += Math.abs(Number(ev.amount || 0));
      byAccount.set(String(account.id), entry);
    });
    return Array.from(byAccount.values()).sort((a, b) => b.amount - a.amount);
  }, [isBalanceTimeline, allTimelines, contextEvents]);

  const { debtBalance, openCount, boardDebtBalance } = useMemo(() => {
    const sumOpen = (list) => list.filter(isOpenObligation).reduce((sum, ev) => sum + Math.abs(Number(ev.amount || 0)), 0);
    const boardEvents = (entityBoardEvents || []).filter((ev) => isKindInBalanceViewMode(classifyMovement(ev, timelineTypeMap).kind, direction));
    const contextDebt = sumOpen(contextEvents);
    return {
      debtBalance: contextDebt,
      openCount: contextEvents.filter(isOpenObligation).length,
      // Without board movements (e.g. the individual role view) the timeline figure is the total
      boardDebtBalance: boardEvents.length > 0 ? sumOpen(boardEvents) : contextDebt
    };
  }, [contextEvents, entityBoardEvents, timelineTypeMap, direction]);

  // Current calendar year progress: planned vs realized vs remaining
  const { plannedYear, realizedYear, remainingYear, realizedPct } = useMemo(() => {
    let planned = 0;
    let realized = 0;
    contextYearEvents.forEach((ev) => {
      if (!ev || ev.isDeleted || ev.status === EventStatus.DELETED || isCancelledStatus(ev.status)) return;
      const amt = Math.abs(Number(ev.amount || 0));
      planned += amt;
      if (isPositiveStatus(ev.status) || ev.isCompleted) realized += amt;
    });
    const pct = planned > 0 ? Math.min(100, Math.round((realized / planned) * 100)) : 0;
    return { plannedYear: planned, realizedYear: realized, remainingYear: Math.max(0, planned - realized), realizedPct: pct };
  }, [contextYearEvents]);

  // Current accumulation: everything already realized by the entity (from the timeline's compute start)
  const currentAccumulation = useMemo(() => contextEvents.reduce((sum, ev) => {
    if (!ev || ev.isDeleted || ev.status === EventStatus.DELETED || isCancelledStatus(ev.status)) return sum;
    if (!(isPositiveStatus(ev.status) || ev.isCompleted)) return sum;
    return sum + Math.abs(Number(ev.amount || 0));
  }, 0), [contextEvents]);

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
  // The clearance declares the whole board: blocked by any open obligation, whatever the timeline shown
  const hasBoardDebt = boardDebtBalance > 0;
  const showBoardTotal = Math.abs(boardDebtBalance - debtBalance) >= 0.005;
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
              disabled={hasBoardDebt}
              title={hasBoardDebt ? t('individualHeader.getClearanceDisabled') : t('individualHeader.getClearance')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: hasBoardDebt ? 0.5 : 1,
                cursor: hasBoardDebt ? 'not-allowed' : 'pointer'
              }}
            >
              <FileCheck size={14} />
              <span>{t('individualHeader.getClearance')}</span>
            </button>
          )}
          {headerSwitch}
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
            <span>{t(isPayable ? 'individualHeader.payableBalance' : 'individualHeader.debtBalance')}</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: debtColor, lineHeight: 1.1 }}>
            {formatCurrency(debtBalance)}
          </div>
          <div style={{ fontSize: '0.74rem', color: hasDebt ? 'var(--text-dim)' : debtColor, lineHeight: 1.3 }}>
            {hasDebt
              ? t('individualHeader.debtBalanceHint', { count: openCount })
              : t('individualHeader.noPendingObligations', { name: entityName })}
          </div>
          {/* Board total when this timeline only holds part of it (the same debt can be paid in cash or by bank) */}
          {/* Balance: how much of it is in each account */}
          {accountBreakdown.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '6px', borderTop: '1px dashed var(--border-glass)' }}>
              {accountBreakdown.map((account) => (
                <div key={account.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.74rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: account.color || 'var(--text-muted)' }} />
                    {account.name}
                  </span>
                  <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(account.amount)}</strong>
                </div>
              ))}
            </div>
          )}
          {showBoardTotal && (
            <div style={{ fontSize: '0.76rem', fontWeight: '700', color: hasBoardDebt ? TimelineColor.DANGER : 'var(--text-main)', paddingTop: '4px', borderTop: '1px dashed var(--border-glass)' }}>
              {t('individualHeader.boardTotal', { amount: formatCurrency(boardDebtBalance) })}
            </div>
          )}
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
                <Landmark size={14} style={{ color: TimelineColor.INVESTMENT }} />
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
