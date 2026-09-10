import React from 'react';
import FinancialEventModal from './FinancialEventModal.jsx';

/**
 * @deprecated Use <FinancialEventModal eventType="expense" /> instead.
 */
export default function ExpenseEventModal(props) {
  return <FinancialEventModal {...props} eventType="expense" />;
}