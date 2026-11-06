import { colors, fade, fonts, radius, rounded } from '@/src/theme/tokens';
import { openStreamEmbed } from '@/components/lumifi/features/audio/stream-stage';
import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { PlaylistEntry } from '@/src/core/own-tracks';
import { StreamBlock } from '@/components/lumifi/features/audio/stream-block';
import { useLumiFi } from '@/components/lumifi/logic';
import { useReducedMotion } from '@/components/lumifi/hooks/use-reduced-motion';
import { CloseIcon, MusicIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, RepeatIcon, UploadIcon, VolumeIcon } from '@/components/lumifi/shared/icons';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { useTone } from '@/components/lumifi/features/tone';

type MusicSource = 'tracks' | 'streaming';

// Tile washes for playlist rows. These are art, not theme accents.
const ART = ['#FFB454', '#FF8246', '#F06E6E', '#96C878', '#AA8CF0'] as const;

export function MusicBlock({
  mobile = false,
  wide = false,
  embedSlotRef,
  onEmbedLayout,
}: {
  mobile?: boolean;
  wide?: boolean;
  embedSlotRef?: React.RefObject<React.ComponentRef<typeof View> | null>;
  onEmbedLayout?: () => void;
}) {
  const tone = useTone(mobile);
  const [source, setSource] = useState<MusicSource>('tracks');
  const selectedStyle = { backgroundColor: tone.solid, borderColor: tone.solid };
  const selectedText = { color: tone.ink };

  if (wide) {
    return (
      <View style={wideStyles.row}>
        <View style={wideStyles.tracksPane}>
          <NowPlaying wide />
          <PlaylistHead wide />
          <View style={wideStyles.playlistBox}>
            <ScrollView style={wideStyles.playlistScroll} contentContainerStyle={wideStyles.trackContent}>
              <TrackRows wide />
            </ScrollView>
          </View>
          <FilesNote wide />
        </View>
        <View style={wideStyles.streamCol}>
          <View style={wideStyles.stream}>
            <Text style={[styles.kicker, wideStyles.cardLabel]}>Streaming</Text>
            <StreamBlock wide>
              <View style={wideStyles.playerBox}>
                <EmbedSlot slotRef={embedSlotRef} onLayout={onEmbedLayout} />
              </View>
            </StreamBlock>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.presetRow}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: source === 'tracks' }}
          accessibilityLabel="Tracks"
          onPress={() => setSource('tracks')}
          style={[styles.preset, styles.sourceTab, source === 'tracks' ? selectedStyle : null]}
        >
          <Text style={[styles.miniText, source === 'tracks' ? selectedText : null]}>Tracks</Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: source === 'streaming' }}
          accessibilityLabel="Streaming"
          onPress={() => setSource('streaming')}
          style={[styles.preset, styles.sourceTab, source === 'streaming' ? selectedStyle : null]}
        >
          <Text style={[styles.miniText, source === 'streaming' ? selectedText : null]}>Streaming</Text>
        </Pressable>
      </View>
      {source === 'tracks' ? <TrackList mobile={mobile} /> : <StreamBlock mobile={mobile} />}
    </View>
  );
}

function EmbedSlot({ slotRef, onLayout }: { slotRef?: React.RefObject<React.ComponentRef<typeof View> | null>; onLayout?: () => void }) {
  const { streamLinks, activeStreamId } = useLumiFi();
  const open = openStreamEmbed(streamLinks, activeStreamId);
  const hint = streamLinks.length > 0
    ? 'Play a saved link and it shows here.'
    : 'Paste a link and the player shows here.';
  return (
    <View
      ref={slotRef}
      onLayout={onLayout}
      style={[wideStyles.slot, open ? wideStyles.slotLive : null]}
    >
      {open ? null : <Text style={wideStyles.slotHint}>{hint}</Text>}
    </View>
  );
}

