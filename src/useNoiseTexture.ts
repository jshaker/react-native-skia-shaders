import { Skia, type SkImage } from '@shopify/react-native-skia';
import { noiseTextureBase64 } from './noise-texture';

let cached: SkImage | null = null;

/** The bundled 128x128 noise image, decoded once per process. */
export function getNoiseTexture(): SkImage {
  if (cached) return cached;
  const data = Skia.Data.fromBase64(noiseTextureBase64);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('react-native-skia-shaders: noise texture failed to decode');
  cached = image;
  return image;
}
