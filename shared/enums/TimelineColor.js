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
  FOLLOWUP: '#06b6d4',
  GOALS: '#10b981',
  CUSTOM: '#6366f1',
  CONDOFLOW: '#a68069',
  EMPTY: '#64748b',
  FINANCIAL: '#10b981',

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
  TimelineColor.LOAN,       // Indigo (#6366f1)
  TimelineColor.BALANCE,    // Sky Blue (#0ea5e9)
  TimelineColor.INCOME,     // Emerald (#10b981)
  TimelineColor.EXPENSE,    // Rose (#f43f5e)
  TimelineColor.INVESTMENT, // Violet (#8b5cf6)
  TimelineColor.REMINDER,   // Amber (#f59e0b)
  TimelineColor.DIARY,      // Pink (#ec4899)
  TimelineColor.TODO,       // Blue (#3b82f6)
  TimelineColor.FOLLOWUP,   // Cyan (#06b6d4)
  TimelineColor.PROJECT,    // Purple (#a855f7)
  '#8f7193',                // Purple Custom
  '#a68069',                // Brown
  '#5086c1',                // Blue Custom
  '#96c4c4',                // Light Blue
  '#c63637',                // Red
  '#c999af',                // Pink Custom
  '#756f4b'                 // Caqui
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
    case TimelineType.FOLLOWUP:
      return TimelineColor.FOLLOWUP;
    default:
      return TimelineColor.PRIMARY;
  }
}

