# Audio & Music Attribution

This project uses third-party audio assets for background music, ambient sounds, and interface effects.

## Lofi Tracks

All lofi tracks are sourced from [Free To Use Music](https://freetouse.com) under Creative Commons / Royalty-Free license terms.

| Track Name        | Artist     | Source        |
| :---------------- | :--------- | :------------ |
| Life is Beautiful | Aylex      | freetouse.com |
| Affogato          | Lukrembo   | freetouse.com |
| Bake A Pie        | Lukrembo   | freetouse.com |
| Bread             | Lukrembo   | freetouse.com |
| Butter            | Lukrembo   | freetouse.com |
| Chocolate         | Lukrembo   | freetouse.com |
| Donut             | Lukrembo   | freetouse.com |
| Jay               | Lukrembo   | freetouse.com |
| Rose              | Lukrembo   | freetouse.com |
| Sunflower         | Lukrembo   | freetouse.com |
| This Is For You   | Lukrembo   | freetouse.com |
| gingersweet       | massobeats | freetouse.com |
| honey jam         | massobeats | freetouse.com |
| rose water        | massobeats | freetouse.com |
| Vibing            | Pufino     | freetouse.com |

## Ambient Audio

All nine ambient loops are sourced from [Freesound](https://freesound.org), and all nine ship in the app:

| Loop        | File           | Mixer label | Author     | Source                          | Licence       |
| :---------- | :------------- | :---------- | :--------- | :------------------------------ | :------------ |
| Rain        | `Rain.ogg`     | Rain        | kijjaz     | [856405](https://freesound.org/s/856405/) | CC0 1.0 |
| Cafe        | `Cafe.ogg`     | Cafe        | lunchmoney | [380202](https://freesound.org/s/380202/) | CC0 1.0 |
| Fireplace   | `Fireplace.ogg`| Fireplace   | NoOneIsReal| [387128](https://freesound.org/s/387128/) | CC0 1.0 |
| Wind        | `Wind.ogg`     | Wind        | ec36power  | [640631](https://freesound.org/s/640631/) | CC BY-NC 4.0 |
| Clock tick  | `ClockTick.ogg`| Clock       | pbimal     | [534094](https://freesound.org/s/534094/) | CC0 1.0 |
| Brown noise | `BrownNoise.ogg`| Brown noise| Bliss      | [8132](https://freesound.org/s/8132/)     | CC BY-NC 4.0 |
| Forest      | `Forest.ogg`   | Forest      | JW_Audio   | [860450](https://freesound.org/s/860450/) | CC BY 4.0 |
| Keyboard    | `Keyboard.ogg` | Keyboard    | M4taiori   | [331428](https://freesound.org/s/331428/) | CC BY 3.0 |
| Waves       | `Waves.ogg`    | Waves       | mugwood    | [164151](https://freesound.org/s/164151/) | CC BY 4.0 |

**Outstanding.** Author, URL and licence are now confirmed for all nine files (2026-11-03). Two problems remain before release, and `AGENTS.md` forbids shipping unlicensed audio, so both are release blockers:

1. **Commercial use is not permitted for two loops.** `Wind.ogg` and `BrownNoise.ogg` are CC BY-NC 4.0, which forbids commercial use. If LumiFi will ever be monetised, or if a store distribution counts as commercial, these two must be replaced with CC0 or CC BY recordings. CC0 and CC BY alternates are easy to find on Freesound.
2. **The four CC BY loops need in-app attribution.** `Forest.ogg`, `Keyboard.ogg` and `Waves.ogg` (plus any CC BY replacement for the two above) require the author to be credited wherever the audio is distributed, which for an app means a reachable credits screen. `MUSIC_LICENSES.md` alone is not user-visible. No credits screen exists yet.

The four CC0 loops (rain, cafe, fireplace, clock tick) need no attribution and carry no restriction.

One extra restriction: `Forest.ogg` (JW_Audio) states the recording "may not be used for AI training or any associated practices." That does not affect shipping the app, but it does rule out using this file as model training data.

## Sound Effects (SFX)

All sound effects are sourced from [Freesound](https://freesound.org).

- **Chime** (`chime.mp3`) – Freesound.org. This is the session-end notification sound. Android only accepts a lowercase file name.
- **Session End Chime** (`SessionEndChime.MP3`) – Freesound.org. Plays in the app when a session ends.
