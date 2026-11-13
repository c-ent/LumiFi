import { StyleSheet } from 'react-native';
import { colors, fonts, radius, rounded } from '@/src/theme/tokens';
import { glassPanel } from '@/components/wickglow/shared/panel-styles';

// The small glass cards that float over the app for the account: sign-in and
// the first sign-in choice. Same glass and size on phone, tablet and desktop
// (owner, 2026-11-13), like the session-end card.
export const cardStyles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(5, 3, 15, 0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    ...glassPanel,
    ...rounded(radius.sheet),
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 18,
  },
  close: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  lead: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    ...rounded(radius.sm),
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 12,
  },
  primary: {
    minHeight: 48,
    ...rounded(radius.lg),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryText: {
    color: colors.textInverse,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
  },
  secondary: {
    minHeight: 48,
    ...rounded(radius.lg),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
  },
  secondaryText: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 14,
  },
  link: {
    minHeight: 36,
    justifyContent: 'center',
  },
  linkText: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  error: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  info: {
    color: colors.success,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  or: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    ...rounded(radius.md),
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
  },
  optionTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  optionMeta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 3,
  },
});
