import { colors, fade, fonts } from '@/src/theme/tokens';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MonthCell, MonthRef, MonthShade } from '@/components/lumifi/theme';
import { monthGrid, monthRef, monthShade, shiftMonth } from '@/components/lumifi/theme';
import { useLumiFi } from '@/components/lumifi/logic';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { useTone } from '@/components/lumifi/features/tone';
import { progressWide as wide } from '@/components/lumifi/features/progression/wide-styles';

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// The month view beside the last-7-days chart. The core returns the cells; this
// draws them and owns only which month is on screen and which day is selected.
export function MonthCalendar({ mobile = false, wide: desk = false }: { mobile?: boolean; wide?: boolean }) {
  const { days, now, streak } = useLumiFi();
  const tone = useTone(mobile);
  // The arrows move the view and selecting a day marks one cell. Both are
  // primitives: the grid and the detail line are derived from the stored
  // history, so neither is kept a second time.
  const [view, setView] = useState<MonthRef | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const shown = view ?? monthRef(now);
  const current = monthRef(now);
  // The month view never steps past the current month: a future month holds no
  // focus time, and neither does a future day, so the next arrow stops there and
  // a future cell is dimmed and not pressable.
  const atCurrentMonth = shown.year === current.year && shown.month === current.month;
  const grid = monthGrid(now, days, shown.year, shown.month);
  const selectedCell = selected == null
    ? null
    : grid.weeks.flat().find((cell) => cell.key === selected) ?? null;

  const body = (
    <View>
      <Text style={[styles.kicker, desk && wide.label]}>Calendar</Text>

      <View style={desk ? deskStyles.head : styles.monthHead}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => setView(shiftMonth(shown, -1))}
          style={desk ? deskStyles.nav : styles.monthNav}
        >
          <Text style={styles.monthNavText}>‹</Text>
        </Pressable>
        {desk ? (
          <View style={deskStyles.headCopy}>
            <Text style={deskStyles.month}>{grid.label}</Text>
            <Text style={deskStyles.streak}>{streak} day streak</Text>
          </View>
        ) : (
          <Text style={styles.monthLabel}>{grid.label} · {streak} day streak</Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: atCurrentMonth }}
          disabled={atCurrentMonth}
          onPress={() => setView(shiftMonth(shown, 1))}
          style={[desk ? deskStyles.nav : styles.monthNav, atCurrentMonth && styles.monthNavOff]}
        >
          <Text style={styles.monthNavText}>›</Text>
        </Pressable>
      </View>

      <View style={[styles.monthWeek, { marginTop: desk ? 0 : 8 }]}>
        {DAY_NAMES.map((name, index) => (
          <Text key={`${name}-${index}`} style={styles.monthDayName}>{name}</Text>
        ))}
      </View>

      <View style={styles.monthGrid}>
        {grid.weeks.map((week) => (
          <View key={week[0].key} style={styles.monthWeek}>
            {week.map((cell) => (
              <DayCell
                key={cell.key}
                cell={cell}
                accent={tone.accent}
                selected={selected === cell.key}
                wide={desk}
                onPress={cell.future ? undefined : () => setSelected(cell.key)}
              />
            ))}
          </View>
        ))}
      </View>

      {desk ? (
        <>
          <View style={deskStyles.legend}>
            <Text style={deskStyles.legendText}>Less</Text>
            <View style={[deskStyles.swatch, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />
            <View style={[deskStyles.swatch, { backgroundColor: fade(tone.accent, 0.2) }]} />
            <View style={[deskStyles.swatch, { backgroundColor: fade(tone.accent, 0.42) }]} />
            <View style={[deskStyles.swatch, { backgroundColor: tone.accent }]} />
            <Text style={deskStyles.legendText}>More</Text>
          </View>
          <Text style={deskStyles.monthLine}>This month: {describe(grid.minutes, grid.sessions)}</Text>
          <View style={deskStyles.detail}>
            {selectedCell ? (
              <Text style={deskStyles.detailTitle}>{selectedCell.key}</Text>
            ) : (
              <Text style={deskStyles.detailMuted}>Tap a day to see its minutes and sessions.</Text>
            )}
            {selectedCell ? (
              <Text style={deskStyles.detailMuted}>{describe(selectedCell.minutes, selectedCell.sessions)}</Text>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.monthTotal}>This month: {describe(grid.minutes, grid.sessions)}</Text>
          {selectedCell ? (
            <Text style={styles.monthDetail}>{selectedCell.key}: {describe(selectedCell.minutes, selectedCell.sessions)}</Text>
          ) : (
            <Text style={styles.meta}>Tap a day to see its minutes and sessions.</Text>
          )}
        </>
      )}
    </View>
  );

  return desk ? <View style={wide.card}>{body}</View> : body;
}

function DayCell({
  cell,
  accent,
  selected,
  wide: desk = false,
  onPress,
}: {
  cell: MonthCell;
  accent: string;
  selected: boolean;
  wide?: boolean;
  onPress?: () => void;
}) {
  // The shade rule itself is `monthShade` in the core. Step 0 stays
  // transparent, and the other three climb the accent so the deepest step is
  // the accent itself. The border marks the selection and today, so the shade
  // is still readable underneath it.
  const shade: MonthShade = monthShade(cell.minutes);
  const fill = !cell.inMonth || shade === 0
    ? 'transparent'
    : shade === 3
      ? accent
      : desk
        ? fade(accent, shade === 2 ? 0.42 : 0.2)
        : `${accent}${shade === 2 ? '66' : '33'}`;
  const borderColor = selected
    ? (desk ? colors.success : accent)
    : cell.today
      ? (desk ? colors.textPrimary : colors.textMuted)
      : 'transparent';
  const ink = desk && cell.inMonth && shade === 3;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: cell.future }}
      accessibilityLabel={
        cell.future
          ? `${cell.key}, not yet`
          : `${cell.key}, ${describe(cell.minutes, cell.sessions)}`
      }
      disabled={cell.future}
      onPress={onPress}
      style={[
        styles.monthCell,
        desk && deskStyles.cell,
        selected && desk && deskStyles.picked,
        { borderColor, backgroundColor: fill },
        !cell.inMonth && styles.monthCellOut,
        cell.future && styles.monthCellFuture,
      ]}
    >
      <Text style={[styles.monthDay, selected && styles.monthDaySelected, ink && deskStyles.ink]}>{cell.day}</Text>
      {cell.today && !desk ? <View style={[styles.monthDot, { backgroundColor: accent }]} /> : null}
    </Pressable>
  );
}

// One reading of a day's numbers, so the month total, the selected line and the
// accessibility label cannot drift apart.
function describe(minutes: number, sessions: number): string {
  const studied = minutes === 1 ? '1 minute' : `${minutes} minutes`;
  if (sessions === 0 && minutes === 0) return 'No focus time';
  const count = sessions === 1 ? '1 session' : `${sessions} sessions`;
  return `${studied} · ${count}`;
}

const deskStyles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headCopy: {
    flex: 1,
    alignItems: 'center',
  },
  month: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    textAlign: 'center',
  },
  streak: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  nav: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    borderRadius: 12,
  },
  picked: {
    borderWidth: 2,
  },
  ink: {
    color: colors.textInverse,
    fontFamily: fonts.bodySemibold,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  legendText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  monthLine: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  detail: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 2,
  },
  detailTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
  },
  detailMuted: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
});
