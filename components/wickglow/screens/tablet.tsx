import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sessionFace } from '@/src/core/session-face';
import { colors, fonts, radius, rounded } from '@/src/theme/tokens';
import { useKeyboardInset } from '@/components/wickglow/hooks/use-keyboard-inset';
import { useZen } from '@/components/wickglow/hooks/use-zen';
import { useWickglow } from '@/components/wickglow/logic';
import { MODE_LABEL, TimerMode } from '@/components/wickglow/theme';
import { RoomBackground } from '@/components/wickglow/features/background/room-background';
import { RainOverlay } from '@/components/wickglow/features/background/rain';
import { SessionCandle } from '@/components/wickglow/features/clock/candle';
import { MonthCalendar } from '@/components/wickglow/features/progression/month-calendar';
import { QuestList } from '@/components/wickglow/features/progression/quest-list';
import { MoodPicker } from '@/components/wickglow/features/settings/mood-picker';
import { TaskList } from '@/components/wickglow/features/tasks/task-list';
import { FocusLine } from '@/components/wickglow/features/tasks/focus-line';
import { MixerBlock } from '@/components/wickglow/features/audio/mixer-block';
import { SoundsScroller } from '@/components/wickglow/features/audio/music-block';
import { openStreamEmbed, StreamStage, streamCardHeight } from '@/components/wickglow/features/audio/stream-stage';
import { SessionEndCard } from '@/components/wickglow/features/timer/session-end-card';
import { TimeText } from '@/components/wickglow/features/timer/time-text';
import { ClockIcon, FlameIcon, ResetIcon, SkipIcon } from '@/components/wickglow/shared/icons';

/**
 * The tablet layout (window 600-840px wide): a split screen. Left half is the
 * candle and timer; right half is a scrolling column with tasks, sounds and
 * quests, so nothing needs a bottom sheet. Same building blocks and the same
 * "mood" colors as the phone (mobile.tsx), just arranged side by side.
 */
