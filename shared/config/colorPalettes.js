import { TimelineType } from '../enums/TimelineType.js';
import { TimelineColor, TIMELINE_COLOR_PRESETS } from '../enums/TimelineColor.js';

export { TIMELINE_COLOR_PRESETS };

/**
 * Color Palettes Configuration
 * Defines curated color palettes with strict shade sets and helper utilities for timelines and customizations.
 */

export const ColorPaletteId = Object.freeze({
  // Custom Themes
  PURPLE: 'purple',
  BROWN: 'brown',
  BLUE: 'blue',
  LIGHT_BLUE: 'light_blue',
  RED: 'red',
  PINK: 'pink',
  CAQUI: 'caqui',
  KHAKI: 'caqui',

  // Timeline Native System Palettes
  BALANCE: 'timeline_balance',
  INCOME: 'timeline_income',
  EXPENSE: 'timeline_expense',
  INVESTMENT: 'timeline_investment',
  LOAN: 'timeline_loan',
  REMINDER: 'timeline_reminder',
  DIARY: 'timeline_diary',
  TODO: 'timeline_todo',
  FOLLOWUP: 'timeline_followup',
  PROJECT: 'timeline_project'
});

export const COLOR_PALETTES = Object.freeze({
  // --- Custom Curated Palettes ---
  [ColorPaletteId.PURPLE]: Object.freeze({
    id: ColorPaletteId.PURPLE,
    name: 'Purple',
    colors: Object.freeze([
      '#8f7193',
      '#a788ab',
      '#c0a0c3',
      '#dfcae1',
      '#e5dde6'
    ]),
    shades: Object.freeze({
      SHADE_1: '#8f7193',
      SHADE_2: '#a788ab',
      SHADE_3: '#c0a0c3',
      SHADE_4: '#dfcae1',
      SHADE_5: '#e5dde6'
    })
  }),

  [ColorPaletteId.BROWN]: Object.freeze({
    id: ColorPaletteId.BROWN,
    name: 'Brown',
    colors: Object.freeze([
      '#a68069',
      '#bf9780',
      '#d8af97',
      '#ecd6c0',
      '#ffffeb'
    ]),
    shades: Object.freeze({
      SHADE_1: '#a68069',
      SHADE_2: '#bf9780',
      SHADE_3: '#d8af97',
      SHADE_4: '#ecd6c0',
      SHADE_5: '#ffffeb'
    })
  }),

  [ColorPaletteId.BLUE]: Object.freeze({
    id: ColorPaletteId.BLUE,
    name: 'Blue',
    colors: Object.freeze([
      '#5086c1',
      '#6a9eda',
      '#84b6f4',
      '#b2dafa',
      '#dcffff'
    ]),
    shades: Object.freeze({
      SHADE_1: '#5086c1',
      SHADE_2: '#6a9eda',
      SHADE_3: '#84b6f4',
      SHADE_4: '#b2dafa',
      SHADE_5: '#dcffff'
    })
  }),

  [ColorPaletteId.LIGHT_BLUE]: Object.freeze({
    id: ColorPaletteId.LIGHT_BLUE,
    name: 'Light Blue',
    colors: Object.freeze([
      '#96c4c4',
      '#aedddd',
      '#c7f7f7',
      '#e4fbfb',
      '#ffffff'
    ]),
    shades: Object.freeze({
      SHADE_1: '#96c4c4',
      SHADE_2: '#aedddd',
      SHADE_3: '#c7f7f7',
      SHADE_4: '#e4fbfb',
      SHADE_5: '#ffffff'
    })
  }),

  [ColorPaletteId.RED]: Object.freeze({
    id: ColorPaletteId.RED,
    name: 'Red',
    colors: Object.freeze([
      '#c63637',
      '#e2504c',
      '#ff6961',
      '#ff9688',
      '#ffbfb0'
    ]),
    shades: Object.freeze({
      SHADE_1: '#c63637',
      SHADE_2: '#e2504c',
      SHADE_3: '#ff6961',
      SHADE_4: '#ff9688',
      SHADE_5: '#ffbfb0'
    })
  }),

  [ColorPaletteId.PINK]: Object.freeze({
    id: ColorPaletteId.PINK,
    name: 'Pink',
    colors: Object.freeze([
      '#c999af',
      '#e3b1c8',
      '#fdcae1',
      '#ffe5f0',
      '#ffffff'
    ]),
    shades: Object.freeze({
      SHADE_1: '#c999af',
      SHADE_2: '#e3b1c8',
      SHADE_3: '#fdcae1',
      SHADE_4: '#ffe5f0',
      SHADE_5: '#ffffff'
    })
  }),

  [ColorPaletteId.CAQUI]: Object.freeze({
    id: ColorPaletteId.CAQUI,
    name: 'Caqui',
    colors: Object.freeze([
      '#756f4b',
      '#a9a27c',
      '#e0d8b0',
      '#f0ebd7'
    ]),
    shades: Object.freeze({
      SHADE_1: '#756f4b',
      SHADE_2: '#a9a27c',
      SHADE_3: '#e0d8b0',
      SHADE_4: '#f0ebd7'
    })
  }),

  // --- Timeline System Palettes ---
  [ColorPaletteId.BALANCE]: Object.freeze({
    id: ColorPaletteId.BALANCE,
    timelineType: TimelineType.BALANCE,
    name: 'Balance (Sky)',
    colors: Object.freeze([
      '#0ea5e9',
      '#0284c7',
      '#38bdf8',
      '#7dd3fc',
      '#bae6fd'
    ]),
    shades: Object.freeze({
      PRIMARY: '#0ea5e9',
      DARK: '#0284c7',
      MEDIUM: '#38bdf8',
      LIGHT: '#7dd3fc',
      LIGHTEST: '#bae6fd'
    })
  }),

  [ColorPaletteId.INCOME]: Object.freeze({
    id: ColorPaletteId.INCOME,
    timelineType: TimelineType.INCOME,
    name: 'Income (Emerald)',
    colors: Object.freeze([
      '#10b981',
      '#059669',
      '#34d399',
      '#6ee7b7',
      '#a7f3d0'
    ]),
    shades: Object.freeze({
      PRIMARY: '#10b981',
      DARK: '#059669',
      MEDIUM: '#34d399',
      LIGHT: '#6ee7b7',
      LIGHTEST: '#a7f3d0'
    })
  }),

  [ColorPaletteId.EXPENSE]: Object.freeze({
    id: ColorPaletteId.EXPENSE,
    timelineType: TimelineType.EXPENSE,
    name: 'Expense (Rose)',
    colors: Object.freeze([
      '#f43f5e',
      '#e11d48',
      '#fb7185',
      '#fda4af',
      '#fecdd3'
    ]),
    shades: Object.freeze({
      PRIMARY: '#f43f5e',
      DARK: '#e11d48',
      MEDIUM: '#fb7185',
      LIGHT: '#fda4af',
      LIGHTEST: '#fecdd3'
    })
  }),

  [ColorPaletteId.INVESTMENT]: Object.freeze({
    id: ColorPaletteId.INVESTMENT,
    timelineType: TimelineType.INVESTMENT,
    name: 'Investment (Violet)',
    colors: Object.freeze([
      '#8b5cf6',
      '#7c3aed',
      '#a78bfa',
      '#c4b5fd',
      '#ddd6fe'
    ]),
    shades: Object.freeze({
      PRIMARY: '#8b5cf6',
      DARK: '#7c3aed',
      MEDIUM: '#a78bfa',
      LIGHT: '#c4b5fd',
      LIGHTEST: '#ddd6fe'
    })
  }),

  [ColorPaletteId.LOAN]: Object.freeze({
    id: ColorPaletteId.LOAN,
    timelineType: TimelineType.LOAN,
    name: 'Loan (Indigo)',
    colors: Object.freeze([
      '#6366f1',
      '#4f46e5',
      '#818cf8',
      '#a5b4fc',
      '#c7d2fe'
    ]),
    shades: Object.freeze({
      PRIMARY: '#6366f1',
      DARK: '#4f46e5',
      MEDIUM: '#818cf8',
      LIGHT: '#a5b4fc',
      LIGHTEST: '#c7d2fe'
    })
  }),

  [ColorPaletteId.REMINDER]: Object.freeze({
    id: ColorPaletteId.REMINDER,
    timelineType: TimelineType.REMINDER,
    name: 'Reminder (Amber)',
    colors: Object.freeze([
      '#f59e0b',
      '#d97706',
      '#fbbf24',
      '#fcd34d',
      '#fde68a'
    ]),
    shades: Object.freeze({
      PRIMARY: '#f59e0b',
      DARK: '#d97706',
      MEDIUM: '#fbbf24',
      LIGHT: '#fcd34d',
      LIGHTEST: '#fde68a'
    })
  }),

  [ColorPaletteId.DIARY]: Object.freeze({
    id: ColorPaletteId.DIARY,
    timelineType: TimelineType.DIARY,
    name: 'Diary (Pink)',
    colors: Object.freeze([
      '#ec4899',
      '#db2777',
      '#f472b6',
      '#f9a8d4',
      '#fbcfe8'
    ]),
    shades: Object.freeze({
      PRIMARY: '#ec4899',
      DARK: '#db2777',
      MEDIUM: '#f472b6',
      LIGHT: '#f9a8d4',
      LIGHTEST: '#fbcfe8'
    })
  }),

  [ColorPaletteId.TODO]: Object.freeze({
    id: ColorPaletteId.TODO,
    timelineType: TimelineType.TODO,
    name: 'Todo (Blue)',
    colors: Object.freeze([
      '#3b82f6',
      '#2563eb',
      '#60a5fa',
      '#93c5fd',
      '#bfdbfe'
    ]),
    shades: Object.freeze({
      PRIMARY: '#3b82f6',
      DARK: '#2563eb',
      MEDIUM: '#60a5fa',
      LIGHT: '#93c5fd',
      LIGHTEST: '#bfdbfe'
    })
  }),

  [ColorPaletteId.FOLLOWUP]: Object.freeze({
    id: ColorPaletteId.FOLLOWUP,
    timelineType: TimelineType.FOLLOWUP,
    name: 'Followup (Cyan)',
    colors: Object.freeze([
      '#06b6d4',
      '#0891b2',
      '#22d3ee',
      '#67e8f9',
      '#a5f3fc'
    ]),
    shades: Object.freeze({
      PRIMARY: '#06b6d4',
      DARK: '#0891b2',
      MEDIUM: '#22d3ee',
      LIGHT: '#67e8f9',
      LIGHTEST: '#a5f3fc'
    })
  }),

  [ColorPaletteId.PROJECT]: Object.freeze({
    id: ColorPaletteId.PROJECT,
    name: 'Project (Purple)',
    colors: Object.freeze([
      '#a855f7',
      '#9333ea',
      '#c084fc',
      '#d8b4fe',
      '#e9d5ff'
    ]),
    shades: Object.freeze({
      PRIMARY: '#a855f7',
      DARK: '#9333ea',
      MEDIUM: '#c084fc',
      LIGHT: '#d8b4fe',
      LIGHTEST: '#e9d5ff'
    })
  })
});

