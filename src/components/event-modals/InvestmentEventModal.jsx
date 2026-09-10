import React from 'react';
import FinancialEventModal from './FinancialEventModal.jsx';

/**
 * @deprecated Use <FinancialEventModal eventType="investment" /> instead.
 */
export default function InvestmentEventModal(props) {
  return <FinancialEventModal {...props} eventType="investment" />;
}