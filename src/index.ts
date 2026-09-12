export { MeshGradient, type MeshGradientProps } from './MeshGradient';
export {
  meshGradientSkSL,
  meshGradientUniforms,
  meshGradientPresets,
  meshGradientDefaultPreset,
  meshGradientMeta,
  type MeshGradientParams,
  type MeshGradientUniforms,
  type MeshGradientPreset,
} from './shaders/mesh-gradient';
export { ShaderCanvas, compileEffect, type ShaderCanvasProps } from './ShaderCanvas';
export { parseColor, packColors, type RGBA } from './color';
export {
  ShaderFitOptions,
  defaultObjectSizing,
  defaultPatternSizing,
  sizingUniforms,
  type ShaderFit,
  type ShaderSizingParams,
  type ShaderSizingUniforms,
} from './sksl/sizing';
export type { ShaderMotionParams, ShaderPreset } from './types';
