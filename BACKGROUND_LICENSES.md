# Background Video Attribution

This project uses third-party video assets for full-screen ambient backgrounds in `assets/backgrounds/videos/`. Unlike `MUSIC_LICENSES.md`, these are not yet all cleared — see Status below each table.

## Scene loops (2026-11-11 batch)

Added 2026-11-11, compressed the same day from raw exports (up to 71MB each) down to 1080p/30fps H.264 (CRF 26, audio stripped since the app's own audio system handles sound), then renamed from their original UUID-style export names to the descriptive names below. Compression and renaming did not change ownership or licensing — the license for each file still needs to be filled in here before it ships.

| File (was) | Length | License | Source / artist |
| :--- | :----- | :------ | :--------------- |
| `desktop_windows.mp4` (`2c824cae-3cc3-4abe-b67f-047b20726781.mp4`) | 25s | _paste here_ | _paste here_ |
| `cherry_blossom_cottage.mp4` (`83886F72-A68D-4249-BEF6-80CECCAD0C44.mp4`) | 16s | _paste here_ | _paste here_ |
| `flower_hill_girl.mp4` (`8ABEC934-6865-4F1C-BD5F-2893AC6CAE01.mp4`) | 30s | _paste here_ | _paste here_ |
| `cyberpunk_desk.mp4` (`9288727d-4d3a-4830-91ad-09ca1f300a24.mp4`) | 5s | _paste here_ | _paste here_ |
| `rainy_cottage.mp4` (`DCC73F26-C0AB-461C-B801-5981E4041992.mp4`) | 16s | _paste here_ | _paste here_ |
| `cozy_lofi_room.mp4` (`F120C014-CC3E-48B3-80C9-C1A0D7AA35D1.mp4`) | 25s | _paste here_ | _paste here_ |
| `turtle_lily_pond.mp4` (`ad249c50-39c0-48f4-b72d-02e9e4c4afe9.mp4`) | 22s | _paste here_ | _paste here_ |
| `twilight_skyline.mp4` (`twilight_skyline_10s_loop_2x_upscaled.mp4`) | 10s | _paste here_ | _paste here_ |

**Status.** Not cleared, but now wired into the desktop `ScenePicker`'s "Videos" group (`components/wickglow/features/background/video-art.ts`), each with a generated thumbnail in `assets/backgrounds/thumbnails/`, so a user can already select and play any of them. At least three of the eight carried a baked-in "recorded by moewalls.com" watermark before compression (moewalls.com's own terms restrict downloads to personal, non-commercial use and prohibit redistribution without the original artist's written permission), so a real commercial-use license from the original artist is needed, not just a MoeWalls download link. **Fill in every License/Source cell below before a release build ships.**

## Pixel-art trio

`aurora_4k.mp4`, `meadow_4k.mp4`, `mountain_4k.mp4` in `assets/backgrounds/pixel-art/` — licensing still open, tracked as `docs/agent/progress.md` Next-up item 4.

## Existing cleared video

`270983_medium.mp4` in `assets/backgrounds/videos/` — licensing status same as above, not yet recorded here.
