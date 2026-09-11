import React from 'react';
import { TimelineType, EventType, normalizeTimelineType } from '../enums/index.js';
import {
  IncomeEventModal,
  ExpenseEventModal,
  InvestmentEventModal,
  LoanEventModal,
  BalanceEventModal,
  ReminderEventModal,
  DiaryEventModal,
  DefaultEventModal
} from './event-modals/index.js';

/**
 * Dispatcher modular de popups de eventos.
 * Roteia para o popup especializado de acordo com o tipo da timeline ativa (TimelineType).
 */
export default function CreateEventModal(props) {
  const { isOpen, timeline, initialData } = props;

  if (!isOpen) return null;

  const normalizedType = normalizeTimelineType(timeline?.type);

  if (initialData?.eventType === EventType.REGISTER || normalizedType === TimelineType.DIARY) {
    return <DiaryEventModal {...props} />;
  }

  switch (normalizedType) {
    case TimelineType.BALANCE:
      return <BalanceEventModal {...props} />;

    case TimelineType.INCOME:
      return <IncomeEventModal {...props} />;

    case TimelineType.EXPENSE:
      return <ExpenseEventModal {...props} />;

    case TimelineType.INVESTMENT:
      return <InvestmentEventModal {...props} />;

    case TimelineType.LOAN:
      return <LoanEventModal {...props} />;

    case TimelineType.REMINDER:
      return <ReminderEventModal {...props} />;

    case TimelineType.DIARY:
      return <DiaryEventModal {...props} />;

    default:
      return <DefaultEventModal {...props} />;
  }
}

