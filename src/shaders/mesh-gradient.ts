import { packColors, parseColor, type RGBA } from '../color';
import {
  defaultObjectSizing,
  objectUV,
  sizingUniformDeclarations,
  sizingUniforms,
  type ShaderSizingParams,
  type ShaderSizingUniforms,
} from '../sksl/sizing';
import { proceduralHash21, rotation2 } from '../sksl/utils';
import type { ShaderMotionParams, ShaderPreset } from '../types';

export const meshGradientMeta = { maxColorCount: 10 } as const;

/**
 * A flowing composition of colour spots, moving along distinct trajectories
 * and transformed by organic distortion.
 *
 * Uniforms:
 * - u_time (float): animation time in seconds
 * - u_colors (vec4[10]): colour spots, RGBA 0..1
 * - u_colorsCount (float): active colours
 * - u_distortion (float): organic noise distortion, 0..1
 * - u_swirl (float): vortex distortion, 0..1
 * - u_grainMixer (float): grain on shape edges, 0..1
 * - u_grainOverlay (float): black/white grain overlay, 0..1
 * plus the sizing uniforms from `sizingUniformDeclarations`.
 */
export const meshGradientSkSL = `
uniform float u_time;
uniform vec4 u_colors[${meshGradientMeta.maxColorCount}];
uniform float u_colorsCount;
uniform float u_distortion;
uniform float u_swirl;
uniform float u_grainMixer;
uniform float u_grainOverlay;
${sizingUniformDeclarations}
${objectUV}
${rotation2}
${proceduralHash21}

float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

float noise(vec2 n, vec2 seedOffset) {
  return valueNoise(n + seedOffset);
}

vec2 getPosition(int i, float t) {
  float a = float(i) * .37;
  float b = .6 + fract(float(i) / 3.) * .9;
  float c = .8 + fract(float(i + 1) / 4.);
  float x = sin(t * b + a);
  float y = cos(t * c + a * 1.5);
  return .5 + .5 * vec2(x, y);
}

vec4 main(vec2 fragCoord) {
  vec2 uv = getObjectUV(fragCoord);
  uv += .5;
  vec2 grainUV = uv * 1000.;

  float mixerGrain = 0.;
  if (u_grainMixer > 0.) {
    mixerGrain = .4 * u_grainMixer * (noise(grainUV, vec2(0.)) - .5);
  }

  const float firstFrameOffset = 41.5;
  float t = .5 * (u_time + firstFrameOffset);

  float radius = smoothstep(0., 1., length(uv - .5));
  float center = 1. - radius;
  for (float i = 1.; i <= 2.; i++) {
    uv.x += u_distortion * center / i * sin(t + i * .4 * smoothstep(.0, 1., uv.y)) * cos(.2 * t + i * 2.4 * smoothstep(.0, 1., uv.y));
    uv.y += u_distortion * center / i * cos(t + i * 2. * smoothstep(.0, 1., uv.x));
  }

  vec2 uvRotated = uv;
  uvRotated -= vec2(.5);
  float angle = 3. * u_swirl * radius;
  uvRotated = rotate(uvRotated, -angle);
  uvRotated += vec2(.5);

  vec3 color = vec3(0.);
  float opacity = 0.;
  float totalWeight = 0.;

  for (int i = 0; i < ${meshGradientMeta.maxColorCount}; i++) {
    if (i < int(u_colorsCount)) {
      vec2 pos = getPosition(i, t) + mixerGrain;
      vec3 colorFraction = u_colors[i].rgb * u_colors[i].a;
      float opacityFraction = u_colors[i].a;

      float dist = length(uvRotated - pos);
      dist = pow(dist, 3.5);
      float weight = 1. / (dist + 1e-3);
      color += colorFraction * weight;
      opacity += opacityFraction * weight;
      totalWeight += weight;
    }
  }

  color /= max(1e-4, totalWeight);
  opacity /= max(1e-4, totalWeight);

  if (u_grainOverlay > 0.) {
    float grainOverlay = valueNoise(rotate(grainUV, 1.) + vec2(3.));
    grainOverlay = mix(grainOverlay, valueNoise(rotate(grainUV, 2.) + vec2(-1.)), .5);
    grainOverlay = pow(grainOverlay, 1.3);

    float grainOverlayV = grainOverlay * 2. - 1.;
    vec3 grainOverlayColor = vec3(step(0., grainOverlayV));
    float grainOverlayStrength = u_grainOverlay * abs(grainOverlayV);
    grainOverlayStrength = pow(grainOverlayStrength, .8);
    color = mix(color, grainOverlayColor, .35 * grainOverlayStrength);

    opacity += .5 * grainOverlayStrength;
  }
  opacity = clamp(opacity, 0., 1.);

  return vec4(color * opacity, opacity);
}
`;

export interface MeshGradientParams extends ShaderSizingParams, ShaderMotionParams {
  colors?: string[];
  distortion?: number;
  swirl?: number;
  grainMixer?: number;
  grainOverlay?: number;
}

export type MeshGradientUniforms = ShaderSizingUniforms & {
  u_time: number;
  u_colors: Float32Array;
  u_colorsCount: number;
  u_distortion: number;
  u_swirl: number;
  u_grainMixer: number;
  u_grainOverlay: number;
};

export type MeshGradientPreset = ShaderPreset<MeshGradientParams>;

export const meshGradientDefaultPreset: MeshGradientPreset = {
  name: 'Default',
  params: {
    ...defaultObjectSizing,
    speed: 1,
    frame: 0,
    colors: ['#e0eaff', '#241d9a', '#f75092', '#9f50d3'],
    distortion: 0.8,
    swirl: 0.1,
    grainMixer: 0,
    grainOverlay: 0,
  },
};

export const meshGradientPresets: MeshGradientPreset[] = [
  meshGradientDefaultPreset,
  {
    name: 'Ink',
    params: {
      ...meshGradientDefaultPreset.params,
      colors: ['#ffffff', '#000000'],
      distortion: 1,
      swirl: 0.2,
      rotation: 90,
    },
  },
  {
    name: 'Purple',
    params: {
      ...meshGradientDefaultPreset.params,
      speed: 0.6,
      colors: ['#aaa7d7', '#3c2b8e'],
      distortion: 1,
      swirl: 1,
    },
  },
  {
    name: 'Beach',
    params: {
      ...meshGradientDefaultPreset.params,
      speed: 0.1,
      colors: ['#bcecf6', '#00aaff', '#00f7ff', '#ffd447'],
      distortion: 0.8,
      swirl: 0.35,
    },
  },
];

/** Build the full uniform set for a frame. `time` is in seconds. */
export function meshGradientUniforms(
  params: Required<Omit<MeshGradientParams, 'speed' | 'frame'>>,
  resolution: [number, number],
  time: number,
): MeshGradientUniforms {
  const colors: RGBA[] = params.colors.map(parseColor);
  return {
    ...sizingUniforms(params, resolution),
    u_time: time,
    u_colors: packColors(colors, meshGradientMeta.maxColorCount),
    u_colorsCount: Math.min(colors.length, meshGradientMeta.maxColorCount),
    u_distortion: params.distortion,
    u_swirl: params.swirl,
    u_grainMixer: params.grainMixer,
    u_grainOverlay: params.grainOverlay,
  };
}
