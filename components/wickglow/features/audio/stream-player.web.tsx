import { keepsWebPlaybackWhenHidden, streamServiceName, StreamService } from '@/src/core/stream-links';
import React, { createElement, useEffect, useState } from 'react';
import { AppState, Linking, Pressable, Text, View } from 'react-native';
import { panelStyles as styles } from '@/components/wickglow/shared/panel-styles';

/**
 * The web version of the streaming player: a plain <iframe> of the service's
 * embed page. Metro picks this `.web.tsx` file instead of stream-player.tsx on
 * web, so callers just import `StreamPlayer` and get the right one. Keep the
 * props in sync with the native file.
 */

// Permissions the iframe may use. Autoplay and encrypted-media are needed for
// the services' players to actually play audio.
const IFRAME_ALLOW = 'autoplay *; clipboard-write; encrypted-media *; fullscreen *; picture-in-picture *';
// What the embed page may do. Scripts and its own origin (for sign-in and
// playback), popups for "open in the app" links, sign-in forms and
// fullscreen. Neither top-navigation token is granted, so an embed can never
// navigate Wickglow itself away.
const IFRAME_SANDBOX = [
  'allow-scripts',
  'allow-same-origin',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-forms',
  'allow-presentation',
  'allow-storage-access-by-user-activation',
].join(' ');

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
  const [active, setActive] = useState(AppState.currentState === 'active');
  const name = streamServiceName(service);
  // Some services stay mounted while the tab is hidden so playback continues;
  // the rest are removed when the page is hidden (matches the native behavior).
  const shown = keepsWebPlaybackWhenHidden(service) || active;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setActive(next === 'active');
    });
    return () => subscription.remove();
  }, []);

  return (
    <View style={[styles.streamFrame, flush ? styles.streamFlush : null, { height }]}>
      {shown ? (
        // React Native has no <iframe> component, so build the DOM element directly.
        createElement('iframe', {
          src: embedUrl,
          title: `${name} player`,
          allow: IFRAME_ALLOW,
          sandbox: IFRAME_SANDBOX,
          allowFullScreen: true,
          referrerPolicy: 'strict-origin-when-cross-origin',
          style: { width: '100%', height: '100%', border: 0 },
        })
      ) : (
        <View style={styles.streamPaused}>
          <Text style={styles.meta}>The player pauses while Wickglow is in the background.</Text>
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
        </View>
      )}
    </View>
  );
}
