import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, rounded } from '@/src/theme/tokens';
import { useLumiFi } from '@/components/lumifi/logic';
import { formatTime, MODE_LABEL, TimerMode } from '@/components/lumifi/theme';
import { RainOverlay } from '@/components/lumifi/features/background/rain';
import { SceneBackground } from '@/components/lumifi/features/background/scene-background';
import { LevelCard } from '@/components/lumifi/features/progression/level-card';
import { QuestList } from '@/components/lumifi/features/progression/quest-list';
import { StatGrid } from '@/components/lumifi/features/progression/stat-grid';
import { WeekChart } from '@/components/lumifi/features/progression/week-chart';
import { ScenePicker } from '@/components/lumifi/features/settings/scene-picker';
import { TimerSettings } from '@/components/lumifi/features/settings/timer-settings';
import { TaskPanel } from '@/components/lumifi/features/tasks/task-panel';
import { MixerBlock } from '@/components/lumifi/features/audio/mixer-block';
import { MusicBlock } from '@/components/lumifi/features/audio/music-block';
import { SessionEndCard } from '@/components/lumifi/features/timer/session-end-card';
import { PanelHeading } from '@/components/lumifi/shared/panel-heading';
import {
  BarsIcon,
  ClockIcon,
  FlameIcon,
  FullscreenIcon,
  GearIcon,
  MixerIcon,
  MusicIcon,
  ResetIcon,
  SceneIcon,
  SkipIcon,
  TaskIcon,
} from '@/components/lumifi/shared/icons';

type PanelId = 'music' | 'mixer' | 'scenes' | 'tasks' | 'progress' | 'settings';

const PANEL_TITLE: Record<PanelId, string> = {
  music: 'Music',
  mixer: 'Ambient mixer',
  scenes: 'Scenes',
  tasks: 'Tasks',
  progress: 'Progress',
  settings: 'Timer settings',
};

