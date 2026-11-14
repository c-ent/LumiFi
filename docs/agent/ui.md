# UI

Read this when touching UI, styling, or layout. Token values live in `src/theme/tokens.ts`. Keep this table in sync with that file.

## Theme

Dark only for v1: deep violet-black backgrounds, warm light as the one accent, soft glass surfaces. The timer is the hero. Light is the subject: a candle or lamp, a glow, a flame that dims when paused. Values below are the Amber mood from the phone prototype. A light theme waits. Every color stays a token so that theme is a new token set later.

## Color tokens

No hardcoded hex values. React Native has no CSS variables, so tokens are keys in a typed theme object.

| Role | Token | Value |
| --- | --- | --- |
| Page background (top, middle, bottom) | `colors.bgBase`, `bgMid`, `bgGlow` | `#0E0A17`, `#1D1328`, `#35201F` |
| Surface (modal and panels) | `colors.bgSurface` | `#180E14` at 93% opacity |
| Surface, opaque | `colors.bgSurfaceSolid` | `#140F1C` |
| Card fill | `colors.bgCard` | white at 6% opacity |
| Scene control fill | `colors.bgControl` | white at 20% opacity. No longer used by any screen since 2026-11-13; kept as a token |
| Desktop dark glass | `darkGlass` in `shared/panel-styles.ts` | the phone tab bar's glass: `glassTint` with `glassEdge`, a `glassEdgeOn` top edge and a 16px blur on web. Desktop top pills, mode tabs, timer round buttons and dock buttons (owner request, 2026-11-13). The chosen mode tab and an open dock button stay solid white |
| Inset field | `colors.bgInset` | black at 28% opacity |
| Phone glass control | `colors.glassFill`, chosen `glassFillOn` | white at 7%, chosen 16%. Phone top pills, mode tabs, round buttons, sheet close button |
| Phone glass edge | `colors.glassEdge`, `glassEdgeOn` | white at 12%, and 30% for a chosen mode and the top edge of the tab bar and sheet |
| Phone glass surface | `colors.glassTint` (web), `glassTintSolid` (native) | `#100A18` at 50% with a 24px blur on web, 86% on native, which has no blur. Phone tab bar and sheet |
| Primary text | `colors.textPrimary` | `#F8F1E8` |
| Muted text | `colors.textMuted` | `#F8F1E8` at 62% opacity |
| Text on light fills | `colors.textInverse` | `#1D1205` |
| Primary accent | `colors.accent` | `#FFB454` |
| Border | `colors.border` | white at 13% opacity |
| Flame (core, mid, outer) | `colors.flame1`, `flame2`, `flame3` | `#FFE3A1`, `#FFA63D`, `#FF6A2B` |
| Success / XP | `colors.success` | `#62D0C0` |
| Error | `colors.error` | `#FF8F8F` (proposed, not in a prototype yet) |
| Break wax (body, shadow, melt) | `breakWax.body`, `breakWax.shadow`, `breakWax.melt` | `#D8EEE9`, `#A8C9C2`, `#BFE3DA` |
| Ambient effects (embers, fire glow, firefly halo and core, tide bands) | `ambientFx.embers`, `fireGlow`, `fireflyHalo`, `fireflyCore`, `tideMain`, `tideLow` | `#FFB36B` / `#FF8A3D` / `#FFD08A`, `#FF7A2E`, `rgba(220, 240, 140, 0.18)`, `rgba(235, 248, 170, 0.95)`, `#9FD8E8`, `#C8ECF2` |

Streaming badges use `streamMark`: Spotify `#7BE8B0`, YouTube and YouTube Music `#FF9F9F`, Apple Music `#F5A3C7`. They name the service. The playing card's header shows the Spotify, YouTube, or Apple Music artwork from `assets/images/icons` at the left of the service name.

### Moods

