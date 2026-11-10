import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { colors, fonts, radius, rounded } from '@/src/theme/tokens';
import { useKeyboardInset } from '@/components/wickglow/hooks/use-keyboard-inset';
import { useWickglow } from '@/components/wickglow/logic';
import { formatTime, hasOpenQuests, MODE_LABEL, TimerMode } from '@/components/wickglow/theme';
import { FillGradient } from '@/components/wickglow/features/background/fill-gradient';
import { RainOverlay } from '@/components/wickglow/features/background/rain';
import { Candle } from '@/components/wickglow/features/clock/candle';
import { LevelCard } from '@/components/wickglow/features/progression/level-card';
import { QuestList } from '@/components/wickglow/features/progression/quest-list';
import { StatGrid } from '@/components/wickglow/features/progression/stat-grid';
import { MonthCalendar } from '@/components/wickglow/features/progression/month-calendar';
import { WeekChart } from '@/components/wickglow/features/progression/week-chart';
import { MoodPicker } from '@/components/wickglow/features/settings/mood-picker';
import { TimerSettings } from '@/components/wickglow/features/settings/timer-settings';
import { TaskList } from '@/components/wickglow/features/tasks/task-list';
import { FocusLine } from '@/components/wickglow/features/tasks/focus-line';
import { MixerBlock } from '@/components/wickglow/features/audio/mixer-block';
import { MusicBlock } from '@/components/wickglow/features/audio/music-block';
import { openStreamEmbed, StreamStage, streamCardHeight } from '@/components/wickglow/features/audio/stream-stage';
import { SessionEndCard } from '@/components/wickglow/features/timer/session-end-card';
import { BarsIcon, ClockIcon, FlameIcon, MusicIcon, ResetIcon, SkipIcon, StarIcon, TaskIcon, TimerIcon } from '@/components/wickglow/shared/icons';

/**
 * The phone layout (window under 600px wide): a big candle, the time, and a
 * bottom sheet that slides up with the controls.
 *
 * Layers, back to front: rain, gradient background, top bar (level + streak),
 * the candle stage, the floating stream player, the bottom sheet, then the
 * session-end card and toast on top. `lamp` is the app context (logic.tsx).
 *
 * The tablet (tablet.tsx) and desktop (desktop.tsx) screens follow the same
 * recipe with a different arrangement; phone/tablet use "moods", desktop
 * uses "scenes".
 */

// The sheet shows one tab at a time.
type SheetTab = 'tasks' | 'sounds' | 'quests' | 'stats' | 'timer';

