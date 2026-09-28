import { useEffect } from 'react';

// Extracted from App.jsx (App).
export function useAppPersistence({
  activeFinancialTab,
  activeTimeboardId,
  activeTimelineId,
  timeboards
}) {
  useEffect(() => {
    try {
      localStorage.setItem('chrono_timeboards_v2', JSON.stringify(timeboards));
    } catch { }
  }, [timeboards]);

  useEffect(() => {
    try {
      if (activeTimeboardId) {
        localStorage.setItem('chrono_active_timeboard_id', activeTimeboardId);
      }
    } catch { }
  }, [activeTimeboardId]);

  useEffect(() => {
    try {
      if (activeTimelineId) {
        localStorage.setItem('chrono_active_timeline_id', activeTimelineId);
      }
    } catch { }
  }, [activeTimelineId]);

  useEffect(() => {
    try {
      if (activeFinancialTab) {
        localStorage.setItem('chrono_active_financial_tab', activeFinancialTab);
      }
    } catch { }
  }, [activeFinancialTab]);

  return {
    
  };
}
