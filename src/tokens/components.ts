export const componentTokens = {
  button: {
    primary: { bg: 'action.primary', text: 'text.onAccent', pressedBg: 'action.primaryPressed' },
    danger: { bg: 'status.danger', text: 'text.onDanger', pressedBg: 'status.dangerSubtle' },
    ghost: { bg: 'transparent', text: 'action.primary', border: 'border.accent' },
  },
  card: {
    default: { bg: 'surface.raised', border: 'border.default', elevation: 1 },
    featured: { bg: 'surface.highest', border: 'border.accent', elevation: 3 },
    danger: { bg: 'status.dangerSubtle', border: 'status.danger', elevation: 1 },
  },
  statCard: {
    neutral: { iconBg: 'action.primarySubtle', iconColor: 'action.primary' },
    success: { iconBg: 'status.successSubtle', iconColor: 'status.success' },
    danger: { iconBg: 'status.dangerSubtle', iconColor: 'status.danger' },
  },
} as const;