/**
 * Mapping of TimelineType to its default palette.
 */
export const TIMELINE_TYPE_PALETTES = Object.freeze({
  [TimelineType.BALANCE]: COLOR_PALETTES[ColorPaletteId.BALANCE],
  [TimelineType.INCOME]: COLOR_PALETTES[ColorPaletteId.INCOME],
  [TimelineType.EXPENSE]: COLOR_PALETTES[ColorPaletteId.EXPENSE],
  [TimelineType.INVESTMENT]: COLOR_PALETTES[ColorPaletteId.INVESTMENT],
  [TimelineType.LOAN]: COLOR_PALETTES[ColorPaletteId.LOAN],
  [TimelineType.REMINDER]: COLOR_PALETTES[ColorPaletteId.REMINDER],
  [TimelineType.DIARY]: COLOR_PALETTES[ColorPaletteId.DIARY],
  [TimelineType.TODO]: COLOR_PALETTES[ColorPaletteId.TODO],
  [TimelineType.FOLLOWUP]: COLOR_PALETTES[ColorPaletteId.FOLLOWUP]
});

/**
 * Returns the palette object by ID or key.
 * @param {string} paletteId
 * @returns {object|null}
 */
export function getPalette(paletteId) {
  if (!paletteId) return null;
  return COLOR_PALETTES[paletteId] || null;
}

