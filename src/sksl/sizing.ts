import { declarePI } from './utils';

export const ShaderFitOptions = { none: 0, contain: 1, cover: 2 } as const;
export type ShaderFit = keyof typeof ShaderFitOptions;

export interface ShaderSizingParams {
  /** How the graphic fits the canvas: `contain`, `cover`, or `none` (world size in points). */
  fit?: ShaderFit;
  /** Overall zoom (0.01 to 4). */
  scale?: number;
  /** Rotation in degrees. */
  rotation?: number;
  /** Anchor of the world box inside the canvas, 0..1. */
  originX?: number;
  originY?: number;
  /** Offset of the graphic centre, -1..1. */
  offsetX?: number;
  offsetY?: number;
  /** Virtual size of the graphic before fitting, in points. 0 means "use the canvas size". */
  worldWidth?: number;
  worldHeight?: number;
}

export const defaultObjectSizing: Required<ShaderSizingParams> = {
  fit: 'contain',
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  originX: 0.5,
  originY: 0.5,
  worldWidth: 0,
  worldHeight: 0,
};

export const defaultPatternSizing: Required<ShaderSizingParams> = {
  ...defaultObjectSizing,
  fit: 'none',
};

export type ShaderSizingUniforms = {
  u_resolution: [number, number];
  u_pixelRatio: number;
  u_fit: number;
  u_scale: number;
  u_rotation: number;
  u_originX: number;
  u_originY: number;
  u_offsetX: number;
  u_offsetY: number;
  u_worldWidth: number;
  u_worldHeight: number;
};

export function sizingUniforms(
  params: Required<ShaderSizingParams>,
  resolution: [number, number],
  pixelRatio = 1,
): ShaderSizingUniforms {
  return {
    u_resolution: resolution,
    u_pixelRatio: pixelRatio,
    u_fit: ShaderFitOptions[params.fit],
    u_scale: params.scale,
    u_rotation: params.rotation,
    u_originX: params.originX,
    u_originY: params.originY,
    u_offsetX: params.offsetX,
    u_offsetY: params.offsetY,
    u_worldWidth: params.worldWidth,
    u_worldHeight: params.worldHeight,
  };
}

/** Uniform declarations every sized shader needs. */
export const sizingUniformDeclarations = `
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_originX;
uniform float u_originY;
uniform float u_offsetX;
uniform float u_offsetY;
uniform float u_worldWidth;
uniform float u_worldHeight;
`;

/**
 * Port of the upstream vertex-shader sizing math. Upstream computes
 * `v_objectUV` per vertex and lets the rasteriser interpolate it; SkSL has no
 * vertex stage, so it is evaluated per fragment from the pixel coordinate.
 *
 * Coordinate convention matches upstream: the canvas centre is (0, 0), y points
 * up, and the object box spans -0.5..0.5 before scale/rotation/offset.
 */
export const objectUV = `
${declarePI}

vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {
  vec2 box = vec2(0.);
  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);
  float noFitBoxWidth = box.x;
  if (u_fit == 1.) {
    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);
  } else if (u_fit == 2.) {
    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);
  }
  box.y = box.x / boxRatio;
  return vec3(box, noFitBoxWidth);
}

vec2 getObjectUV(vec2 fragCoord) {
  vec2 uv = fragCoord / u_resolution - .5;
  uv.y = -uv.y;

  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = max(vec2(u_worldWidth, u_worldHeight), vec2(1.)) * u_pixelRatio;
  float r = u_rotation * PI / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  vec2 fixedRatioBoxGivenSize = vec2(
    (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
    (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  vec2 objectBoxSize = getBoxSize(1., fixedRatioBoxGivenSize).xy;
  vec2 objectWorldScale = u_resolution / objectBoxSize;

  uv *= objectWorldScale;
  uv += boxOrigin * (objectWorldScale - 1.);
  uv += graphicOffset;
  uv /= u_scale;
  uv = graphicRotation * uv;
  return uv;
}
`;
