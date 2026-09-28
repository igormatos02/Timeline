import React from 'react';
import { EventType } from '../../../shared/enums/index.js';
import CashFlowEventModal from './CashFlowEventModal.jsx';

export default function ExpenseEventModal(props) {
  return <CashFlowEventModal {...props} eventType={EventType.EXPENSE} />;
}
