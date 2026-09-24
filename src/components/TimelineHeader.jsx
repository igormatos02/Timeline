import React from 'react';
import { TimelineType, TimeboardType, isLoanTimelineType } from '../enums/index.js';
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
 * Dispatcher do cabeçalho da timeline.
 * Renderiza o cabeçalho dedicado para cada tipo de timeline do enum TimelineType.
 */
function TimelineHeader(rawProps) {
  const { timeline, timeboard, selectedEntityId, isIndividualView, isIndividualRole } = rawProps;

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

  // The individual view is only available on condoflow timeboards.
  const isCondoflow = timeboard?.type === TimeboardType.CONDOFLOW;
  const props = isCondoflow
    ? rawProps
    : { ...rawProps, isIndividualView: false, onToggleIndividualView: undefined };

  // When an obligator is selected and the user switches to individual view,
  // replace the regular header with the IndividualTimelineHeader.
  if (isCondoflow && selectedEntityId && isIndividualView) {
    return <IndividualTimelineHeader {...props} />;
  }

  if (isLoanTimelineType(timeline.type)) {
    return <LoanTimelineHeader {...props} />;
  }

  const typeLower = (timeline.type || '').toLowerCase();

  switch (typeLower) {
    case TimelineType.BALANCE:
      return <BalanceTimelineHeader {...props} />;

    case TimelineType.INCOME:
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
