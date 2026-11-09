import { colors, fonts, radius, rounded } from '@/src/theme/tokens';
import { StyleSheet } from 'react-native';

// Shared chrome for the desktop Progress card. Phone and tablet keep panel-styles.
export const progressWide = StyleSheet.create({
  card: {
    padding: 14,
    ...rounded(radius.lg),
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  label: {
    marginTop: 0,
    marginBottom: 10,
    fontSize: 11,
    letterSpacing: 1.1,
  },
  hint: {
    marginTop: 0,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 20,
  },
  field: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
    minHeight: 46,
    marginTop: 0,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: colors.bgInset,
    fontSize: 14,
  },
  barTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
  },
  barThin: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.timeMedium,
  },
});
