import { memo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ShaderCanvas, compileEffect } from './ShaderCanvas';
import {
  meshGradientDefaultPreset,
  meshGradientSkSL,
  meshGradientUniforms,
  type MeshGradientParams,
} from './shaders/mesh-gradient';

export interface MeshGradientProps extends MeshGradientParams {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

const d = meshGradientDefaultPreset.params;

export const MeshGradient = memo(function MeshGradient({
  style,
  children,
  speed = d.speed,
  frame = d.frame,
  colors = d.colors,
  distortion = d.distortion,
  swirl = d.swirl,
  grainMixer = d.grainMixer,
  grainOverlay = d.grainOverlay,
  fit = d.fit,
  scale = d.scale,
  rotation = d.rotation,
  originX = d.originX,
  originY = d.originY,
  offsetX = d.offsetX,
  offsetY = d.offsetY,
  worldWidth = d.worldWidth,
  worldHeight = d.worldHeight,
}: MeshGradientProps) {
  const colorsKey = colors.join('|');
  const uniformsForFrame = useCallback(
    (resolution: [number, number], time: number) =>
      meshGradientUniforms(
        {
          colors: colorsKey.split('|'),
          distortion,
          swirl,
          grainMixer,
          grainOverlay,
          fit,
          scale,
          rotation,
          originX,
          originY,
          offsetX,
          offsetY,
          worldWidth,
          worldHeight,
        },
        resolution,
        time,
      ),
    [colorsKey, distortion, swirl, grainMixer, grainOverlay, fit, scale, rotation, originX, originY, offsetX, offsetY, worldWidth, worldHeight],
  );

  return (
    <ShaderCanvas
      style={style}
      speed={speed}
      frame={frame}
      effect={compileEffect(meshGradientSkSL)}
      uniformsForFrame={uniformsForFrame}
    >
      {children}
    </ShaderCanvas>
  );
});
