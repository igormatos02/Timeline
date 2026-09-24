import React from 'react';
import { TimelineType, isLoanTimelineType } from '../enums/index.js';
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
function TimelineHeader(props) {
  const { timeline, selectedEntityId, isIndividualView, onToggleIndividualView } = props;

  if (!timeline) return null;

  // When an obligator is selected and the user switches to individual view,
  // replace the regular header with the IndividualTimelineHeader.
  if (selectedEntityId && isIndividualView) {
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
