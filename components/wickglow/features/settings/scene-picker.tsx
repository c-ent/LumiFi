import { colors, fonts, radius, rounded } from '@/src/theme/tokens';
import React, { useRef } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLoadingBackground } from '@/components/wickglow/features/background/background-loading';
import {
  SceneSource,
  downloadScene,
  remoteFileOf,
  sceneOffered,
  useSceneStatus,
} from '@/components/wickglow/features/background/scene-downloads';
import { useReducedMotion } from '@/components/wickglow/hooks/use-reduced-motion';
import { PIXEL_ART } from '@/components/wickglow/features/background/pixel-art';
import { VIDEOS } from '@/components/wickglow/features/background/video-art';
import { useWickglow } from '@/components/wickglow/logic';
import { DownloadIcon } from '@/components/wickglow/shared/icons';
import { panelStyles as styles } from '@/components/wickglow/shared/panel-styles';
import { SCENES } from '@/components/wickglow/theme';
import { formatMegabytes } from '@/src/core/remote-scenes';

// Desktop: choose the background. Three groups: the gradient scenes (Dusk /
// Midnight / Forest / Ember, each with a swatch of its middle color), Pixel art
// (looping pixel-art videos) and Videos (looping video).
// Exactly one choice across all groups is selected. Phone/tablet use MoodPicker
// instead (the two systems are still separate; see progress.md).
//
// Every video but Classic lives on the scene host. On Android a tile that is not
// downloaded yet shows its size; a tap downloads it, then selects it, unless
// another tile was tapped meanwhile. On web every scene streams, so no tile
// shows a size. While no host is set the remote tiles are not shown.
export function ScenePicker() {
  const { scene, setScene, videoBg, setVideoBg, pixelBg, setPixelBg } = useWickglow();
  // The background that is still loading, e.g. `video:snowy_sled`.
  const loading = useLoadingBackground();
  // The tile tapped last, so a download that finishes after a later tap does
  // not take the selection back.
  const lastTap = useRef<string | null>(null);
  const tap = (key: string, select: () => void) => {
    lastTap.current = key;
    select();
  };
  const afterDownload = (key: string, select: () => void) => {
    if (lastTap.current === key) select();
  };

  const pixels = PIXEL_ART.filter((item) => sceneOffered(item.source));
  const videos = VIDEOS.filter((item) => sceneOffered(item.source));

  return (
    <View>
      <Text style={styles.kicker}>Scenes</Text>
      <View style={styles.sceneGrid}>
        {SCENES.map((item) => {
          const selected = item.id === scene && !videoBg && pixelBg === null;
          return (
            <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${item.name} scene`} key={item.id} onPress={() => tap(`scene:${item.id}`, () => setScene(item.id))} style={[styles.sceneBtn, selected && { borderColor: colors.textPrimary }]}>
              <View style={[styles.swatch, { backgroundColor: item.b2 }]} />
              <Text style={[styles.sceneName, selected && { color: colors.textPrimary }]}>{item.name}</Text>
            </Pressable>
          );
        })}
      </View>
      {pixels.length > 0 ? (
        <>
          <Text style={styles.kicker}>Pixel art</Text>
          <View style={styles.sceneGrid}>
            {pixels.map((item) => {
              const key = `pixel:${item.id}`;
              return (
                <SceneTile
                  key={item.id}
                  name={item.name}
                  kind="pixel art background"
                  thumb={item.thumb}
                  source={item.source}
                  selected={item.id === pixelBg}
                  loading={loading === key}
                  onTap={(select) => tap(key, select ? () => setPixelBg(item.id) : () => {})}
                  onDownloaded={() => afterDownload(key, () => setPixelBg(item.id))}
                />
              );
            })}
          </View>
        </>
      ) : null}
      <Text style={styles.kicker}>Videos</Text>
      <View style={styles.sceneGrid}>
        {videos.map((item) => {
          const key = `video:${item.id}`;
          return (
            <SceneTile
              key={item.id}
              name={item.name}
              kind="video background"
              thumb={item.thumb}
              source={item.source}
              selected={item.id === videoBg}
              loading={loading === key}
              onTap={(select) => tap(key, select ? () => setVideoBg(item.id) : () => {})}
              onDownloaded={() => afterDownload(key, () => setVideoBg(item.id))}
            />
          );
        })}
      </View>
    </View>
  );
}

/**
 * One video or pixel-art tile. A playable scene is selected on tap. A remote
 * scene that is not on the device shows its size, and a tap downloads it
 * (`onTap(false)` records the tap without selecting; `onDownloaded` selects it
 * once it is in place). A failed download shows "Tap to retry".
 */
function SceneTile({ name, kind, thumb, source, selected, loading, onTap, onDownloaded }: {
  name: string;
  kind: string;
  thumb: number;
  source: SceneSource;
  selected: boolean;
  loading: boolean;
  onTap: (select: boolean) => void;
  onDownloaded: () => void;
}) {
  const status = useSceneStatus(source);
  const remote = remoteFileOf(source);
  const size = remote ? formatMegabytes(remote.bytes) : '';

  const press = () => {
    if (status.kind === 'ready' || !remote) {
      onTap(true);
      return;
    }
    if (status.kind === 'downloading') return;
    onTap(false);
    void downloadScene(remote).then((ok) => {
      if (ok) onDownloaded();
    });
  };

  const label =
    status.kind === 'missing' ? `${name} ${kind}, download ${size}`
      : status.kind === 'downloading' ? `${name} ${kind}, downloading, ${Math.round(status.progress * 100)} percent`
        : status.kind === 'failed' ? `${name} ${kind}, download failed, tap to retry`
          : `${name} ${kind}`;

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected, busy: status.kind === 'downloading' }} accessibilityLabel={label} onPress={press} style={[styles.sceneBtn, selected && { borderColor: colors.textPrimary }]}>
      <View>
        <Image source={thumb} style={styles.sceneThumb} contentFit="cover" />
        {status.kind === 'missing' ? (
          <View style={tile.badge} pointerEvents="none">
            <DownloadIcon size={12} color={colors.textPrimary} />
            <Text style={tile.badgeText}>{size}</Text>
          </View>
        ) : null}
        {status.kind === 'downloading' ? <TileProgress progress={status.progress} /> : null}
        {status.kind === 'failed' ? (
          <View style={tile.cover} pointerEvents="none">
            <Text style={tile.coverText}>Tap to retry</Text>
          </View>
        ) : null}
        {status.kind === 'ready' && loading ? <TileSpinner /> : null}
      </View>
      <Text style={[styles.sceneName, selected && { color: colors.textPrimary }]}>{name}</Text>
    </Pressable>
  );
}

// Dims the tile while it downloads, with the percentage (and a spinner, unless
// reduced motion is on).
function TileProgress({ progress }: { progress: number }) {
  const reduced = useReducedMotion();
  return (
    <View style={tile.cover} pointerEvents="none">
      {reduced ? null : <ActivityIndicator size="small" color={colors.textPrimary} />}
      <Text style={tile.coverText}>{`${Math.round(progress * 100)}%`}</Text>
    </View>
  );
}

// Dims the picked tile and spins over it while its background loads. Under
// reduced motion the dimming alone shows it, with the pill on the background.
function TileSpinner() {
  const reduced = useReducedMotion();
  return (
    <View style={tile.cover} pointerEvents="none" accessibilityLabel="Loading">
      {reduced ? null : <ActivityIndicator size="small" color={colors.textPrimary} />}
    </View>
  );
}

const tile = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.bgInset,
    ...rounded(radius.sm),
  },
  coverText: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  // The size of a scene that is not downloaded yet, in the tile's corner.
  badge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    ...rounded(radius.sm),
  },
  badgeText: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
});
