import { describe, expect, it } from 'vitest';
import { packColors, parseColor } from '../src/color';

describe('parseColor', () => {
  it('parses hex forms', () => {
    expect(parseColor('#fff')).toEqual([1, 1, 1, 1]);
    expect(parseColor('#ff000080')[3]).toBeCloseTo(0.502, 2);
    expect(parseColor('#00ff00')).toEqual([0, 1, 0, 1]);
  });
  it('parses rgb and hsl', () => {
    expect(parseColor('rgb(255, 0, 0)')).toEqual([1, 0, 0, 1]);
    expect(parseColor('rgba(0,0,255,0.25)')).toEqual([0, 0, 1, 0.25]);
    expect(parseColor('hsl(120, 100%, 50%)')).toEqual([0, 1, 0, 1]);
  });
  it('falls back on junk', () => {
    expect(parseColor('#zz')).toEqual([0.5, 0.5, 0.5, 1]);
    expect(parseColor('tomato')).toEqual([0.5, 0.5, 0.5, 1]);
  });
  it('packs into a flat array', () => {
    const p = packColors([[1, 0, 0, 1], [0, 1, 0, 1]], 3);
    expect(Array.from(p)).toEqual([1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0]);
  });
});
