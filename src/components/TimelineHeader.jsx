import React from 'react';
import { TimelineType, isLoanTimelineType } from '../enums/index.js';
import {
  BalanceTimelineHeader,
  IncomeTimelineHeader,
  ExpenseTimelineHeader,
  InvestmentTimelineHeader,
  LoanTimelineHeader,
  ReminderTimelineHeader,
  ProjectTimelineHeader,
  DefaultTimelineHeader
} from './timeline-headers/index.js';

/**
 * Dispatcher do cabeçalho da timeline.
 * Renderiza o cabeçalho dedicado para cada tipo de timeline do enum TimelineType.
 */
function TimelineHeader(props) {
  const { timeline } = props;

  if (!timeline) return null;

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
    case 'reminder':
    case 'reminders':
      return <ReminderTimelineHeader {...props} />;

    case TimelineType.PROJECT:
    case 'project':
    case 'projects':
      return <ProjectTimelineHeader {...props} />;

    default:
      return <DefaultTimelineHeader {...props} />;
  }
}

export default React.memo(TimelineHeader);
