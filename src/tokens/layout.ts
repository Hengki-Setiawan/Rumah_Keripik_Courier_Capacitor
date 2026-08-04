export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800' },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  h2: { fontSize: 19, lineHeight: 25, fontWeight: '700' },
  bodyLg: { fontSize: 16, lineHeight: 23, fontWeight: '500' },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8 },
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, full: 9999 } as const;

export const elevationLight = {
  1: { shadowColor: '#2f241c', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  2: { shadowColor: '#2f241c', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  3: { shadowColor: '#2f241c', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 9 },
} as const;

export const elevationDark = {
  1: { borderWidth: 1, borderColor: 'border.subtle' },
  2: { borderWidth: 1, borderColor: 'border.default', shadowColor: 'glow.accent', shadowOpacity: 0.25, shadowRadius: 16 },
  3: { borderWidth: 1.5, borderColor: 'border.accent', shadowColor: 'glow.accent', shadowOpacity: 0.4, shadowRadius: 24 },
} as const;

export const motion = {
  duration: { instant: 100, fast: 180, normal: 280, slow: 420 },
  easing: { standard: 'cubic-bezier(0.2, 0, 0, 1)', spring: { damping: 15, stiffness: 150 } },
} as const;
