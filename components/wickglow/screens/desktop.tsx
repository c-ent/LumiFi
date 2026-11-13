import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sessionFace } from '@/src/core/session-face';
import { colors, fonts, radius, rounded } from '@/src/theme/tokens';
import { darkGlass, glassPanel } from '@/components/wickglow/shared/panel-styles';
import { useFullscreen } from '@/components/wickglow/hooks/use-fullscreen';
import { useKeyboardInset } from '@/components/wickglow/hooks/use-keyboard-inset';
import { useZen } from '@/components/wickglow/hooks/use-zen';
import { useWickglow } from '@/components/wickglow/logic';
import { hasOpenQuests, MODE_LABEL, TimerMode } from '@/components/wickglow/theme';
import { RainOverlay } from '@/components/wickglow/features/background/rain';
import { SceneBackground } from '@/components/wickglow/features/background/scene-background';
import { LevelCard } from '@/components/wickglow/features/progression/level-card';
import { QuestList } from '@/components/wickglow/features/progression/quest-list';
import { StatGrid } from '@/components/wickglow/features/progression/stat-grid';
import { MonthCalendar } from '@/components/wickglow/features/progression/month-calendar';
import { WeekChart } from '@/components/wickglow/features/progression/week-chart';
import { ScenePicker } from '@/components/wickglow/features/settings/scene-picker';
import { TimerSettings } from '@/components/wickglow/features/settings/timer-settings';
import { TaskList } from '@/components/wickglow/features/tasks/task-list';
import { FocusLine } from '@/components/wickglow/features/tasks/focus-line';
import { MixerBlock } from '@/components/wickglow/features/audio/mixer-block';
import { MusicBlock } from '@/components/wickglow/features/audio/music-block';
import { StreamStage } from '@/components/wickglow/features/audio/stream-stage';
import { SessionEndCard } from '@/components/wickglow/features/timer/session-end-card';
import { TimeText } from '@/components/wickglow/features/timer/time-text';
import { LogoMark } from '@/components/wickglow/shared/logo';
import { PanelHeading } from '@/components/wickglow/shared/panel-heading';
import {
  ClockIcon,
  FlameIcon,
  FullscreenIcon,
  GearIcon,
  MixerIcon,
  MusicIcon,
  ResetIcon,
  SceneIcon,
  SkipIcon,
  StarIcon,
  TaskIcon,
} from '@/components/wickglow/shared/icons';

/**
 * The desktop layout (window over 840px, or a large tablet in landscape): a
 * full-screen animated scene with the timer in the middle, an icon dock along
 * the bottom, and panels that open as floating cards. Uses "scenes" for color
 * (the phone and tablet use "moods").
 *
 * Only one panel can be open at a time, tracked by `panel`.
 */

// Which panel (if any) is open. `null` = just the scene and timer.
type PanelId = 'music' | 'mixer' | 'scenes' | 'tasks' | 'progress' | 'quests' | 'settings';

// A narrow card opens under the dock button that opened it: the left group holds music
// through quests, the right group holds timer settings and full screen.
const PANEL_SIDE: Record<PanelId, 'left' | 'right'> = {
  music: 'left',
  mixer: 'left',
  scenes: 'left',
  tasks: 'left',
  progress: 'left',
  quests: 'left',
  settings: 'right',
};

// Title shown in each panel's heading bar.
const PANEL_TITLE: Record<PanelId, string> = {
  music: 'Music',
  mixer: 'Ambient mixer',
  scenes: 'Scenes',
  tasks: 'Tasks',
  progress: 'Progress',
  quests: 'Quests',
  settings: 'Timer settings',
};

