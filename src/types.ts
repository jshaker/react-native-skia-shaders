export interface ShaderMotionParams {
  /** Animation speed multiplier. 0 freezes the shader; negative plays in reverse. */
  speed?: number;
  /** Starting time offset in milliseconds, for deterministic first frames. */
  frame?: number;
}

export interface ShaderPreset<T> {
  name: string;
  params: Required<T>;
}
