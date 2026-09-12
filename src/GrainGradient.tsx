import { ImageShader } from '@shopify/react-native-skia';
import { memo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ShaderCanvas, compileEffect } from './ShaderCanvas';
import {
  grainGradientDefaultPreset,
  grainGradientSkSL,
  grainGradientUniforms,
  type GrainGradientParams,
} from './shaders/grain-gradient';
import { noiseTextureSize } from './noise-texture';
import { getNoiseTexture } from './useNoiseTexture';

export interface GrainGradientProps extends GrainGradientParams {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

const d = grainGradientDefaultPreset.params;

export const GrainGradient = memo(function GrainGradient({
  style,
  children,
  speed = d.speed,
  frame = d.frame,
  colorBack = d.colorBack,
  colors = d.colors,
  softness = d.softness,
  intensity = d.intensity,
  noise = d.noise,
  shape = d.shape,
  fit = d.fit,
  scale = d.scale,
  rotation = d.rotation,
  originX = d.originX,
  originY = d.originY,
  offsetX = d.offsetX,
  offsetY = d.offsetY,
  worldWidth = d.worldWidth,
  worldHeight = d.worldHeight,
}: GrainGradientProps) {
  const colorsKey = colors.join('|');
  const uniformsForFrame = useCallback(
    (resolution: [number, number], time: number) =>
      grainGradientUniforms(
        {
          colorBack,
          colors: colorsKey.split('|'),
          softness,
          intensity,
          noise,
          shape,
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
    [colorBack, colorsKey, softness, intensity, noise, shape, fit, scale, rotation, originX, originY, offsetX, offsetY, worldWidth, worldHeight],
  );

  return (
    <ShaderCanvas
      style={style}
      speed={speed}
      frame={frame}
      effect={compileEffect(grainGradientSkSL)}
      uniformsForFrame={uniformsForFrame}
      shaderChildren={
        <ImageShader
          image={getNoiseTexture()}
          tx="repeat"
          ty="repeat"
          fit="none"
          rect={{ x: 0, y: 0, width: noiseTextureSize, height: noiseTextureSize }}
        />
      }
    >
      {children}
    </ShaderCanvas>
  );
});