export function DesktopWickglow() {
  const lamp = useWickglow();
  // Actions never change identity, so they are pulled out once (see logic.tsx).
  const { setMode, toggle, startNext, dismissEnding, reset, skip } = lamp;
  const insets = useSafeAreaInsets();
  const fullscreen = useFullscreen();
  const { width, height } = useWindowDimensions();
  // How far the on-screen keyboard covers the bottom (a large Android tablet in
  // landscape gets this layout). While it is up, the open card ends above it
  // instead of above the dock, so the field being typed in stays visible.
  const keyboard = useKeyboardInset();
  const [panel, setPanel] = useState<PanelId | null>(null);
  // Zen: while focusing with no panel open, the whole UI fades out after 3.5s
  // without input.
  const { zen, poke } = useZen(lamp.running && lamp.mode === 'focus' && lamp.zenOpt && !panel, 3500);
  // The empty "slot" box inside the Music card, and its measured position on
  // screen. The stream player floats over the scene (so it survives the card
  // closing) and is moved to sit exactly on top of this slot.
  const embedSlotRef = useRef<React.ComponentRef<typeof View>>(null);
  const [embedFrame, setEmbedFrame] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const theme = lamp.sceneTheme;
  // Big timer digits scale with the window but never pass 280px.
  const timeSize = Math.min(width * 0.23, height * 0.36, 280);

  // Open a panel, or close it if its button is pressed again.
  const togglePanel = (id: PanelId) => {
    poke();
    setPanel((current) => (current === id ? null : id));
  };

  // Home (the logo): close whatever panel is open and show the controls again.
  const goHome = () => {
    poke();
    setPanel(null);
  };

  // Remember where the embed slot is in the window. Skips zero-size results
  // (not laid out yet) and identical results (avoids a pointless re-render).
  const applyEmbedFrame = useCallback((x: number, y: number, slotWidth: number, slotHeight: number) => {
    const frame = { x: Math.round(x), y: Math.round(y), width: Math.round(slotWidth), height: Math.round(slotHeight) };
    if (frame.width < 2 || frame.height < 2) return false;
    setEmbedFrame((prev) => (
      prev && prev.x === frame.x && prev.y === frame.y && prev.width === frame.width && prev.height === frame.height
        ? prev
        : frame
    ));
    return true;
  }, []);

  // The asynchronous measure, used when the slot's own layout changes later.
  const placeEmbed = useCallback(() => {
    embedSlotRef.current?.measureInWindow((x, y, slotWidth, slotHeight) => {
      applyEmbedFrame(x, y, slotWidth, slotHeight);
    });
  }, [applyEmbedFrame]);

  // When the music card opens or the window resizes, measure the slot in the
  // same pass the card is laid out, so the player is on the slot in the first
  // frame instead of hidden for one. If the synchronous read is not there or
  // has no size yet, fall back to measuring a frame later.
  useLayoutEffect(() => {
    if (panel !== 'music') return undefined;
    const slot = embedSlotRef.current as { getBoundingClientRect?: () => { x: number; y: number; width: number; height: number } } | null;
    const rect = slot?.getBoundingClientRect?.();
    if (rect && applyEmbedFrame(rect.x, rect.y, rect.width, rect.height)) return undefined;
    const id = requestAnimationFrame(() => placeEmbed());
    return () => cancelAnimationFrame(id);
  }, [applyEmbedFrame, height, panel, placeEmbed, width]);

  const face = sessionFace(
    { mode: lamp.mode, status: lamp.status, cycle: lamp.cycle, activeTask: lamp.activeTask?.text ?? null },
    'plain',
  );
  // Dot on the Quests button while any daily quest is unclaimed.
  const questOpen = hasOpenQuests(lamp.day);
  // Music card height: up to 720px, or whatever fits above the dock.
  const musicRoom = height - insets.top - insets.bottom - 104;
  const musicHeight = Math.min(720, Math.max(0, musicRoom));
  // Bottom edge of the wide cards and the narrow side cards: above the dock, or
  // just above the keyboard while it is open.
  const wideBottom = keyboard > 0 ? keyboard + 12 : insets.bottom + 84;
  const sideBottom = keyboard > 0 ? keyboard + 12 : insets.bottom + 72;
  // With the keyboard up, a side card must also not run off the top.
  const sideMaxHeight = keyboard > 0 ? Math.max(0, height - sideBottom - insets.top - 20) : undefined;

  return (
    <View style={[styles.root, { backgroundColor: theme.b1 }]} onTouchStart={poke}>
      {/* Back to front: animated scene, rain, then the UI layers below. */}
      <SceneBackground />
      <RainOverlay amount={lamp.mix.rain} />

      {/* Top bar: logo on the left; streak, minutes and level pills on the
          right (each opens the Progress card). */}
      <View style={[styles.top, { paddingTop: insets.top + 14, opacity: zen ? 0 : 1 }]} pointerEvents={zen ? 'none' : 'auto'}>
        {/* The logo is the home button: it closes any open panel and wakes
            the controls, leaving just the scene and the timer. */}
        <Pressable accessibilityRole="button" accessibilityLabel="Wickglow, home" onPress={goHome} style={styles.brand}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <LogoMark size={26} />
          </View>
          <Text style={styles.brandText}>Wickglow</Text>
        </Pressable>
        <View style={styles.pills}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Streak ${lamp.streak} days. Open progress`} style={styles.pill} onPress={() => togglePanel('progress')}>
            <FlameIcon size={15} color={colors.error} />
            <Text style={styles.pillText}>{lamp.streak}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${lamp.day.minutes} minutes today. Open progress`} style={styles.pill} onPress={() => togglePanel('progress')}>
            <ClockIcon size={15} color={colors.textPrimary} />
            <Text style={styles.pillText}>{lamp.day.minutes}m</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Level ${lamp.level}. Open progress`} style={styles.pill} onPress={() => togglePanel('progress')}>
            <Text style={styles.pillText}>Lv {lamp.level}</Text>
            <View style={styles.miniXp}>
              <View style={[styles.miniXpFill, { width: `${(lamp.xpInLevel / lamp.xpNeeded) * 100}%`, backgroundColor: theme.accent }]} />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Center: mode tabs, big time, focus chip, session pips, start/reset/skip. */}
      <View style={[styles.center, { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 90 }]}>
        <View style={[styles.tabs, { opacity: zen ? 0 : 1 }]} pointerEvents={zen ? 'none' : 'auto'}>
          {(['focus', 'short', 'long'] as TimerMode[]).map((item) => {
            const selected = lamp.mode === item;
            return (
              <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${MODE_LABEL[item]} timer`} key={item} onPress={() => setMode(item)} style={[styles.tab, selected && styles.tabOn]}>
                <Text style={[styles.tabText, selected && styles.tabTextOn]}>{MODE_LABEL[item]}</Text>
              </Pressable>
            );
          })}
        </View>
        <TimeText style={[styles.time, { fontSize: timeSize }]} />
        <FocusLine
          mode={face.chip.kind}
          text={face.chip.text}
          accent={theme.accent}
          zen={zen}
          onPress={lamp.mode === 'focus' ? () => togglePanel('tasks') : undefined}
        />
        <View style={styles.pips}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={[styles.pip, index < face.pipsLit && styles.pipOn]} />
          ))}
        </View>
        {/* Zen hides Reset and Skip; the main button stays, as on phone and tablet. */}
        <View style={styles.controls}>
          <Pressable accessibilityRole="button" accessibilityLabel="Reset timer" style={[styles.round, { opacity: zen ? 0 : 1 }]} pointerEvents={zen ? 'none' : 'auto'} onPress={reset}><ResetIcon /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={face.startLabel} style={styles.start} onPress={toggle}><Text style={styles.startText}>{face.startLabel}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Skip timer" style={[styles.round, { opacity: zen ? 0 : 1 }]} pointerEvents={zen ? 'none' : 'auto'} onPress={skip}><SkipIcon /></Pressable>
        </View>
      </View>

      {/* Dock: left group opens panels, right group is timer settings and full
          screen. Full screen only appears where the browser supports it. */}
      <View style={[styles.dock, { paddingBottom: insets.bottom + 14, opacity: zen ? 0 : 1 }]} pointerEvents={zen ? 'none' : 'auto'}>
        <View style={styles.dockGroup}>
          <DockButton label="Music" active={panel === 'music'} dot={lamp.musicPlaying || lamp.activeStreamId != null} onPress={() => togglePanel('music')}><MusicIcon /></DockButton>
          <DockButton label="Ambient mixer" active={panel === 'mixer'} onPress={() => togglePanel('mixer')}><MixerIcon /></DockButton>
          <DockButton label="Scenes" active={panel === 'scenes'} onPress={() => togglePanel('scenes')}><SceneIcon /></DockButton>
          <DockButton label="Tasks" active={panel === 'tasks'} onPress={() => togglePanel('tasks')}><TaskIcon /></DockButton>
          <DockButton label="Quests" active={panel === 'quests'} dot={questOpen} onPress={() => togglePanel('quests')}><StarIcon /></DockButton>
        </View>
        <View style={styles.dockGroup}>
          <DockButton label="Timer settings" active={panel === 'settings'} onPress={() => togglePanel('settings')}><GearIcon /></DockButton>
          {fullscreen.supported ? (
            <DockButton label="Full screen" active={fullscreen.active} onPress={fullscreen.toggle}><FullscreenIcon /></DockButton>
          ) : null}
        </View>
      </View>

      {/* The stream player. With the Music card open it is moved onto the slot
          (`plain`, absolutely positioned at `embedFrame`); before the slot is
          measured it is hidden and inert; otherwise it floats above the dock. */}
      <StreamStage
        plain={panel === 'music' && embedFrame != null}
        inert={panel === 'music' && embedFrame == null}
        style={
          panel === 'music' && embedFrame
            ? [styles.embedFloat, { top: embedFrame.y, left: embedFrame.x, width: embedFrame.width, height: embedFrame.height }]
            : [styles.stream, panel === 'music' ? { bottom: insets.bottom + 72, opacity: 0 } : { bottom: insets.bottom + 72 }]
        }
      />

      {/* Click anywhere outside an open panel to close it. */}
      {panel ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Close panel" onPress={() => setPanel(null)} style={styles.backdrop} />
      ) : null}

      {/* Wide, centered cards: Music, Progress, Quests and Tasks. Their
          wrapper is 'box-none' so clicks outside the card reach the backdrop. */}
      {panel === 'music' ? (
        <View
          pointerEvents="box-none"
          style={[styles.wideWrap, styles.progressWrap, { top: insets.top + 20, bottom: insets.bottom + 84 }]}
        >
          <View style={[styles.progressScroll, styles.musicScroll, { height: musicHeight }]}>
            <View style={[styles.progressCard, styles.musicCard]}>
              <PanelHeading title={PANEL_TITLE.music} onClose={() => setPanel(null)} />
              <MusicBlock embedSlotRef={embedSlotRef} onEmbedLayout={placeEmbed} />
            </View>
          </View>
        </View>
      ) : null}

      {panel === 'progress' || panel === 'quests' || panel === 'tasks' ? (
        <View
          pointerEvents="box-none"
          style={[styles.wideWrap, styles.progressWrap, { top: insets.top + 20, bottom: wideBottom }]}
        >
          <ScrollView keyboardShouldPersistTaps="handled" style={[styles.progressScroll, panel === 'quests' && styles.questsScroll, panel === 'tasks' && styles.tasksScroll]}>
            <View style={styles.progressCard}>
              <PanelHeading title={PANEL_TITLE[panel]} onClose={() => setPanel(null)} />
              {panel === 'progress' ? <ProgressBoard /> : panel === 'quests' ? <QuestsBoard /> : <TaskList />}
            </View>
          </ScrollView>
        </View>
      ) : null}

      {/* Narrow side cards: mixer, scenes, timer settings. They anchor left or
          right to sit under the dock button that opened them (PANEL_SIDE). */}
      {panel && panel !== 'music' && panel !== 'progress' && panel !== 'quests' && panel !== 'tasks' ? (
        <View style={[styles.panel, styles[PANEL_SIDE[panel] === 'right' ? 'panelRight' : 'panelLeft'], { bottom: sideBottom }, sideMaxHeight != null ? { maxHeight: sideMaxHeight } : null]}>
          <PanelHeading title={PANEL_TITLE[panel]} onClose={() => setPanel(null)} />
          <ScrollView style={styles.panelBody} contentContainerStyle={styles.panelContent}>
            {panel === 'mixer' ? <MixerBlock /> : null}
            {panel === 'scenes' ? <ScenePicker /> : null}
            {panel === 'settings' ? <TimerSettings /> : null}
          </ScrollView>
        </View>
      ) : null}

      {lamp.ending ? (
        <SessionEndCard
          title={lamp.ending.title}
          line={lamp.ending.line}
          actionLabel={lamp.ending.actionLabel}
          accent={theme.accent}
          showLater={lamp.ending.showLater}
          onStart={startNext}
          onDismiss={dismissEnding}
        />
      ) : null}

      {lamp.toast ? (
        <View style={[styles.toast, { top: insets.top + 64 }]}>
          <Text style={styles.toastText}>{lamp.toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

// Progress card contents: two columns. Left: level, stats, last-7-days chart.
// Right: the month calendar.
function ProgressBoard() {
  return (
    <View style={styles.board}>
      <View style={[styles.boardCol, styles.boardWide]}>
        <LevelCard wide />
        <StatGrid wide />
        <WeekChart wide />
      </View>
      <View style={styles.boardCol}>
        <MonthCalendar wide />
      </View>
    </View>
  );
}

// Quests card contents: just the daily quest list.
function QuestsBoard() {
  return <QuestList wide />;
}

// A round dock icon. Like the phone's DockItem, it recolors its icon child with
// cloneElement (dark when active, light otherwise) and can show an accent dot.
function DockButton({ children, active, dot, onPress, label }: { children: React.ReactNode; active: boolean; dot?: boolean; onPress: () => void; label: string }) {
  const { sceneTheme } = useWickglow();
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={[styles.ib, active && styles.ibOn]}>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ color?: string }>, { color: active ? colors.textInverse : colors.textPrimary })
        : children}
      {dot ? <View style={[styles.dot, { backgroundColor: sceneTheme.accent }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    color: colors.textPrimary,
    fontFamily: fonts.timeLight,
    fontSize: 19,
    letterSpacing: 1.5,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  pill: {
    minHeight: 36,
    paddingHorizontal: 14,
    ...rounded(radius.pill),
    ...darkGlass,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillText: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  miniXp: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  miniXpFill: {
    height: '100%',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    ...rounded(radius.pill),
    ...darkGlass,
  },
  tab: {
    minHeight: 36,
    paddingHorizontal: 16,
    ...rounded(radius.pill),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOn: {
    backgroundColor: colors.textPrimary,
  },
  tabText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  tabTextOn: {
    color: colors.textInverse,
  },
  time: {
    color: colors.textPrimary,
    fontFamily: fonts.timeRegular,
    marginVertical: 18,
    fontVariant: ['tabular-nums'],
  },
  pips: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 8,
    marginBottom: 18,
  },
  pip: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  pipOn: {
    backgroundColor: colors.textPrimary,
    transform: [{ scale: 1.25 }],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    ...darkGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  start: {
    minWidth: 148,
    minHeight: 54,
    ...rounded(radius.pill),
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  startText: {
    color: colors.textInverse,
    fontFamily: fonts.bodySemibold,
    fontSize: 17,
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  dockGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  ib: {
    width: 44,
    height: 44,
    borderRadius: 22,
    ...darkGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ibOn: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
    borderTopColor: colors.textPrimary,
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  stream: {
    position: 'absolute',
    right: 16,
    width: 390,
    maxWidth: '92%',
    zIndex: 7,
  },
  embedFloat: {
    position: 'absolute',
    zIndex: 9,
  },
  wideWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 8,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  musicScroll: {
    maxWidth: 1120,
    overflow: 'hidden',
  },
  musicCard: {
    flex: 1,
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    paddingTop: 24,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  progressWrap: {
    justifyContent: 'center',
  },
  // Caps at the space above the dock and scrolls only when the content is taller.
  // A ScrollView for Progress, Quests and Tasks; the Music card reuses the box
  // as a plain View with `musicScroll`, which clips instead of scrolling.
  progressScroll: {
    width: '100%',
    maxWidth: 900,
    maxHeight: '100%',
    minHeight: 0,
    flexGrow: 0,
    flexShrink: 1,
  },
  // Daily quests are one column, so the card stays narrower than Progress.
  questsScroll: {
    maxWidth: 450,
  },
  // One column, the width of the task list.
  tasksScroll: {
    maxWidth: 470,
  },
  progressCard: {
    width: '100%',
    ...glassPanel,
    ...rounded(radius.sheet),
    paddingTop: 18,
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  board: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  boardCol: {
    flex: 1,
    minWidth: 0,
    gap: 11,
  },
  // The column holding the chart takes the extra width. The calendar needs less.
  boardWide: {
    flex: 1.35,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 5,
  },
  panel: {
    position: 'absolute',
    width: 390,
    maxWidth: '92%',
    maxHeight: '70%',
    zIndex: 8,
    ...glassPanel,
    ...rounded(radius.sheet),
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  panelLeft: {
    left: 16,
  },
  panelRight: {
    right: 16,
  },
  panelBody: {
    flexGrow: 0,
  },
  panelContent: {
    paddingBottom: 12,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.textPrimary,
    ...rounded(radius.pill),
    paddingHorizontal: 18,
    paddingVertical: 10,
    zIndex: 20,
  },
  toastText: {
    color: colors.textInverse,
    fontFamily: fonts.bodySemibold,
  },
});
