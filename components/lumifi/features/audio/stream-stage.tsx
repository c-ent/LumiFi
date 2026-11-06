import { compactEmbedHeight, playbackFor, streamServiceName, type StreamLink } from '@/src/core/stream-links';
import { colors, fonts, radius, rounded } from '@/src/theme/tokens';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { StreamPlayer } from '@/components/lumifi/features/audio/stream-player';
import { useLumiFi } from '@/components/lumifi/logic';
import { glassPanel, panelStyles } from '@/components/lumifi/shared/panel-styles';

const CARD_CHROME = 72;

export function openStreamEmbed(links: StreamLink[], activeId: string | null) {
  const link = activeId ? links.find((item) => item.id === activeId) : undefined;
  if (!link) return null;
  const playback = playbackFor(link);
  if (playback.kind !== 'embed') return null;
  return { link, playback };
}

export function streamCardHeight(embedHeight: number) {
  return embedHeight + CARD_CHROME;
}

export function StreamStage({ style, plain = false, inert = false }: { style?: StyleProp<ViewStyle>; plain?: boolean; inert?: boolean }) {
  const { streamLinks, activeStreamId, closeStream } = useLumiFi();
  const open = openStreamEmbed(streamLinks, activeStreamId);
  const [minimizedId, setMinimizedId] = useState<string | null>(null);
  const [fitted, setFitted] = useState(0);
  if (!open) return null;
  const name = streamServiceName(open.link.service);
  const minimized = !plain && minimizedId === open.link.id;
  const height = plain && fitted > 0
    ? fitted
    : minimized
      ? compactEmbedHeight(open.link)
      : open.playback.height;

  return (
    <View style={[styles.anchor, plain ? styles.plainAnchor : null, style]} pointerEvents={inert ? 'none' : 'box-none'}>
      <View
        style={[styles.card, plain ? styles.plain : minimized ? styles.chip : styles.full]}
        onLayout={plain ? (event) => {
          const next = Math.round(event.nativeEvent.layout.height);
          setFitted((prev) => (prev === next ? prev : next));
        } : undefined}
      >
        {plain ? null : (
          <View style={styles.head}>
            {minimized ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Show ${name} player`}
                onPress={() => setMinimizedId(null)}
                style={styles.identity}
              >
                <Text style={styles.mark}>{name}</Text>
                <Text style={styles.title} numberOfLines={1}>{open.link.title}</Text>
              </Pressable>
            ) : (
              <View style={styles.identity}>
                <Text style={styles.mark}>{name}</Text>
                <Text style={styles.title} numberOfLines={1}>{open.link.title}</Text>
              </View>
            )}
            {minimized ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Minimize ${name} player`}
                onPress={() => setMinimizedId(open.link.id)}
                style={panelStyles.mini}
              >
                <Text style={panelStyles.miniText}>Minimize</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Close ${name} player`}
              onPress={closeStream}
              style={panelStyles.mini}
            >
              <Text style={panelStyles.miniText}>Close</Text>
            </Pressable>
          </View>
        )}
        <StreamPlayer
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
  chip: {
    width: 280,
    maxWidth: '100%',
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
