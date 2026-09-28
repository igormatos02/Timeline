import { useCallback, useMemo } from 'react';
import { computeMonthlyFlows } from '../../../shared/finance/financialPosition.js';
import { TimelineType } from '../../enums/index.js';

// Extracted from VerticalTimeline.jsx (VerticalTimeline).
export function useTimelineMonthlyFlows({
  computeFromMonth,
  effectiveTimelines,
  inactiveTimelineIdSet,
  isEventMatchingEntity,
  isEventTimelineActive,
  selectedEntityId,
  selectedTimelineIds,
  timeline,
  timelineEvents,
  timelines
}) {
  const monthlyFlows = useMemo(() => {
    const timelineTypeMap = new Map((effectiveTimelines || timelines || []).map((tl) => [String(tl.id), tl.type]));
    return computeMonthlyFlows({
      events: timelineEvents,
      timelineTypeMap,
      fromMonth: computeFromMonth,
      include: (ev) => {
        if (!isEventTimelineActive(ev)) return false;
        if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) return false;
        if (timeline.type === TimelineType.BALANCE && selectedTimelineIds && selectedTimelineIds.length > 0) {
          return selectedTimelineIds.includes(ev.timelineId) || selectedTimelineIds.includes(ev.timelineOriginId);
        }
        return true;
      }
    });
  }, [timelineEvents, effectiveTimelines, timelines, selectedTimelineIds, selectedEntityId, timeline.type, inactiveTimelineIdSet, computeFromMonth]);

  // Per-month values shown by the month badges (money back from withdrawals counts as income of the month)
  const monthMapOf = useCallback((pick) => {
    const map = new Map();
    monthlyFlows.forEach((entry, key) => map.set(key, pick(entry)));
    return map;
  }, [monthlyFlows]);
  const monthExpensesTotalMap = useMemo(() => monthMapOf((e) => e.projected.expensesFromAvailable), [monthMapOf]);
  const monthLoansTotalMap = useMemo(() => monthMapOf((e) => e.projected.installments), [monthMapOf]);
  const monthIncomeTotalMap = useMemo(() => monthMapOf((e) => e.projected.income + e.projected.allWithdrawals), [monthMapOf]);
  const monthInvestmentsTotalMap = useMemo(() => monthMapOf((e) => e.projected.savingsNet), [monthMapOf]);
  const monthInvestmentsDeductionsMap = useMemo(() => monthMapOf((e) => e.projected.depositsInternal), [monthMapOf]);
  const monthInvestmentsExternalMap = useMemo(() => monthMapOf((e) => e.projected.depositsExternal - (e.projected.allWithdrawals - e.projected.withdrawals)), [monthMapOf]);
  const monthExpensesRealizedMap = useMemo(() => monthMapOf((e) => e.realized.expensesFromAvailable), [monthMapOf]);
  const monthLoansRealizedMap = useMemo(() => monthMapOf((e) => e.realized.installments), [monthMapOf]);
  const monthIncomeRealizedMap = useMemo(() => monthMapOf((e) => e.realized.income + e.realized.allWithdrawals), [monthMapOf]);
  const monthInvestmentsRealizedMap = useMemo(() => monthMapOf((e) => e.realized.savingsNet), [monthMapOf]);
  const monthInvestmentsDeductionsRealizedMap = useMemo(() => monthMapOf((e) => e.realized.depositsInternal), [monthMapOf]);
  const monthInvestmentsExternalRealizedMap = useMemo(() => monthMapOf((e) => e.realized.depositsExternal - (e.realized.allWithdrawals - e.realized.withdrawals)), [monthMapOf]);

  return {
    monthExpensesRealizedMap,
    monthExpensesTotalMap,
    monthIncomeRealizedMap,
    monthIncomeTotalMap,
    monthInvestmentsDeductionsMap,
    monthInvestmentsDeductionsRealizedMap,
    monthInvestmentsExternalMap,
    monthInvestmentsExternalRealizedMap,
    monthInvestmentsRealizedMap,
    monthInvestmentsTotalMap,
    monthLoansRealizedMap,
    monthLoansTotalMap
  };
}
