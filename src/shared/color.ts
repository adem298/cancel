const HEX = /^#([0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance for a #rrggbb color. */
export function luminance(hex: string): number {
  const match = HEX.exec(hex);
  if (!match?.[1]) throw new Error(`Invalid hex color: ${hex}`);
  const n = parseInt(match[1], 16);
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export const INK_DARK = '#09090b';
export const INK_LIGHT = '#ffffff';

/** Pick the label color (dark or white) that reads best on the given background. */
export function readableInkOn(background: string): string {
  return contrastRatio(background, INK_DARK) >= contrastRatio(background, INK_LIGHT) ? INK_DARK : INK_LIGHT;
}

/** Accent colors are used for button fills and highlights on the dark canvas. */
export function accentIssues(hex: string): string[] {
  const issues: string[] = [];
  if (!isHexColor(hex)) return ['Use a six-digit hex color, for example #34d399.'];
  const ink = readableInkOn(hex);
  if (contrastRatio(hex, ink) < 4.5) {
    issues.push('Text on this color does not reach the 4.5:1 contrast needed for body text.');
  }
  if (contrastRatio(hex, '#09090b') < 3) {
    issues.push('This color is too close to the dark background to stand out as an accent.');
  }
  return issues;
}
