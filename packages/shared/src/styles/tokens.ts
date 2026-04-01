/**
 * Design token strings for light/dark theming.
 *
 * Rules:
 *  - Every export is a Tailwind class string (or Record of them).
 *  - Color / appearance only — no layout, spacing, or typography scale.
 *  - All dark-mode variants live here so components stay free of raw `dark:` classes.
 *  - To update the palette, change values here; components automatically follow.
 */

// ── Surfaces ──────────────────────────────────────────────────────────────────

/** Full-screen page / route background */
export const pageBg = 'bg-gray-50 dark:bg-gray-950';

/** Card, panel, header — primary surface */
export const surface = 'bg-white dark:bg-gray-900';

/** Subtle fill — secondary badges, code blocks, inner well */
export const subtleBg = 'bg-gray-100 dark:bg-gray-800';

// ── Borders ───────────────────────────────────────────────────────────────────

/** Standard border between surfaces */
export const borderBase = 'border-gray-200 dark:border-gray-700';

/** Very faint interior divider */
export const borderSubtle = 'border-gray-100 dark:border-gray-800';

/** Input / form element border */
export const borderStrong = 'border-gray-300 dark:border-gray-600';

/** `divide-*` utility variant of borderBase */
export const divideBase = 'divide-gray-100 dark:divide-gray-800';

// ── Text ──────────────────────────────────────────────────────────────────────

export const textPrimary   = 'text-gray-900 dark:text-gray-100';
export const textSecondary = 'text-gray-700 dark:text-gray-300';
export const textMuted     = 'text-gray-500 dark:text-gray-400';
export const textFaint     = 'text-gray-400 dark:text-gray-500';
export const textLink      = 'text-blue-600 dark:text-blue-400';

// ── Hover helpers (use inside composed tokens below, or standalone) ────────────

export const hoverSurface       = 'hover:bg-gray-100 dark:hover:bg-gray-800';
export const hoverSurfaceSubtle = 'hover:bg-gray-50  dark:hover:bg-gray-800';
export const hoverTextPrimary   = 'hover:text-gray-900 dark:hover:text-gray-100';

// ── Composed card patterns ────────────────────────────────────────────────────

/**
 * Color + border for a card surface. Add rounding and padding per usage.
 * Example: `<div className={`rounded-lg ${card} px-4 py-3`}>`
 */
export const card = `border ${borderBase} ${surface}`;

/**
 * Interactive card with lift shadow on hover.
 * Includes rounding so it can be used directly.
 */
export const cardElevated = `rounded-lg border ${borderBase} ${surface} shadow-sm transition-shadow hover:shadow-md`;

// ── Page layout helpers ───────────────────────────────────────────────────────

/** Root shell of a full-height route page (detail pages that grow to content) */
export const pageShell = `flex min-h-screen flex-col ${pageBg}`;

/** Root shell of a fixed-height list page (fills viewport, children scroll) */
export const pageShellFixed = `flex h-screen flex-col ${pageBg}`;

/**
 * Colors for a sticky page/section header bar.
 * Add `shrink-0`, padding, and height per layout.
 */
export const pageHeaderColors = `border-b ${borderBase} ${surface}`;

// ── Badges / pills ────────────────────────────────────────────────────────────

const _badgeBase = 'rounded-full px-2 py-0.5 text-xs font-medium';

export const badge = {
  neutral: `${_badgeBase} bg-gray-100   dark:bg-gray-800   text-gray-700   dark:text-gray-300`,
  blue:    `${_badgeBase} bg-blue-100   dark:bg-blue-900   text-blue-800   dark:text-blue-200`,
  green:   `${_badgeBase} bg-green-100  dark:bg-green-900  text-green-800  dark:text-green-200`,
  red:     `${_badgeBase} bg-red-100    dark:bg-red-900    text-red-800    dark:text-red-200`,
  purple:  `${_badgeBase} bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200`,
  indigo:  `${_badgeBase} bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200`,
  amber:   `${_badgeBase} bg-amber-100  dark:bg-amber-900  text-amber-800  dark:text-amber-200`,
} as const;

// ── Semantic badge maps ────────────────────────────────────────────────────────

/** Keyed by full party name */
export const partyBadge: Record<string, string> = {
  Democrat:    badge.blue,
  Republican:  badge.red,
  Independent: badge.purple,
};

/** Keyed by full chamber name ("House" | "Senate") */
export const chamberBadgeByName: Record<string, string> = {
  House:   badge.green,
  Senate:  badge.purple,
};

/** Keyed by chamber code ('h' | 's') */
export const chamberBadgeByCode: Record<string, string> = {
  h: badge.amber,
  s: badge.indigo,
};

// ── Buttons ───────────────────────────────────────────────────────────────────

export const btn = {
  /** Filled primary action. Add size padding per usage. */
  primary:
    'rounded-lg bg-blue-600 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50',

  /** Outlined secondary action. Add size padding per usage. */
  secondary:
    `rounded-lg border ${borderStrong} font-medium text-gray-600 dark:text-gray-300 transition-colors ${hoverSurfaceSubtle} disabled:opacity-50`,

  /** Text-only ghost button or nav item. Add size padding per usage. */
  ghost:
    `rounded-md font-medium text-gray-600 dark:text-gray-400 transition-colors ${hoverSurface} ${hoverTextPrimary}`,

  /** Blue-tinted outline — "View Full Text" style. Add size padding per usage. */
  blueOutline:
    'rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 font-medium text-blue-700 dark:text-blue-300 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900',
} as const;

// ── Input ─────────────────────────────────────────────────────────────────────

/** Text input / textarea base. Add width, padding, font-size per usage. */
export const inputBase =
  `rounded-lg border ${borderStrong} ${surface} text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`;

// ── Navigation links ──────────────────────────────────────────────────────────

export const navLink = {
  active:
    'rounded-md px-3 py-2 text-sm font-medium bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 transition-colors',
  inactive:
    `rounded-md px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 ${hoverSurface} ${hoverTextPrimary} transition-colors`,
} as const;

// ── Feedback / status text ────────────────────────────────────────────────────

export const feedback = {
  /** Inline error banner with border */
  error:
    'rounded-lg border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-600 dark:text-red-400',
  /** Bare error text — sm */
  errorText:
    'text-sm text-red-500 dark:text-red-400',
  /** Bare error text — xs */
  errorTextXs:
    'text-xs text-red-600 dark:text-red-400',
  /** Inline success confirmation */
  successText:
    'text-sm text-green-600 dark:text-green-400',
  /** Generic loading / empty state */
  loadingText:
    'text-sm text-gray-400 dark:text-gray-500',
} as const;
