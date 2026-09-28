import React from 'react';
import { TimelineType, EventType, normalizeTimelineType, isAccountOutflowEvent, isPocketTransferEvent } from '../enums/index.js';
import {
  IncomeEventModal,
  ExpenseEventModal,
  InvestmentEventModal,
  LoanEventModal,
  BalanceEventModal,
  ReminderEventModal,
  DiaryEventModal,
  TodoEventModal,
  FollowupEventModal,
  DefaultEventModal
} from './event-modals/index.js';
import AccountOutflowModal from './AccountOutflowModal.jsx';

/**
 * Dispatcher modular de popups de eventos.
 * Roteia para o popup especializado de acordo com o tipo da timeline ativa (TimelineType).
 */
export default function CreateEventModal(props) {
  const { isOpen, timeline, initialData } = props;

  if (!isOpen) return null;

  if (initialData?.eventType === EventType.WITHDRAWAL || initialData?.isWithdrawal || isAccountOutflowEvent(initialData) || isPocketTransferEvent(initialData)) {
    return <AccountOutflowModal {...props} />;
  }

  const normalizedType = normalizeTimelineType(timeline?.type);

  if (initialData?.eventType === EventType.REGISTER || normalizedType === TimelineType.DIARY) {
    return <DiaryEventModal {...props} />;
  }

  if (initialData?.eventType === EventType.TODO || normalizedType === TimelineType.TODO) {
    return <TodoEventModal {...props} />;
  }

  if (initialData?.eventType === EventType.FOLLOWUP || normalizedType === TimelineType.FOLLOWUP) {
    return <FollowupEventModal {...props} />;
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

    case TimelineType.TODO:
      return <TodoEventModal {...props} />;

    case TimelineType.FOLLOWUP:
      return <FollowupEventModal {...props} />;

    default:
      return <DefaultEventModal {...props} />;
  }
}

