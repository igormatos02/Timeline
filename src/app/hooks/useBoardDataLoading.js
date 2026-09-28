import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { TimelineType } from '../../enums/index.js';

// Extracted from App.jsx (App).
export function useBoardDataLoading({
  activeFinancialTab,
  activeTimeboardId,
  activeTimelineId,
  futureHorizonYears,
  pastHorizonYears,
  setActiveFinancialTab,
  setActiveTimelineId,
  setFutureHorizonYears,
  setRawEvents,
  setTimelines,
  timelines
}) {
  const [isLoadingSystem, setIsLoadingSystem] = useState(true);
  // Month focused by the last opened modal (the timeline scrolls back to it after saving)
  const focusedMonthRef = React.useRef(null);
  const scrollYBeforeModalRef = React.useRef(0);

  const timelinesRef = React.useRef(timelines);
  React.useEffect(() => {
    timelinesRef.current = timelines;
  }, [timelines]);

  const fetchEventsForVisiblePeriod = React.useCallback(async (pastYears = pastHorizonYears, futureYears = futureHorizonYears, forceReload = false) => {
    if (!activeTimeboardId) return;

    try {
      // Para timelines de empréstimos, buscar a série completa sem truncar por horizonte de 1 ano
      const params = {
        timeboardId: activeTimeboardId
      };

      const evData = await api.fetchEvents(params);
      if (Array.isArray(evData)) {
        if (forceReload) {
          setRawEvents(evData);
        } else {
          // Merge sem duplicar eventos existentes na memória
          setRawEvents((prevEvents) => {
            const map = new Map(prevEvents.map((e) => [e.id, e]));
            evData.forEach((e) => map.set(e.id, e));
            return Array.from(map.values());
          });
        }
      }
    } catch (e) {
      console.error('Error fetching events for period:', e);
    }
  }, [activeTimeboardId, pastHorizonYears, futureHorizonYears]);

  // Fetch todas as timelines e os eventos de todo o horizonte ao carregar o Timeboard
  useEffect(() => {
    if (!activeTimeboardId) return;
    let isMounted = true;
    setIsLoadingSystem(true);

    (async () => {
      try {
        const data = await api.fetchTimelines({ timeboardId: activeTimeboardId });
        if (!isMounted) return;

        if (Array.isArray(data)) {
          setTimelines(data);
          if (data.length > 0) {
            const balanceTl = data.find((tl) => tl.type === TimelineType.BALANCE);
            const defaultTl = balanceTl || data[0];

            // Check if current active timeline or financial tab belongs to the loaded dataset
            const targetTl = data.find((tl) => tl.id === activeFinancialTab || tl.id === activeTimelineId) || defaultTl;

            setActiveTimelineId(targetTl.id);
            setActiveFinancialTab(targetTl.id);

            // Buscar eventos apenas UMA vez para todo o Timeboard no mount
            await fetchEventsForVisiblePeriod(pastHorizonYears, futureHorizonYears, true);
          }
        }
      } catch (err) {
        console.error('Error fetching timelines for timeboard:', err.message);
      } finally {
        if (isMounted) {
          setIsLoadingSystem(false);
        }
      }
    })();

    return () => { isMounted = false; };
  }, [activeTimeboardId]);

  const refreshTimelines = React.useCallback(async () => {
    try {
      const tlData = await api.fetchTimelines({ timeboardId: activeTimeboardId });
      if (Array.isArray(tlData)) {
        setTimelines(tlData);
      }
      await fetchEventsForVisiblePeriod(pastHorizonYears, futureHorizonYears, true);
      return tlData;
    } catch (e) {
      console.error('Error refreshing timelines:', e);
    }
  }, [activeTimeboardId, fetchEventsForVisiblePeriod, pastHorizonYears, futureHorizonYears]);

  // Expandir horizonte de tempo sem descartar o que já está na memória
  const isInitialHorizonMountRef = React.useRef(true);
  useEffect(() => {
    if (isInitialHorizonMountRef.current) {
      isInitialHorizonMountRef.current = false;
      return;
    }
    if (activeTimeboardId) {
      fetchEventsForVisiblePeriod(pastHorizonYears, futureHorizonYears, false);
    }
  }, [pastHorizonYears, futureHorizonYears]);

  const handleLoadMoreFuture = async () => {
    const nextYears = futureHorizonYears + 1;
    setFutureHorizonYears(nextYears);
  };

  return {
    fetchEventsForVisiblePeriod,
    focusedMonthRef,
    handleLoadMoreFuture,
    isLoadingSystem,
    refreshTimelines,
    scrollYBeforeModalRef
  };
}
