export type RGBA = [number, number, number, number];

const fallbackColor: RGBA = [0.5, 0.5, 0.5, 1];

export const clamp = (n: number, min: number, max: number): number =>
  Math.min(Math.max(n, min), max);

/** Parse `#hex`, `rgb()`, `rgba()`, `hsl()`, `hsla()`, or a numeric tuple into 0..1 RGBA. */
export function parseColor(
  color: string | [number, number, number] | RGBA | undefined,
): RGBA {
  if (Array.isArray(color)) {
    if (color.length === 4) return color;
    if (color.length === 3) return [color[0], color[1], color[2], 1];
    return fallbackColor;
  }
  if (typeof color !== 'string') return fallbackColor;

  let rgba: RGBA | null;
  if (color.startsWith('#')) rgba = hexToRgba(color);
  else if (color.startsWith('rgb')) rgba = parseRgba(color);
  else if (color.startsWith('hsl')) rgba = parseHsla(color);
  else rgba = null;

  if (rgba === null) return fallbackColor;
  return [clamp(rgba[0], 0, 1), clamp(rgba[1], 0, 1), clamp(rgba[2], 0, 1), clamp(rgba[3], 0, 1)];
}

function hexToRgba(input: string): RGBA | null {
  let hex = input.replace(/^#/, '');
  if (hex.length === 3 || hex.length === 4) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (hex.length === 6) hex += 'ff';
  if (!/^[0-9a-f]{8}$/i.test(hex)) return null;
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
    parseInt(hex.slice(6, 8), 16) / 255,
  ];
}

function parseRgba(input: string): RGBA | null {
  const m = input.match(
    /^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)$/i,
  );
  if (!m) return null;
  return [
    parseInt(m[1] ?? '0') / 255,
    parseInt(m[2] ?? '0') / 255,
    parseInt(m[3] ?? '0') / 255,
    m[4] === undefined ? 1 : parseFloat(m[4]),
  ];
}

function parseHsla(input: string): RGBA | null {
  const m = input.match(
    /^hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([0-9.]+))?\s*\)$/i,
  );
  if (!m) return null;
  const h = parseInt(m[1] ?? '0') / 360;
  const s = parseInt(m[2] ?? '0') / 100;
  const l = parseInt(m[3] ?? '0') / 100;
  const a = m[4] === undefined ? 1 : parseFloat(m[4]);
  if (s === 0) return [l, l, l, a];

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3), a];
}

/** Pack up to `max` colours into a flat array for a `vec4[max]` uniform. */
export function packColors(colors: RGBA[], max: number): number[] {
  const out = new Array<number>(max * 4).fill(0);
  colors.slice(0, max).forEach((c, i) => out.splice(i * 4, 4, ...c));
  return out;
}
