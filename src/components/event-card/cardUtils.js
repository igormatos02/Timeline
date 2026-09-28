import { TimelineColor } from '../../enums/index.js';

// Widths of the floating popovers of the event card
export const RECEIPT_DATE_POPOVER_WIDTH = 270;
export const RECEIPT_NUMBER_POPOVER_WIDTH = 220;
export const CATEGORY_PICKER_POPOVER_WIDTH = 220;

// Color with transparency: hex (#rgb / #rrggbb) or rgb() to rgba()
export function hexToRgba(hex, alpha = 1) {
  if (!hex) return hexToRgba(TimelineColor.PRIMARY, alpha);
  if (hex.startsWith('rgba')) {
    return hex;
  }
  if (hex.startsWith('rgb')) {
    return hex.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
  }
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  if (c.length === 6) {
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}
