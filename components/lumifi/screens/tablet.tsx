import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, rounded } from '@/src/theme/tokens';
import { useKeyboardInset } from '@/components/lumifi/hooks/use-keyboard-inset';
import { useLumiFi } from '@/components/lumifi/logic';
import { formatTime, MODE_LABEL, TimerMode } from '@/components/lumifi/theme';
import { FillGradient } from '@/components/lumifi/features/background/fill-gradient';
import { RainOverlay } from '@/components/lumifi/features/background/rain';
import { Candle } from '@/components/lumifi/features/clock/candle';
import { MonthCalendar } from '@/components/lumifi/features/progression/month-calendar';
import { QuestList } from '@/components/lumifi/features/progression/quest-list';
import { MoodPicker } from '@/components/lumifi/features/settings/mood-picker';
import { TaskList } from '@/components/lumifi/features/tasks/task-list';
import { FocusLine } from '@/components/lumifi/features/tasks/focus-line';
import { MixerBlock } from '@/components/lumifi/features/audio/mixer-block';
import { MusicBlock } from '@/components/lumifi/features/audio/music-block';
import { openStreamEmbed, StreamStage, streamCardHeight } from '@/components/lumifi/features/audio/stream-stage';
import { SessionEndCard } from '@/components/lumifi/features/timer/session-end-card';
import { ClockIcon, FlameIcon, ResetIcon, SkipIcon } from '@/components/lumifi/shared/icons';

export function TabletLumiFi() {
  const lamp = useLumiFi();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const keyboard = useKeyboardInset();
  const [zen, setZen] = useState(false);
  const lastAct = useRef(0);
  const mood = lamp.moodTheme;
  const timeSize = Math.min(72, Math.max(48, width * 0.08));

  const poke = useCallback(() => {
    lastAct.current = Date.now();
    setZen(false);
  }, []);

  useEffect(() => {
    lastAct.current = Date.now();
    const id = setInterval(() => {
      const hide = lamp.running && lamp.mode === 'focus' && lamp.zenOpt && Date.now() - lastAct.current > 4000;
      setZen(hide);
    }, 400);
    return () => clearInterval(id);
  }, [lamp.mode, lamp.running, lamp.zenOpt]);

  const embed = openStreamEmbed(lamp.streamLinks, lamp.activeStreamId);
  const playerReserve = embed ? streamCardHeight(embed.playback.height) : 0;

  const idle = lamp.status === 'idle';
  const startLabel = lamp.running
    ? 'Pause'
    : idle
      ? (lamp.mode === 'focus' ? 'Light the candle' : 'Start break')
      : 'Resume';
  const phase = lamp.mode === 'focus' ? `Focus · ${(lamp.cycle % 4) + 1} of 4` : MODE_LABEL[lamp.mode];
  const taskLine = lamp.mode === 'focus'
    ? (lamp.activeTask?.text ?? 'Pick a task to focus on')
    : 'Stretch, sip some water, look away';
  const pipsLit = lamp.mode === 'long' ? 4 : lamp.cycle % 4;

  return (
    <View style={[styles.root, { backgroundColor: mood.bgBase }]} onTouchStart={poke}>
      <FillGradient
        id="room"
        stops={[
          { offset: '0', color: mood.bgBase },
          { offset: '0.58', color: mood.bgMid },
          { offset: '1', color: mood.bgGlow },
        ]}
      />
      <RainOverlay amount={lamp.mix.rain} />

      <View style={[styles.split, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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

          <Pressable accessibilityRole="button" accessibilityLabel={startLabel} style={[styles.candleBtn, { minHeight: Math.max(120, Math.min(420, height - 300)) }]} onPress={lamp.toggle}>
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
          <Text style={[styles.time, { fontSize: timeSize }]}>{formatTime(lamp.remaining)}</Text>
          <Text style={styles.phase}>{phase}</Text>
          <FocusLine
            mode={lamp.mode === 'focus' ? (lamp.activeTask ? 'task' : 'empty') : 'break'}
            text={taskLine}
            accent={mood.accent}
            zen={zen}
          />
          <View style={styles.pips}>
            {[0, 1, 2, 3].map((index) => (
              <View key={index} style={styles.miniCandle}>
                <View style={[styles.wickFlame, index < pipsLit && { opacity: 1, backgroundColor: mood.flame2 }]} />
                <View style={[styles.waxBit, index < pipsLit && { backgroundColor: mood.wax }]} />
              </View>
            ))}
          </View>
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
        </ScrollView>

        <ScrollView
          style={[styles.side, { opacity: zen ? 0 : 1 }]}
          pointerEvents={zen ? 'none' : 'auto'}
          contentContainerStyle={[styles.sideContent, keyboard > 0 ? { paddingBottom: keyboard + 28 } : null]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.kicker}>Tasks</Text>
          <TaskList mobile />
          <Text style={styles.kicker}>Sounds</Text>
          <MoodPicker />
          <MusicBlock mobile />
          <MixerBlock mobile />
          <QuestList mobile />
          <MonthCalendar mobile />
        </ScrollView>
      </View>

      <StreamStage style={[styles.stream, { top: insets.top + 8, width: Math.min(420, width * 0.48) }]} />

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
        <View style={[styles.toast, { top: insets.top + 16 }]}>
          <Text style={styles.toastText}>{lamp.toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
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
    fontFamily: fonts.time,
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
