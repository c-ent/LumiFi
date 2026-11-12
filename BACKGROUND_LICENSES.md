# Background Video Attribution

This project uses third-party video assets for full-screen ambient backgrounds in `assets/backgrounds/videos/`. Unlike `MUSIC_LICENSES.md`, these are not yet all cleared — see Status below each table.

## Scene loops (2026-11-11 batch)

Added 2026-11-11, compressed the same day from raw exports (up to 71MB each) down to 1080p/30fps H.264 (CRF 26, re-encoded 2026-11-12 at CRF 20 from the originals in `videos/original/`, keeping 24fps sources at 24; audio stripped since the app's own audio system handles sound), then renamed from their original UUID-style export names to the descriptive names below. Compression and renaming did not change ownership or licensing — the license for each file still needs to be filled in here before it ships.

| File (was) | Length | License | Source / artist |
| :--- | :----- | :------ | :--------------- |
| `flower_hill_girl.mp4` (`8ABEC934-6865-4F1C-BD5F-2893AC6CAE01.mp4`) | 30s | Permission from Wallper: the owner asked Wallper and reports they said these may be used (2026-11-11). Exact reply not on file yet; paste it below. Wallper is the platform, not the artist | "Field of cherry blossom": https://www.wallper.app/wallpaper/pixelart/field-of-cherry-blossom-8abec934-6865-4f1c-bd5f-2893ac6cae01 |
| `cyberpunk_desk.mp4` (`9288727d-4d3a-4830-91ad-09ca1f300a24.mp4`) | 5s | Permission from Wallper: the owner asked Wallper and reports they said these may be used (2026-11-11). Exact reply not on file yet; paste it below. Wallper is the platform, not the artist | "Cyber Hacker", uploaded by "biggjohnson2k": https://www.wallper.app/wallpaper/scifi/cyber-hacker-9288727d-4d3a-4830-91ad-09ca1f300a24 |
| `rainy_cottage.mp4` (`DCC73F26-C0AB-461C-B801-5981E4041992.mp4`) | 16s | Permission from Wallper: the owner asked Wallper and reports they said these may be used (2026-11-11). Exact reply not on file yet; paste it below. Wallper is the platform, not the artist | "Lofi", uploaded by "Matt": https://www.wallper.app/wallpaper/other/lofi-dcc73f26-c0ab-461c-b801-5981e4041992 |
| `frog_lily_pond.mp4` (`ad249c50-39c0-48f4-b72d-02e9e4c4afe9.mp4`) | 22s | Owner says it is fine to use, and Wallper said it may be used (2026-11-11). No written permission from the artist on file yet | Artist: Abi Toads (Instagram `abi.toads`). Downloaded as "Frog Relaxing in Pond", uploaded to Wallper as "Henry Hui": https://www.wallper.app/wallpaper/animals/frog-relaxing-in-pond-ad249c50-39c0-48f4-b72d-02e9e4c4afe9 |

**Status (2026-11-11).** On 2026-11-12 the owner had `desktop_windows.mp4` ("Blue,Lofi boy"), `cherry_blossom_cottage.mp4` ("Spring lofi") and `twilight_skyline.mp4` (owner-made) removed from the app. The remaining four are wired into the desktop `ScenePicker`'s "Videos" group (`components/wickglow/features/background/video-art.ts`), each with a thumbnail in `assets/backgrounds/thumbnails/`. All four came from Wallper; the owner is shipping them on Wallper's permission (below), not on a licence from each artist. An earlier note here said three carried a moewalls.com watermark; the originals were later traced to Wallper.

**Sources found 2026-11-11.** Six of the original filenames are Wallper wallpaper ids (`wallper.app`, a paid live-wallpaper app for Mac); the sitemap lists them under `cdn.wallper.app/wallper-user-generated/`, and each video's length matches its page. The names above are Wallper usernames, not confirmed artists. Wallper's terms (`https://www.wallper.app/legal/terms`) say uploaders keep their rights and license them to Wallper only, and give app users a licence to the app on up to three personal Macs, with no right to redistribute. Those terms alone do not clear the videos for Wickglow; see Wallper's permission below.

**Wallper permission, 2026-11-11.** The owner asked Wallper about the six Wallper videos above and reports that Wallper said they are okay to use. Record Wallper's reply here word for word, with its date and where it came from (email or support chat):

> _paste Wallper's reply here_

Wallper's own terms say uploaders keep ownership and license their content to Wallper "in connection with the Service", so Wallper's yes is good-faith permission from the platform, not a licence from each artist. If an artist objects, remove that video in the next release.

## Scene loops (2026-11-12 batch)

Added 2026-11-12 from raw exports in `assets/backgrounds/videos/original/` (mostly 4K, 1 to 71MB each, about 246MB in all) and encoded to 1080p H.264 High, CRF 20 (first CRF 26, raised the same day at the owner's request for about twice the bitrate), preset slow, at most 30fps (24fps sources kept at 24), audio stripped, faststart. About 40MB in all. Thumbnails are a frame at 1s, 480px wide. `sunlit_meadow.mp4` (`bcb295b7…`, looked like a Studio Ghibli frame) was encoded too but removed the same day at the owner's request. Source and licence for the remaining seven are **unknown**: the owner supplied the files without a source.

| File (was) | Length | License | Source / artist |
| :--- | :----- | :------ | :--------------- |
| `snowy_sled.mp4` (`2d0d311f-1486-414b-aa40-fc098ed96745.mp4`) | 11s | Unknown | Unknown. Hand-painted snowy slope, a small frog on a sled |
| `blossom_grove.mp4` (`43d863ae-0674-4a7d-8d89-40b99433437e.mp4`) | 15s | Unknown | Unknown. Looks like a Minecraft cherry grove with shaders: Mojang's assets, so check Mojang's usage guidelines before shipping |
| `hilltop_picnic.mp4` (`44fd28b2-3ee6-4b47-ae88-49e3455d8aad.mp4`) | 20s | Unknown | Unknown. Green hill, picnic blanket, clouds |
| `mossy_branch.mp4` (`5037c286-9372-4693-8679-dcf3d73134db.mp4`) | 35s | Unknown | Unknown. Close-up of a moss-covered branch |
| `night_hills.mp4` (`8a926e43-a5a1-4e27-82a8-d49f2548470a.mp4`) | 15s | Unknown | Unknown. Rolling green hills at night. The original has a small watermark in the bottom-right corner; identify it |
| `pixel_coder.mp4` (`bbc246eb-bd25-448d-bf7a-1b1a8c730b54.mp4`) | 50s | Unknown | Unknown. Pixel character at a laptop with a code window |
| `moonlit_city.mp4` (`db80ce82-9bf7-4531-b3c2-c3ab5759cd18.mp4`) | 20s | Unknown | Unknown. Purple city under a large moon |

**Status (2026-11-12).** All seven are in the desktop `ScenePicker`'s "Videos" group. None is cleared. Record each source and licence here before a release build, and remove any that cannot be cleared.

## Pixel-art trio

Source: "Nature Landscapes Free Pixel Art" by Free Game Assets (CraftPix), https://free-game-assets.itch.io/nature-landscapes-free-pixel-art . The pack is 8 PNG parallax backgrounds; the videos in `assets/backgrounds/pixel-art/` are animated versions of them. Asked "What is the license?" on that page, the creator linked https://craftpix.net/file-licenses/ .

That licence (checked 2026-11-11), for free assets: use in any number of personal and commercial projects; modify them and include them in "game projects, elements for websites, applications"; sell and distribute games with them. "No attribution or link back to this site is required, however any credit will be highly appreciated." Not allowed: reselling or redistributing the art files themselves, or letting the user save or export the artwork from the app. Wickglow only shows them as a background, which is allowed. Also not allowed: using them to train AI.

| File | Matches | Status |
| :--- | :------ | :----- |
| `mountain_4k.mp4` | The snowy mountain and pine valley preview on the itch.io page | Cleared (CraftPix licence) |
| `meadow_4k.mp4` | The pine and bush meadow preview on the itch.io page | Cleared (CraftPix licence) |
| `aurora_4k.mp4` | Not in the four previews on the page; owner confirmed 2026-11-11 it is in the downloaded zip | Cleared (CraftPix licence) |

Who made the animated versions is not recorded. If someone other than the owner animated them, the CraftPix licence still covers the art; note the source of the animation here if known.

## Classic video

| File | Length | License | Source / artist |
| :--- | :----- | :------ | :--------------- |
| `270983_medium.mp4` (the "Classic" scene) | Not recorded | Pixabay Content License, no attribution needed (as supplied by the owner, 2026-11-09). Pixabay page URL not on file yet; add it | "Video by MrBones03 from Pixabay". Pixabay video id 270983, inferred from the filename and not checked against the page |

**Status.** Recorded from the owner's note when the file was added (see `docs/agent/completed.md`, 2026-11-09). Not yet checked against the Pixabay page: add the page URL and confirm the artist before release.