function LoopButton({
  on,
  onPress,
  accent,
  size = 16,
  style,
}: {
  on: boolean;
  onPress: () => void;
  accent: string;
  size?: number;
  style: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel="Repeat this track"
      accessibilityHint={on ? 'On. The current track repeats.' : 'Off. The next track plays when this one ends.'}
      onPress={onPress}
      style={[style, on ? { borderColor: fade(accent, 0.55), backgroundColor: fade(accent, 0.16) } : null]}
    >
      <RepeatIcon size={size} color={on ? accent : colors.textMuted} />
    </Pressable>
  );
}

function NowPlaying({ mobile = false, wide = false }: { mobile?: boolean; wide?: boolean }) {
  const lamp = useLumiFi();
  const tone = useTone(mobile);
  const icon = tone.ink;
  const transport = (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous track" style={wide ? wideStyles.round : styles.round} onPress={lamp.prevTrack}><PrevIcon color={colors.textPrimary} size={16} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={lamp.musicPlaying ? 'Pause music' : 'Play music'} style={[wide ? wideStyles.play : styles.roundLg, { backgroundColor: wide ? tone.accent : tone.solid }]} onPress={lamp.toggleMusic}>
        {lamp.musicPlaying ? <PauseIcon color={icon} size={wide ? 16 : 18} /> : <PlayIcon color={icon} size={wide ? 16 : 18} />}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Next track" style={wide ? wideStyles.round : styles.round} onPress={lamp.nextTrack}><NextIcon color={colors.textPrimary} size={16} /></Pressable>
      <LoopButton on={lamp.musicLoop} onPress={lamp.toggleMusicLoop} accent={tone.accent} size={16} style={wide ? wideStyles.round : styles.round} />
    </>
  );

  if (!wide) {
    return (
      <View>
        <Text style={styles.trackName}>{lamp.trackTitle}</Text>
        <Text style={styles.meta}>{lamp.trackArtist}</Text>
        <View style={styles.transport}>
          {transport}
          <Slider
            accessibilityLabel="Music volume"
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            value={lamp.mix.music}
            onValueChange={(value) => lamp.setMix('music', Math.round(value))}
            minimumTrackTintColor={tone.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={tone.accent}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={wideStyles.now}>
      <TrackArt index={lamp.trackIndex} size={64} />
      <View style={wideStyles.nowCopy}>
        <Text style={wideStyles.nowTitle} numberOfLines={1}>{lamp.trackTitle}</Text>
        <Text style={wideStyles.nowArtist} numberOfLines={1}>{lamp.trackArtist}</Text>
        <View style={wideStyles.controls}>
          {transport}
          <View style={wideStyles.vol}>
            <VolumeIcon color={colors.textMuted} size={16} />
            <Slider
              accessibilityLabel="Music volume"
              style={wideStyles.volSlider}
              minimumValue={0}
              maximumValue={100}
              value={lamp.mix.music}
              onValueChange={(value) => lamp.setMix('music', Math.round(value))}
              minimumTrackTintColor={tone.accent}
              maximumTrackTintColor={'rgba(255, 255, 255, 0.16)'}
              thumbTintColor={tone.accent}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function TrackList({ mobile = false }: { mobile?: boolean }) {
  return (
    <View>
      <NowPlaying mobile={mobile} />
      <PlaylistHead />
      <TrackRows mobile={mobile} />
      <FilesNote />
    </View>
  );
}

function PlaylistHead({ wide = false }: { wide?: boolean }) {
  const lamp = useLumiFi();
  const canAddFiles = Platform.OS !== 'web' && !wide;
  return (
    <View style={wide ? wideStyles.labelRow : styles.mixHead}>
      <Text style={[styles.kicker, styles.mixKicker, wide ? wideStyles.label : null]}>Playlist</Text>
      {canAddFiles ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add audio files from this device"
          onPress={lamp.addOwnFiles}
          style={styles.mini}
        >
          <Text style={styles.miniText}>Add files</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function TrackRows({ wide = false, mobile = false }: { wide?: boolean; mobile?: boolean }) {
  const lamp = useLumiFi();
  const tone = useTone(mobile);
  if (!wide) {
    return (
      <View style={wideStyles.phoneList}>
        {lamp.playlist.map((entry, index) => (
          <TrackRow key={entry.key} entry={entry} index={index} selected={index === lamp.trackIndex} playing={lamp.musicPlaying} accent={tone.accent} onSelect={lamp.selectTrack} onRemove={lamp.removeOwnTrack} ownId={ownId(lamp.ownTracks, entry)} />
        ))}
      </View>
    );
  }

  const rows: { entry: PlaylistEntry; index: number }[][] = [];
  lamp.playlist.forEach((entry, index) => {
    const row = rows[rows.length - 1];
    if (!row || row.length === 2) rows.push([{ entry, index }]);
    else row.push({ entry, index });
  });

  return (
    <View style={wideStyles.grid}>
      {rows.map((pair) => (
        <View key={pair[0].entry.key} style={wideStyles.pair}>
          {pair.map(({ entry, index }) => (
            <View key={entry.key} style={wideStyles.cell}>
              <TrackRow wide entry={entry} index={index} selected={index === lamp.trackIndex} playing={lamp.musicPlaying} accent={tone.accent} onSelect={lamp.selectTrack} onRemove={lamp.removeOwnTrack} ownId={ownId(lamp.ownTracks, entry)} />
            </View>
          ))}
          {pair.length === 1 ? <View style={wideStyles.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

function ownId(ownTracks: { id: string }[], entry: PlaylistEntry) {
  if (entry.ownIndex == null) return null;
  return ownTracks[entry.ownIndex]?.id ?? null;
}

function TrackRow({
  entry,
  index,
  selected,
  playing,
  accent,
  onSelect,
  onRemove,
  ownId: ownedId,
  wide = false,
}: {
  entry: PlaylistEntry;
  index: number;
  selected: boolean;
  playing: boolean;
  accent: string;
  onSelect: (index: number) => void;
  onRemove: (id: string) => void;
  ownId: string | null;
  wide?: boolean;
}) {
  const titleStyle = selected ? { color: accent, fontFamily: fonts.bodySemibold } : null;
  return (
    <View style={[styles.trackRow, wideStyles.trackRow]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={entry.own ? `Play ${entry.title} from your files` : `Play ${entry.title} by ${entry.artist}`}
        onPress={() => onSelect(index)}
        style={[
          wide ? wideStyles.track : wideStyles.phoneTrack,
          {
            borderColor: selected ? fade(accent, 0.55) : 'rgba(255, 255, 255, 0.09)',
            backgroundColor: selected ? fade(accent, 0.14) : 'rgba(255, 255, 255, 0.04)',
          },
        ]}
      >
        <TrackArt index={index} size={wide ? 36 : 42} />
        <View style={styles.taskCopy}>
          <Text style={[wide ? wideStyles.trackTitle : styles.taskText, titleStyle]} numberOfLines={1}>{entry.title}</Text>
          <Text style={wide ? wideStyles.trackArtist : styles.meta} numberOfLines={1}>{entry.artist}</Text>
        </View>
        {selected && playing ? <EqMark color={accent} /> : null}
      </Pressable>
      {ownedId ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${entry.title} from your files`}
          onPress={() => onRemove(ownedId)}
          style={[styles.trackRemove, wide ? wideStyles.remove : null]}
        >
          <CloseIcon color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function FilesNote({ wide = false }: { wide?: boolean }) {
  const lamp = useLumiFi();
  const canAddFiles = Platform.OS !== 'web';
  if (!wide) {
    return canAddFiles ? (
      <Text style={styles.note}>Your files stay on this device, play offline, and are never uploaded.</Text>
    ) : (
      <Text style={styles.note}>Adding your own files is available in the Android and iOS app.</Text>
    );
  }

  return (
    <View style={wideStyles.own}>
      {canAddFiles ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add audio files from this device"
          onPress={lamp.addOwnFiles}
          style={styles.mini}
        >
          <Text style={styles.miniText}>Add files</Text>
        </Pressable>
      ) : (
        <UploadIcon color={colors.textMuted} />
      )}
      <Text style={wideStyles.ownText}>
        {canAddFiles
          ? 'Your files stay on this device, play offline, and are never uploaded.'
          : 'Adding your own files is available in the Android and iOS app.'}
      </Text>
    </View>
  );
}

function TrackArt({ index, size = 42 }: { index: number; size?: number }) {
  const hue = ART[index % ART.length] ?? ART[0];
  const id = `track-art-${size}-${index}`;
  const icon = size >= 56 ? 26 : 15;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[wideStyles.art, { width: size, height: size, borderRadius: size >= 56 ? 14 : size <= 36 ? 9 : 10 }]}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={hue} stopOpacity={0.35} />
            <Stop offset="1" stopColor={hue} stopOpacity={0.12} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${id})`} />
      </Svg>
      <MusicIcon size={icon} color={hue} />
    </View>
  );
}

function EqMark({ color }: { color: string }) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) return undefined;
    pulse.set(withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true));
    return undefined;
  }, [pulse, reduced]);

  const first = useAnimatedStyle(() => {
    const scale = 0.4 + 0.6 * Math.abs(Math.sin(pulse.get() * Math.PI));
    return { transform: [{ scaleY: scale }, { translateY: (1 - scale) * 8 }] };
  });
  const second = useAnimatedStyle(() => {
    const scale = 0.35 + 0.65 * Math.abs(Math.sin(pulse.get() * Math.PI + 0.8));
    return { transform: [{ scaleY: scale }, { translateY: (1 - scale) * 8 }] };
  });
  const third = useAnimatedStyle(() => {
    const scale = 0.5 + 0.5 * Math.abs(Math.sin(pulse.get() * Math.PI + 1.6));
    return { transform: [{ scaleY: scale }, { translateY: (1 - scale) * 8 }] };
  });
  const bars = reduced ? [wideStyles.eqStill, wideStyles.eqStill, wideStyles.eqStill] : [first, second, third];

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={wideStyles.eq}>
      {bars.map((bar, index) => (
        <Reanimated.View key={index} style={[wideStyles.eqBar, { backgroundColor: color }, bar]} />
      ))}
    </View>
  );
}

const wideStyles = StyleSheet.create({
  row: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 20,
  },
  // Now playing stays put. Only the playlist box scrolls.
  tracksPane: {
    flexGrow: 1.35,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 0,
    gap: 14,
  },
  playlistBox: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...rounded(radius.md),
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  playlistScroll: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  trackContent: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 8,
  },
  streamCol: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 0,
  },
  stream: {
    flex: 1,
    minHeight: 0,
    padding: 18,
    ...rounded(radius.lg),
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardLabel: {
    marginTop: 0,
    marginBottom: 14,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  labelRow: {
    marginBottom: 0,
  },
  label: {
    marginTop: 0,
    marginBottom: 0,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  phoneList: {
    gap: 8,
  },
  grid: {
    gap: 8,
  },
  pair: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    flex: 1,
    minWidth: 0,
  },
  trackRow: {
    alignItems: 'stretch',
  },
  phoneTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  track: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 10,
    borderWidth: 1,
    borderRadius: 12,
  },
  trackTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
  },
  trackArtist: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  remove: {
    marginBottom: 0,
  },
  art: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eq: {
    width: 14,
    height: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  eqBar: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  eqStill: {
    transform: [{ scaleY: 0.7 }],
  },
  now: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...rounded(radius.lg),
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  nowCopy: {
    flex: 1,
    minWidth: 0,
  },
  nowTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.timeMedium,
    fontSize: 18,
    lineHeight: 22,
  },
  nowArtist: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  round: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vol: {
    flex: 1,
    maxWidth: 140,
    minWidth: 56,
    marginLeft: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  volSlider: {
    flex: 1,
    height: 28,
  },
  own: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ownText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  playerBox: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  slot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgInset,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...rounded(14),
  },
  slotHint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  slotLive: {
    borderStyle: 'solid',
    borderColor: fade(colors.success, 0.4),
    backgroundColor: 'transparent',
  },
});
