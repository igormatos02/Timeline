import React from 'react';
import { TimelineType } from '../enums/index.js';
import {
  IncomeEventModal,
  ExpenseEventModal,
  InvestmentEventModal,
  LoanEventModal,
  BalanceEventModal,
  DefaultEventModal
} from './event-modals/index.js';

/**
 * Dispatcher modular de popups de eventos.
 * Roteia para o popup especializado de acordo com o tipo da timeline ativa (TimelineType).
 */
export default function CreateEventModal(props) {
  const { isOpen, timeline } = props;

  if (!isOpen) return null;

  switch (timeline?.type) {
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

    default:
      return <DefaultEventModal {...props} />;
  }
}
