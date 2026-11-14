import type { StreamService } from '@/src/core/stream-links';

/**
 * Native (Android/iOS) stub. Streaming is off on native (`STREAMING_AVAILABLE`
 * in stream-stage.tsx is false there), so this component never renders. It used
 * to show the service embed in react-native-webview; that package was removed
 * to cut app size. The web build uses stream-player.web.tsx instead, and Metro
 * picks that file on web, so both export the same `StreamPlayer`.
 */
export function StreamPlayer(_props: {
  service: StreamService;
  embedUrl: string;
  pageUrl: string;
  height: number;
  flush?: boolean;
}) {
  return null;
}