/**
 * Returns the native palette for a specific TimelineType.
 * @param {string} timelineType
 * @returns {object|null}
 */
export function getTimelinePalette(timelineType) {
  if (!timelineType) return null;
  return TIMELINE_TYPE_PALETTES[timelineType] || null;
}

/**
 * Returns an array of colors (hex codes) for the specified palette.
 * @param {string} paletteId
 * @returns {string[]}
 */
export function getPaletteColors(paletteId) {
  const palette = getPalette(paletteId);
  return palette ? [...palette.colors] : [];
}

/**
 * Checks if a specific color belongs to a palette.
 * @param {string} color
 * @param {string} paletteId
 * @returns {boolean}
 */
export function isColorInPalette(color, paletteId) {
  if (!color || !paletteId) return false;
  const palette = getPalette(paletteId);
  if (!palette) return false;
  const normalized = color.trim().toLowerCase();
  return palette.colors.some((c) => c.toLowerCase() === normalized);
}

/**
 * Presets of all available palettes for timeline color selection.
 * Each preset provides the representative primary color (colors[0]),
 * id, and name of the palette.
 */
export const TIMELINE_PALETTE_PRESETS = Object.freeze(
  Object.values(COLOR_PALETTES).map((palette) => Object.freeze({
    id: palette.id,
    name: palette.name,
    color: palette.colors[0],
    colors: palette.colors
  }))
);

