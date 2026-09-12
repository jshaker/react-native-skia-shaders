# react-native-skia-shaders

[Paper Shaders](https://github.com/paper-design/shaders) ported to SkSL for
[React Native Skia](https://shopify.github.io/react-native-skia/). Same props,
same presets, same look, but rendered on iOS, Android, and web (via CanvasKit)
instead of a DOM `<canvas>`.

## Install

```sh
npm install react-native-skia-shaders @shopify/react-native-skia react-native-reanimated
```

Skia and Reanimated are peer dependencies. Follow their install guides for the
native setup (Expo: `npx expo install @shopify/react-native-skia react-native-reanimated`).

## Usage

```tsx
import { MeshGradient } from 'react-native-skia-shaders';

<MeshGradient
  style={{ width: '100%', height: 240 }}
  colors={['#e0eaff', '#241d9a', '#f75092', '#9f50d3']}
  distortion={0.8}
  swirl={0.1}
  speed={1}
/>
```

Children render on top of the shader, so it works as a background:

```tsx
<MeshGradient style={styles.hero} {...meshGradientPresets[3].params}>
  <Text>Saturday dinner</Text>
</MeshGradient>
```

### Props

Every shader accepts the upstream sizing props (`fit`, `scale`, `rotation`,
`originX`, `originY`, `offsetX`, `offsetY`, `worldWidth`, `worldHeight`) and
motion props (`speed`, `frame`). `speed={0}` freezes the shader. World sizes
are in points, not device pixels.

`MeshGradient` adds `colors` (up to 10, any CSS hex/rgb/hsl string),
`distortion`, `swirl`, `grainMixer`, and `grainOverlay`, all 0..1.

`GrainGradient` adds `colorBack`, `colors` (up to 7), `softness`, `intensity`,
`noise` (all 0..1) and `shape`: `wave`, `dots`, `truchet`, `corners`,
`ripple`, `blob`, or `sphere`. Presets are exported as `grainGradientPresets`.

### Lower-level API

The SkSL source and a uniform builder are exported for each shader, so you can
drop the effect into your own Skia tree, for example behind an `ImageShader`
mask or inside a `Group` with a clip:

```tsx
import { Shader, Fill } from '@shopify/react-native-skia';
import { compileEffect, meshGradientSkSL, meshGradientUniforms } from 'react-native-skia-shaders';

const effect = compileEffect(meshGradientSkSL);
const uniforms = { ...meshGradientUniforms(params, [width, height]), u_time: seconds };

<Fill><Shader source={effect} uniforms={uniforms} /></Fill>
```

## Shaders

| Upstream | Status |
| --- | --- |
| Mesh Gradient | ported |
| Grain Gradient | ported (all seven shapes) |
| Everything else | not yet |

Porting a shader means translating its fragment shader to SkSL (mostly
mechanical: no `#version`, no `precision`, `main(vec2)` returns premultiplied
`vec4`, sizing math moves from the vertex stage into `getObjectUV`) and adding
a uniform builder plus presets. Shaders that sample a noise texture take the bundled
image as an `ImageShader` child (see `GrainGradient`). SkSL has no `fwidth`,
so derivative-based anti-aliasing becomes a fixed epsilon.

## Example app

`example/` is an Expo app that imports the library from `../src`:

```sh
cd example && npm install && npm run web   # or ios / android
```

On web, Skia binds CanvasKit at import time, so the demo is loaded through
`WithSkiaWeb` (see `example/App.web.tsx`) and nothing imports the library
before that resolves.

## Development

```sh
npm install
npm run typecheck
npm test          # compiles the SkSL with CanvasKit and renders each preset to test/__output__
npm run build
```

Tests run the real Skia compiler (CanvasKit wasm) in Node, so a shader that
does not compile fails CI, and every preset produces a PNG you can eyeball
against [shaders.paper.design](https://shaders.paper.design).

## License

Apache-2.0. This is a derivative work of Paper Shaders by Paper Design, also
Apache-2.0; see `NOTICE`.
