import { keepsWebPlaybackWhenHidden, streamServiceName, StreamService } from '@/src/core/stream-links';
import React, { createElement, useEffect, useState } from 'react';
import { AppState, Linking, Pressable, Text, View } from 'react-native';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';

/**
 * The web version of the streaming player: a plain <iframe> of the service's
 * embed page. Metro picks this `.web.tsx` file instead of stream-player.tsx on
 * web, so callers just import `StreamPlayer` and get the right one. Keep the
 * props in sync with the native file.
 */

// Permissions the iframe may use. Autoplay and encrypted-media are needed for
// the services' players to actually play audio.
const IFRAME_ALLOW = 'autoplay *; clipboard-write; encrypted-media *; fullscreen *; picture-in-picture *';

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
          allowFullScreen: true,
          referrerPolicy: 'strict-origin-when-cross-origin',
          style: { width: '100%', height: '100%', border: 0 },
        })
      ) : (
        <View style={styles.streamPaused}>
          <Text style={styles.meta}>The player pauses while LumiFi is in the background.</Text>
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
