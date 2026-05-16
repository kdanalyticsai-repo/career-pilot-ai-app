export const Colors = {
  primary: '#5d3fd3',         // Electric Indigo / Cyber Violet
  primaryLight: '#e8e0ff',    // primary-container
  primaryDark: '#4723be',
  secondary: '#565e74',       // Slate
  tertiary: '#4edea3',        // Emerald Pulse (positive metrics)
  danger: '#ba1a1a',
  warning: '#e08c00',
  success: '#4edea3',

  background: '#f7f9fb',
  surface: '#ffffff',
  surfaceSecondary: '#f2f4f6',
  surfaceMid: '#eceef0',
  border: '#e6e8ea',
  borderSubtle: '#f1f5f9',

  text: '#191c1e',            // on-surface
  textSecondary: '#484554',   // on-surface-variant
  textMuted: '#797586',       // outline
  textInverse: '#ffffff',

  matchHigh: '#4edea3',       // Emerald 80%+
  matchMid: '#e08c00',        // Amber 60-79%
  matchLow: '#ba1a1a',        // Red <60%
} as const;

export const Typography = {
  h1: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28, letterSpacing: -0.2 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  h4: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.2 },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 4,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// Ambient shadows tinted with primary/secondary color
export const Shadow = {
  sm: {
    shadowColor: '#191c1e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  md: {
    shadowColor: '#5d3fd3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
} as const;
