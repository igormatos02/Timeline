import React from 'react';
import {
  Scale,
  TrendingUp,
  ShoppingCart,
  PiggyBank,
  CreditCard,
  Bell,
  BookOpen,
  CheckSquare,
  Layers
} from 'lucide-react';
import {
  TimelineType,
  getDefaultTimelineColor,
  isSingleInstanceTimelineType,
  normalizeTimelineType
} from '../enums/index.js';

/**
 * Returns the translation key for a given TimelineType enum.
 * @param {string} type
 * @returns {string}
 */
export function getTimelineTypeLabelKey(type) {
  const norm = normalizeTimelineType(type);
  switch (norm) {
    case TimelineType.BALANCE:
      return 'sidebar.balanceTimeline';
    case TimelineType.INCOME:
      return 'sidebar.incomeTimeline';
    case TimelineType.EXPENSE:
      return 'sidebar.expenseTimeline';
    case TimelineType.INVESTMENT:
      return 'sidebar.investmentTimeline';
    case TimelineType.LOAN:
      return 'sidebar.loanTimeline';
    case TimelineType.REMINDER:
      return 'sidebar.reminderTimeline';
    case TimelineType.DIARY:
      return 'sidebar.diaryTimeline';
    case TimelineType.TODO:
      return 'sidebar.todoTimeline';
    default:
      return 'sidebar.customTimeline';
  }
}

/**
 * Returns the icon component for a given TimelineType enum.
 * @param {string} type
 * @returns {React.ComponentType}
 */
export function getTimelineTypeIconComponent(type) {
  const norm = normalizeTimelineType(type);
  switch (norm) {
    case TimelineType.BALANCE:
      return Scale;
    case TimelineType.INCOME:
      return TrendingUp;
    case TimelineType.EXPENSE:
      return ShoppingCart;
    case TimelineType.INVESTMENT:
      return PiggyBank;
    case TimelineType.LOAN:
      return CreditCard;
    case TimelineType.REMINDER:
      return Bell;
    case TimelineType.DIARY:
      return BookOpen;
    case TimelineType.TODO:
      return CheckSquare;
    default:
      return Layers;
  }
}

/**
 * Returns a configured icon element for a given TimelineType enum.
 * @param {string} type
 * @param {number} size
 * @returns {React.ReactElement}
 */
export function getTimelineTypeIcon(type, size = 14) {
  const IconComponent = getTimelineTypeIconComponent(type);
  const color = getDefaultTimelineColor(type);
  return <IconComponent size={size} style={{ color }} />;
}

/**
 * Returns metadata options dynamically derived from Object.values(TimelineType).
 * @returns {Array<{type: string, labelKey: string, defaultColor: string, icon: React.ComponentType, singleInstance: boolean}>}
 */
export function getTimelineTypeOptions() {
  return Object.values(TimelineType).map((type) => ({
    type,
    labelKey: getTimelineTypeLabelKey(type),
    defaultColor: getDefaultTimelineColor(type),
    icon: getTimelineTypeIconComponent(type),
    singleInstance: isSingleInstanceTimelineType(type)
  }));
}

/**
 * Generates the dropdown options dynamically from TimelineType, filtering out single-instance types already present.
 * @param {Array} existingTimelines
 * @param {Function} t - translation function
 * @returns {Array<{key: string, type: string, label: string, icon: React.ReactElement, color: string}>}
 */
export function getTimelineDropdownOptions(existingTimelines = [], t) {
  const currentTypes = new Set(
    (existingTimelines || []).map((tl) => normalizeTimelineType(tl.type))
  );

  return Object.values(TimelineType)
    .filter((type) => {
      if (isSingleInstanceTimelineType(type) && currentTypes.has(type)) {
        return false;
      }
      return true;
    })
    .map((type) => ({
      key: type,
      type,
      label: t(getTimelineTypeLabelKey(type)),
      icon: getTimelineTypeIcon(type, 14),
      color: getDefaultTimelineColor(type)
    }));
}
