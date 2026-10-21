import { TimelineColor } from '../enums/TimelineColor.js';

/**
 * Colors of the printable documents (receipts, declarations, reports): they print on white paper from a frame
 * without the app's CSS variables, so they take their colors from these tokens — the print counterpart of the web
 * theme variables (src/index.css) — and from the palette.
 */
export const PrintTheme = Object.freeze({
  paper: TimelineColor.WHITE,
  ink: '#0f172a',
  inkSoft: '#1e293b',
  inkMuted: '#334155',
  muted: TimelineColor.SLATE,
  faint: TimelineColor.SLATE_LIGHT,
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  panel: '#f8fafc',
  panelAlt: '#f1f5f9',
  accentTint: '#eef2ff',
  accentTintStrong: '#e0e7ff',
  accentBorder: '#c7d2fe',
  accentInk: '#4338ca',
  accentInkDeep: '#3730a3',
  link: '#2563eb',
  printInk: '#000000'
});
