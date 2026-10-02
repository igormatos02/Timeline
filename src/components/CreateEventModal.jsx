import React from 'react';
import { TimelineType, EventType, normalizeTimelineType, isWalletTimelineType, isAccountOutflowEvent, isPocketTransferEvent } from '../enums/index.js';
import {
  CashFlowEventModal,
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
  const { isOpen, timeline, initialData, allTimelines, defaultNature } = props;

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

  const isNew = !initialData?.id && !initialData?.eventId && !initialData?.eventType;

  // Bank movements (Poupança & Cofrinhos / Conta Bancária)
  const isInvestmentMovement = initialData?.eventType === EventType.INVESTMENT ||
    Boolean(initialData?.pocketId || initialData?.pocket_id) ||
    defaultNature === EventType.INVESTMENT || defaultNature === 'investment' ||
    normalizedType === TimelineType.INVESTMENT;

  if (isInvestmentMovement) {
    const investmentTl = normalizedType === TimelineType.INVESTMENT ? timeline : (allTimelines || []).find((tl) => normalizeTimelineType(tl?.type) === TimelineType.INVESTMENT);
    const ownTimeline = (allTimelines || []).find((tl) => String(tl.id) === String(initialData?.timelineId || initialData?.timeline_id || ''));
    const isExpense = initialData?.eventType === EventType.EXPENSE || initialData?.eventType === EventType.WITHDRAWAL || (isNew && defaultNature === EventType.EXPENSE);
    return (
      <CashFlowEventModal
        {...props}
        timeline={ownTimeline || investmentTl || timeline}
        pockets={investmentTl?.pockets || timeline?.pockets || props.pockets || []}
        eventType={isExpense ? EventType.EXPENSE : EventType.INVESTMENT}
        allowTypeSwitch={isNew}
      />
    );
  }

  // The wallet holds income and expenses: the movement type (editing) or the requested nature (new) picks the form.
  // The income / outflows modes of the balance add and edit wallet movements with the same forms.
  const isCashFlowMovement = initialData?.eventType === EventType.INCOME || initialData?.eventType === EventType.EXPENSE ||
    (isNew && (defaultNature === EventType.INCOME || defaultNature === EventType.EXPENSE));
  const isWalletTimeline = isWalletTimelineType(normalizedType);
  if (isWalletTimeline || (normalizedType === TimelineType.BALANCE && isCashFlowMovement)) {
    const wallet = isWalletTimeline ? timeline : (allTimelines || []).find((tl) => isWalletTimelineType(tl?.type));
    const ownTimeline = (allTimelines || []).find((tl) => String(tl.id) === String(initialData?.timelineId || initialData?.timeline_id || ''));
    const isExpense = initialData?.eventType === EventType.EXPENSE || (isNew && defaultNature === EventType.EXPENSE);
    return (
      <CashFlowEventModal
        {...props}
        timeline={ownTimeline || wallet || timeline}
        eventType={isExpense ? EventType.EXPENSE : EventType.INCOME}
        allowTypeSwitch={isWalletTimeline && isNew}
      />
    );
  }

  switch (normalizedType) {
    case TimelineType.BALANCE:
      return <BalanceEventModal {...props} />;

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