A mood (phone/tablet) or scene (desktop) replaces the background, flame/orb and accent tokens only. Moonlit is stored as `moon`. Wax, dish and glow stay on each mood in `components/wickglow/theme.ts`; they are candle illustration colors, phone/tablet only. Desktop scenes and phone/tablet moods are the same themes, same names, same colors (owner decision, 2026-11-14; this used to be an open question, see `progress.md`). `moods` in `src/theme/tokens.ts` is the one source: a scene's gradient stops (`b1/b2/b3`) are a mood's background (`bgBase/bgMid/bgGlow`), and a scene's three drifting orbs (`o1/o2/o3`) are a mood's three flame colors (`flame1/2/3`). Both platforms default to Amber (Dusk and Spirit were removed 2026-11-14, owner request; Dusk had been desktop's default, so desktop now defaults to Amber too).

| Theme | Background top, mid, glow (desktop gradient stops) | Flame core, mid, outer (desktop orbs) | Accent |
| --- | --- | --- | --- |
| Amber (default) | `#0E0A17`, `#1D1328`, `#35201F` | `#FFE3A1`, `#FFA63D`, `#FF6A2B` | `#FFB454` |
| Moonlit | `#070A1A`, `#121A40`, `#1F2C5E` | `#F1F6FF`, `#A6C6FF`, `#6F9CFF` | `#A6C6FF` |
| Rose | `#14070F`, `#2E0F22`, `#4A1A36` | `#FFF0F6`, `#FFA6C9`, `#FF6FA5` | `#FFA6C9` |
| Violet | `#0C0716`, `#1E1238`, `#33205A` | `#F6F0FF`, `#C9A6FF`, `#9A6BFF` | `#C4A6FF` |
| Ash | `#0B0B0D`, `#18181C`, `#26262C` | `#FFFFFF`, `#E4E2DC`, `#A9A59C` | `#E4E2DC` |
| Forest | `#06191A`, `#123D2C`, `#1F3A22` | `#F3FFCB`, `#D7EE6E`, `#5A9B5E` | `#A7D96B` |
| Tide | `#041319`, `#0B3240`, `#0F4050` | `#E0FBFF`, `#5EE3F0`, `#1E7A98` | `#5EE3F0` |

`SceneId` is now just `MoodId`; a scene tile and a mood card for the same theme share one id. The order above is `moods`' own key order, which both pickers render in.

### Room lights

A mood also carries the candle illustration colors: `wax`, `waxS`, `melt`, `dish` and `dishHi` for the wax and dish. They live beside each mood in `components/wickglow/theme.ts`, so the room art reads from `MOODS` alone. The candle is the only light; the unlocked oil lamp and the window glow were removed with roadmap #2 on 2026-11-04.

Break wax (`breakWax`) is separate and stays cool on every mood.

## Icons

Stroke icons, 1.8 stroke width, 20dp. The library is Lucide: `lucide-react-native` on Android and iOS, `lucide-react` on web. Phosphor is the fallback if a weight Lucide lacks is needed. Neither package is installed yet. The icons in the app stay the hand-drawn set until that swap is the current item.

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

- Phone (owner choice, 2026-11-12: fixed tab bar): the level ring and streak pills on top (all open Stats), the Focus / Short / Long tabs under them, then the candle, the time, the cycle line and pips, a Reset / start / Skip row, and the focus chip. A five-tab bar (Tasks, Sounds, Stats, Mood, Timer; Quests moved into Stats and Mood got its own tab on 2026-11-14) floats just above the bottom edge as a glass pill. The phone has its own lighter glass (owner request, 2026-11-12: the desktop glass read as too white): the `glass*` tokens above, a brighter frost and the mood accent for the open tab and the chosen mode instead of solid white, and the start buttons in glass tinted with the mood accent. Picking a tab slides a glass sheet up under the tab bar, up to 80% of the height, holding only that tab's content under a one-line timer (time, mode, play or pause, close). The screen behind dims; tapping it, the close button, the handle or the open tab closes the sheet. While typing, the sheet sits on the keyboard. Zen fades the top bar, mode tabs, Reset, Skip and the tab bar. The phone Sounds tab opens on a Tracks / Ambient switch (no Streaming; that is desktop only) and shows one view at a time; Ambient holds the ambient sliders; the mood picker has its own Mood tab. The phone Stats tab opens on a Stats / Calendar switch the same way: Stats holds the level card, today's numbers, the last 7 days and the daily quests (headed "Quests"), and the Stats tab carries the open-quest dot; Calendar holds the month view.
- Tablet: split view. Timer on one side, tasks, sounds and quests always visible on the other. On Android and iOS this is also the landscape layout, because a phone or tablet is never wider than 840 on its shorter side.
- Desktop: full-screen gradient scene, very large timer, a row of glass icon buttons along the bottom. The mixer and scenes open as a 390-wide card above the dock on the left, and timer settings opens the same card on the right, because its gear sits in the right dock group. Music, Progress, Quests and Tasks each open as a centered card, inset from the edges, above the dock. Progress, Quests and Tasks are only as tall as their content, capped at the space above the dock, and scroll when the content is taller. The Music card is a fixed height, 620 or the space above the dock when that is shorter, and the card itself does not scroll. Every modal uses the translucent sheet color, a 28 radius, and a soft shadow, so the scene shows through. Web uses this above 840 wide. Music is two columns. The left column is now playing, a compact row with the cover, title, transport and volume, then the playlist label, then the track list in two columns inside its own scrolling box, then the note about adding files. Each row has a washed note tile, and the playing row carries a small meter. The right column is one streaming card that fills the height: the paste field, saved links, and the embed, which grows to fill whatever is left so the card does not jump when a player opens. The transport is previous, play or pause, next, and a repeat toggle; the repeat toggle carries the layout accent and a wash while it is on, and a muted repeat glyph while it is off. Phone and tablet keep the transport in one row with the volume slider. Progress is two columns: the level ring with today's stats and the 7-day chart on the left, the month calendar with a shade legend and the tapped day on the right. Daily quests have their own Quests card, opened from the star button in the dock, one column and narrower than Progress. Tasks is a centered card about 470 wide: an add field with an optional due date, then each task with a checkbox, a title that focuses it, a due date, subtasks, edit, and delete. Finished tasks sit under the open ones. Phone and tablet use that same list in one column. Their track rows use the same washed note tile, selected wash, and playing meter as the desktop rows, in one column. The dock's Full screen button appears only where the browser can request element fullscreen, so it is absent on native and on the browsers that cannot, and it shows an active state while the scene is fullscreen.
- Candle height maps to `remaining / total`. Four small candles show sessions toward a long break, a lit one is a completed session. Break candles use a cooler wax color.
- Account (2026-11-13, accounts and saving): an Account row on the stats surface, always there, never a prompt that interrupts a session. Phone: the last card in the Stats view, under the quests. Tablet: after the calendar in the side column. Desktop: the bottom of the Progress card's left column. Layout (owner request, 2026-11-13): one compact card with a round badge on the left (the email's initial, tinted with the layout accent), the text in the middle and the main action as a pill on the right, then a footer line under a thin divider. Signed out it reads "Account" and "Keep your progress on every device" with a Sign in pill that opens a small glass card over the app (email, password, Sign in or Create account, Forgot password, Continue with Google), the same on every layout. Signed in it shows the email (shortened in the middle if long) with a status dot and line under it (green "Progress saved to your account", a small spinner for "Connecting…", amber for offline or a pending choice, red for an error, with Try again under the row), a Sign out pill on the right, an amber "Email not confirmed" strip with Resend until the link is opened, and a muted "Delete account" link that opens an email request. When the device and the account both have progress on first sign-in, a glass card asks "Keep which progress?" with both summaries; "Decide later" closes it and the row's Choose button opens it again. Hidden when the build has no Firebase config.
- The Calendar block sits on the stats surface. On the phone it is under the 7-day chart in the Stats tab. On the desktop Progress card it is the right column, in its own card, with round month arrows, the streak under the month, a four-step legend, and the tapped day in a line under the grid. On tablet it closes the side column. A header row holds a previous-month arrow, the month and year with the streak, and a next-month arrow. Under it are a single-letter weekday row and six week rows of square day cells. A day is shaded in four steps (nothing, 1 to 24, 25 to 59, 60+) by tinting the layout accent, the deepest step at full accent; a padding day from an adjacent month is dimmed and unshaded. A day after today is dimmed like a padding day, is not pressable, and reads "not yet" to a screen reader; the next-month arrow is dimmed and disabled once the current month is on screen, since there is nothing ahead to look at. On the phone and tablet, today carries a small accent dot and a muted border, and the tapped day carries an accent border. On desktop, today carries a light border and the tapped day carries a success border. The padding days keep the grid the same height in every month. The month's own total is its own line under the grid. The tapped day's minutes and sessions sit in a separate card under that line, or the card invites a tap.
- Tasks are one list on the phone Tasks tab, the tablet tasks block, and the desktop Tasks card. The add row is a title field, an optional due date, and Add. On web the date is a calendar button that opens the browser date input and shows the short date once set; native keeps a typed `YYYY-MM-DD`. A task row is a checkbox, the title (press to focus, press again to clear), the due date, a subtask control, a target button, edit, and delete. The target button is the second way to focus, sitting just before edit: it is muted while the task is idle and takes the layout accent with a wash while it is focused, so the focused task is marked by a control and not only by the row's tint. Pressing either the title or the target focuses the task, and pressing it again clears the focus. The focused task's row takes the layout accent on its border and fill. A due date before today uses the flame color. Finished tasks are struck through, lose the date, the target and the edit control, and sit under the open ones. Subtasks indent under an open task, with their own checkbox, edit, and delete, and an add field. `+ Sub` becomes a done count once a task has subtasks. The hint under an open list shows a target glyph and says to click a task to focus on it, and that it then shows under the timer. An empty list says to add the first one. Daily quests stay on the Quests surface. Under that list, a quiet line says every focus minute also earns 2 XP, so the three bonuses are not the only reward.
- The line under the timer is the focus chip. In focus mode it is a control, not a caption: with no task it is a dashed pill with a task glyph and "Pick a task to focus on", and with a task it is a solid washed pill showing that task. It presses through to the task list — the phone Tasks tab, the desktop Tasks card, or the tablet side column, which is already on screen. It uses the layout accent and follows the zen fade. A break keeps the plain muted reminder line, which is not a control.
- Focus mode: about 4 seconds after a focus session starts with no touch, fade everything except the candle, the time and the main button. Any touch brings it back. Users can disable it.
- Session end: the flame dims softly and a soft chime plays. No harsh alarm. A card shows one short encouraging message with "Start break" and "Later". "Later" leaves the next candle ready but not lit.
- On web, use CSS `env(safe-area-inset-*)` for safe areas.
