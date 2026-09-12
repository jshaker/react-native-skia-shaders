import { packColors, parseColor, type RGBA } from '../color';
import {
  defaultObjectSizing,
  defaultPatternSizing,
  objectUV,
  patternUV,
  sizingUniformDeclarations,
  sizingUniforms,
  type ShaderSizingParams,
  type ShaderSizingUniforms,
} from '../sksl/sizing';
import { proceduralHash11, rotation2, simplexNoise } from '../sksl/utils';
import { noiseTextureSize } from '../noise-texture';
import type { ShaderMotionParams, ShaderPreset } from '../types';

export const grainGradientMeta = { maxColorCount: 7 } as const;

export const GrainGradientShapes = {
  wave: 1,
  dots: 2,
  truchet: 3,
  corners: 4,
  ripple: 5,
  blob: 6,
  sphere: 7,
} as const;
export type GrainGradientShape = keyof typeof GrainGradientShapes;

/**
 * Multi-colour gradients with grainy, noise-textured distortion in seven
 * animated shapes.
 *
 * Grain is computed from the pixel coordinate, so it does not react to
 * `scale` or `fit`. Requires a `u_noiseTexture` child shader (the bundled
 * 128x128 noise image, repeat-tiled).
 *
 * SkSL has no screen-space derivatives, so the upstream `fwidth`-based edge
 * anti-aliasing is replaced by a fixed epsilon; hard edges (softness 0) are
 * marginally crisper than upstream.
 */
