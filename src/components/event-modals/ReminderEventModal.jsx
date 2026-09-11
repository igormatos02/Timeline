import React from 'react';
import FinancialEventModal from './FinancialEventModal.jsx';

export default function ReminderEventModal(props) {
  return <FinancialEventModal {...props} eventType="reminder" />;
}
