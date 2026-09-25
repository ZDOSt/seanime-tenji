# Changelog

All notable changes to this project will be documented in this file.

## v0.3.8 (Android TV)

- ✨ AIOStreams: Kitsu / IMDb tabs on the results sheet. Some anime resolve to the wrong season
  through Kitsu (a sequel whose season shares its IMDb entry), which used to mean changing the
  plugin's "Preferred Media ID" by hand in the Extensions page. The tabs now do that for you: they
  switch the plugin's own setting and ask for the same episode again, so only one ID is queried at a
  time and the plugin itself is never modified
- 🦺 The tab row shows a brief "switching…" state while the plugin reloads (changing its setting
  restarts it), and re-asks for the episode if the plugin was not listening yet

## v0.3.3 (phones/tablets)

- 🦺 Player (Android): the picture returns after the screen was turned off and back on — the
  player now re-attaches its video surface, forces a fresh frame, and reloads in place when mpv
  still reports no video (previously the audio kept playing over a black screen)

## v0.3.7 (Android TV)

- 🦺 External player: streams that only play with extra request headers (a referer for an HLS
  source, for example) are no longer handed over — an Android intent carries no headers, so the
  player opened, showed nothing and reported no error. Those play in the built-in player instead,
  which sends the headers.
- ⚡️ Settings → Player: "Test External Player" hands a short public sample clip to the chosen app,
  which tells a broken handoff apart from an unplayable stream in one press.

## v0.3.6 (Android TV)

- 🦺 External player (Android TV): a stream that can only fail there is no longer handed over —
  URLs that require a login are played by the built-in player (which sends the headers), and
  loopback URLs are refused when the server runs elsewhere
- ⚡️ External player: the handoff is logged (player, URL with the token masked, HTTP status of
  a reachability probe) so a handoff that opens an idle player can be diagnosed from Profile → Logs
- 🦺 External player (Android): more intent shapes are attempted for mpv, and each attempt is
  logged to logcat

## v0.3.5 (Android TV)

- 🦺 Player (Android TV): the player UI no longer disappears when the picture-in-picture
  state is reported incorrectly (the activity pausing used to be treated as PiP)
- 🦺 Player (Android TV): layout is measured from the live window, so overlays and dialogs
  cannot be squashed into a stripe or left half-clipped after a window change
- ⚡️ Player (Android TV): pressing BACK twice quickly always leaves the player, even when
  the exit prompt is not visible
- ⚡️ Player (Android TV): on-screen diagnostics (window/screen size, PiP state from JS and
  native, video view size, mpv output) — shown with "Playback stats" and automatically when
  a size/PiP mismatch is detected

## v0.3.0

- 🎉 New Releases: AndroidTV and tvOS
- ⚡️ Player: Buffered progress in seek bar
- ⚡️ Player (Android): SubRip subtitles now get a usable fallback font
- ⚡️ Player: Playback stats
- ⬆️ Upgraded to React Native 0.85 / Expo SDK 56

## v0.2.0

- ⚡️ UI: Handling of larger screen sizes
- ⚡️ Player(Android): Use gpu-next for hardware decoding by default
- ⚡️ Player(Android): Support for mpvEX
- ⚡️ Playback: Support watching downloaded episodes in external player
- ⚡️ Player(iOS): Pause playback when phone locks
- ⚡️ Torrent streaming: Preload next episode when enabled
- ⚡️ Debrid streaming: Show cached torrent indicator
- ⚡️ Discover: Aired Recently section
- ⚡️ Schedule: Missing and upcoming episodes
- ⚡️ Search: Tag and minimum score filters
- ⚡️ My List: Tag filters
- 🦺 Download: Handling of episodes with multiple files
- 🦺 Playback: Fixed continuity updates using stale progress
- 🦺 Settings: Refresh app data when server settings change
- 🦺 Discover: Fixed sections loading the wrong data
- 🦺 UI: Restrict anime entry bottom bar width on larger screens
- 🦺 Core: Added cancellation and timeout handling
- 🦺 Core: Refactored websocket handling

## v0.1.21

- ⚡️ Refactored support for mobile server downloads
- ⚡️ Android: Trust local certs
- 🦺 iOS: Potential fix for orientation restoration issues

### OTA (6/23):

- 🦺 Bypass offline mode check when changing server url
- 🦺 Player: Fixed double tap backward seek #10

## v0.1.20

- 🎉 Alpha release

### OTA (6/10):

- ⚡️ Player: Option to disable subtitles
- ⚡️ Torrent search: Support for search across providers
- ⚡️ Torrent search: Redesigned layout and smart search params
- ⚡️ Manga: Improved zooming handling
- 🦺 Local Manga: Fixed cache pollution causing incorrect chapters being shown
- 🦺 Android: Use stepper instead of slider for score
- 🦺 Logs: Fixed log entry size causing crashes
- 🦺 Player: Fixed overlays being stuck
- 🦺 Player: Fixed persistent homebar indicator on iOS
- 🦺 Home: Fixed part of the library not showing up when switching off offline mode

### OTA:

- ⚡️ Manga: Double tap to zoom in/out
- 🦺 Auth: Bypass status check when switching to offline mode
- 🦺 iOS: Fixed websocket issues causing stream starts to fail
- 🦺 Android: Add dynamic safe insets to navbar
