import React from 'react';
import { BalanceViewMode, TimelineColor, TimelineType, TimeboardType, isLoanTimelineType, isWalletTimelineType, normalizeTimelineType } from '../enums/index.js';
import BalanceModeSwitch from './timeline-headers/BalanceModeSwitch.jsx';
import {
  BalanceTimelineHeader,
  IncomeTimelineHeader,
  ExpenseTimelineHeader,
  InvestmentTimelineHeader,
  LoanTimelineHeader,
  ReminderTimelineHeader,
  DiaryTimelineHeader,
  ProjectTimelineHeader,
  TodoTimelineHeader,
  FollowupTimelineHeader,
  DefaultTimelineHeader
} from './timeline-headers/index.js';
import IndividualTimelineHeader from './timeline-headers/IndividualTimelineHeader.jsx';

/**
 * Balance header following the selected mode: the balance itself, the income header (money coming in) or
 * the expense header (money going out). The income and expense headers keep their look; they receive the
 * movements listed in that mode and the wallet / outflow colors.
 */
function BalanceHeaderByMode(props) {
  const { timeline, allTimelines = [], balanceMode = BalanceViewMode.ALL, onChangeBalanceMode } = props;
  const headerSwitch = onChangeBalanceMode
    ? <BalanceModeSwitch value={balanceMode} onChange={onChangeBalanceMode} />
    : null;
  // The mode list only has income (or outflows): the board-wide figures (commitment, accumulation) still
  // need every movement of the board
  const allEvents = props.allEvents || timeline.events;

  if (balanceMode === BalanceViewMode.INCOME) {
    // The wallet provides the color and the starting balance of the available money
    const wallet = allTimelines.find((tl) => isWalletTimelineType(tl?.type));
    const incomeTimeline = {
      ...(wallet || {}),
      id: timeline.id,
      name: timeline.name,
      description: timeline.description,
      color: wallet?.color || TimelineColor.INCOME,
      events: timeline.events
    };
    return <IncomeTimelineHeader {...props} timeline={incomeTimeline} allEvents={allEvents} headerSwitch={headerSwitch} />;
  }

  if (balanceMode === BalanceViewMode.OUTFLOW) {
    const expenseTimeline = allTimelines.find((tl) => normalizeTimelineType(tl?.type) === TimelineType.EXPENSE);
    const outflowTimeline = { ...timeline, color: expenseTimeline?.color || TimelineColor.EXPENSE };
    return <ExpenseTimelineHeader {...props} timeline={outflowTimeline} allEvents={allEvents} headerSwitch={headerSwitch} />;
  }

  return <BalanceTimelineHeader {...props} headerSwitch={headerSwitch} />;
}

/**
 * Dispatcher do cabeçalho da timeline.
 * Renderiza o cabeçalho dedicado para cada tipo de timeline do enum TimelineType.
 */
function TimelineHeader(rawProps) {
  const { timeline, timeboard, selectedEntityId, isIndividualRole } = rawProps;

  if (!timeline) return null;

  // Individual-role users only ever see the individual header (no global view, no switch).
  if (isIndividualRole) {
    return (
      <IndividualTimelineHeader
        {...rawProps}
        isIndividualView
        onToggleIndividualView={undefined}
        onOpenClearance={undefined}
      />
    );
  }

  // The global / individual switch is gone: choosing an entity in the filter already means "show this entity"
  const props = { ...rawProps, isIndividualView: false, onToggleIndividualView: undefined };

  // Condoflow: with an entity selected, the header becomes the entity's own (figures of the current timeline,
  // the board total next to them); in the balance it keeps the all / income / outflows switch
  const isCondoflow = timeboard?.type === TimeboardType.CONDOFLOW;
  if (isCondoflow && selectedEntityId) {
    const isBalance = normalizeTimelineType(timeline.type) === TimelineType.BALANCE;
    const headerSwitch = isBalance && props.onChangeBalanceMode
      ? <BalanceModeSwitch value={props.balanceMode || BalanceViewMode.ALL} onChange={props.onChangeBalanceMode} />
      : null;
    return <IndividualTimelineHeader {...props} headerSwitch={headerSwitch} />;
  }

  if (isLoanTimelineType(timeline.type)) {
    return <LoanTimelineHeader {...props} />;
  }

  const typeLower = (timeline.type || '').toLowerCase();

  switch (typeLower) {
    case TimelineType.BALANCE:
      return <BalanceHeaderByMode {...props} />;

    case TimelineType.INCOME:
    case TimelineType.WALLET:
      return <IncomeTimelineHeader {...props} />;

    case TimelineType.EXPENSE:
      return <ExpenseTimelineHeader {...props} />;

    case TimelineType.INVESTMENT:
      return <InvestmentTimelineHeader {...props} />;

    case TimelineType.REMINDER:
      return <ReminderTimelineHeader {...props} />;

    case TimelineType.DIARY:
      return <DiaryTimelineHeader {...props} />;

    case TimelineType.PROJECT:
      return <ProjectTimelineHeader {...props} />;

    case TimelineType.TODO:
      return <TodoTimelineHeader {...props} />;

    case TimelineType.FOLLOWUP:
      return <FollowupTimelineHeader {...props} />;

    default:
      return <DefaultTimelineHeader {...props} />;
  }
}

export default React.memo(TimelineHeader);