export const grainGradientSkSL = `
uniform float u_time;
uniform shader u_noiseTexture;
uniform vec4 u_colorBack;
uniform vec4 u_colors[${grainGradientMeta.maxColorCount}];
uniform float u_colorsCount;
uniform float u_softness;
uniform float u_intensity;
uniform float u_noise;
uniform float u_shape;
${sizingUniformDeclarations}
${objectUV}
${patternUV}
${simplexNoise}
${rotation2}
${proceduralHash11}

float randomR(vec2 p) {
  vec2 uv = floor(p) / 100. + .5;
  return u_noiseTexture.eval(fract(uv) * ${noiseTextureSize}.).r;
}

float valueNoiseR(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = randomR(i);
  float b = randomR(i + vec2(1.0, 0.0));
  float c = randomR(i + vec2(0.0, 1.0));
  float d = randomR(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

vec4 fbmR(vec2 n0, vec2 n1, vec2 n2, vec2 n3) {
  float amplitude = 0.2;
  vec4 total = vec4(0.);
  for (int i = 0; i < 3; i++) {
    n0 = rotate(n0, 0.3);
    n1 = rotate(n1, 0.3);
    n2 = rotate(n2, 0.3);
    n3 = rotate(n3, 0.3);
    total.x += valueNoiseR(n0) * amplitude;
    total.y += valueNoiseR(n1) * amplitude;
    total.z += valueNoiseR(n2) * amplitude;
    total.z += valueNoiseR(n3) * amplitude;
    n0 *= 1.99;
    n1 *= 1.99;
    n2 *= 1.99;
    n3 *= 1.99;
    amplitude *= 0.6;
  }
  return total;
}

vec2 truchet(vec2 uv, float idx) {
  idx = fract(((idx - .5) * 2.));
  if (idx > 0.75) {
    uv = vec2(1.0) - uv;
  } else if (idx > 0.5) {
    uv = vec2(1.0 - uv.x, uv.y);
  } else if (idx > 0.25) {
    uv = 1.0 - vec2(1.0 - uv.x, uv.y);
  }
  return uv;
}

vec4 main(vec2 fragCoord) {
  const float firstFrameOffset = 7.;
  float t = .1 * (u_time + firstFrameOffset);

  vec2 shape_uv = vec2(0.);
  vec2 grain_uv = vec2(0.);

  float r = u_rotation * PI / 180.;
  float cr = cos(r);
  float sr = sin(r);
  mat2 inverseRotation = mat2(cr, -sr, sr, cr);
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  if (u_shape > 3.5) {
    shape_uv = getObjectUV(fragCoord);
    grain_uv = shape_uv;
    grain_uv = inverseRotation * grain_uv;
    grain_uv *= u_scale;
    grain_uv -= graphicOffset;
    grain_uv *= getObjectBoxSize();
    grain_uv *= .7;
  } else {
    vec2 pUV = getPatternUV(fragCoord);
    vec2 patternBoxSize = getPatternBoxSize();
    shape_uv = .5 * pUV;
    grain_uv = 100. * pUV;
    grain_uv = inverseRotation * grain_uv;
    grain_uv *= u_scale;
    if (u_fit > 0.) {
      vec2 patternBoxGivenSize = getGivenBoxSize();
      float patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;
      float patternBoxNoFitBoxWidth = patternBoxRatio * min(patternBoxGivenSize.x / patternBoxRatio, patternBoxGivenSize.y);
      grain_uv /= (patternBoxNoFitBoxWidth / patternBoxSize.x);
    }
    vec2 patternBoxScale = u_resolution / patternBoxSize;
    grain_uv -= graphicOffset / patternBoxScale;
    grain_uv *= 1.6;
  }

  float shape = 0.;

  if (u_shape < 1.5) {
    float wave = cos(.5 * shape_uv.x - 4. * t) * sin(1.5 * shape_uv.x + 2. * t) * (.75 + .25 * cos(6. * t));
    shape = 1. - smoothstep(-1., 1., shape_uv.y + wave);
  } else if (u_shape < 2.5) {
    float stripeIdx = floor(2. * shape_uv.x / TWO_PI);
    float rand = hash11(stripeIdx * 100.);
    rand = sign(rand - .5) * pow(4. * abs(rand), .3);
    shape = sin(shape_uv.x) * cos(shape_uv.y - 5. * rand * t);
    shape = pow(abs(shape), 4.);
  } else if (u_shape < 3.5) {
    float n2 = valueNoiseR(shape_uv * .4 - 3.75 * t);
    shape_uv.x += 10.;
    shape_uv *= .6;
    vec2 tile = truchet(fract(shape_uv), randomR(floor(shape_uv)));
    float distance1 = length(tile);
    float distance2 = length(tile - vec2(1.));
    n2 -= .5;
    n2 *= .1;
    shape = smoothstep(.2, .55, distance1 + n2) * (1. - smoothstep(.45, .8, distance1 - n2));
    shape += smoothstep(.2, .55, distance2 + n2) * (1. - smoothstep(.45, .8, distance2 - n2));
    shape = pow(shape, 1.5);
  } else if (u_shape < 4.5) {
    shape_uv *= .6;
    vec2 outer = vec2(.5);
    vec2 bl = smoothstep(vec2(0.), outer, shape_uv + vec2(.1 + .1 * sin(3. * t), .2 - .1 * sin(5.25 * t)));
    vec2 tr = smoothstep(vec2(0.), outer, 1. - shape_uv);
    shape = 1. - bl.x * bl.y * tr.x * tr.y;
    shape_uv = -shape_uv;
    bl = smoothstep(vec2(0.), outer, shape_uv + vec2(.1 + .1 * sin(3. * t), .2 - .1 * cos(5.25 * t)));
    tr = smoothstep(vec2(0.), outer, 1. - shape_uv);
    shape -= bl.x * bl.y * tr.x * tr.y;
    shape = 1. - smoothstep(0., 1., shape);
  } else if (u_shape < 5.5) {
    shape_uv *= 2.;
    float dist = length(.4 * shape_uv);
    float waves = sin(pow(dist, 1.2) * 5. - 3. * t) * .5 + .5;
    shape = waves;
  } else if (u_shape < 6.5) {
    t *= 2.;
    vec2 f1_traj = .25 * vec2(1.3 * sin(t), .2 + 1.3 * cos(.6 * t + 4.));
    vec2 f2_traj = .2 * vec2(1.2 * sin(-t), 1.3 * sin(1.6 * t));
    vec2 f3_traj = .25 * vec2(1.7 * cos(-.6 * t), cos(-1.6 * t));
    vec2 f4_traj = .3 * vec2(1.4 * cos(.8 * t), 1.2 * sin(-.6 * t - 3.));
    shape = .5 * pow(1. - min(1., length(shape_uv + f1_traj)), 5.);
    shape += .5 * pow(1. - min(1., length(shape_uv + f2_traj)), 5.);
    shape += .5 * pow(1. - min(1., length(shape_uv + f3_traj)), 5.);
    shape += .5 * pow(1. - min(1., length(shape_uv + f4_traj)), 5.);
    shape = smoothstep(.0, .9, shape);
    float edge = smoothstep(.25, .3, shape);
    shape = mix(.0, shape, edge);
  } else {
    shape_uv *= 2.;
    float d = 1. - pow(length(shape_uv), 2.);
    vec3 pos = vec3(shape_uv, sqrt(max(d, 0.)));
    vec3 lightPos = normalize(vec3(cos(1.5 * t), .8, sin(1.25 * t)));
    shape = .5 + .5 * dot(lightPos, pos);
    shape *= step(0., d);
  }

  float baseNoise = snoise(grain_uv * .5);
  vec4 fbmVals = fbmR(
    .002 * grain_uv + 10.,
    .003 * grain_uv,
    .001 * grain_uv,
    rotate(.4 * grain_uv, 2.)
  );
  float grainDist = baseNoise * snoise(grain_uv * .2) - fbmVals.x - fbmVals.y;
  float rawNoise = .75 * baseNoise - fbmVals.w - fbmVals.z;
  float noise = clamp(rawNoise, 0., 1.);

  shape += u_intensity * 2. / u_colorsCount * (grainDist + .5);
  shape += u_noise * 10. / u_colorsCount * noise;

  const float aa = .004;

  shape = clamp(shape - .5 / u_colorsCount, 0., 1.);
  float totalShape = smoothstep(0., u_softness + 2. * aa, clamp(shape * u_colorsCount, 0., 1.));
  float mixer = shape * (u_colorsCount - 1.);

  int cntStop = int(u_colorsCount) - 1;
  vec4 gradient = u_colors[0];
  gradient.rgb *= gradient.a;
  for (int i = 1; i < ${grainGradientMeta.maxColorCount}; i++) {
    if (i <= cntStop) {
      float localT = clamp(mixer - float(i - 1), 0., 1.);
      localT = smoothstep(.5 - .5 * u_softness - aa, .5 + .5 * u_softness + aa, localT);
      vec4 c = u_colors[i];
      c.rgb *= c.a;
      gradient = mix(gradient, c, localT);
    }
  }

  vec3 color = gradient.rgb * totalShape;
  float opacity = gradient.a * totalShape;

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1.0 - opacity);
  opacity = opacity + u_colorBack.a * (1.0 - opacity);

  return vec4(color, opacity);
}
`;

