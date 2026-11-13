import { playbackFor, streamServiceName, type StreamLink } from '@/src/core/stream-links';
import { colors, fonts, radius, rounded } from '@/src/theme/tokens';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { StreamPlayer } from '@/components/wickglow/features/audio/stream-player';
import { useWickglow } from '@/components/wickglow/logic';
import { glassPanel, panelStyles } from '@/components/wickglow/shared/panel-styles';
import { StreamServiceMark } from '@/components/wickglow/shared/stream-marks';

/**
 * The floating card that holds the playing stream embed (Spotify, YouTube,
 * Apple Music). It is mounted once at the top of each screen shell, outside the
 * panels, so the player is NOT destroyed when a panel closes (closing a panel
 * must not stop the music). It renders nothing unless an embed is active.
 */

// Vertical space the card adds around the embed (header + padding), in px.
const CARD_CHROME = 72;

/**
 * Streaming links are a web-only feature (owner choice, 2026-11-13). In the
 * Android and iOS app the service embeds run in a WebView with no sign-in, so
 * Spotify and Apple Music only offered previews that often did not play. The
 * Streaming views are hidden there and no embed is shown. Saved links stay in
 * storage untouched.
 */
export const STREAMING_AVAILABLE = Platform.OS === 'web';

// The currently playing embed, or null. "Open" links (YouTube Music) are not
// embeds, so they return null here, and so does everything on Android and iOS.
export function openStreamEmbed(links: StreamLink[], activeId: string | null) {
  if (!STREAMING_AVAILABLE) return null;
  const link = activeId ? links.find((item) => item.id === activeId) : undefined;
  if (!link) return null;
  const playback = playbackFor(link);
  if (playback.kind !== 'embed') return null;
  return { link, playback };
}

/**
 * Phone and tablet layouts have no streaming (owner choice, 2026-11-14). On the
 * web a window can narrow from desktop to phone width with an embed playing;
 * with no player on screen it would be silent but still own the sound, so the
 * phone and tablet screens call this to end it.
 */
export function useEndStream() {
  const { activeStreamId, closeStream } = useWickglow();
  useEffect(() => {
    if (activeStreamId != null) closeStream();
  }, [activeStreamId, closeStream]);
}

// Total card height for an embed of the given height.
export function streamCardHeight(embedHeight: number) {
  return embedHeight + CARD_CHROME;
}

/**
 * `plain`: no card chrome or header; the player fills a slot (desktop Music
 * card). `inert`: ignore touches (used while the player is just being placed).
 */
export function StreamStage({ style, plain = false, inert = false }: { style?: StyleProp<ViewStyle>; plain?: boolean; inert?: boolean }) {
  const { streamLinks, activeStreamId, closeStream } = useWickglow();
  const open = openStreamEmbed(streamLinks, activeStreamId);
  // In `plain` mode, the measured slot height; 0 until the first layout.
  const [fitted, setFitted] = useState(0);
  if (!open) return null;
  const name = streamServiceName(open.link.service);
  const height = plain && fitted > 0 ? fitted : open.playback.height;

  return (
    // 'box-none': this wrapper ignores touches but its children (the card)
    // still get them, so the empty area around the card doesn't block the scene.
    <View style={[styles.anchor, plain ? styles.plainAnchor : null, style]} pointerEvents={inert ? 'none' : 'box-none'}>
      <View
        style={[styles.card, plain ? styles.plain : styles.full]}
        onLayout={plain ? (event) => {
          const next = Math.round(event.nativeEvent.layout.height);
          setFitted((prev) => (prev === next ? prev : next));
        } : undefined}
      >
        {plain ? null : (
          <View style={styles.head}>
            <StreamServiceMark service={open.link.service} />
            <View style={styles.identity}>
              <Text style={styles.mark}>{name}</Text>
              <Text style={styles.title} numberOfLines={1}>{open.link.title}</Text>
            </View>
            {/* Ends playback (unmounts the embed), it doesn't just hide the card. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`End ${name} stream`}
              onPress={closeStream}
              style={panelStyles.mini}
            >
              <Text style={panelStyles.miniText}>End stream</Text>
            </Pressable>
          </View>
        )}
        <StreamPlayer
          key={open.link.id}
          service={open.link.service}
          embedUrl={open.playback.embedUrl}
          pageUrl={open.link.url}
          height={height}
          flush={plain}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    alignItems: 'flex-end',
  },
  card: {
    ...glassPanel,
    ...rounded(radius.lg),
    padding: 12,
  },
  full: {
    width: '100%',
  },
  plainAnchor: {
    width: '100%',
    height: '100%',
    alignItems: 'stretch',
  },
  plain: {
    width: '100%',
    height: '100%',
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    boxShadow: 'none',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  mark: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
});
