import React from 'react';
import FinancialEventModal from './FinancialEventModal.jsx';

/**
 * @deprecated Use <FinancialEventModal eventType="income" /> instead.
 */
export default function IncomeEventModal(props) {
  return <FinancialEventModal {...props} eventType="income" />;
}