export function DesktopLumiFi() {
  const lamp = useLumiFi();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [zen, setZen] = useState(false);
  const lastAct = useRef(0);
  const theme = lamp.sceneTheme;
  const timeSize = Math.min(width * 0.23, height * 0.36, 280);

  const poke = useCallback(() => {
    lastAct.current = Date.now();
    setZen(false);
  }, []);

  useEffect(() => {
    lastAct.current = Date.now();
    const id = setInterval(() => {
      const hide = lamp.running && lamp.mode === 'focus' && lamp.zenOpt && !panel && Date.now() - lastAct.current > 3500;
      setZen(hide);
    }, 400);
    return () => clearInterval(id);
  }, [lamp.mode, lamp.running, lamp.zenOpt, panel]);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const onMove = () => poke();
    window.addEventListener('pointerdown', onMove);
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointerdown', onMove);
      window.removeEventListener('pointermove', onMove);
    };
  }, [poke]);

  const togglePanel = (id: PanelId) => {
    poke();
    setPanel((current) => (current === id ? null : id));
  };

  const taskLine = lamp.mode === 'focus'
    ? (lamp.activeTask?.text ?? 'Choose what you are working on')
    : 'Stretch, drink some water, look away from the screen';
  const pipsLit = lamp.mode === 'long' ? 4 : lamp.cycle % 4;
  const startLabel = lamp.running ? 'Pause' : lamp.status === 'paused' ? 'Resume' : 'Start';
  const questOpen = lamp.day.sessions < 4 || lamp.day.minutes < 60 || lamp.day.tasks < 1;

  return (
    <View style={[styles.root, { backgroundColor: theme.b1 }]} onTouchStart={poke}>
      <SceneBackground />
      <RainOverlay amount={lamp.mix.rain} />
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${lamp.progress * 100}%` }]} />
      </View>

      <View style={[styles.top, { paddingTop: insets.top + 14, opacity: zen ? 0 : 1 }]} pointerEvents={zen ? 'none' : 'auto'}>
        <View style={styles.brand}>
          <View style={[styles.brandDot, { backgroundColor: theme.accent, boxShadow: `0 0 14px ${theme.accent}` }]} />
          <Text style={styles.brandText}>LumiFi</Text>
        </View>
        <View style={styles.pills}>
          <Pressable style={styles.pill} onPress={() => togglePanel('progress')}>
            <FlameIcon size={15} color={colors.textPrimary} />
            <Text style={styles.pillText}>{lamp.streak}</Text>
          </Pressable>
          <Pressable style={styles.pill} onPress={() => togglePanel('progress')}>
            <ClockIcon size={15} color={colors.textPrimary} />
            <Text style={styles.pillText}>{lamp.day.minutes}m</Text>
          </Pressable>
          <Pressable style={styles.pill} onPress={() => togglePanel('progress')}>
            <Text style={styles.pillText}>Lv {lamp.level}</Text>
            <View style={styles.miniXp}>
              <View style={[styles.miniXpFill, { width: `${(lamp.xpInLevel / lamp.xpNeeded) * 100}%`, backgroundColor: theme.accent }]} />
            </View>
          </Pressable>
        </View>
      </View>

      <View style={[styles.center, { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 90 }]}>
        <View style={[styles.tabs, { opacity: zen ? 0 : 1 }]} pointerEvents={zen ? 'none' : 'auto'}>
          {(['focus', 'short', 'long'] as TimerMode[]).map((item) => {
            const selected = lamp.mode === item;
            return (
              <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${MODE_LABEL[item]} timer`} key={item} onPress={() => lamp.setMode(item)} style={[styles.tab, selected && styles.tabOn]}>
                <Text style={[styles.tabText, selected && styles.tabTextOn]}>{MODE_LABEL[item]}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.time, { fontSize: timeSize }]}>{formatTime(lamp.remaining)}</Text>
        <Pressable onPress={() => togglePanel('tasks')} style={{ opacity: zen ? 0 : 1 }} pointerEvents={zen ? 'none' : 'auto'}>
          <Text style={[styles.taskLine, lamp.mode === 'focus' && lamp.activeTask ? styles.taskLineOn : null]}>{taskLine}</Text>
        </Pressable>
        <View style={styles.pips}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={[styles.pip, index < pipsLit && styles.pipOn]} />
          ))}
        </View>
        <View style={[styles.controls, { opacity: zen ? 0 : 1 }]} pointerEvents={zen ? 'none' : 'auto'}>
          <Pressable accessibilityRole="button" accessibilityLabel="Reset timer" style={styles.round} onPress={lamp.reset}><ResetIcon /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={startLabel} style={styles.start} onPress={lamp.toggle}><Text style={styles.startText}>{startLabel}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Skip timer" style={styles.round} onPress={lamp.skip}><SkipIcon /></Pressable>
        </View>
      </View>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 14, opacity: zen ? 0 : 1 }]} pointerEvents={zen ? 'none' : 'auto'}>
        <View style={styles.dockGroup}>
          <DockButton label="Music" active={panel === 'music'} dot={lamp.musicPlaying} onPress={() => togglePanel('music')}><MusicIcon /></DockButton>
          <DockButton label="Ambient mixer" active={panel === 'mixer'} onPress={() => togglePanel('mixer')}><MixerIcon /></DockButton>
          <DockButton label="Scenes" active={panel === 'scenes'} onPress={() => togglePanel('scenes')}><SceneIcon /></DockButton>
          <DockButton label="Tasks" active={panel === 'tasks'} onPress={() => togglePanel('tasks')}><TaskIcon /></DockButton>
          <DockButton label="Progress" active={panel === 'progress'} dot={questOpen} onPress={() => togglePanel('progress')}><BarsIcon /></DockButton>
        </View>
        <View style={styles.dockGroup}>
          <DockButton label="Timer settings" active={panel === 'settings'} onPress={() => togglePanel('settings')}><GearIcon /></DockButton>
          <DockButton label="Full screen" active={false} onPress={toggleFullscreen}><FullscreenIcon /></DockButton>
        </View>
      </View>

      {panel ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Close panel" onPress={() => setPanel(null)} style={styles.backdrop} />
      ) : null}

      {panel ? (
        <View style={[styles.panel, { bottom: insets.bottom + 72 }]}>
          <PanelHeading title={PANEL_TITLE[panel]} onClose={() => setPanel(null)} />
          <ScrollView style={styles.panelBody} contentContainerStyle={styles.panelContent}>
            {panel === 'tasks' ? <TaskPanel /> : null}
            {panel === 'music' ? <MusicBlock /> : null}
            {panel === 'mixer' ? <MixerBlock /> : null}
            {panel === 'scenes' ? <ScenePicker /> : null}
            {panel === 'progress' ? (
              <View>
                <LevelCard />
                <StatGrid />
                <QuestList />
                <WeekChart />
              </View>
            ) : null}
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

function DockButton({ children, active, dot, onPress, label }: { children: React.ReactNode; active: boolean; dot?: boolean; onPress: () => void; label: string }) {
  const { sceneTheme } = useLumiFi();
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={[styles.ib, active && styles.ibOn]}>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ color?: string }>, { color: active ? colors.textInverse : colors.textPrimary })
        : children}
      {dot ? <View style={[styles.dot, { backgroundColor: sceneTheme.accent }]} /> : null}
    </Pressable>
  );
}

function toggleFullscreen() {
  if (Platform.OS !== 'web') return;
  const root = document.documentElement;
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch((error) => console.warn('Could not exit fullscreen mode.', error));
  } else if (root.requestFullscreen) {
    void root.requestFullscreen().catch((error) => console.warn('Could not enter fullscreen mode.', error));
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.border,
    zIndex: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.textPrimary,
    opacity: 0.7,
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
  brandDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
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
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontFamily: fonts.time,
    marginVertical: 18,
    fontVariant: ['tabular-nums'],
  },
  taskLine: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  taskLineOn: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyMedium,
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
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ibOn: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 5,
  },
  panel: {
    position: 'absolute',
    left: 16,
    width: 390,
    maxWidth: '92%',
    maxHeight: '70%',
    zIndex: 8,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    ...rounded(radius.md),
    padding: 16,
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
