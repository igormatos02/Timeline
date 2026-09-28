import { useCallback, useState } from 'react';
import { format } from 'date-fns';

// Extracted from App.jsx (App).
export function useLoanAndOutflowModals() {
  const [isAmortizationModalOpen, setIsAmortizationModalOpen] = useState(false);
  const [editingAmortization, setEditingAmortization] = useState(null);
  const [amortizationDefaultDate, setAmortizationDefaultDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [editingInstallment, setEditingInstallment] = useState(null);

  // Withdrawal Specific Modal
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [editingWithdrawal, setEditingWithdrawal] = useState(null);
  const [withdrawalDefaultDate, setWithdrawalDefaultDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [withdrawalDefaultPocketId, setWithdrawalDefaultPocketId] = useState(null);

  const handleOpenAmortizationModal = useCallback((dateStr, eventObj = null) => {
    if (dateStr) {
      setAmortizationDefaultDate(dateStr);
    }
    setEditingAmortization(eventObj || null);
    setIsAmortizationModalOpen(true);
  }, []);

  return {
    amortizationDefaultDate,
    editingAmortization,
    editingInstallment,
    editingWithdrawal,
    handleOpenAmortizationModal,
    isAmortizationModalOpen,
    isWithdrawalModalOpen,
    setEditingAmortization,
    setEditingInstallment,
    setEditingWithdrawal,
    setIsAmortizationModalOpen,
    setIsWithdrawalModalOpen,
    setWithdrawalDefaultDate,
    setWithdrawalDefaultPocketId,
    withdrawalDefaultDate,
    withdrawalDefaultPocketId
  };
}
