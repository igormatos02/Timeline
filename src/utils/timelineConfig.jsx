import React from 'react';
import {
  Scale,
  Landmark,
  CreditCard,
  Bell,
  BookOpen,
  CheckSquare,
  ListTree,
  Layers,
  Wallet,
  ReceiptEuro
} from 'lucide-react';
import {
  TimelineType,
  TimeboardType,
  getDefaultTimelineColor,
  isSingleInstanceTimelineType,
  normalizeTimelineType,
  isWalletTimelineType
} from '../enums/index.js';
import { makeDiaryT } from './diaryLabels.js';

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
    case TimelineType.WALLET:
      return 'sidebar.walletTimeline';
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
    case TimelineType.FOLLOWUP:
      return 'sidebar.followupTimeline';
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
    case TimelineType.WALLET:
      return Wallet;
    case TimelineType.EXPENSE:
      return ReceiptEuro;
    case TimelineType.INVESTMENT:
      return Landmark;
    case TimelineType.LOAN:
      return CreditCard;
    case TimelineType.REMINDER:
      return Bell;
    case TimelineType.DIARY:
      return BookOpen;
    case TimelineType.TODO:
      return CheckSquare;
    case TimelineType.FOLLOWUP:
      return ListTree;
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
/**
 * Short description of a timeline type for the timeboard type (e.g. wallet -> "Dinheiro em caixa" on a condominium);
 * falls back to the default (financial) text when the timeboard type has none.
 * @param {string} type - timeline type
 * @param {string} timeboardType - TimeboardType of the active timeboard
 * @param {Function} t - translation function (returns the key itself when missing)
 * @returns {string}
 */
export function getTimelineTypeDescription(type, timeboardType, t) {
  const typeKey = isWalletTimelineType(type) ? TimelineType.WALLET : normalizeTimelineType(type);
  if (!typeKey) return '';
  const ownKey = `timelineTypeDescription.${timeboardType}.${typeKey}`;
  const own = timeboardType ? t(ownKey) : ownKey;
  if (own && own !== ownKey) return own;
  const defaultKey = `timelineTypeDescription.default.${typeKey}`;
  const fallback = t(defaultKey);
  return fallback && fallback !== defaultKey ? fallback : '';
}

// Types no longer offered when creating a timeline: the income timeline became the wallet and the expense
// timeline is replaced by the outflows mode of the balance (existing ones keep working)
const LEGACY_TIMELINE_TYPES = new Set([TimelineType.INCOME, TimelineType.EXPENSE]);

// Types present in a timeboard; the income timeline occupies the wallet slot until the database migration
function getPresentTimelineTypes(existingTimelines = []) {
  const present = new Set((existingTimelines || []).map((tl) => normalizeTimelineType(tl.type)));
  if ((existingTimelines || []).some((tl) => isWalletTimelineType(tl.type))) present.add(TimelineType.WALLET);
  return present;
}

export { getPresentTimelineTypes };

export function getTimelineTypeOptions() {
  return Object.values(TimelineType).filter((type) => !LEGACY_TIMELINE_TYPES.has(type)).map((type) => ({
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
 * @param {string} timeboardType - type of timeboard (e.g., 'condoflow')
 * @returns {Array<{key: string, type: string, label: string, icon: React.ReactElement, color: string}>}
 */
export function getTimelineDropdownOptions(existingTimelines = [], t, timeboardType = null) {
  const currentTypes = getPresentTimelineTypes(existingTimelines);

  // Types not allowed in condoflow timeboards
  const condoflowDisallowed = new Set([TimelineType.TODO, TimelineType.FOLLOWUP]);

  return Object.values(TimelineType)
    .filter((type) => {
      if (LEGACY_TIMELINE_TYPES.has(type)) return false;
      if (isSingleInstanceTimelineType(type) && currentTypes.has(type)) {
        return false;
      }
      if (timeboardType === TimeboardType.CONDOFLOW && condoflowDisallowed.has(type)) {
        return false;
      }
      return true;
    })
    .map((type) => ({
      key: type,
      type,
      label: makeDiaryT(t, timeboardType === TimeboardType.CONDOFLOW)(getTimelineTypeLabelKey(type)),
      icon: getTimelineTypeIcon(type, 14),
      color: getDefaultTimelineColor(type)
    }));
}
