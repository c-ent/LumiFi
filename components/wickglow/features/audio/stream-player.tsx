import {
  decideStreamNavigation,
  sameStreamDocument,
  streamServiceName,
  StreamService,
} from '@/src/core/stream-links';
import React, { useEffect, useRef, useState, type ComponentType, type Ref } from 'react';
import { AppState, Linking, Pressable, Text, View } from 'react-native';
import { WebView, type WebViewNavigation, type WebViewProps } from 'react-native-webview';
import { panelStyles as styles } from '@/components/wickglow/shared/panel-styles';

/**
 * The native (Android/iOS) streaming player: the service's own embed page shown
 * inside a WebView. React Native has no <iframe>, and WebView is the closest
 * thing. The web build uses stream-player.web.tsx instead; Expo/Metro picks the
 * `.web.tsx` file automatically on web, so both export the same `StreamPlayer`.
 *
 * Safety: the WebView only allows https pages, and every navigation is checked
 * by `decideStreamNavigation` so an embed can't send the user somewhere else.
 */

// YouTube requires a Referer on an embedded player and forbids playback once
// the app is not on screen. The value identifies this app. It is not a sign-in.
const STREAM_REFERER = 'https://com.cent.wickglow';
// JavaScript injected into the page to pause any <video>/<audio> element.
// The trailing `true;` is required by react-native-webview on iOS.
const PAUSE_MEDIA = "(function(){var nodes=document.querySelectorAll('video,audio');for(var i=0;i<nodes.length;i++){nodes[i].pause();}})();true;";

// The published WebView class defaults its props generic to `undefined`, and
// `WebViewProps & undefined` is `never`. The cast keeps the real prop type.
type StreamWebViewHandle = {
  injectJavaScript: (script: string) => void;
  stopLoading: () => void;
};
const ServiceWebView = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<StreamWebViewHandle> }>;

export function StreamPlayer({
  service,
  embedUrl,
  pageUrl,
  height,
  flush = false,
}: {
  service: StreamService;
  embedUrl: string;
  pageUrl: string;
  height: number;
  flush?: boolean;
}) {
  const webRef = useRef<StreamWebViewHandle>(null);
  // False while the app is in the background; the WebView is removed then.
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [failed, setFailed] = useState(false);
  const name = streamServiceName(service);

  // Leaving the foreground: pause and unmount the embed so it can't keep
  // playing with the screen locked (only local tracks are meant to do that).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        setActive(true);
        return;
      }
      // Pause inside the service page, then unmount it, so audio cannot
      // continue after the screen locks. Screen-off playback stays with the
      // local tracks.
      webRef.current?.injectJavaScript(PAUSE_MEDIA);
      webRef.current?.stopLoading();
      setActive(false);
    });
    return () => subscription.remove();
  }, []);

  // Called before the WebView loads any URL. Returning false blocks it.
  // 'external' links (e.g. "open in app") go to the OS instead of the WebView.
  const onNavigate = (request: WebViewNavigation) => {
    const decision = decideStreamNavigation(request.url, service);
    if (decision === 'external') {
      Linking.openURL(request.url).catch(() => {
        Linking.openURL(pageUrl).catch(() => undefined);
      });
      return false;
    }
    return decision === 'allow';
  };

  return (
    <View style={[styles.streamFrame, flush ? styles.streamFlush : null, { height }]}>
      {active && !failed ? (
        <ServiceWebView
          ref={webRef}
          source={{ uri: embedUrl, headers: { Referer: STREAM_REFERER } }}
          style={styles.streamWeb}
          accessibilityLabel={`${name} player`}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          allowsPictureInPictureMediaPlayback={false}
          domStorageEnabled
          javaScriptCanOpenWindowsAutomatically={false}
          javaScriptEnabled
          mediaPlaybackRequiresUserAction
          nestedScrollEnabled
          // Every origin reaches onNavigate, which allows https on the service's
          // own hosts and hands only its app links to the OS. A narrower list
          // would send a non-matching URL straight to the OS, unchecked.
          // Popups are disabled above and below.
          originWhitelist={['*']}
          setSupportMultipleWindows={false}
          onError={() => setFailed(true)}
          // Any HTTP error on the embed page itself is a failure; errors for
          // sub-resources (images, ads) are ignored.
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode < 400) return;
            if (!sameStreamDocument(event.nativeEvent.url, embedUrl)) return;
            setFailed(true);
          }}
          onShouldStartLoadWithRequest={onNavigate}
        />
      ) : (
        <StreamFallback failed={failed} pageUrl={pageUrl} onRetry={() => setFailed(false)} />
      )}
    </View>
  );
}

// Shown instead of the WebView when the app is in the background or the link
// failed. A failed link is never opened in another app on its own: a load can
// fail just because the device is offline, and leaving Wickglow is the user's
// choice, so every platform gets the same "Open link" button.
// "Try again" clears the failure, which mounts a fresh WebView on the embed.
function StreamFallback({ failed, pageUrl, onRetry }: { failed: boolean; pageUrl: string; onRetry: () => void }) {
  const message = failed
    ? 'This link could not be played here. It may be private, or you may be offline.'
    : 'The player pauses while Wickglow is in the background.';
  return (
    <View style={styles.streamPaused}>
      <Text style={styles.meta}>{message}</Text>
      {failed ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={onRetry} style={styles.mini}>
          <Text style={styles.miniText}>Try again</Text>
        </Pressable>
      ) : null}
      {failed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open link"
          onPress={() => {
            Linking.openURL(pageUrl).catch(() => undefined);
          }}
          style={styles.mini}
        >
          <Text style={styles.miniText}>Open link</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
