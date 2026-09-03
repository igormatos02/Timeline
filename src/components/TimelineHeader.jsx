import React from 'react';
import { TimelineType } from '../enums/index.js';
import {
  BalanceTimelineHeader,
  IncomeTimelineHeader,
  ExpenseTimelineHeader,
  InvestmentTimelineHeader,
  LoanTimelineHeader,
  DefaultTimelineHeader
} from './timeline-headers/index.js';

/**
 * Dispatcher do cabeçalho da timeline.
 * Renderiza o cabeçalho dedicado para cada tipo de timeline do enum TimelineType.
 */
function TimelineHeader(props) {
  const { timeline } = props;

  if (!timeline) return null;

  const typeLower = (timeline.type || '').toLowerCase();

  if (typeLower === TimelineType.LOAN || typeLower === 'loan' || typeLower === 'empréstimo' || typeLower === 'emprestimo') {
    return <LoanTimelineHeader {...props} />;
  }

  switch (typeLower) {
    case TimelineType.BALANCE:
      return <BalanceTimelineHeader {...props} />;

    case TimelineType.INCOME:
      return <IncomeTimelineHeader {...props} />;

    case TimelineType.EXPENSE:
      return <ExpenseTimelineHeader {...props} />;

    case TimelineType.INVESTMENT:
      return <InvestmentTimelineHeader {...props} />;

    default:
      return <DefaultTimelineHeader {...props} />;
  }
}

export default React.memo(TimelineHeader);