export function TabletWickglow() {
  const lamp = useWickglow();
  // Actions never change identity, so they are pulled out once (see logic.tsx).
  const { setMode, toggle, startNext, dismissEnding, reset, skip } = lamp;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const keyboard = useKeyboardInset();
  // Zen mode, as on the phone: hide the UI after 4s without a touch during focus.
  const { zen, poke } = useZen(lamp.running && lamp.mode === 'focus' && lamp.zenOpt, 4000);
  const mood = lamp.moodTheme;
  // Timer digits scale with the window, clamped to 48..72px.
  const timeSize = Math.min(72, Math.max(48, width * 0.08));

  // Room to leave at the top of the left column for a playing stream embed.
  const embed = openStreamEmbed(lamp.streamLinks, lamp.activeStreamId);
  const playerReserve = embed ? streamCardHeight(embed.playback.height) : 0;

  const idle = lamp.status === 'idle';
  const face = sessionFace(
    { mode: lamp.mode, status: lamp.status, cycle: lamp.cycle, activeTask: lamp.activeTask?.text ?? null },
    'candle',
  );

  return (
    <View style={[styles.root, { backgroundColor: mood.bgBase }]} onTouchStart={poke}>
      <RoomBackground />
      <RainOverlay amount={lamp.mix.rain} />

      {/* Two columns side by side (flexDirection: 'row'). */}
      <View style={[styles.split, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Left: level, candle, time, mode tabs and start/reset/skip. */}
        <ScrollView
          style={styles.stage}
          contentContainerStyle={[styles.stageContent, playerReserve > 0 ? { paddingTop: playerReserve } : null]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.top, { opacity: zen ? 0 : 1 }]} pointerEvents={zen ? 'none' : 'auto'}>
            <View>
              <Text style={styles.levelName}>{lamp.levelName}</Text>
              <Text style={styles.levelXp}>Level {lamp.level} · {lamp.xpInLevel} / {lamp.xpNeeded} XP</Text>
            </View>
            <View style={styles.pills}>
              <View style={styles.pill}><FlameIcon size={14} color={colors.error} /><Text style={styles.pillText}>{lamp.streak}</Text></View>
              <View style={styles.pill}><ClockIcon size={14} color={colors.textPrimary} /><Text style={styles.pillText}>{lamp.day.minutes}m</Text></View>
            </View>
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel={face.startLabel} style={[styles.candleBtn, { minHeight: Math.max(120, Math.min(420, height - 300)) }]} onPress={toggle}>
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
          <TimeText style={[styles.time, { fontSize: timeSize }]} />
          <Text style={styles.phase}>{face.cycleLine}</Text>
          {/* No onPress here: the task list is already visible in the right
              column, so the chip is a plain label on tablet. */}
          <FocusLine
            mode={face.chip.kind}
            text={face.chip.text}
            accent={mood.accent}
            zen={zen}
          />
          <View style={styles.pips}>
            {[0, 1, 2, 3].map((index) => (
              <View key={index} style={styles.miniCandle}>
                <View style={[styles.wickFlame, index < face.pipsLit && { opacity: 1, backgroundColor: mood.flame2 }]} />
                <View style={[styles.waxBit, index < face.pipsLit && { backgroundColor: mood.wax }]} />
              </View>
            ))}
          </View>
          <View style={[styles.modes, { opacity: zen ? 0 : 1 }]} pointerEvents={zen ? 'none' : 'auto'}>
            {(['focus', 'short', 'long'] as TimerMode[]).map((item) => {
              const selected = lamp.mode === item;
              return (
                <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${MODE_LABEL[item]} timer`} key={item} onPress={() => setMode(item)} style={[styles.mode, selected && styles.modeOn]}>
                  <Text style={[styles.modeText, selected && styles.modeTextOn]}>{MODE_LABEL[item]}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Reset timer" style={[styles.round, { opacity: zen ? 0 : 1 }]} onPress={reset}><ResetIcon color={colors.textPrimary} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={face.startLabel} style={[styles.start, { backgroundColor: mood.accent }]} onPress={toggle}>
              <Text style={styles.startText}>{face.startLabel}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Skip timer" style={[styles.round, { opacity: zen ? 0 : 1 }]} onPress={skip}><SkipIcon color={colors.textPrimary} /></Pressable>
          </View>
        </ScrollView>

        {/* Right: everything the phone keeps in its bottom sheet, stacked in
            one scrolling column. The column is the track list's own scroller
            (so the tracks can be virtualised); the rest rides along above and
            below the tracks. Extra bottom padding lifts the content above the
            on-screen keyboard. */}
        <View style={[styles.side, { opacity: zen ? 0 : 1 }]} pointerEvents={zen ? 'none' : 'auto'}>
          <SoundsScroller
            mobile
            contentContainerStyle={[styles.sideContent, keyboard > 0 ? { paddingBottom: keyboard + 28 } : null]}
            before={(
              <>
                <Text style={styles.kicker}>Tasks</Text>
                <TaskList mobile />
                <Text style={styles.kicker}>Sounds</Text>
                <MoodPicker video />
              </>
            )}
            after={(
              <>
                <MixerBlock mobile />
                <QuestList mobile />
                <MonthCalendar mobile />
              </>
            )}
          />
        </View>
      </View>

      {/* Floating stream player over the left column. */}
      <StreamStage style={[styles.stream, { top: insets.top + 8, width: Math.min(420, width * 0.48) }]} />

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
        <View style={[styles.toast, { top: insets.top + 16 }]}>
          <Text style={styles.toastText}>{lamp.toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({  root: {
    flex: 1,
    overflow: 'hidden',
  },
  stream: {
    position: 'absolute',
    left: 12,
    zIndex: 4,
  },
  split: {
    flex: 1,
    flexDirection: 'row',
    zIndex: 2,
  },
  stage: {
    flex: 1.05,
  },
  stageContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 12,
  },
  levelName: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
  },
  levelXp: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
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
  candleBtn: {
    flexGrow: 1,
  },
  time: {
    color: colors.textPrimary,
    fontFamily: fonts.timeRegular,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  phase: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 4,
  },
  pips: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
    marginBottom: 10,
    height: 22,
    alignItems: 'flex-end',
    justifyContent: 'center',
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
  modes: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.bgCard,
    ...rounded(radius.sm),
    padding: 4,
  },
  mode: {
    flex: 1,
    minHeight: 36,
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
  },
  round: {
    width: 52,
    height: 52,
    ...rounded(radius.lg),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  start: {
    flex: 1,
    minHeight: 52,
    ...rounded(radius.lg),
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: {
    color: colors.textInverse,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
  },
  side: {
    flex: 0.95,
    borderLeftWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSurface,
  },
  sideContent: {
    padding: 16,
    paddingBottom: 28,
  },
  kicker: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
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
