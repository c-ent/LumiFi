import { colors, fade, fonts, radius, rounded } from '@/src/theme/tokens';
import { openStreamEmbed, STREAMING_AVAILABLE } from '@/components/wickglow/features/audio/stream-stage';
import Slider from '@react-native-community/slider';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatTrackTime } from '@/src/core/track-time';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { PlaylistEntry } from '@/src/core/own-tracks';
import { StreamBlock } from '@/components/wickglow/features/audio/stream-block';
import { useMusicPosition, useWickglow } from '@/components/wickglow/logic';
import { useReducedMotion } from '@/components/wickglow/hooks/use-reduced-motion';
import { CloseIcon, MusicIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, RepeatIcon, UploadIcon, VolumeIcon } from '@/components/wickglow/shared/icons';
import { panelStyles as styles } from '@/components/wickglow/shared/panel-styles';
import { SegmentTabs } from '@/components/wickglow/shared/segment-tabs';
import { useTone } from '@/components/wickglow/features/tone';

/**
 * The Music panel. It has two sources:
 * - "Tracks": the local player (bundled lofi + the user's own files).
 * - "Streaming": a pasted Spotify/YouTube/Apple Music link (see stream-block.tsx).
 *   Desktop web layout only: hidden on Android and iOS (see `STREAMING_AVAILABLE`)
 *   and never offered in the phone and tablet layouts.
 *
 * It renders in two shapes from the same pieces:
 * - `SoundsScroller` (phone and tablet): Tracks, plus Ambient on phone. It is the
 *   page's scroller, not a block inside one, so the track list can be
 *   virtualised (see the note on it below).
 * - `MusicBlock` (the desktop Music card): tracks on the left, streaming on the
 *   right, and an empty "slot" that the floating stream player is positioned over.
 *
 * The small components below (NowPlaying, TrackRow, ...) each take `wide` and
 * `mobile` flags instead of being duplicated per layout.
 *
 * The track list is a FlashList in both shapes. Bundled tracks are few, but a
 * user can add hundreds of their own files, and a plain mapped list would
 * mount every row (each with an SVG tile) at once.
 */
// Which view the phone/tablet Sounds page shows. 'ambient' only exists when
// the screen passes `ambient` (the phone does; see SoundsScroller).
type MusicSource = 'tracks' | 'ambient';

const SOURCE_LABEL: Record<MusicSource, string> = { tracks: 'Tracks', ambient: 'Ambient' };

// Tile washes for playlist rows. These are art, not theme accents.
const ART = ['#FFB454', '#FF8246', '#F06E6E', '#96C878', '#AA8CF0'] as const;

/** The desktop Music card's contents. Phone and tablet use `SoundsScroller`. */
export function MusicBlock({
  embedSlotRef,
  onEmbedLayout,
}: {
  /** Lets the desktop screen measure where the embed slot is. */
  embedSlotRef?: React.RefObject<React.ComponentRef<typeof View> | null>;
  /** Called when the slot moves/resizes so the player can follow. */
  onEmbedLayout?: () => void;
}) {
  return (
    <View style={wideStyles.row}>
      <View style={wideStyles.tracksPane}>
        <NowPlaying wide />
        <PlaylistHead wide />
        <View style={wideStyles.playlistBox}>
          <WideTrackGrid />
        </View>
        <FilesNote wide />
      </View>
      {/* Streaming is web-only; on Android and iOS the tracks fill the card. */}
      {STREAMING_AVAILABLE ? (
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
      ) : null}
    </View>
  );
}

// Ambient shows no track rows. A constant, so the list's data keeps one identity.
const NO_TRACKS: PlaylistEntry[] = [];

/**
 * The Sounds page on phone and tablet, as one virtualised list. The track rows
 * are the list's items; everything else on the page rides along as the list's
 * header and footer: `before` (the mood picker, and on tablet the tasks), the
 * Tracks / Ambient switch, the player, and `after` (the mixer, and on tablet
 * the quests and calendar). It looks like the single scrolling page it
 * replaced, but only the rows near the screen are mounted.
 *
 * With `ambient` (the phone), the switch gains a third view, Ambient, that
 * shows only that content, so Tracks stays short.
 *
 * It has to be the scroller itself: a virtualised list placed inside another
 * vertical ScrollView is given unlimited height and mounts every row anyway.
 * So the screen renders this in place of its ScrollView, not inside it.
 */
