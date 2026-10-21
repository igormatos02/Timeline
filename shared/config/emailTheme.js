import { TimelineColor } from '../enums/TimelineColor.js';

/**
 * Colors of the e-mails (dark theme). E-mail clients ignore CSS variables, so the e-mails take their colors from
 * these tokens — the e-mail counterpart of the web theme variables (src/index.css) — and from the palette.
 */
export const EmailTheme = Object.freeze({
  pageBackground: '#0b0f19',
  cardBackground: '#111827',
  footerBackground: '#0d131f',
  title: TimelineColor.WHITE,
  text: '#cbd5e1',
  muted: TimelineColor.SLATE_LIGHT,
  faint: TimelineColor.SLATE,
  accent: TimelineColor.PRIMARY,
  accentLight: TimelineColor.PRIMARY_LIGHT,
  accentSoft: '#c7d2fe',
  accentDark: '#4f46e5',
  accentDeep: '#7c3aed',
  condo: TimelineColor.CONDOFLOW,
  success: TimelineColor.SUCCESS,
  warning: TimelineColor.WARNING,
  border: 'rgba(255, 255, 255, 0.12)',
  borderSoft: 'rgba(255, 255, 255, 0.08)',
  borderFaint: 'rgba(255, 255, 255, 0.06)',
  panel: 'rgba(255, 255, 255, 0.03)',
  shadow: 'rgba(0, 0, 0, 0.6)',
  accentGlow: 'rgba(99, 102, 241, 0.1)',
  accentTint: 'rgba(99, 102, 241, 0.12)',
  accentTintStrong: 'rgba(99, 102, 241, 0.2)',
  accentBorder: 'rgba(99, 102, 241, 0.3)',
  accentBorderStrong: 'rgba(99, 102, 241, 0.4)',
  buttonShadow: 'rgba(79, 70, 229, 0.4)'
});