export function MobileWickglow() {
  const lamp = useWickglow();
  // Safe-area insets = the notch / status bar / home-indicator sizes in px.
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // How far the on-screen keyboard covers the bottom, so the sheet can rise above it.
  const keyboard = useKeyboardInset();
  const [open, setOpen] = useState(false); // sheet expanded?
  const [tab, setTab] = useState<SheetTab>('tasks');
  // "Zen": while focusing, the UI fades away after 4s of no touches.
  const [zen, setZen] = useState(false);
  const lastAct = useRef(0); // timestamp of the last touch
  // Reanimated shared value driving the sheet's slide (runs on the UI thread).
  const sheetOffset = useSharedValue(0);
  const mood = lamp.moodTheme;
  // The sheet is always fully built at `expanded` height and slid down by
  // (expanded - collapsed) px, so only the top `collapsed` px peek out.
  const collapsed = 214 + insets.bottom;
  // A playing stream embed needs room at the top; shrink the stage and sheet to fit.
  const embed = openStreamEmbed(lamp.streamLinks, lamp.activeStreamId);
  const playerReserve = embed ? streamCardHeight(embed.playback.height) : 0;
  const playerTop = insets.top + 72;
  const fittedSheet = height - playerTop - playerReserve - 8;
  // The sheet rises above the keyboard, so its open height is also capped to the
  // space between the status bar and the keyboard.
  const available = Math.max(collapsed, height - keyboard - insets.top - 8);
  const expanded = playerReserve > 0
    ? Math.min(height * 0.84, 760, available, Math.max(collapsed, fittedSheet))
    : Math.min(height * 0.84, 760, available);

  // Any touch counts as activity: record the time and bring the UI back.
  const poke = useCallback(() => {
    lastAct.current = Date.now();
    setZen(false);
  }, []);

  // Slide the sheet up/down whenever it opens, closes or resizes.
  useEffect(() => {
    sheetOffset.set(withTiming(open ? 0 : expanded - collapsed, { duration: 380 }));
  }, [collapsed, expanded, open, sheetOffset]);

  // Zen timer: check 2.5x a second whether to hide the UI. It only hides during
  // a running focus session, with the setting on and the sheet closed.
  useEffect(() => {
    lastAct.current = Date.now();
    const id = setInterval(() => {
      const hide = lamp.running && lamp.mode === 'focus' && lamp.zenOpt && !open && Date.now() - lastAct.current > 4000;
      setZen(hide);
    }, 400);
    return () => clearInterval(id);
  }, [lamp.mode, lamp.running, lamp.zenOpt, open]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetOffset.get() }],
  }));
  // idle = nothing started; "paused" is not idle (it has time already spent).
  const idle = lamp.status === 'idle';
  const startLabel = lamp.running
    ? 'Pause'
    : idle
      ? (lamp.mode === 'focus' ? 'Light the candle' : 'Start break')
      : 'Resume';
  // "Focus · 2 of 4": every 4th focus session leads to a long break.
  const phase = lamp.mode === 'focus' ? `Focus · ${(lamp.cycle % 4) + 1} of 4` : MODE_LABEL[lamp.mode];
  const taskLine = lamp.mode === 'focus'
    ? (lamp.activeTask?.text ?? 'Pick a task to focus on')
    : 'Stretch, sip some water, look away';
  // How many of the four little candles under the timer are lit.
  const pipsLit = lamp.mode === 'long' ? 4 : lamp.cycle % 4;
  // Dot on the Quests tab while any daily quest is unclaimed.
  const questOpen = hasOpenQuests(lamp.day);

  // Tapping the active tab closes the sheet; any other tab switches to it and opens.
  const openTab = (next: SheetTab) => {
    poke();
    if (open && tab === next) setOpen(false);
    else {
      setTab(next);
      setOpen(true);
    }
  };

  return (
    // onTouchStart fires for every touch anywhere, which is how zen mode notices activity.
    <View style={[styles.root, { backgroundColor: mood.bgBase }]} onTouchStart={poke}>
      <RainOverlay amount={lamp.mix.rain} />
      <FillGradient
        id="room"
        stops={[
          { offset: '0', color: mood.bgBase },
          { offset: '0.58', color: mood.bgMid },
          { offset: '1', color: mood.bgGlow },
        ]}
      />

      {/* Top bar: level ring (opens Stats) and streak / minutes-today pills.
          Hidden elements also get pointerEvents="none" so invisible buttons
          can't be tapped by accident. */}
      <View style={[styles.top, { paddingTop: insets.top + 12, opacity: zen ? 0 : 1 }]} pointerEvents={zen ? 'none' : 'auto'}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open stats" style={styles.levelBtn} onPress={() => openTab('stats')}>
          <LevelRing progress={lamp.xpInLevel / lamp.xpNeeded} color={mood.accent} level={lamp.level} />
          <View>
            <Text style={styles.levelName}>{lamp.levelName}</Text>
            <Text style={styles.levelXp}>{lamp.xpInLevel} / {lamp.xpNeeded} XP</Text>
          </View>
        </Pressable>
        <View style={styles.pills}>
          <View style={styles.pill}><FlameIcon size={14} color={colors.error} /><Text style={styles.pillText}>{lamp.streak}</Text></View>
          <View style={styles.pill}><ClockIcon size={14} color={colors.textPrimary} /><Text style={styles.pillText}>{lamp.day.minutes}m</Text></View>
        </View>
      </View>

      {/* While the sheet is open, tapping the dimmed area behind it closes it. */}
      {open ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Close panel" onPress={() => { poke(); setOpen(false); }} style={styles.backdrop} />
      ) : null}

      {/* Stage: the candle IS the start/pause button. Bottom padding keeps it
          clear of the collapsed sheet. */}
      <View style={[styles.stage, { paddingBottom: collapsed + 8, paddingTop: playerReserve }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={startLabel} style={styles.candleBtn} onPress={lamp.toggle}>
          <Candle
            progress={lamp.progress}
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
        <Text style={styles.time}>{formatTime(lamp.remaining)}</Text>
        <Text style={styles.phase}>{phase}</Text>
        <FocusLine
          mode={lamp.mode === 'focus' ? (lamp.activeTask ? 'task' : 'empty') : 'break'}
          text={taskLine}
          accent={mood.accent}
          zen={zen}
          onPress={lamp.mode === 'focus' ? () => openTab('tasks') : undefined}
        />
        {/* Four mini candles = progress through the 4-session cycle. */}
        <View style={styles.pips}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={styles.miniCandle}>
              <View style={[styles.wickFlame, index < pipsLit && { opacity: 1, backgroundColor: mood.flame2 }]} />
              <View style={[styles.waxBit, index < pipsLit && { backgroundColor: mood.wax }]} />
            </View>
          ))}
        </View>
      </View>

      {/* Playing Spotify/YouTube/Apple Music embed floats near the top. It lives
          here (not inside a tab) so closing the sheet doesn't stop the stream. */}
      <StreamStage style={[styles.stream, { top: playerTop }]} />

      {/* Bottom sheet: grab handle, mode tabs, start/reset/skip, dock, and the
          scrollable tab body. Slid by `sheetStyle`; lifted by `keyboard`. */}
      <Reanimated.View style={[styles.sheet, { height: expanded, bottom: keyboard }, sheetStyle]}>
        <Pressable accessibilityRole="button" accessibilityLabel={open ? 'Collapse controls' : 'Expand controls'} style={styles.grab} onPress={() => { poke(); setOpen((value) => !value); }}>
          <View style={styles.grabBar} />
        </Pressable>
        <View style={[styles.modes, { opacity: zen ? 0 : 1 }]} pointerEvents={zen ? 'none' : 'auto'}>
          {(['focus', 'short', 'long'] as TimerMode[]).map((item) => {
            const selected = lamp.mode === item;
            return (
              <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${MODE_LABEL[item]} timer`} key={item} onPress={() => lamp.setMode(item)} style={[styles.mode, selected && styles.modeOn]}>
                <Text style={[styles.modeText, selected && styles.modeTextOn]}>{MODE_LABEL[item]}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Reset timer" style={[styles.round, { opacity: zen ? 0 : 1 }]} onPress={lamp.reset}><ResetIcon color={colors.textPrimary} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={startLabel} style={[styles.start, { backgroundColor: mood.accent }]} onPress={lamp.toggle}>
            <Text style={styles.startText}>{startLabel}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Skip timer" style={[styles.round, { opacity: zen ? 0 : 1 }]} onPress={lamp.skip}><SkipIcon color={colors.textPrimary} /></Pressable>
        </View>
        <View style={[styles.dock, { opacity: zen ? 0 : 1 }]} pointerEvents={zen ? 'none' : 'auto'}>
          <DockItem label="Tasks" active={open && tab === 'tasks'} color={mood.accent} onPress={() => openTab('tasks')}><TaskIcon size={20} /></DockItem>
          <DockItem label="Sounds" active={open && tab === 'sounds'} color={mood.accent} dot={lamp.musicPlaying || lamp.activeStreamId != null} onPress={() => openTab('sounds')}><MusicIcon size={20} /></DockItem>
          <DockItem label="Quests" active={open && tab === 'quests'} color={mood.accent} dot={questOpen} onPress={() => openTab('quests')}><StarIcon size={20} /></DockItem>
          <DockItem label="Stats" active={open && tab === 'stats'} color={mood.accent} onPress={() => openTab('stats')}><BarsIcon size={20} /></DockItem>
          <DockItem label="Timer" active={open && tab === 'timer'} color={mood.accent} onPress={() => openTab('timer')}><TimerIcon size={20} /></DockItem>
        </View>
        {open ? (
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            // "handled": a tap on a button while the keyboard is open works on the
            // first tap, instead of only dismissing the keyboard.
            keyboardShouldPersistTaps="handled"
          >
            {tab === 'tasks' ? <TaskList mobile /> : null}
            {tab === 'sounds' ? <View><MoodPicker /><MusicBlock mobile /><MixerBlock mobile /></View> : null}
            {tab === 'quests' ? <QuestList mobile /> : null}
            {tab === 'stats' ? <View><LevelCard mobile /><StatGrid /><WeekChart mobile /><MonthCalendar mobile /></View> : null}
            {tab === 'timer' ? <TimerSettings mobile /> : null}
          </ScrollView>
        ) : null}
      </Reanimated.View>

      {/* Gentle end-of-session card, and a short toast for XP / quest messages. */}
      {lamp.ending ? (
        <SessionEndCard
          title={lamp.ending.title}
          line={lamp.ending.line}
          actionLabel={lamp.ending.actionLabel}
          accent={mood.accent}
          showLater={lamp.ending.showLater}
          onStart={lamp.startNext}
          onDismiss={lamp.dismissEnding}
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
      <Text style={[styles.dockLabel, active && { color }]}>{label}</Text>
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
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 4,
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
    minHeight: 34,
    paddingHorizontal: 12,
    ...rounded(radius.pill),
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
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
  stream: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 7,
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
    fontFamily: fonts.time,
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
    marginTop: 6,
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
    backgroundColor: colors.bgSurface,
    borderTopWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  grab: {
    height: 26,
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
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.bgCard,
    ...rounded(radius.sm),
    padding: 4,
  },
  mode: {
    flex: 1,
    minHeight: 38,
    ...rounded(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeOn: {
    backgroundColor: colors.textPrimary,
  },
  modeText: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
  },
  modeTextOn: {
    color: colors.textInverse,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginHorizontal: 16,
  },
  round: {
    width: 54,
    height: 54,
    ...rounded(radius.lg),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  start: {
    flex: 1,
    minHeight: 54,
    ...rounded(radius.lg),
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: {
    color: colors.textInverse,
    fontFamily: fonts.bodySemibold,
    fontSize: 17,
  },
  dock: {
    flexDirection: 'row',
    marginTop: 8,
    marginHorizontal: 8,
  },
  dockBtn: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...rounded(radius.sm),
  },
  dockBtnOn: {
    backgroundColor: colors.bgCard,
  },
  dockLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    marginTop: 2,
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
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 28,
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
