import { Canvas, Fill, Shader, Skia, useClock, type SkRuntimeEffect, type Uniforms } from '@shopify/react-native-skia';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

export interface ShaderCanvasProps {
  style?: StyleProp<ViewStyle>;
  speed: number;
  frame: number;
  effect: SkRuntimeEffect;
  /** Uniforms for the current props and resolution; `u_time` is added per frame on the UI thread. */
  uniforms: (resolution: [number, number]) => Uniforms;
  /** Child shaders bound to the effect's `uniform shader` slots, in declaration order. */
  shaderChildren?: ReactNode;
  children?: ReactNode;
}

const effectCache = new Map<string, SkRuntimeEffect>();

/** Compile SkSL once per source string. Throws with the compiler message on error. */
export function compileEffect(source: string): SkRuntimeEffect {
  const cached = effectCache.get(source);
  if (cached) return cached;
  const effect = Skia.RuntimeEffect.Make(source);
  if (!effect) throw new Error('react-native-skia-shaders: SkSL failed to compile');
  effectCache.set(source, effect);
  return effect;
}

/**
 * Measures itself, then fills that box with `effect`. Time advances at
 * `speed` from a `frame` millisecond offset, matching the upstream mount.
 */
export function ShaderCanvas({ style, speed, frame, effect, uniforms: buildUniforms, shaderChildren, children }: ShaderCanvasProps) {
  const [size, setSize] = useState<[number, number] | null>(null);
  const clock = useClock();

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev && prev[0] === width && prev[1] === height ? prev : [width, height]));
  };

  const base = useMemo(() => buildUniforms(size ?? [1, 1]), [size, buildUniforms]);

  // Only plain data crosses into the worklet: the builder runs on the JS thread.
  const uniforms = useDerivedValue(() => {
    'worklet';
    return { ...base, u_time: (frame + clock.value * speed) / 1000 };
  }, [base, frame, speed]);

  return (
    <View style={style} onLayout={onLayout}>
      {size && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={effect} uniforms={uniforms}>
              {shaderChildren}
            </Shader>
          </Fill>
        </Canvas>
      )}
      {children}
    </View>
  );
}
