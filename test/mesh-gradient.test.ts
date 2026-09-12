import { beforeAll, describe, expect, it } from 'vitest';
import { meshGradientPresets, meshGradientSkSL, meshGradientUniforms } from '../src/shaders/mesh-gradient';
import { compile, loadCanvasKit, render, type CanvasKit } from './canvaskit';

let CanvasKit: CanvasKit;
beforeAll(async () => {
  CanvasKit = await loadCanvasKit();
});

const SIZE = 256;

function uniformsFor(presetName: string, t: number, res: [number, number] = [SIZE, SIZE]) {
  const preset = meshGradientPresets.find((p) => p.name === presetName)!;
  const { speed: _s, frame: _f, ...params } = preset.params;
  return meshGradientUniforms(params, res, t);
}

function stats(pixels: Uint8Array) {
  let minA = 255, maxA = 0;
  const seen = new Set<number>();
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3]!;
    minA = Math.min(minA, a);
    maxA = Math.max(maxA, a);
    seen.add((pixels[i]! << 16) | (pixels[i + 1]! << 8) | pixels[i + 2]!);
  }
  return { minA, maxA, distinctColors: seen.size };
}

describe('meshGradient SkSL', () => {
  it('compiles', () => {
    expect(() => compile(CanvasKit, meshGradientSkSL)).not.toThrow();
  });

  it.each(meshGradientPresets.map((p) => p.name))('renders the %s preset as a gradient', (name) => {
    const { pixels } = render(CanvasKit, meshGradientSkSL, uniformsFor(name, 0), SIZE, SIZE, `mesh-${name.toLowerCase()}`);
    const s = stats(pixels);
    expect(s.minA).toBe(255);
    expect(s.distinctColors).toBeGreaterThan(100);
  });

  it('changes over time', () => {
    const a = render(CanvasKit, meshGradientSkSL, uniformsFor('Default', 0), 64, 64).pixels;
    const b = render(CanvasKit, meshGradientSkSL, uniformsFor('Default', 3), 64, 64).pixels;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff += Math.abs(a[i]! - b[i]!);
    expect(diff / a.length).toBeGreaterThan(1);
  });

  it('keeps colour opacity when a colour is translucent', () => {
    const u = uniformsFor('Default', 0);
    u.u_colors = new Float32Array(40);
    u.u_colors.set([1, 0, 0, 0.5]);
    u.u_colorsCount = 1;
    const { pixels } = render(CanvasKit, meshGradientSkSL, u, 16, 16);
    const { minA, maxA } = stats(pixels);
    expect(minA).toBeGreaterThan(120);
    expect(maxA).toBeLessThan(135);
  });

  it('respects fit: contain on a wide canvas leaves the same picture as square, centred', () => {
    const square = render(CanvasKit, meshGradientSkSL, uniformsFor('Ink', 0, [64, 64]), 64, 64).pixels;
    const wide = render(CanvasKit, meshGradientSkSL, uniformsFor('Ink', 0, [128, 64]), 128, 64).pixels;
    // centre column of the square image equals centre column of the wide image
    let diff = 0;
    for (let y = 0; y < 64; y++) {
      const si = (y * 64 + 32) * 4;
      const wi = (y * 128 + 64) * 4;
      diff += Math.abs(square[si]! - wide[wi]!);
    }
    expect(diff / 64).toBeLessThan(2);
  });
});