export interface GrainGradientParams extends ShaderSizingParams, ShaderMotionParams {
  colorBack?: string;
  colors?: string[];
  softness?: number;
  intensity?: number;
  noise?: number;
  shape?: GrainGradientShape;
}

export type GrainGradientUniforms = ShaderSizingUniforms & {
  u_time: number;
  u_colorBack: RGBA;
  u_colors: Float32Array;
  u_colorsCount: number;
  u_softness: number;
  u_intensity: number;
  u_noise: number;
  u_shape: number;
};

export type GrainGradientPreset = ShaderPreset<GrainGradientParams>;

export const grainGradientDefaultPreset: GrainGradientPreset = {
  name: 'Default',
  params: {
    ...defaultObjectSizing,
    speed: 1,
    frame: 0,
    colorBack: '#000000',
    colors: ['#7300ff', '#eba8ff', '#00bfff', '#2a00ff'],
    softness: 0.5,
    intensity: 0.5,
    noise: 0.25,
    shape: 'corners',
  },
};

export const grainGradientPresets: GrainGradientPreset[] = [
  grainGradientDefaultPreset,
  {
    name: 'Wave',
    params: {
      ...defaultPatternSizing,
      speed: 1,
      frame: 0,
      colorBack: '#000a0f',
      colors: ['#c4730b', '#bdad5f', '#d8ccc7'],
      softness: 0.7,
      intensity: 0.15,
      noise: 0.5,
      shape: 'wave',
    },
  },
  {
    name: 'Dots',
    params: {
      ...defaultPatternSizing,
      scale: 0.6,
      speed: 1,
      frame: 0,
      colorBack: '#0a0000',
      colors: ['#6f0000', '#0080ff', '#f2ebc9', '#33cc33'],
      softness: 1,
      intensity: 1,
      noise: 0.7,
      shape: 'dots',
    },
  },
  {
    name: 'Truchet',
    params: {
      ...defaultPatternSizing,
      speed: 1,
      frame: 0,
      colorBack: '#0a0000',
      colors: ['#6f2200', '#eabb7c', '#39b523'],
      softness: 0,
      intensity: 0.2,
      noise: 1,
      shape: 'truchet',
    },
  },
  {
    name: 'Ripple',
    params: {
      ...defaultObjectSizing,
      scale: 0.5,
      speed: 1,
      frame: 0,
      colorBack: '#140a00',
      colors: ['#6f2d00', '#88ddae', '#2c0b1d'],
      softness: 0.5,
      intensity: 0.5,
      noise: 0.5,
      shape: 'ripple',
    },
  },
  {
    name: 'Blob',
    params: {
      ...defaultObjectSizing,
      scale: 1.3,
      speed: 1,
      frame: 0,
      colorBack: '#0f0e18',
      colors: ['#3e6172', '#a49b74', '#568c50'],
      softness: 0,
      intensity: 0.15,
      noise: 0.5,
      shape: 'blob',
    },
  },
];

export function grainGradientUniforms(
  params: Required<Omit<GrainGradientParams, 'speed' | 'frame'>>,
  resolution: [number, number],
  time: number,
): GrainGradientUniforms {
  const colors = params.colors.map(parseColor);
  return {
    ...sizingUniforms(params, resolution),
    u_time: time,
    u_colorBack: parseColor(params.colorBack),
    u_colors: packColors(colors, grainGradientMeta.maxColorCount),
    u_colorsCount: Math.min(colors.length, grainGradientMeta.maxColorCount),
    u_softness: params.softness,
    u_intensity: params.intensity,
    u_noise: params.noise,
    u_shape: GrainGradientShapes[params.shape],
  };
}
