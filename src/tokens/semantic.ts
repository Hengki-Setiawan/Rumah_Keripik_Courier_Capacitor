import { globalTokens as g } from './global';

export type ThemeMode = 'dark' | 'light';

export const semanticDark = {
  'surface.base': g.umber[950],
  'surface.raised': g.umber[900],
  'surface.overlay': g.umber[800],
  'surface.highest': g.umber[700],

  'border.subtle': 'rgba(240,230,219,0.06)',
  'border.default': 'rgba(240,230,219,0.12)',
  'border.strong': 'rgba(240,230,219,0.22)',
  'border.accent': g.amber[500],

  'text.primary': g.umber[50],
  'text.secondary': 'rgba(240,230,219,0.68)',
  'text.muted': 'rgba(240,230,219,0.55)',
  'text.onAccent': '#000000',
  'text.onDanger': g.white,

  'action.primary': g.amber[500],
  'action.primaryHover': g.amber[400],
  'action.primaryPressed': g.amber[600],
  'action.primarySubtle': 'rgba(197,90,43,0.16)',

  'status.success': g.green[300],
  'status.successSubtle': g.green[100],
  'status.danger': g.red[500],
  'status.dangerSubtle': 'rgba(220,38,38,0.16)',
  'status.warning': g.yellow[300],
  'status.warningSubtle': 'rgba(217,164,65,0.16)',
  'status.info': g.blue[300],
  'status.infoSubtle': 'rgba(61,126,166,0.16)',

  'status.money': g.yellow[500],
  'status.moneySubtle': 'rgba(217,164,65,0.16)',

  'glow.accent': 'rgba(197,90,43,0.45)',
  'glow.danger': 'rgba(220,38,38,0.5)',
  'glow.success': 'rgba(95,122,46,0.4)',
} as const;

export const semanticLight: Record<keyof typeof semanticDark, string> = {
  'surface.base': g.umber[50],
  'surface.raised': g.white,
  'surface.overlay': g.white,
  'surface.highest': g.amber[50],

  'border.subtle': 'rgba(47,36,28,0.04)',
  'border.default': g.umber[200],
  'border.strong': g.umber[300],
  'border.accent': g.amber[500],

  'text.primary': g.umber[800],
  'text.secondary': g.umber[500],
  'text.muted': g.umber[500],
  'text.onAccent': g.white,
  'text.onDanger': g.white,

  'action.primary': g.amber[600],
  'action.primaryHover': g.amber[700],
  'action.primaryPressed': g.amber[800],
  'action.primarySubtle': g.amber[100],

  'status.success': g.green[600],
  'status.successSubtle': g.green[100],
  'status.danger': g.red[600],
  'status.dangerSubtle': g.red[100],
  'status.warning': g.yellow[600],
  'status.warningSubtle': 'rgba(217,164,65,0.14)',
  'status.info': g.blue[600],
  'status.infoSubtle': 'rgba(61,126,166,0.1)',

  'status.money': g.yellow[600],
  'status.moneySubtle': 'rgba(217,164,65,0.14)',

  'glow.accent': 'transparent',
  'glow.danger': 'transparent',
  'glow.success': 'transparent',
};

export type SemanticKey = keyof typeof semanticDark;

export const semanticTokens: Record<ThemeMode, Record<SemanticKey, string>> = {
  dark: semanticDark,
  light: semanticLight,
};