export function SoundsScroller({
  mobile = false,
  before,
  after,
  ambient,
  contentContainerStyle,
}: {
  mobile?: boolean;
  /** Rendered above the Tracks / Ambient switch. */
  before?: React.ReactNode;
  /** Rendered below the track list. */
  after?: React.ReactNode;
  /** When given, an Ambient view that shows this alone (`before` and `after` hide there). */
  ambient?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const tone = useTone(mobile);
  const [source, setSource] = useState<MusicSource>('tracks');
  // Streaming lives only on the desktop Music card (owner choice, 2026-11-14),
  // so phone and tablet never offer it. Without Ambient (the tablet) only
  // Tracks is left, so the switch is not shown at all.
  const options: MusicSource[] = ['tracks'];
  if (ambient) options.push('ambient');
  const { playlist, trackIndex, musicPlaying, ownTracks, selectTrack, removeOwnTrack } = useWickglow();
  const accent = tone.accent;
  // The list re-renders its visible rows when this changes. Without it a row
  // would keep showing the old "selected" state after the track changes.
  const extra = useMemo(() => ({ trackIndex, musicPlaying, ownTracks, accent }), [accent, musicPlaying, ownTracks, trackIndex]);

  return (
    <FlashList
      data={source === 'tracks' ? playlist : NO_TRACKS}
      extraData={extra}
      keyExtractor={(entry) => entry.key}
      contentContainerStyle={contentContainerStyle}
      // "handled": a tap on a button while the keyboard is open works on the
      // first tap, instead of only dismissing the keyboard.
      keyboardShouldPersistTaps="handled"
      ItemSeparatorComponent={RowGap}
      ListHeaderComponent={(
        <View>
          {source === 'ambient' ? null : before}
          {options.length > 1 ? (
            <SegmentTabs
              value={source}
              options={options}
              labels={SOURCE_LABEL}
              onChange={setSource}
              mobile={mobile}
              first={!before || source === 'ambient'}
            />
          ) : null}
          {source === 'tracks' ? (
            <>
              <NowPlaying mobile={mobile} />
              <PlaylistHead />
            </>
          ) : (
            ambient
          )}
        </View>
      )}
      ListFooterComponent={(
        <View>
          {source === 'tracks' ? <FilesNote /> : null}
          {source === 'ambient' ? null : after}
        </View>
      )}
      renderItem={({ item, index }) => (
        <TrackRow
          entry={item}
          index={index}
          selected={index === trackIndex}
          playing={musicPlaying}
          accent={accent}
          onSelect={selectTrack}
          onRemove={removeOwnTrack}
          ownId={ownId(ownTracks, item)}
        />
      )}
    />
  );
}

// The space between two track rows (the mapped list used `gap: 8`).
function RowGap() {
  return <View style={wideStyles.rowGap} />;
}


// An empty box on the desktop Music card. The real stream player (StreamStage)
// floats above the scene and is positioned to cover this box, so the card looks
// like it contains the player. Shows a hint until something is playing.
function EmbedSlot({ slotRef, onLayout }: { slotRef?: React.RefObject<React.ComponentRef<typeof View> | null>; onLayout?: () => void }) {
  const { streamLinks, activeStreamId } = useWickglow();
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

// The repeat toggle. `accessibilityRole="switch"` + `checked` tells screen
// readers it's an on/off control; the color change shows it visually.
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

// Current track, transport buttons (prev / play / next / repeat) and volume.
// `lamp` is just the name for the app context (the app was once called Lamp).
function NowPlaying({ mobile = false, wide = false }: { mobile?: boolean; wide?: boolean }) {
  const lamp = useWickglow();
  // Actions never change identity, so they are pulled out once (see logic.tsx).
  const { setMix, toggleMusic, nextTrack, prevTrack, toggleMusicLoop } = lamp;
  const tone = useTone(mobile);
  const icon = tone.ink;
  // Built once and reused by both the compact and wide layouts below.
  const transport = (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous track" style={wide ? wideStyles.round : styles.round} onPress={prevTrack}><PrevIcon color={colors.textPrimary} size={16} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={lamp.musicPlaying ? 'Pause music' : 'Play music'} style={[wide ? wideStyles.play : styles.roundLg, { backgroundColor: wide ? tone.accent : tone.solid }]} onPress={toggleMusic}>
        {lamp.musicPlaying ? <PauseIcon color={icon} size={wide ? 16 : 18} /> : <PlayIcon color={icon} size={wide ? 16 : 18} />}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Next track" style={wide ? wideStyles.round : styles.round} onPress={nextTrack}><NextIcon color={colors.textPrimary} size={16} /></Pressable>
      <LoopButton on={lamp.musicLoop} onPress={toggleMusicLoop} accent={tone.accent} size={16} style={wide ? wideStyles.round : styles.round} />
    </>
  );

  // Volume is drawn in quiet greys with a speaker icon in front, so it does not
  // read as a second progress bar. The accent belongs to the track position.
  const volume = (
    <View style={wideStyles.vol}>
      <VolumeIcon color={colors.textMuted} size={16} />
      <Slider
        accessibilityLabel="Music volume"
        style={wideStyles.volSlider}
        minimumValue={0}
        maximumValue={100}
        value={lamp.mix.music}
        onValueChange={(value) => setMix('music', Math.round(value))}
        minimumTrackTintColor={colors.textMuted}
        maximumTrackTintColor={'rgba(255, 255, 255, 0.16)'}
        thumbTintColor={colors.textPrimary}
      />
    </View>
  );

  if (!wide) {
    return (
      <View style={styles.card}>
        <Text style={styles.trackName}>{lamp.trackTitle}</Text>
        <Text style={styles.meta}>{lamp.trackArtist}</Text>
        <TrackProgress accent={tone.accent} />
        <View style={styles.transport}>
          {transport}
          {volume}
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
        <TrackProgress accent={tone.accent} wide />
        <View style={wideStyles.controls}>
          {transport}
          {volume}
        </View>
      </View>
    </View>
  );
}

// How long a released seek holds the bar at the picked spot while the player's
// status catches up, so the thumb does not jump back for a moment.
const SEEK_HOLD_MS = 900;

// The track position: a seek bar in the accent, with the time played on the
// left and the time left on the right. It reads the player's status itself
// (`useMusicPosition`), so its updates re-render only this bar.
function TrackProgress({ accent, wide = false }: { accent: string; wide?: boolean }) {
  const { seekMusic } = useWickglow();
  const { position, length } = useMusicPosition();
  // While a finger or mouse holds the thumb, the bar shows that spot, not the
  // player's position, which would pull the thumb back on each update.
  const [held, setHeld] = useState<number | null>(null);
  const dragging = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  const ready = length > 0;
  const shown = Math.min(held ?? position, length);
  const left = Math.max(0, length - shown);

  return (
    <View style={wide ? wideStyles.progressWide : wideStyles.progress}>
      <Slider
        accessibilityLabel="Track position"
        accessibilityValue={ready ? { text: `${formatTrackTime(shown)} of ${formatTrackTime(length)}` } : undefined}
        disabled={!ready}
        style={wideStyles.progressSlider}
        minimumValue={0}
        maximumValue={ready ? length : 1}
        value={ready ? shown : 0}
        onSlidingStart={(value) => {
          if (holdTimer.current) clearTimeout(holdTimer.current);
          dragging.current = true;
          setHeld(value);
        }}
        onValueChange={(value) => {
          if (dragging.current) setHeld(value);
        }}
        onSlidingComplete={(value) => {
          dragging.current = false;
          setHeld(value);
          seekMusic(value);
          holdTimer.current = setTimeout(() => setHeld(null), SEEK_HOLD_MS);
        }}
        minimumTrackTintColor={accent}
        maximumTrackTintColor={'rgba(255, 255, 255, 0.16)'}
        thumbTintColor={accent}
      />
      <View style={wideStyles.times}>
        <Text style={wideStyles.time}>{ready ? formatTrackTime(shown) : '0:00'}</Text>
        <Text style={wideStyles.time}>{ready ? `-${formatTrackTime(left)}` : '--:--'}</Text>
      </View>
    </View>
  );
}

// "Playlist" heading with the Add files button. Picking device files only works
// on Android/iOS; on `wide` the button lives in FilesNote at the bottom instead.
function PlaylistHead({ wide = false }: { wide?: boolean }) {
  const lamp = useWickglow();
  // Actions never change identity, so they are pulled out once (see logic.tsx).
  const { addOwnFiles } = lamp;
  const canAddFiles = Platform.OS !== 'web' && !wide;
  return (
    <View style={wide ? wideStyles.labelRow : styles.mixHead}>
      <Text style={[styles.kicker, styles.mixKicker, wide ? wideStyles.label : styles.kickerLg]}>Playlist</Text>
      {canAddFiles ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add audio files from this device"
          onPress={addOwnFiles}
          style={styles.mini}
        >
          <Text style={styles.miniText}>Add files</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// The desktop card's track list: a two-column grid that scrolls inside its box.
// FlashList lays out the columns; each cell pads itself to make the 8px gutters
// the old hand-built grid had (a list has no `gap` between its cells).
function WideTrackGrid() {
  const tone = useTone(false);
  const { playlist, trackIndex, musicPlaying, ownTracks, selectTrack, removeOwnTrack } = useWickglow();
  const accent = tone.accent;
  const extra = useMemo(() => ({ trackIndex, musicPlaying, ownTracks, accent }), [accent, musicPlaying, ownTracks, trackIndex]);
  return (
    <FlashList
      style={wideStyles.playlistScroll}
      contentContainerStyle={wideStyles.trackContent}
      data={playlist}
      extraData={extra}
      numColumns={2}
      keyExtractor={(entry) => entry.key}
      renderItem={({ item, index }) => (
        <View style={index % 2 === 0 ? wideStyles.cellLeft : wideStyles.cellRight}>
          <TrackRow
            wide
            entry={item}
            index={index}
            selected={index === trackIndex}
            playing={musicPlaying}
            accent={accent}
            onSelect={selectTrack}
            onRemove={removeOwnTrack}
            ownId={ownId(ownTracks, item)}
          />
        </View>
      )}
    />
  );
}

// Bundled tracks can't be removed; only the user's own files can. Returns the
// own-track id for a playlist entry, or null for a bundled one (no remove button).
function ownId(ownTracks: { id: string }[], entry: PlaylistEntry) {
  if (entry.ownIndex == null) return null;
  return ownTracks[entry.ownIndex]?.id ?? null;
}

// One playlist row: art tile, title/artist, an animated EQ mark while it plays,
// and a remove button for own files. `fade(color, a)` = color at alpha `a`.
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

// Privacy/availability note under the playlist. Web can't add own files (no
// private app folder to copy them into), so it explains that instead.
function FilesNote({ wide = false }: { wide?: boolean }) {
  const lamp = useWickglow();
  // Actions never change identity, so they are pulled out once (see logic.tsx).
  const { addOwnFiles } = lamp;
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
          onPress={addOwnFiles}
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

// Placeholder cover art: a soft gradient tile in one of the ART colors (picked
// by row index) with a music note. There is no real cover art to load.
// Hidden from screen readers since it's decorative.
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

// Three little bars that bounce next to the playing track (an "equalizer").
// Each bar reads the same 0..1 pulse with a different phase offset (+0, +0.8,
// +1.6) so they move out of step. Static when reduced motion is on.
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

// Styles for the desktop (`wide`) card, and a few shared by the phone rows.
// `minHeight: 0` / `minWidth: 0` on flex children lets them shrink and scroll
// instead of stretching the parent (a common React Native/CSS flexbox gotcha).
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
  // Each grid cell adds 8 below itself, so the bottom needs only 2 more to make 10.
  trackContent: {
    paddingTop: 10,
    paddingBottom: 2,
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
  rowGap: {
    height: 8,
  },
  // Two columns with an 8px gutter: 4 on the inner side of each cell.
  cellLeft: {
    paddingRight: 4,
    paddingBottom: 8,
  },
  cellRight: {
    paddingLeft: 4,
    paddingBottom: 8,
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
    ...rounded(14),
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
    ...rounded(12),
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
  progress: {
    marginTop: 8,
  },
  progressWide: {
    marginTop: 6,
  },
  progressSlider: {
    height: 24,
    marginHorizontal: Platform.OS === 'web' ? 0 : -8,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -2,
  },
  time: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
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