export const TIMELINE_PALETTE_COLORS = Object.freeze(
  TIMELINE_PALETTE_PRESETS.map((p) => p.color)
);

/**
 * Finds the palette that has the specified color as primary or in its shades.
 * @param {string} color
 * @returns {object|null}
 */
export function findPaletteByColor(color) {
  if (!color) return null;
  const normalized = color.trim().toLowerCase();
  const primaryMatch = Object.values(COLOR_PALETTES).find(
    (p) => p.colors[0].toLowerCase() === normalized
  );
  if (primaryMatch) return primaryMatch;
  return Object.values(COLOR_PALETTES).find(
    (p) => p.colors.some((c) => c.toLowerCase() === normalized)
  ) || null;
}

/**
 * Validates or falls back to the primary shade of a palette.
 * @param {string} color
 * @param {string} paletteId
 * @returns {string}
 */
export function sanitizePaletteColor(color, paletteId) {
  const palette = getPalette(paletteId);
  if (!palette) return color;
  return isColorInPalette(color, paletteId) ? color : palette.colors[0];
}

/**
 * Resolves a full theme object containing all shades and visual tokens
 * for a timeline given its color, palette ID, or type.
 * @param {string} colorOrPaletteId
 * @param {string} [fallbackColor]
 * @returns {object}
 */
export function getPaletteTheme(colorOrPaletteId, fallbackColor = TimelineColor.PRIMARY) {
  const palette = getPalette(colorOrPaletteId) || findPaletteByColor(colorOrPaletteId);
  const baseColor = colorOrPaletteId || fallbackColor;

  if (!palette || !palette.colors || palette.colors.length === 0) {
    return {
      id: null,
      name: 'Default',
      primary: baseColor,
      secondary: baseColor,
      medium: baseColor,
      light: baseColor,
      lightest: baseColor,
      colors: [baseColor]
    };
  }

  const c = palette.colors;
  return {
    id: palette.id,
    name: palette.name,
    primary: c[0],
    secondary: c[1] || c[0],
    medium: c[2] || c[1] || c[0],
    light: c[3] || c[2] || c[0],
    lightest: c[4] || c[3] || c[0],
    colors: c
  };
}

