import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const CanvasKitInit = require('canvaskit-wasm/bin/canvaskit.js');

export type CanvasKit = Awaited<ReturnType<typeof CanvasKitInit>>;

let ck: Promise<CanvasKit> | undefined;
export function loadCanvasKit(): Promise<CanvasKit> {
  if (!ck) {
    ck = CanvasKitInit({
      locateFile: (file: string) => require.resolve(`canvaskit-wasm/bin/${file}`),
    });
  }
  return ck!;
}

/** Compile SkSL; returns the effect or throws with CanvasKit's compiler output. */
export function compile(CanvasKit: CanvasKit, sksl: string) {
  const errors: string[] = [];
  const effect = CanvasKit.RuntimeEffect.Make(sksl, (e: string) => errors.push(e));
  if (!effect) throw new Error(`SkSL failed to compile:\n${errors.join('\n')}`);
  return effect;
}

export interface RenderResult {
  pixels: Uint8Array;
  width: number;
  height: number;
}

/** Render a shader to an RGBA buffer and, if `name` is given, a PNG under test/__output__. */
export function render(
  CanvasKit: CanvasKit,
  sksl: string,
  uniforms: Record<string, number | number[] | Float32Array>,
  width: number,
  height: number,
  name?: string,
): RenderResult {
  const effect = compile(CanvasKit, sksl);
  const flat: number[] = [];
  for (let i = 0; i < effect.getUniformCount(); i++) {
    const u = effect.getUniformName(i);
    const v = uniforms[u];
    if (v === undefined) throw new Error(`missing uniform ${u}`);
    if (typeof v === 'number') flat.push(v);
    else flat.push(...Array.from(v));
  }
  const surface = CanvasKit.MakeSurface(width, height);
  if (!surface) throw new Error('MakeSurface failed');
  const paint = new CanvasKit.Paint();
  const shader = effect.makeShader(flat);
  paint.setShader(shader);
  surface.getCanvas().drawPaint(paint);
  const image = surface.makeImageSnapshot();
  const pixels = image.readPixels(0, 0, {
    width,
    height,
    colorType: CanvasKit.ColorType.RGBA_8888,
    alphaType: CanvasKit.AlphaType.Unpremul,
    colorSpace: CanvasKit.ColorSpace.SRGB,
  }) as Uint8Array;
  if (name) {
    const dir = join(process.cwd(), 'test', '__output__');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${name}.png`), image.encodeToBytes()!);
  }
  shader.delete();
  paint.delete();
  image.delete();
  surface.delete();
  return { pixels, width, height };
}
