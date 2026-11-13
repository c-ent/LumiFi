import { colors, fonts, radius, rounded } from '@/src/theme/tokens';
import { Platform, StyleSheet, type ViewStyle } from 'react-native';

// The desktop panels, the session card, and the stream card share this glass.
// The blur is web-only; native keeps the same translucent fill.
export const glassPanel: ViewStyle = {
  backgroundColor: colors.bgSurface,
  borderWidth: 1,
  borderColor: colors.border,
  boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5)',
  ...(Platform.OS === 'web' ? { backdropFilter: 'blur(18px)' } : null),
};

// The phone tab bar's dark glass, for small floating controls (the desktop dock
// buttons, mode tabs, top pills and round timer buttons): a dark tint the scene
// shows through, a faint edge, and a brighter top edge like light on glass.
export const darkGlass: ViewStyle = {
  backgroundColor: colors.glassTint,
  borderWidth: 1,
  borderColor: colors.glassEdge,
  borderTopColor: colors.glassEdgeOn,
  ...(Platform.OS === 'web' ? { backdropFilter: 'blur(16px) saturate(140%)' } : null),
};

// Screens and feature files share these keys, so the sheet stays in one place.
// This is the app's "shared CSS file": buttons, inputs, rows, bars, the
// calendar cells and so on. React Native has no stylesheet cascade or CSS
// classes, so a style is shared by importing it (usually as `styles`) and
// putting it in a component's `style` prop. Names are grouped roughly by
// feature (task*, mix*, month*, stream*).
export const panelStyles = StyleSheet.create({
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    ...rounded(radius.sm),
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  solidBtn: {
    minHeight: 44,
    ...rounded(radius.sm),
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidBtnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  empty: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    marginBottom: 8,
  },
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    ...rounded(radius.md),
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  taskMobile: {
    paddingVertical: 10,
  },
  taskCopy: {
    flex: 1,
  },
  taskText: {
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  done: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  mini: {
    borderWidth: 1,
    borderColor: colors.border,
    ...rounded(radius.pill),
    minHeight: 30,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniText: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  // Icon-only twin of `mini`, at the 44pt touch target the pill is too short for.
  iconMini: {
    width: 44,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    ...rounded(radius.pill),
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 12,
  },
  kicker: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  // Phone and tablet sheet section titles ("Mood", "Daily quests", "Last 7
  // days", ...) read larger than the shared 11px `kicker`. Desktop panels keep
  // the smaller size (they either use `wide.label` after `kicker`, which wins
  // since it comes last, or are desktop-only and never add this).
  kickerLg: {
    fontSize: 16,
  },
  mixHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  mixKicker: {
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  mixOffMuted: {
    opacity: 0.45,
  },
  trackName: {
    color: colors.textPrimary,
    fontFamily: fonts.timeLight,
    fontSize: 22,
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundLg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundSm: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slider: {
    flex: 1,
    minWidth: 60,
    height: 28,
  },
  trackBtn: {
    borderWidth: 1,
    ...rounded(radius.sm),
    minHeight: 48,
    paddingHorizontal: 14,
    justifyContent: 'center',
    marginBottom: 6,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackGrow: {
    flex: 1,
  },
  trackRemove: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  streamColumn: {
    flex: 1,
    minHeight: 0,
  },
  streamLinks: {
    flex: 1,
    minHeight: 0,
  },
  streamLinksContent: {
    paddingBottom: 4,
  },
  streamFrame: {
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
    ...rounded(radius.sm),
  },
  streamFlush: {
    marginTop: 0,
    marginBottom: 0,
  },
  streamWeb: {
    flex: 1,
    backgroundColor: colors.bgCard,
  },
  streamPaused: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  mixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  mixLabel: {
    width: 76,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  mixValue: {
    width: 30,
    textAlign: 'right',
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  sceneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Centers each wrapped row on its own, so an odd last tile (7 scenes at
    // 2 per row) sits in the middle instead of flush left with a gap beside it.
    justifyContent: 'center',
    gap: 14,
  },
  sceneBtn: {
    width: '47%',
    borderWidth: 2,
    borderColor: 'transparent',
    ...rounded(radius.md),
    padding: 4,
  },
  swatch: {
    height: 68,
    ...rounded(radius.sm),
  },
  // A video thumbnail, the same size as the color `swatch` above so every tile
  // in the scene grid lines up. Use with contentFit="cover" so the image fills
  // the tile and crops instead of stretching.
  sceneThumb: {
    width: '100%',
    height: 68,
    ...rounded(radius.sm),
    overflow: 'hidden',
    backgroundColor: colors.bgInset,
  },
  sceneName: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  // 3 per row (a 3x3-ish grid; 6 moods make two full rows, a 7th "Video" tile
  // on tablet starts a third). `moodBtn` gets a fixed width instead of `flex: 1`
  // so a short last row doesn't stretch to fill the width.
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Centers each wrapped row on its own, so an odd last tile (7 moods at
    // 3 per row) sits in the middle instead of flush left with a gap beside it.
    justifyContent: 'center',
    gap: 10,
  },
  moodBtn: {
    width: '30%',
    borderWidth: 2,
    // A faint edge so each card reads on its own; selected turns it white.
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    ...rounded(radius.md),
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  // A round swatch of the mood's flame colour.
  moodFlame: {
    width: 26,
    height: 26,
    ...rounded(13),
    marginBottom: 6,
    boxShadow: '0 0 16px rgba(255,255,255,0.25)',
  },
  // The phone and tablet content card: the same box as the level card and the
  // stat tiles, so every section of a sheet reads as one set of tiles.
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    ...rounded(radius.md),
    padding: 14,
    marginBottom: 12,
  },
  // A quest tile: the same card, packed closer since they stack as a list.
  questCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    ...rounded(radius.md),
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 10,
  },
  levelCard: {
    borderWidth: 1,
    ...rounded(radius.md),
    padding: 14,
    marginBottom: 12,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
  },
  levelTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.timeLight,
    fontSize: 26,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    ...rounded(radius.md),
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statValue: {
    color: colors.textPrimary,
    fontFamily: fonts.timeLight,
    fontSize: 26,
  },
  quest: {
    marginBottom: 14,
  },
  goalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  goalLinkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  goalChip: {
    borderWidth: 1,
    borderColor: colors.border,
    ...rounded(radius.pill),
    minHeight: 30,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalChipOn: {
    backgroundColor: colors.bgCard,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 8,
  },
  reward: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
  },
  week: {
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  colBar: {
    width: '100%',
    maxWidth: 30,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  dayLabel: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  monthHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  monthNav: {
    minWidth: 44,
    minHeight: 34,
    borderWidth: 1,
    borderColor: colors.border,
    ...rounded(radius.pill),
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavText: {
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  monthNavOff: {
    opacity: 0.35,
  },
  monthDayName: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  monthGrid: {
    gap: 4,
    marginTop: 4,
  },
  monthWeek: {
    flexDirection: 'row',
    gap: 4,
  },
  monthCell: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: 'transparent',
    ...rounded(8),
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  monthCellOut: {
    opacity: 0.3,
  },
  monthCellFuture: {
    opacity: 0.35,
  },
  monthDay: {
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  monthDaySelected: {
    fontFamily: fonts.bodySemibold,
  },
  monthDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  monthTotal: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginTop: 12,
  },
  monthDetail: {
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 6,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  preset: {
    borderWidth: 1,
    borderColor: colors.border,
    ...rounded(radius.pill),
    minHeight: 38,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceTab: {
    flex: 1,
  },
  // The Tracks / Streaming row: clear of the mood cards above and the player below.
  sourceRow: {
    marginTop: 16,
    marginBottom: 16,
  },
  sourceRowFirst: {
    marginTop: 0,
  },
  fields: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
  },
  fieldInput: {
    flex: 0,
    marginTop: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  panelTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.timeMedium,
    fontSize: 22,
  },
});
