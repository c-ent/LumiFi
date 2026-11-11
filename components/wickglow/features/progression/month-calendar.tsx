import { colors, fade, fonts, rounded } from '@/src/theme/tokens';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MonthCell, MonthRef, MonthShade } from '@/components/wickglow/theme';
import { monthGrid, monthRef, monthShade, quietDayLine, shiftMonth } from '@/components/wickglow/theme';
import { calendarKey } from '@/src/core/calendar';
import { useWickglow } from '@/components/wickglow/logic';
import { panelStyles as styles } from '@/components/wickglow/shared/panel-styles';
import { useTone } from '@/components/wickglow/features/tone';
import { progressWide as wide } from '@/components/wickglow/features/progression/wide-styles';

// Column headers, Sunday first. Duplicate letters (T, S) are why the render key
// below also includes the index.
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// The month view beside the last-7-days chart. The core returns the cells; this
// draws them and owns only which month is on screen and which day is selected.
export function MonthCalendar({ mobile = false, wide: desk = false }: { mobile?: boolean; wide?: boolean }) {
  const { days, now, streak } = useWickglow();
  const tone = useTone(mobile);
  // The arrows move the view and selecting a day marks one cell. Both are
  // primitives: the grid comes from the stored history and the detail line from
  // the tapped cell, so neither reading is kept a second time. The quiet line is
  // the one exception, since it is drawn rather than derived.
  // null = "follow the current month"; set once the user presses an arrow.
  const [view, setView] = useState<MonthRef | null>(null);
  // Today starts picked, so the panel opens on a day's numbers instead of the
  // "tap a day" hint. Stepping to another month finds no cell for that key and
  // falls back to the hint.
  // Only a user's pick is stored; with none, the selection follows `now`, so it
  // stays on today if the provider updates the clock or the day rolls over.
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? calendarKey(now);
  // A quiet day's line is drawn once per view and redrawn on every tap, so the
  // detail line is not the same sentence every time an empty day is picked.
  const [quiet, setQuiet] = useState(() => quietDayLine(Math.random));

  const pick = (key: string) => {
    setPicked(key);
    setQuiet(quietDayLine(Math.random));
  };

  const shown = view ?? monthRef(now);
  const current = monthRef(now);
  // The month view never steps past the current month: a future month holds no
  // focus time, and neither does a future day, so the next arrow stops there and
  // a future cell is dimmed and not pressable.
  const atCurrentMonth = shown.year === current.year && shown.month === current.month;
  // 6 weeks x 7 days of cells for the shown month (see src/core/month-calendar.ts).
  const grid = monthGrid(now, days, shown.year, shown.month);
  // The detail line is looked up from the grid each render, never stored.
  // Padding days from a neighbouring month never match, so a selection made in
  // one month cannot show its details in another month's view.
  const selectedCell = selected == null
    ? null
    : grid.weeks.flat().find((cell) => cell.inMonth && cell.key === selected) ?? null;

  // Built once, then either wrapped in a card (desktop) or returned bare at the bottom.
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
                onPress={cell.future || !cell.inMonth ? undefined : () => pick(cell.key)}
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
              <Text style={deskStyles.detailTitle}>{dayLabel(selectedCell.at)}</Text>
            ) : (
              <Text style={deskStyles.detailMuted}>Tap a day to see its minutes and sessions.</Text>
            )}
            {selectedCell ? (
              <Text style={deskStyles.detailMuted}>{describeDay(selectedCell, quiet)}</Text>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.monthTotal}>This month: {describe(grid.minutes, grid.sessions)}</Text>
          {selectedCell ? (
            <Text style={styles.monthDetail}>{dayLabel(selectedCell.at)}: {describeDay(selectedCell, quiet)}</Text>
          ) : (
            <Text style={styles.meta}>Tap a day to see its minutes and sessions.</Text>
          )}
        </>
      )}
    </View>
  );

  return desk ? <View style={wide.card}>{body}</View> : body;
}

// One square in the grid. Its fill darkens with the day's minutes (4 steps).
// `onPress` is undefined for future days so they can't be selected.
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
      : fade(accent, shade === 2 ? 0.42 : 0.2);
  const borderColor = selected
    ? (desk ? colors.success : accent)
    : cell.today
      ? (desk ? colors.textPrimary : colors.textMuted)
      : 'transparent';
  // On the darkest (solid accent) cell the number switches to dark text to stay readable.
  const ink = desk && cell.inMonth && shade === 3;
  // Future days and the padding days from next door cannot be picked.
  const unavailable = cell.future || !cell.inMonth;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: unavailable }}
      accessibilityLabel={
        cell.future
          ? `${dayLabel(cell.at)}, not yet`
          : `${dayLabel(cell.at)}, ${describe(cell.minutes, cell.sessions)}`
      }
      disabled={unavailable}
      onPress={onPress}
      style={[
        styles.monthCell,
        desk && deskStyles.cell,
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

// A day as people say it ("Mon, Nov 9, 2026"), in the user's own locale. The
// cell's `key` stays the internal identity and is never shown or read aloud.
const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function dayLabel(at: number): string {
  return dayFormatter.format(new Date(at));
}

// The day detail, which swaps the bare zero reading for a quiet line only on a
// day with none. The month total and the accessibility label keep `describe`, so
// the facts stay facts in the places that read as numbers.
function describeDay(cell: MonthCell, quiet: string): string {
  if (cell.minutes === 0 && cell.sessions === 0) return quiet;
  return describe(cell.minutes, cell.sessions);
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
    marginBottom: 10,
  },
  headCopy: {
    flex: 1,
    alignItems: 'center',
  },
  month: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    textAlign: 'center',
  },
  streak: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  nav: {
    width: 31,
    height: 31,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Every cell carries the same 2px border, transparent until picked or today,
  // so selecting a day recolors the border and never resizes the cell.
  cell: {
    ...rounded(10),
    borderWidth: 2,
  },
  ink: {
    color: colors.textInverse,
    fontFamily: fonts.bodySemibold,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  legendText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  monthLine: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 11,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  detail: {
    marginTop: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    ...rounded(11),
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 2,
    // Room for the date and the reading together (two 18px lines, the gap, the
    // padding and the border), so the hint, a day and an empty day all draw the
    // same height and the card never moves.
    minHeight: 18 + 18 + 2 + 9 * 2 + 2,
    justifyContent: 'flex-start',
  },
  detailTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    lineHeight: 18,
  },
  detailMuted: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
});
