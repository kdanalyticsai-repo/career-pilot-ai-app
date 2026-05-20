// Aetheris AI Design System — Deep Violet + Glassmorphism
export const Colors = {
  // Primary — Deep Violet
  primary: '#5b2eff',
  primaryDark: '#4300dc',
  primaryHero: '#1a0060',
  primaryLight: '#e5deff',
  primaryContainer: '#5b2eff',

  // Secondary
  secondary: '#6349c0',
  secondaryLight: '#e7deff',

  // Tertiary — Electric Blue (AI-active accent)
  tertiary: '#00aec4',
  tertiaryBright: '#00d1ff',
  tertiaryContainer: '#006880',

  // Semantic
  danger: '#ba1a1a',
  warning: '#c47f00',
  success: '#1e7e34',

  // Backgrounds
  background: '#f8f9fe',
  backgroundDim: '#eceef3',

  // Surfaces
  surface: '#ffffff',
  surfaceGlass: 'rgba(255,255,255,0.72)',
  surfaceContainer: '#eceef3',
  surfaceLow: '#f2f3f8',
  surfaceSecondary: '#f2f3f8',
  surfaceMid: '#e7e8ed',

  // Borders
  border: '#c9c3da',
  borderSubtle: 'rgba(201,195,218,0.45)',
  borderGlass: 'rgba(255,255,255,0.45)',

  // Text
  text: '#191c1f',
  textSecondary: '#474557',
  textMuted: '#787589',
  textInverse: '#ffffff',

  // Match
  matchHigh: '#1e7e34',
  matchMid: '#c47f00',
  matchLow: '#ba1a1a',

  // Provider
  providerAccent: '#006880',
} as const;

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36, letterSpacing: -0.4 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 30, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28, letterSpacing: -0.2 },
  h4: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 22 },
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
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// Tinted ambient shadows per design spec
export const Shadow = {
  sm: {
    shadowColor: '#5b2eff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  md: {
    shadowColor: '#5b2eff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  lg: {
    shadowColor: '#5b2eff',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 12,
  },
} as const;

// Hero gradient stops (simulated via overlapping Views)
export const HeroColors = {
  base: '#1a0060',
  orb1: '#5b2eff',
  orb2: '#00d1ff',
  text: '#ffffff',
  textDim: 'rgba(255,255,255,0.65)',
  border: 'rgba(255,255,255,0.18)',
  surface: 'rgba(255,255,255,0.12)',
} as const;
