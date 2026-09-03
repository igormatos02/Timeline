import { EventStatus, EventType } from '../../../../../shared/enums/index.js';

/**
 * Domain Service: InvestmentDomainService
 * Encapsulates calculation rules and metrics for Savings, Assets, and Investments.
 */
export class InvestmentDomainService {
  /**
   * Filter events belonging to investments
   */
  filterEvents(events = [], timelineId = null) {
    return events.filter((ev) => {
      if (!ev || ev.isDeleted) return false;
      if (timelineId && ev.timelineId === timelineId) return true;
      return (
        ev.eventType === EventType.INVESTMENT
      );
    });
  }

  /**
   * Calculate financial metrics for Investments & Savings
   */
  calculateMetrics(investmentEvents = [], currentMonthKey = null) {
    const activeMonth = currentMonthKey || new Date().toISOString().substring(0, 7);

    const monthlyContributions = investmentEvents
      .filter((ev) => ev.date && ev.date.startsWith(activeMonth) && !ev.isDeleted)
      .reduce((sum, ev) => sum + (Number(ev.amount) || 0), 0);

    const investedTotal = investmentEvents
      .filter(
        (ev) =>
          ev.date &&
          ev.date.startsWith(activeMonth) &&
          !ev.isDeleted &&
          (ev.status === EventStatus.INVESTED)
      )
      .reduce((sum, ev) => sum + (Number(ev.amount) || 0), 0);

    const accumulatedSavings = investmentEvents.reduce((max, ev) => {
      const prior = Number(ev.initialInvestedAmount || 0);
      return Math.max(max, prior);
    }, 0);

    return {
      monthlyContributions: Math.round(monthlyContributions * 100) / 100,
      investedTotal: Math.round(investedTotal * 100) / 100,
      accumulatedSavings: Math.round(accumulatedSavings * 100) / 100,
      totalNetWorth: Math.round((accumulatedSavings + investedTotal) * 100) / 100
    };
  }
}

export const investmentDomainService = new InvestmentDomainService();
