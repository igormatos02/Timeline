import { TimelineType } from './TimelineType.js';

export const TimelineColor = Object.freeze({
  BALANCE: '#0ea5e9',
  INCOME: '#10b981',
  EXPENSE: '#f43f5e',
  INVESTMENT: '#8b5cf6',
  LOAN: '#6366f1',
  PROJECT: '#a855f7',
  REMINDER: '#f59e0b',
  DIARY: '#ec4899',
  TODO: '#3b82f6',
  GOALS: '#10b981',
  CUSTOM: '#6366f1',

  // Palette & Status Colors
  PRIMARY: '#6366f1',
  PRIMARY_LIGHT: '#818cf8',
  SUCCESS: '#10b981',
  DANGER: '#f43f5e',
  WARNING: '#f59e0b',
  INFO: '#0ea5e9',
  CYAN: '#06b6d4',
  BLUE: '#3b82f6',
  PURPLE: '#a855f7',
  VIOLET: '#8b5cf6',
  ROSE: '#f43f5e',
  EMERALD: '#10b981',
  AMBER: '#f59e0b',
  SKY: '#0ea5e9',
  PINK: '#ec4899',
  SLATE: '#64748b',
  WHITE: '#ffffff'
});

export const TIMELINE_COLOR_PRESETS = Object.freeze([
  TimelineColor.LOAN,       // Indigo
  TimelineColor.BALANCE,    // Sky Blue
  TimelineColor.INCOME,     // Emerald
  TimelineColor.EXPENSE,    // Rose
  TimelineColor.REMINDER,   // Amber
  TimelineColor.PROJECT,    // Purple
  TimelineColor.CYAN,       // Cyan
  TimelineColor.BLUE        // Blue
]);

/**
 * Returns default color for a given TimelineType enum.
 * @param {string} type
 * @returns {string}
 */
export function getDefaultTimelineColor(type) {
  switch (type) {
    case TimelineType.BALANCE:
      return TimelineColor.BALANCE;
    case TimelineType.INCOME:
      return TimelineColor.INCOME;
    case TimelineType.EXPENSE:
      return TimelineColor.EXPENSE;
    case TimelineType.INVESTMENT:
      return TimelineColor.INVESTMENT;
    case TimelineType.LOAN:
      return TimelineColor.LOAN;
    case TimelineType.REMINDER:
      return TimelineColor.REMINDER;
    case TimelineType.DIARY:
      return TimelineColor.DIARY;
    case TimelineType.TODO:
      return TimelineColor.TODO;
    default:
      return TimelineColor.PRIMARY;
  }
}

