import { TimelineType, isWalletTimelineType, normalizeTimelineType } from './TimelineType.js';

// Where a movement's money was received or paid: in cash (the wallet) or through the bank account
export const PaymentChannel = Object.freeze({
  CASH: 'cash',
  BANK: 'bank'
});

/**
 * Payment channel of a movement from the type of the timeline that owns it, or null for other timelines.
 * @param {string} timelineType
 * @returns {string|null}
 */
export function paymentChannelOf(timelineType) {
  if (isWalletTimelineType(timelineType)) return PaymentChannel.CASH;
  if (normalizeTimelineType(timelineType) === TimelineType.INVESTMENT) return PaymentChannel.BANK;
  return null;
}
