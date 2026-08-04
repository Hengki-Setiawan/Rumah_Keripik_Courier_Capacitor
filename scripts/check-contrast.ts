/**
 * WCAG AA contrast check for design tokens (blueprint COURIER_UI_CSS_OVERHAUL X.1).
 * Reads tokens/semantic.ts + tokens/global.ts, composites alpha colors over surfaces,
 * and fails (exit 1) when a text/surface pair drops below WCAG AA.
 *   - 4.5:1 for body text
 *   - 3.0:1 for large text / UI components
 * Run via `npm run check:contrast` (tsx).
 */
import { semanticTokens, semanticDark } from '../src/tokens/semantic';

type RGB = { r: number; g: number; b: number };

const BODY_THRESHOLD = 4.5;
const LARGE_THRESHOLD = 3.0;

function parseHex(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function parseRgba(css: string): RGB & { a: number } {
  const m = css.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (!m) throw new Error(`Cannot parse color: ${css}`);
  const a = m[4] !== undefined ? Number(m[4]) : 1;
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a };
}

function toRgb(css: string): RGB {
  if (css === 'transparent') return { r: 0, g: 0, b: 0 };
  if (css.startsWith('#')) return parseHex(css);
  if (css.startsWith('rgb')) return parseRgba(css);
  throw new Error(`Unsupported color format: ${css}`);
}

/** Composite a possibly-alpha foreground over a background surface. */
function composite(fg: string, bg: string): RGB {
  const alpha = fg.startsWith('rgba') ? parseRgba(fg).a : 1;
  const fgRgb = toRgb(fg);
  const bgRgb = toRgb(bg);
  return {
    r: Math.round(fgRgb.r * alpha + bgRgb.r * (1 - alpha)),
    g: Math.round(fgRgb.g * alpha + bgRgb.g * (1 - alpha)),
    b: Math.round(fgRgb.b * alpha + bgRgb.b * (1 - alpha)),
  };
}

function luminance({ r, g, b }: RGB): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

interface Pair {
  fg: string;
  fgLabel: string;
  bg: string;
  bgLabel: string;
  kind: 'body' | 'large';
}

function buildPairs(theme: Record<string, string>): Pair[] {
  const s = (k: string) => theme[k];
  const surfaces = ['surface.base', 'surface.raised', 'surface.overlay'];
  const texts = ['text.primary', 'text.secondary', 'text.muted'];
  const pairs: Pair[] = [];

  for (const bg of surfaces) {
    for (const fg of texts) {
      pairs.push({ fg: s(fg), fgLabel: fg, bg: s(bg), bgLabel: bg, kind: 'body' });
    }
  }
  // Text on brand/danger (button labels)
  pairs.push({ fg: s('text.onAccent'), fgLabel: 'text.onAccent', bg: s('action.primary'), bgLabel: 'action.primary', kind: 'body' });
  pairs.push({ fg: s('text.onDanger'), fgLabel: 'text.onDanger', bg: s('status.danger'), bgLabel: 'status.danger', kind: 'body' });
  // Status colors used as UI (large) elements over surfaces
  for (const bg of ['surface.base', 'surface.raised']) {
    for (const status of ['status.success', 'status.warning', 'status.info']) {
      pairs.push({ fg: s(status), fgLabel: status, bg: s(bg), bgLabel: bg, kind: 'large' });
    }
  }
  return pairs;
}

const failures: string[] = [];
const rows: { fg: string; bg: string; ratio: number; threshold: number; pass: boolean; kind: string }[] = [];

for (const [mode, theme] of Object.entries(semanticTokens)) {
  const pairs = buildPairs(theme as Record<string, string>);
  for (const p of pairs) {
    const fgRgb = composite(p.fg, p.bg);
    const bgRgb = toRgb(p.bg);
    const ratio = contrast(fgRgb, bgRgb);
    const threshold = p.kind === 'body' ? BODY_THRESHOLD : LARGE_THRESHOLD;
    const pass = ratio >= threshold;
    rows.push({ fg: `${mode}:${p.fgLabel}`, bg: `${mode}:${p.bgLabel}`, ratio, threshold, pass, kind: p.kind });
    if (!pass) {
      failures.push(`${mode} ${p.fgLabel} over ${p.bgLabel} = ${ratio.toFixed(2)} (need >= ${threshold})`);
    }
  }
}

console.log('=== WCAG AA Contrast Audit ===');
for (const r of rows) {
  const mark = r.pass ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${r.fg.padEnd(32)} on ${r.bg.padEnd(30)} ratio=${r.ratio.toFixed(2).padStart(5)} (${r.kind}, >=${r.threshold})`);
}

// Reference surface base for composite info
console.log(`\n(surface.base dark = ${semanticDark['surface.base']})`);

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} contrast failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error('\nFix tokens in src/tokens/ before shipping (blueprint X.1).');
  process.exit(1);
}

console.log('\n✓ All token text/surface pairs meet WCAG AA.');
