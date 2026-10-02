import React from 'react';
import { EventType } from '../../../shared/enums/index.js';
import CashFlowEventModal from './CashFlowEventModal.jsx';

// Deposits and movements into the bank account (inflows/outflows of the account or a pocket)
export default function InvestmentEventModal(props) {
  const { initialData, defaultNature, timeline } = props;
  const isNew = !initialData?.id && !initialData?.eventId && !initialData?.eventType;
  const isExpense = initialData?.eventType === EventType.EXPENSE || initialData?.eventType === EventType.WITHDRAWAL || (isNew && defaultNature === EventType.EXPENSE);

  return (
    <CashFlowEventModal
      {...props}
      timeline={timeline}
      pockets={timeline?.pockets || props.pockets || []}
      eventType={isExpense ? EventType.EXPENSE : EventType.INVESTMENT}
      allowTypeSwitch={isNew}
    />
  );
}
