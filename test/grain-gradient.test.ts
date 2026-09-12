import { beforeAll, describe, expect, it } from 'vitest';
import { grainGradientPresets, grainGradientSkSL, grainGradientUniforms } from '../src/shaders/grain-gradient';
import { noiseTextureBase64 } from '../src/noise-texture';
import { compile, loadCanvasKit, noiseShader, render, type CanvasKit } from './canvaskit';

let CanvasKit: CanvasKit;
let noise: unknown;
beforeAll(async () => {
  CanvasKit = await loadCanvasKit();
  noise = noiseShader(CanvasKit, noiseTextureBase64);
});

const SIZE = 256;

function uniformsFor(name: string, t: number, res: [number, number] = [SIZE, SIZE]) {
  const preset = grainGradientPresets.find((p) => p.name === name)!;
  const { speed: _s, frame: _f, ...params } = preset.params;
  return { ...grainGradientUniforms(params, res), u_time: t };
}

function distinct(pixels: Uint8Array) {
  const seen = new Set<number>();
  for (let i = 0; i < pixels.length; i += 4) seen.add((pixels[i]! << 16) | (pixels[i + 1]! << 8) | pixels[i + 2]!);
  return seen.size;
}

describe('grainGradient SkSL', () => {
  it('compiles', () => {
    expect(() => compile(CanvasKit, grainGradientSkSL)).not.toThrow();
  });

  it.each(grainGradientPresets.map((p) => p.name))('renders the %s preset', (name) => {
    const { pixels } = render(CanvasKit, grainGradientSkSL, uniformsFor(name, 0), SIZE, SIZE, `grain-${name.toLowerCase()}`, [noise]);
    expect(distinct(pixels)).toBeGreaterThan(100);
    expect(pixels[3]).toBe(255);
  });

  it('changes over time', () => {
    const a = render(CanvasKit, grainGradientSkSL, uniformsFor('Default', 0), 64, 64, undefined, [noise]).pixels;
    const b = render(CanvasKit, grainGradientSkSL, uniformsFor('Default', 5), 64, 64, undefined, [noise]).pixels;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff += Math.abs(a[i]! - b[i]!);
    expect(diff / a.length).toBeGreaterThan(1);
  });
});
