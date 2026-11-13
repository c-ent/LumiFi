import React, { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { sessionFace } from '@/src/core/session-face';
import { colors, fade as tint, fonts, radius, rounded } from '@/src/theme/tokens';
import { useKeyboardInset } from '@/components/wickglow/hooks/use-keyboard-inset';
import { useZen } from '@/components/wickglow/hooks/use-zen';
import { useWickglow } from '@/components/wickglow/logic';
import { hasOpenQuests, MODE_LABEL, TimerMode } from '@/components/wickglow/theme';
import { RoomBackground } from '@/components/wickglow/features/background/room-background';
import { RainOverlay } from '@/components/wickglow/features/background/rain';
import { SessionCandle } from '@/components/wickglow/features/clock/candle';
import { LevelCard } from '@/components/wickglow/features/progression/level-card';
import { AccountRow } from '@/components/wickglow/features/account/account-row';
import { QuestList } from '@/components/wickglow/features/progression/quest-list';
import { StatGrid } from '@/components/wickglow/features/progression/stat-grid';
import { MonthCalendar } from '@/components/wickglow/features/progression/month-calendar';
import { WeekChart } from '@/components/wickglow/features/progression/week-chart';
import { MoodPicker } from '@/components/wickglow/features/settings/mood-picker';
import { TimerSettings } from '@/components/wickglow/features/settings/timer-settings';
import { TaskList } from '@/components/wickglow/features/tasks/task-list';
import { FocusLine } from '@/components/wickglow/features/tasks/focus-line';
import { MixerBlock } from '@/components/wickglow/features/audio/mixer-block';
import { SoundsScroller } from '@/components/wickglow/features/audio/music-block';
import { useEndStream } from '@/components/wickglow/features/audio/stream-stage';
import { SessionEndCard } from '@/components/wickglow/features/timer/session-end-card';
import { TimeText } from '@/components/wickglow/features/timer/time-text';
import { SegmentTabs } from '@/components/wickglow/shared/segment-tabs';
import { BarsIcon, ClockIcon, CloseIcon, FlameIcon, MusicIcon, PauseIcon, PlayIcon, ResetIcon, SceneIcon, SkipIcon, TaskIcon, TimerIcon } from '@/components/wickglow/shared/icons';

/**
 * The phone layout (window under 600px wide). The home screen is the timer:
 * level and streak on top, the mode tabs, the candle, the time and its
 * controls. A tab bar is fixed at the bottom; picking a tab slides a sheet up
 * from behind it holding only that tab's content, with a one-line timer at
 * its top. Tapping the open tab, the close button or the dimmed area closes it.
 *
 * Layers, back to front: rain, gradient background, top bar, the candle stage,
 * the dim behind an open sheet, the floating stream player, the sheet, the tab
 * bar, then the session-end card and toast on top. `lamp` is the app context
 * (logic.tsx).
 *
 * The tablet (tablet.tsx) and desktop (desktop.tsx) screens follow the same
 * recipe with a different arrangement; phone/tablet use "moods", desktop
 * uses "scenes".
 */

// The sheet shows one tab at a time.
type SheetTab = 'tasks' | 'sounds' | 'stats' | 'mood' | 'timer';

// The tab bar's height above the home-indicator inset.
const TAB_BAR_HEIGHT = 64;

// The phone glass. Web gets a real blur, so its bars and sheet can be clear;
// native has none, so they use a stronger tint to stay readable.
const web = Platform.OS === 'web';
const blur = (px: number) => (web ? { backdropFilter: `blur(${px}px) saturate(140%)` } : null);
// Floating surfaces: the tab bar and the sheet.
const glassSurface = {
  backgroundColor: web ? colors.glassTint : colors.glassTintSolid,
  borderWidth: 1,
  borderColor: colors.glassEdge,
  // A brighter top edge, like light catching the glass.
  borderTopColor: colors.glassEdgeOn,
  ...blur(24),
};
// Buttons, pills and the mode tabs: a faint frost, never white.
const glassControl = {
  backgroundColor: colors.glassFill,
  borderWidth: 1,
  borderColor: colors.glassEdge,
  ...blur(16),
};

export function MobileWickglow() {
  const lamp = useWickglow();
  // Actions never change identity, so they are pulled out once (see logic.tsx).
  const { setMode, toggle, startNext, dismissEnding, reset, skip } = lamp;
  // Streaming is desktop-only; end one left playing from a wider window.
  useEndStream();
  // Safe-area insets = the notch / status bar / home-indicator sizes in px.
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // How far the on-screen keyboard covers the bottom, so the sheet can rise above it.
  const keyboard = useKeyboardInset();
  const [open, setOpen] = useState(false); // sheet up?
  const [tab, setTab] = useState<SheetTab>('tasks');
  // The sheet's content stays mounted while it slides down, so it does not
  // empty itself on the way out. Set when a tab opens, cleared after the slide.
  const [mounted, setMounted] = useState(false);
  const shown = open || mounted;
  // "Zen": while focusing with the sheet closed, the UI fades away after 4s
  // of no touches. Any touch counts as activity (`poke`).
  const { zen, poke } = useZen(lamp.running && lamp.mode === 'focus' && lamp.zenOpt && !open, 4000);
  // Reanimated shared value driving the sheet's slide (runs on the UI thread).
  const sheetOffset = useSharedValue(1);
  const mood = lamp.moodTheme;
  // The tab bar floats a little above the bottom edge (or the home indicator).
  const barGap = insets.bottom + 12;
  const tabBar = TAB_BAR_HEIGHT + barGap;
  // The sheet reaches the bottom edge, under the floating tab bar, or sits on
  // the keyboard while typing (the tab bar hides then).
  const sheetBottom = keyboard;
  const typing = keyboard > 0;
  // Room at the end of the sheet's content so the last row clears the tab bar.
  const bodyContent = [styles.bodyContent, { paddingBottom: typing ? 24 : tabBar + 16 }];
  const roof = insets.top + 12;
  const sheetHeight = Math.max(200, Math.min(height * 0.8, 760, height - sheetBottom - roof));

  // Slide the sheet up, or down behind the tab bar.
  useEffect(() => {
    sheetOffset.set(withTiming(open ? 0 : 1, { duration: 320 }));
    if (open) return undefined;
    const timer = setTimeout(() => setMounted(false), 340);
    return () => clearTimeout(timer);
  }, [open, sheetOffset]);

  const sheetStyle = useAnimatedStyle(() => ({
    // Fully down = moved its own height plus a little, so no edge peeks out.
    transform: [{ translateY: sheetOffset.get() * (sheetHeight + 24) }],
  }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: 1 - sheetOffset.get() }));
  // idle = nothing started; "paused" is not idle (it has time already spent).
  const idle = lamp.status === 'idle';
  // The start label, "Focus · 2 of 4", the lit pips and the focus chip.
  const face = sessionFace(
    { mode: lamp.mode, status: lamp.status, cycle: lamp.cycle, activeTask: lamp.activeTask?.text ?? null },
    'candle',
  );
  // Dot on the Stats tab (which holds the quests) while any daily quest is open.
  const questOpen = hasOpenQuests(lamp.day);
  const fade = { opacity: zen ? 0 : 1 };
  const touch = zen ? 'none' : 'auto';

  // Tapping the open tab closes the sheet; any other tab switches to it and opens.
  const openTab = (next: SheetTab) => {
    poke();
    if (open && tab === next) setOpen(false);
    else {
      setTab(next);
      setOpen(true);
      setMounted(true);
    }
  };
  const close = () => {
    poke();
    setOpen(false);
  };

  return (
    // onTouchStart fires for every touch anywhere, which is how zen mode notices activity.
    <View style={[styles.root, { backgroundColor: mood.bgBase }]} onTouchStart={poke}>
      <RainOverlay amount={lamp.mix.rain} />
      <RoomBackground video={false} />

      {/* Top bar: level ring and the streak / minutes-today pills, all opening
          Stats. Hidden elements also get pointerEvents="none" so invisible
          buttons can't be tapped by accident. */}
      <View style={[styles.top, { paddingTop: insets.top + 12 }, fade]} pointerEvents={touch}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open stats" style={styles.levelBtn} onPress={() => openTab('stats')}>
          <LevelRing progress={lamp.xpInLevel / lamp.xpNeeded} color={mood.accent} level={lamp.level} />
          <View>
            <Text style={styles.levelName}>{lamp.levelName}</Text>
            <Text style={styles.levelXp}>{lamp.xpInLevel} / {lamp.xpNeeded} XP</Text>
          </View>
        </Pressable>
        <View style={styles.pills}>
          {/* Both pills open Stats, as they open the progress card on desktop. */}
          <Pressable accessibilityRole="button" accessibilityLabel={`Streak ${lamp.streak} days. Open stats`} hitSlop={6} style={styles.pill} onPress={() => openTab('stats')}>
            <FlameIcon size={14} color={colors.error} /><Text style={styles.pillText}>{lamp.streak}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${lamp.day.minutes} minutes today. Open stats`} hitSlop={6} style={styles.pill} onPress={() => openTab('stats')}>
            <ClockIcon size={14} color={colors.textPrimary} /><Text style={styles.pillText}>{lamp.day.minutes}m</Text>
          </Pressable>
        </View>
      </View>

      {/* Mode tabs, under the top bar. */}
      <View style={[styles.modes, fade]} pointerEvents={touch}>
        {(['focus', 'short', 'long'] as TimerMode[]).map((item) => {
          const selected = lamp.mode === item;
          return (
            <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${MODE_LABEL[item]} timer`} key={item} onPress={() => setMode(item)} style={[styles.mode, selected && styles.modeOn]}>
              <Text style={[styles.modeText, selected && styles.modeTextOn]}>{MODE_LABEL[item]}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Stage: the candle (also a start/pause button), the time, the controls
          and the cycle. Bottom padding keeps it clear of the tab bar. */}
      <View style={[styles.stage, { paddingBottom: tabBar + 20 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={face.startLabel} style={styles.candleBtn} onPress={toggle}>
          <SessionCandle
            lit={lamp.running}
            paused={!lamp.running && !idle}
            idle={idle}
            smoke={lamp.smoke}
            dimming={lamp.dimming}
            mode={lamp.mode}
            mood={mood}
            swap={lamp.swap}
          />
        </Pressable>
        <TimeText style={styles.time} />
        <Text style={styles.phase}>{face.cycleLine}</Text>
        {/* Four mini candles = progress through the 4-session cycle. */}
        <View style={styles.pips}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={styles.miniCandle}>
              <View style={[styles.wickFlame, index < face.pipsLit && { opacity: 1, backgroundColor: mood.flame2 }]} />
              <View style={[styles.waxBit, index < face.pipsLit && { backgroundColor: mood.wax }]} />
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Reset timer" style={[styles.round, fade]} pointerEvents={touch} onPress={reset}><ResetIcon color={colors.textPrimary} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={face.startLabel} style={[styles.start, { backgroundColor: tint(mood.accent, 0.24), borderColor: tint(mood.accent, 0.6) }]} onPress={toggle}>
            <Text style={styles.startText}>{face.startLabel}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Skip timer" style={[styles.round, fade]} pointerEvents={touch} onPress={skip}><SkipIcon color={colors.textPrimary} /></Pressable>
        </View>
        <FocusLine
          mode={face.chip.kind}
          text={face.chip.text}
          accent={mood.accent}
          zen={zen}
          onPress={lamp.mode === 'focus' ? () => openTab('tasks') : undefined}
        />
      </View>

      {/* While the sheet is up, the screen behind dims and a tap on it closes the sheet. */}
      {shown ? (
        <Reanimated.View style={[styles.dim, dimStyle]} pointerEvents={open ? 'auto' : 'none'}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close panel" onPress={close} style={StyleSheet.absoluteFill} />
        </Reanimated.View>
      ) : null}

      {/* The sheet: a one-line timer, then the open tab's content. It slides up
          from behind the tab bar, and rides above the keyboard while typing. */}
      {/* Closed, the sheet is hidden from screen readers, and its controls are
          not rendered at all once it has slid away, so none can take focus. */}
      <Reanimated.View
        style={[styles.sheet, { height: sheetHeight, bottom: sheetBottom }, sheetStyle]}
        pointerEvents={open ? 'auto' : 'none'}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
        aria-hidden={!open}
      >
        {shown ? (
        <>
        <Pressable accessibilityRole="button" accessibilityLabel="Close panel" style={styles.grab} onPress={close}>
          <View style={styles.grabBar} />
        </Pressable>
        <View style={styles.mini}>
          <View style={[styles.miniFlame, { backgroundColor: lamp.running ? mood.flame2 : colors.textMuted }]} />
          <TimeText style={styles.miniTime} />
          <Text style={styles.miniLabel} numberOfLines={1}>{MODE_LABEL[lamp.mode]}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={face.startLabel} style={[styles.miniBtn, { backgroundColor: tint(mood.accent, 0.24), borderColor: tint(mood.accent, 0.6) }]} onPress={toggle}>
            {lamp.running ? <PauseIcon color={colors.textPrimary} size={16} /> : <PlayIcon color={colors.textPrimary} size={16} />}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Close panel" style={styles.miniClose} onPress={close}>
            <CloseIcon color={colors.textMuted} size={18} />
          </Pressable>
        </View>
        </>
        ) : null}
        {/* The Sounds tab is a virtualised list (the track rows), so it is the
            scroller itself rather than a block inside the ScrollView below. */}
        {shown && tab === 'sounds' ? (
          <View style={styles.body}>
            {/* Tracks, Streaming and Ambient each show alone. Ambient holds the
                mood (the look) and the ambient loops, the two that set the room. */}
            <SoundsScroller mobile ambient={<MixerBlock mobile />} contentContainerStyle={bodyContent} />
          </View>
        ) : shown ? (
          <ScrollView
            style={styles.body}
            contentContainerStyle={bodyContent}
            // "handled": a tap on a button while the keyboard is open works on the
            // first tap, instead of only dismissing the keyboard.
            keyboardShouldPersistTaps="handled"
          >
            {tab === 'tasks' ? <TaskList mobile /> : null}
            {tab === 'stats' ? <StatsTab /> : null}
            {tab === 'mood' ? <MoodPicker /> : null}
            {tab === 'timer' ? <TimerSettings mobile /> : null}
          </ScrollView>
        ) : null}
      </Reanimated.View>

      {/* Tab bar, fixed at the bottom. It fades with zen like the rest. */}
      <View style={[styles.tabBar, { bottom: barGap }, fade, typing && styles.hidden]} pointerEvents={typing ? 'none' : touch}>
        <DockItem label="Tasks" active={open && tab === 'tasks'} color={mood.accent} onPress={() => openTab('tasks')}><TaskIcon size={20} /></DockItem>
        <DockItem label="Sounds" active={open && tab === 'sounds'} color={mood.accent} dot={lamp.musicPlaying || lamp.activeStreamId != null} onPress={() => openTab('sounds')}><MusicIcon size={20} /></DockItem>
        <DockItem label="Stats" active={open && tab === 'stats'} color={mood.accent} dot={questOpen} onPress={() => openTab('stats')}><BarsIcon size={20} /></DockItem>
        <DockItem label="Mood" active={open && tab === 'mood'} color={mood.accent} onPress={() => openTab('mood')}><SceneIcon size={20} /></DockItem>
        <DockItem label="Timer" active={open && tab === 'timer'} color={mood.accent} onPress={() => openTab('timer')}><TimerIcon size={20} /></DockItem>
      </View>

      {/* Gentle end-of-session card, and a short toast for XP / quest messages. */}
      {lamp.ending ? (
        <SessionEndCard
          title={lamp.ending.title}
          line={lamp.ending.line}
          actionLabel={lamp.ending.actionLabel}
          accent={mood.accent}
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

// The Stats tab shows one view at a time, like Sounds: Stats (level, today's
// numbers, the last 7 days, the daily quests) or Calendar (the month view and
// streak). The quests live here; the phone has no Quests tab of its own.
type StatsView = 'stats' | 'calendar';
const STATS_VIEWS: readonly StatsView[] = ['stats', 'calendar'];
const STATS_LABEL: Record<StatsView, string> = { stats: 'Stats', calendar: 'Calendar' };

function StatsTab() {
  const [view, setView] = useState<StatsView>('stats');
  return (
    <View>
      <SegmentTabs value={view} options={STATS_VIEWS} labels={STATS_LABEL} onChange={setView} mobile first />
      {view === 'stats' ? (
        <>
          <AccountRow mobile />
          <LevelCard mobile />
          <StatGrid />
          <WeekChart mobile />
          <QuestList mobile title="Quests" />
        </>
      ) : (
        <MonthCalendar mobile />
      )}
    </View>
  );
}

// Small circular XP progress ring with the level number in the middle. Same SVG
// dash-offset trick as LevelCard; rotated -90deg (ringSpin) to start at the top.
function LevelRing({ progress, color, level }: { progress: number; color: string; level: number }) {
  const ringRadius = 19;
  const circ = 2 * Math.PI * ringRadius;
  return (
    <View style={styles.ringWrap}>
      <Svg width={46} height={46} viewBox="0 0 44 44" style={styles.ringSpin}>
        <Circle cx="22" cy="22" r={ringRadius} fill="none" stroke={colors.border} strokeWidth={3} />
        <Circle
          cx="22"
          cy="22"
          r={ringRadius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${circ}`}
          strokeDashoffset={circ * (1 - progress)}
        />
      </Svg>
      <Text style={styles.ringLevel}>{level}</Text>
    </View>
  );
}

// One tab button in the sheet's dock. It recolors the icon passed as `children`
// (cloneElement injects a `color` prop) so active/inactive state needs no extra
// icon variants. `dot` draws a small "something here" marker.
function DockItem({ children, label, active, color, dot, onPress }: { children: React.ReactNode; label: string; active: boolean; color: string; dot?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.dockBtn, active && styles.dockBtnOn]}
    >
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ color?: string }>, { color: active ? color : colors.textMuted })
        : children}
      <Text style={[styles.dockLabel, active && styles.dockLabelOn]}>{label}</Text>
      {dot ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 5,
  },
  // Dims the candle and time behind the open sheet so the two never blend.
  dim: {
    ...StyleSheet.absoluteFill,
    zIndex: 4,
    backgroundColor: 'rgba(5, 3, 10, 0.6)',
  },
  levelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  levelName: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
  levelXp: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  pills: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    minHeight: 36,
    paddingHorizontal: 13,
    ...rounded(radius.pill),
    ...glassControl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillText: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
  },
  ringSpin: {
    transform: [{ rotate: '-90deg' }],
  },
  ringWrap: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLevel: {
    position: 'absolute',
    color: colors.textPrimary,
    fontFamily: fonts.timeMedium,
    fontSize: 18,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 2,
  },
  candleBtn: {
    flex: 1,
    width: '100%',
  },
  time: {
    color: colors.textPrimary,
    fontFamily: fonts.timeRegular,
    fontSize: 64,
    fontVariant: ['tabular-nums'],
  },
  phase: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  pips: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    height: 22,
    alignItems: 'flex-end',
  },
  miniCandle: {
    width: 9,
    height: 22,
    alignItems: 'center',
  },
  wickFlame: {
    width: 6,
    height: 9,
    borderRadius: 4,
    opacity: 0,
    marginBottom: 1,
  },
  waxBit: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 14,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 6,
    // Glass. The dim behind it keeps the candle and time from showing through.
    ...glassSurface,
    borderBottomWidth: 0,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  grab: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grabBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  modes: {
    marginTop: 14,
    marginHorizontal: 16,
    zIndex: 3,
    // A glass pill; the chosen mode is a brighter frost, not solid white.
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    ...rounded(radius.pill),
    ...glassControl,
  },
  mode: {
    flex: 1,
    minHeight: 38,
    ...rounded(radius.pill),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeOn: {
    backgroundColor: colors.glassFillOn,
    borderWidth: 1,
    borderColor: colors.glassEdgeOn,
  },
  modeText: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
  },
  modeTextOn: {
    color: colors.textPrimary,
  },
  // Reset, start and skip, under the time.
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    marginBottom: 12,
    width: '100%',
    maxWidth: 360,
  },
  // Round glass buttons.
  round: {
    width: 52,
    height: 52,
    borderRadius: 26,
    ...glassControl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The start button: glass tinted with the mood accent (set inline).
  start: {
    flex: 1,
    minHeight: 54,
    ...rounded(radius.pill),
    borderWidth: 1,
    ...blur(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 17,
  },
  // A floating glass pill, fixed above the bottom edge and over the sheet.
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: TAB_BAR_HEIGHT,
    zIndex: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    ...glassSurface,
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
    ...rounded(radius.pill),
  },
  hidden: {
    opacity: 0,
  },
  // The one-line timer at the top of the open sheet.
  mini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  miniFlame: {
    width: 8,
    height: 12,
    borderRadius: 4,
  },
  miniTime: {
    color: colors.textPrimary,
    fontFamily: fonts.timeMedium,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  miniLabel: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  miniBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    ...glassControl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockBtn: {
    flex: 1,
    height: TAB_BAR_HEIGHT - 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...rounded(radius.pill),
  },
  // The open tab: a brighter frost and the mood accent, not solid white.
  dockBtnOn: {
    backgroundColor: colors.glassFillOn,
  },
  dockLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    marginTop: 2,
  },
  dockLabelOn: {
    color: colors.textPrimary,
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: '28%',
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  body: {
    flex: 1,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  bodyContent: {
    padding: 16,
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
    fontSize: 14,
  },
});
