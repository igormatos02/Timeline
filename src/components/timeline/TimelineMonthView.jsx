import React from 'react';
import { groupEventsByDate } from '../../utils/eventSorting.js';
import { EventStatus, EventType, InvestmentEventCategory, LoanEventCategory, MovementKind, TimelineColor, TimelineType } from '../../enums/index.js';
import { classifyMovement } from '../../../shared/finance/movements.js';
import { savingsEffect } from '../../../shared/finance/savingsSpaces.js';
import { differenceInCalendarMonths, format } from 'date-fns';
import FutureHorizonButton from './FutureHorizonButton.jsx';
import { Calendar, Clock, EyeOff, TrendingDown } from 'lucide-react';
import AddEventButton from './AddEventButton.jsx';
import MonthProjectionBadges from '../MonthProjectionBadges.jsx';
import { formatCurrency } from '../../utils/formatCurrency';
import AccountMonthSpaces from '../account/AccountMonthSpaces.jsx';
import LazyMonthBody from './LazyMonthBody.jsx';

// Approximate height of an event card, for the placeholder of months not rendered yet
const ESTIMATED_CARD_HEIGHT = 96;
import TimelineEventCard from '../TimelineEventCard';
import PastHorizonButton from './PastHorizonButton.jsx';

// Extracted from VerticalTimeline.jsx (VerticalTimeline): receives every value it uses as a prop.
export default function TimelineMonthView({
  activeFinancialTab,
  activeTimeboard,
  computeFromMonth,
  dateLocale,
  dayComparator,
  effectiveTimelines,
  handleOpenReceipt,
  hasExpenseTimeline,
  hasIncomeTimeline,
  hasInvestmentTimeline,
  hasLoanTimeline,
  isBalancoView,
  balanceMode,
  isFinancial,
  isFinancialTimeline,
  isLoanTimelineOrTab,
  isReadOnly,
  isReminders,
  monthExpensesRealizedMap,
  monthExpensesTotalMap,
  monthIncomeRealizedMap,
  monthIncomeTotalMap,
  monthInvestmentsDeductionsMap,
  monthInvestmentsDeductionsRealizedMap,
  monthInvestmentsExternalMap,
  monthInvestmentsExternalRealizedMap,
  monthInvestmentsRealizedMap,
  monthInvestmentsTotalMap,
  monthLoansRealizedMap,
  monthLoansTotalMap,
  monthProjectionMode,
  monthsList,
  onAddChecklistItem,
  onAddEventForDate,
  onDeleteChecklistItem,
  onDeleteEvent,
  onDeletePocket,
  onEditEvent,
  onEditPocket,
  onLoadMoreFuture,
  onLoadMorePast,
  onNavigateToTimeline,
  onOpenAmortizationModal,
  onOpenCreatePocket,
  onOpenEditInstallment,
  onOpenWithdrawModal,
  onPayUpToHere,
  onToggleLoanPayment,
  onToggleTask,
  onUpdateEventDirect,
  paletteTheme,
  persons,
  pockets,
  selectedCategoryFilter,
  setMonthProjectionMode,
  showEmptyDays,
  t,
  timeline,
  timelines,
  todayDate
}) {


  // Pre-calculate chronological running cumulative metrics
  const monthCumulativeMap = new Map();
  const seenInitialInvestments = new Set();
  let runningIncome = 0;
  let runningExpense = 0;
  let runningInvestment = 0;

  const sortedChronologicalMonths = [...monthsList].sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime());
  sortedChronologicalMonths.forEach((mG) => {
    let mInc = 0;
    let mExp = 0;
    let mInv = 0;

    mG.events.forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted) return;
      if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED || ev.status === EventStatus.ABATED || ev.isAbated || ev.isAbatida || ev.status === 'Abatida') return;

      // Shared financial engine: references never count, savings expenses stay in the savings
      const movement = classifyMovement(ev);
      if (movement.isReference) return;
      const amt = movement.amount;
      const isIncome = movement.kind === MovementKind.INCOME;
      const isExpense = movement.kind === MovementKind.EXPENSE || movement.kind === MovementKind.LOAN_INSTALLMENT || movement.kind === MovementKind.AMORTIZATION;
      const savingsDelta = savingsEffect(movement);
      const isInvestment = savingsDelta !== 0 || ev.eventType === EventType.INVESTMENT;

      const initialKey = ev.eventId || ev.seriesId || ev.id;
      let initialAmt = 0;
      if (isInvestment && ev.initialInvestedAmount && !seenInitialInvestments.has(initialKey)) {
        initialAmt = Number(ev.initialInvestedAmount) || 0;
        seenInitialInvestments.add(initialKey);
      }

      if (isIncome) mInc += amt;
      if (isExpense) mExp += amt;
      if (isInvestment) mInv += savingsDelta + initialAmt;
    });

    runningIncome += mInc;
    runningExpense += mExp;
    runningInvestment += mInv;

    monthCumulativeMap.set(format(mG.monthDate, 'yyyy-MM'), {
      income: runningIncome,
      expense: runningExpense,
      investment: runningInvestment
    });
  });

  return (
    <div className="vertical-timeline-container">
      {/* Left Main Chronological Timeline Spine */}
      <div className="timeline-spine" />
      <div
        className="timeline-spine-gradient"
        style={{ background: `linear-gradient(180deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)` }}
      />

      {/* Botão Carregar Mais Futuro */}
      <FutureHorizonButton onLoadMoreFuture={onLoadMoreFuture} t={t} />

      {monthsList.map((mGroup) => {
        const currentMonthKey = format(todayDate, 'yyyy-MM');
        const monthKeyStr = format(mGroup.monthDate, 'yyyy-MM');
        const isCurrentMonth = currentMonthKey === monthKeyStr;
        const isFutureMonth = monthKeyStr > currentMonthKey;
        const monthTitleStr = format(mGroup.monthDate, 'MMMM yyyy', { locale: dateLocale });
        const hasEvents = mGroup.events.length > 0;

        const mMonthProjectedExpense = hasExpenseTimeline ? (monthExpensesTotalMap.get(monthKeyStr) || 0) : 0;
        const mMonthProjectedLoan = hasLoanTimeline ? (monthLoansTotalMap.get(monthKeyStr) || 0) : 0;
        const mMonthProjectedIncome = hasIncomeTimeline ? (monthIncomeTotalMap.get(monthKeyStr) || 0) : 0;
        const mMonthProjectedInvestment = hasInvestmentTimeline ? (monthInvestmentsTotalMap.get(monthKeyStr) || 0) : 0;
        const mMonthProjectedInvestmentInternal = hasInvestmentTimeline ? (monthInvestmentsDeductionsMap.get(monthKeyStr) || 0) : 0;
        const mMonthProjectedInvestmentExternal = hasInvestmentTimeline ? (monthInvestmentsExternalMap.get(monthKeyStr) || 0) : 0;
        const mMonthProjectedInvestmentDeduction = mMonthProjectedInvestmentInternal;
        const mMonthProjectedSaldo = mMonthProjectedIncome - (mMonthProjectedExpense + mMonthProjectedLoan + mMonthProjectedInvestmentDeduction);

        const mMonthRealizedExpense = hasExpenseTimeline ? (monthExpensesRealizedMap.get(monthKeyStr) || 0) : 0;
        const mMonthRealizedLoan = hasLoanTimeline ? (monthLoansRealizedMap.get(monthKeyStr) || 0) : 0;
        const mMonthRealizedIncome = hasIncomeTimeline ? (monthIncomeRealizedMap.get(monthKeyStr) || 0) : 0;
        const mMonthRealizedInvestment = hasInvestmentTimeline ? (monthInvestmentsRealizedMap.get(monthKeyStr) || 0) : 0;
        const mMonthRealizedInvestmentInternal = hasInvestmentTimeline ? (monthInvestmentsDeductionsRealizedMap.get(monthKeyStr) || 0) : 0;
        const mMonthRealizedInvestmentExternal = hasInvestmentTimeline ? (monthInvestmentsExternalRealizedMap.get(monthKeyStr) || 0) : 0;
        const mMonthRealizedInvestmentDeduction = mMonthRealizedInvestmentInternal;
        const mMonthRealizedSaldo = mMonthRealizedIncome - (mMonthRealizedExpense + mMonthRealizedLoan + mMonthRealizedInvestmentDeduction);

        const isNotComputedMonth = Boolean(isFinancial && computeFromMonth && monthKeyStr < computeFromMonth);
        // Months around today render at once: the view opens positioned on the current month, and the months
        // just above it (the next ones) must already have their real height
        const monthsFromToday = differenceInCalendarMonths(mGroup.monthDate, todayDate);
        const isNearToday = monthsFromToday >= -1 && monthsFromToday <= 2;

        if (!showEmptyDays && !hasEvents && !isCurrentMonth) return null;

        return (
          <div
            key={format(mGroup.monthDate, 'yyyy-MM')}
            id={isCurrentMonth ? 'timeline-node-today' : `timeline-month-${format(mGroup.monthDate, 'yyyy-MM')}`}
            data-month-key={format(mGroup.monthDate, 'yyyy-MM')}
            className={`timeline-day-row ${isCurrentMonth ? 'is-today' : ''} ${isFutureMonth ? 'is-future-month' : ''} ${isNotComputedMonth ? 'is-not-computed-month' : ''}`}
          >
            <div className="day-date-col">
              <div className="day-date-main" style={{ color: isNotComputedMonth ? 'var(--text-dim)' : (isFutureMonth ? 'var(--text-dim)' : 'var(--text-main)') }}>
                {format(mGroup.monthDate, 'MMM', { locale: dateLocale }).toUpperCase()}
              </div>
              <div className="day-date-sub" style={{ color: isFutureMonth ? 'var(--text-dim)' : 'var(--text-muted)' }}>
                {format(mGroup.monthDate, 'yyyy')}
              </div>
              {isCurrentMonth && <span className="today-badge-chip pulse-glow">{t('timeline.currentMonth')}</span>}
            </div>

            <div className="day-node-wrapper">
              <div
                className={`day-node-dot ${isCurrentMonth ? 'is-today-node' : hasEvents ? 'has-events' : ''}`}
                style={
                  hasEvents && !isCurrentMonth
                    ? {
                      backgroundColor: isNotComputedMonth
                        ? `${TimelineColor.SLATE_LIGHT}40`
                        : (isFutureMonth
                          ? `${TimelineColor.SLATE_LIGHT}66`
                          : paletteTheme.primary),
                      borderColor: isNotComputedMonth
                        ? `${TimelineColor.SLATE_LIGHT}40`
                        : (isFutureMonth ? `${TimelineColor.SLATE_LIGHT}4c` : undefined)
                    }
                    : {}
                }
              />
            </div>

            <div className="day-content-col">
              <div
                className="group-card"
                style={
                  isNotComputedMonth
                    ? { opacity: 0.78, borderStyle: 'dashed', borderColor: `${TimelineColor.SLATE_LIGHT}40` }
                    : (isFutureMonth ? { borderColor: `${TimelineColor.SLATE_LIGHT}2e` } : undefined)
                }
              >
                <div className="group-card-header" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
                    <h3
                      className="group-card-title"
                      style={{
                        margin: 0,
                        textTransform: 'capitalize',
                        color: isNotComputedMonth ? 'var(--text-dim)' : (isFutureMonth ? 'var(--text-muted)' : 'var(--text-main)'),
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <Clock size={18} style={{ color: isNotComputedMonth ? 'var(--text-dim)' : (isFutureMonth ? 'var(--text-dim)' : 'var(--primary-light)') }} />
                      <span>{monthTitleStr}</span>
                      {isNotComputedMonth && (
                        <span
                          className="group-card-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            height: '22px',
                            padding: '0 8px',
                            boxSizing: 'border-box',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            color: 'var(--text-dim)',
                            borderColor: `${TimelineColor.SLATE_LIGHT}40`,
                            background: `${TimelineColor.SLATE_LIGHT}14`,
                            borderRadius: '999px',
                            letterSpacing: '0.2px',
                            cursor: 'help'
                          }}
                          title={t('timeline.notComputedTooltip')}
                        >
                          <EyeOff size={11} style={{ opacity: 0.8 }} />
                          <span>{t('timeline.notComputed')}</span>
                        </span>
                      )}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        className="group-card-badge"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: '26px',
                          boxSizing: 'border-box',
                          color: isFutureMonth ? 'var(--text-dim)' : 'var(--text-muted)',
                          borderColor: isFutureMonth ? `${TimelineColor.SLATE_LIGHT}2e` : 'var(--border-glass)',
                          background: isFutureMonth ? `${TimelineColor.SLATE_LIGHT}0d` : undefined
                        }}
                      >
                        {t('timeline.eventsCount', { count: mGroup.events.length })}
                      </span>

                      {onOpenAmortizationModal && isLoanTimelineOrTab && (() => {
                        const monthLoanEvents = mGroup.events.filter((e) => e.category === LoanEventCategory.INSTALLMENT || e.category === LoanEventCategory.LOAN_INSTALLMENT || e.eventType === EventType.LOAN_INSTALLMENT);
                        const isAbatidaMonth = monthLoanEvents.length > 0 && monthLoanEvents.every((e) => e.isAbatida || e.status === EventStatus.AMORTIZED || e.status === EventStatus.ABATED);
                        if (isAbatidaMonth) return null;
                        return (
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              background: 'linear-gradient(135deg, var(--success) 0%, var(--accent-emerald) 100%)',
                              boxShadow: '0 4px 14px var(--shadow-glow-emerald)',
                              padding: '4px 12px',
                              height: '26px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              border: 'none',
                              color: TimelineColor.WHITE
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const targetDayStr = format(mGroup.monthDate, 'yyyy-MM-15');
                              onOpenAmortizationModal(targetDayStr);
                            }}
                            title={t('timeline.amortizeMonthTitle', { month: monthTitleStr })}
                          >
                            <TrendingDown size={14} />
                            <span>{t('buttons.amortize')}</span>
                          </button>
                        );
                      })()}

                      <AddEventButton
                        targetDayStr={format(mGroup.monthDate, 'yyyy-MM-01')}
                        title={t('timeline.addEventMonthTitle', { month: monthTitleStr })}
                        activeFinancialTab={activeFinancialTab}
                        activeTimeboard={activeTimeboard}
                        isBalancoView={isBalancoView}
                        balanceMode={balanceMode}
                        isFinancialTimeline={isFinancialTimeline}
                        isLoanTimelineOrTab={isLoanTimelineOrTab}
                        isReminders={isReminders}
                        onAddEventForDate={onAddEventForDate}
                        onOpenCreatePocket={onOpenCreatePocket}
                        paletteTheme={paletteTheme}
                        t={t}
                        timeline={timeline}
                      />
                    </div>
                  </div>

                  {isFinancialTimeline && !isLoanTimelineOrTab && (
                    <MonthProjectionBadges
                      monthProjectedIncome={mMonthProjectedIncome}
                      monthProjectedExpense={mMonthProjectedExpense}
                      monthProjectedLoan={mMonthProjectedLoan}
                      monthProjectedInvestment={mMonthProjectedInvestment}
                      monthProjectedInvestmentInternal={mMonthProjectedInvestmentInternal}
                      monthProjectedInvestmentExternal={mMonthProjectedInvestmentExternal}
                      monthProjectedInvestmentDeduction={mMonthProjectedInvestmentDeduction}
                      monthProjectedSaldo={mMonthProjectedSaldo}
                      monthRealizedIncome={mMonthRealizedIncome}
                      monthRealizedExpense={mMonthRealizedExpense}
                      monthRealizedLoan={mMonthRealizedLoan}
                      monthRealizedInvestment={mMonthRealizedInvestment}
                      monthRealizedInvestmentInternal={mMonthRealizedInvestmentInternal}
                      monthRealizedInvestmentExternal={mMonthRealizedInvestmentExternal}
                      monthRealizedInvestmentDeduction={mMonthRealizedInvestmentDeduction}
                      monthRealizedSaldo={mMonthRealizedSaldo}
                      projectionMode={monthProjectionMode}
                      onToggleProjectionMode={setMonthProjectionMode}
                      timelines={effectiveTimelines || timelines}
                      hasIncomeTimeline={hasIncomeTimeline}
                      hasExpenseTimeline={hasExpenseTimeline}
                      hasLoanTimeline={hasLoanTimeline}
                      hasInvestmentTimeline={hasInvestmentTimeline}
                      isFutureMonth={isFutureMonth}
                      isNotComputedMonth={isNotComputedMonth}
                      formatCurrency={formatCurrency}
                      showProgress={!isReadOnly}
                      t={t}
                    />
                  )}
                </div>

                {/* Cards only for months near the viewport (the current month and empty months render at once) */}
                <LazyMonthBody
                  eager={isNearToday || !hasEvents || timeline.type === TimelineType.INVESTMENT}
                  estimatedHeight={mGroup.events.length * ESTIMATED_CARD_HEIGHT}
                >
                {() => (timeline.type === TimelineType.INVESTMENT ? (
                  <AccountMonthSpaces
                    monthKey={format(mGroup.monthDate, 'yyyy-MM')}
                    monthStartStr={format(mGroup.monthDate, 'yyyy-MM-01')}
                    isFutureMonth={isFutureMonth}
                    monthEvents={mGroup.events}
                    allEvents={timeline.events || []}
                    pockets={pockets}
                    spaceFilter={selectedCategoryFilter}
                    color={timeline.color || TimelineColor.INVESTMENT}
                    palette={paletteTheme}
                    onAddMovement={onAddEventForDate ? (dateStr, pocketId) => {
                      const pocket = (pockets || []).find((p) => p.id === pocketId);
                      onAddEventForDate(dateStr, EventType.INVESTMENT, {
                        pocketId: pocketId || null,
                        pocketName: pocket?.name || null,
                        category: InvestmentEventCategory.SAVINGS
                      });
                    } : undefined}
                    onEditPocket={onEditPocket}
                    onDeletePocket={onDeletePocket}
                    renderEvents={(spaceEvents) => groupEventsByDate(spaceEvents, dayComparator).map((dateGroup, gIdx) => (
                      <div key={`${dateGroup.date}_${gIdx}`}>
                        <TimelineEventCard
                          events={dateGroup.events}
                          timelineColor={timeline.color}
                          allEvents={timeline.events || []}
                          timelines={effectiveTimelines || timelines}
                          currentTimelineId={timeline.id}
                          timelineType={timeline.type}
                          activeFinancialTab={activeFinancialTab}
                          persons={persons}
                          onEdit={onEditEvent}
                          onUpdateEventDirect={onUpdateEventDirect}
                          onDelete={onDeleteEvent}
                          onToggleTask={onToggleTask}
                          onAddChecklistItem={onAddChecklistItem}
                          onDeleteChecklistItem={onDeleteChecklistItem}
                          onToggleLoanPayment={onToggleLoanPayment}
                          onPayUpToHere={onPayUpToHere}
                          onOpenEditInstallment={onOpenEditInstallment}
                          onNavigateToTimeline={onNavigateToTimeline}
                          onPrintReceipt={handleOpenReceipt}
                        />
                      </div>
                    ))}
                    t={t}
                  />
                ) : hasEvents ? (
                  (mGroup.groupedDateEvents || groupEventsByDate(mGroup.events, dayComparator)).map((dateGroup, gIdx) => (
                    <div
                      key={`${dateGroup.date}_${gIdx}`}
                      style={{ marginBottom: '8px' }}
                    >
                      <TimelineEventCard
                        events={dateGroup.events}
                        timelineColor={timeline.color}
                        allEvents={timeline.events || []}
                        timelines={effectiveTimelines || timelines}
                        currentTimelineId={timeline.id}
                        timelineType={timeline.type}
                        activeFinancialTab={activeFinancialTab}
                        onEdit={onEditEvent}
                        onUpdateEventDirect={onUpdateEventDirect}
                        onDelete={onDeleteEvent}
                        onToggleTask={onToggleTask}
                        onAddChecklistItem={onAddChecklistItem}
                        onDeleteChecklistItem={onDeleteChecklistItem}
                        onToggleLoanPayment={onToggleLoanPayment}
                        onPayUpToHere={onPayUpToHere}
                        onOpenEditInstallment={onOpenEditInstallment}
                        onNavigateToTimeline={onNavigateToTimeline}
                        onPrintReceipt={handleOpenReceipt}
                        persons={persons}
                      />
                    </div>
                  ))
                ) : (
                  <div
                    className="empty-day-row"
                    onClick={() => {
                      if (isLoanTimelineOrTab) return;
                      const nature = timeline.type === TimelineType.EXPENSE
                        ? EventType.EXPENSE
                        : timeline.type === TimelineType.INVESTMENT
                          ? EventType.INVESTMENT
                          : isReminders
                            ? EventType.REMINDER
                            : EventType.INCOME;
                      onAddEventForDate?.(format(mGroup.monthDate, 'yyyy-MM-01'), nature);
                    }}
                    style={{
                      cursor: isLoanTimelineOrTab ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                      <span className="empty-day-text">
                        {isLoanTimelineOrTab ? t('timeline.noLoanMonth') : isReminders ? t('reminderHeader.noReminders') : t('timeline.noTabRecords')}
                      </span>
                    </div>
                  </div>
                ))}
                </LazyMonthBody>
              </div>
            </div>
          </div>
        );
      })}

      {/* Botão Carregar Mais Passado */}
      <PastHorizonButton onLoadMorePast={onLoadMorePast} t={t} />
    </div>
  );
  }
