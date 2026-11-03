# UI

Read this when touching UI, styling, or layout. Token values live in `src/theme/tokens.ts`. Keep this table in sync with that file.

## Theme
Dark only for v1: deep violet-black backgrounds, warm light as the one accent, soft glass surfaces. The timer is the hero. Light is the subject: a candle or lamp, a glow, a flame that dims when paused. Values below are the Amber mood from the phone prototype.

## Color tokens
No hardcoded hex values. React Native has no CSS variables, so tokens are keys in a typed theme object.

| Role | Token | Value |
| --- | --- | --- |
| Page background (top, middle, bottom) | `colors.bgBase`, `bgMid`, `bgGlow` | `#0E0A17`, `#1D1328`, `#35201F` |
| Surface (sheet) | `colors.bgSurface` | `#140F1C` at 90% opacity |
| Card fill | `colors.bgCard` | white at 6% opacity |
| Primary text | `colors.textPrimary` | `#F8F1E8` |
| Muted text | `colors.textMuted` | `#F8F1E8` at 62% opacity |
| Text on light fills | `colors.textInverse` | `#1D1205` |
| Primary accent | `colors.accent` | `#FFB454` |
| Border | `colors.border` | white at 13% opacity |
| Flame (core, mid, outer) | `colors.flame1`, `flame2`, `flame3` | `#FFE3A1`, `#FFA63D`, `#FF6A2B` |
| Success / XP | `colors.success` | `#62D0C0` |
| Error | `colors.error` | `#FF8F8F` (proposed, not in a prototype yet) |
| Break wax (body, shadow, melt) | `breakWax.body`, `breakWax.shadow`, `breakWax.melt` | `#D8EEE9`, `#A8C9C2`, `#BFE3DA` |

### Moods
A mood replaces the background, flame and accent tokens only. Moonlit is stored as `moon`. Wax, dish and glow stay on each mood in `components/lumifi/theme.ts`; they are candle illustration colors. Desktop scenes stay separate.

| Mood | Background top, mid, glow | Flame core, mid, outer | Accent |
| --- | --- | --- | --- |
| Amber (default) | `#0E0A17`, `#1D1328`, `#35201F` | `#FFE3A1`, `#FFA63D`, `#FF6A2B` | `#FFB454` |
| Moonlit | `#070A1A`, `#121A40`, `#1F2C5E` | `#F1F6FF`, `#A6C6FF`, `#6F9CFF` | `#A6C6FF` |
| Spirit | `#06130E`, `#0E2A1F`, `#173D2D` | `#EAFFF3`, `#8DFFC4`, `#3DDC97` | `#7BE8B0` |

## Typography
| Role | Font | Token |
| --- | --- | --- |
| UI text | Figtree 400 | `fonts.body` |
| UI text, medium | Figtree 500 | `fonts.bodyMedium` |
| UI text, semibold | Figtree 600 | `fonts.bodySemibold` |
| Timer digits | Outfit 200 | `fonts.time` |
| Headings | Outfit 300 | `fonts.timeLight` |
| Timer, medium | Outfit 500 | `fonts.timeMedium` |

Use tabular figures for every time and counter (`fontVariant: ['tabular-nums']`). The timer uses weight 200 at a very large size and stays the largest element on every layout.

## Border radius
| Context | Token |
| --- | --- |
| Inline controls, inputs | `radius.sm` = 12 |
| Cards and panels | `radius.md` = 16 |
| Primary buttons | `radius.lg` = 18 |
| Bottom sheet (top corners) | `radius.sheet` = 28 |
| Pills and chips | `radius.pill` = 999 |

## Layout patterns
- Phone: the candle fills the middle, the time sits under its dish, and a bottom sheet holds the mode buttons, the main button and the tool dock. The sheet is about 214dp collapsed and up to 84% of the height open, with a drag handle.
- Tablet: split view. Timer on one side, tasks, sounds and quests always visible on the other. On Android and iOS this is also the landscape layout, because a phone or tablet is never wider than 840 on its shorter side.
- Desktop: full-screen gradient scene, very large timer, a row of glass icon buttons along the bottom, panels as a card above the dock. Web uses this above 840 wide.
- Candle height maps to `remaining / total`. Four small candles show sessions toward a long break, a lit one is a completed session. Break candles use a cooler wax color.
- Focus mode: about 4 seconds after a focus session starts with no touch, fade everything except the candle, the time and the main button. Any touch brings it back. Users can disable it.
- Session end: the flame dims softly and a soft chime plays. No harsh alarm. A card shows one short encouraging message with "Start break" and "Later". "Later" leaves the next candle ready but not lit.
- On web, use CSS `env(safe-area-inset-*)` for safe areas.
