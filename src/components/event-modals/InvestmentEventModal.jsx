import React from 'react';
import { EventType } from '../../../shared/enums/index.js';
import CashFlowEventModal from './CashFlowEventModal.jsx';

// Deposits into the bank account (inflows of the current account or a pocket)
export default function InvestmentEventModal(props) {
  return <CashFlowEventModal {...props} eventType={EventType.INVESTMENT} />;
}
