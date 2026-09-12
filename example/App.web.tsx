import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

// Skia's web backend binds CanvasKit at import time, so the demo (and the
// library) must load only after LoadSkiaWeb resolves.
export default function App() {
  return <WithSkiaWeb getComponent={() => import('./Demo')} fallback={null} />;
}
