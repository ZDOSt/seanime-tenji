# Changelog

All notable changes to this project will be documented in this file.

## v0.3.14 (phones/tablets) and v0.3.18 (Android TV)

- ✨ AIOStreams results now show the **full metadata**, matching the desktop panel: provider, complete
  filename, file size (and the plugin's cached/debrid lines) instead of being cut off after two lines.
  The size is also added to the summary row, so a release can be judged on the TV without guessing
- 🔍 The cards stay readable: the release name is limited to three lines, the metadata below it is shown
  in full

## v0.3.13 (phones/tablets) and v0.3.17 (Android TV)

- 🦺 Android TV: the AIOStreams ID tabs are properly remote-navigable — a focused tab now gets the
  brand border and a filled background, so you can always see where the D-pad is before pressing OK
  (previously a focused but inactive tab only widened its border, which was indistinguishable from
  being unfocused)

## v0.3.12 (phones/tablets) and v0.3.16 (Android TV)

- ✅ AIOStreams Kitsu / IMDb tabs confirmed working: switching queries the plugin with the chosen ID and
  the results change with it (verified on the TV: 14 results for Kitsu, 23 for IMDb, both ways)
- 🧹 The temporary diagnostic line is gone; the sheet still shows any error the plugin itself raises
- 🩹 Tab switching no longer relies on timestamps or on the app's lagging settings query — an answer is
  taken as soon as the plugin finishes a search, and re-asks are counted, not timed

## v0.3.11 (phones/tablets) and v0.3.15 (Android TV)

- 🩹 **AIOStreams tabs: the answer is no longer thrown away.** The on-device readout showed the plugin
  *had* switched and answered (14 Kitsu results), but a guard compared "answered?" against a timestamp
  and rejected the correct answer, so the sheet stayed on "switching" and then reported that the plugin
  never answered. The switch now tracks answers with a counter, which also removes a same-millisecond
  ambiguity that could make it skip the re-ask instead (the two failure modes were the same flaw)

## v0.3.10 (phones/tablets) and v0.3.14 (Android TV)

- 🩹 **AIOStreams tabs actually switch now.** The app never re-asked the plugin after changing the ID:
  the "has the plugin answered yet?" check was compared against a timestamp that was still zero, so an
  answer from the *previous* search looked like "already answered" and every re-ask was skipped. The
  plugin was therefore never asked for the new ID and the list stayed as it was — the diagnostic line
  showed it plainly (`sends=1`). The switch now re-asks immediately, and a regression test drives a
  switch after a completed search to make sure the request is really sent

## v0.3.9 (phones/tablets) and v0.3.13 (Android TV)

- 🔍 AIOStreams tabs: the results sheet now shows a small diagnostic line (messages received, the last
  message's state, how many requests were sent, how many were dropped, and what the picker decided) and
  any message the plugin itself raises — so a silent "no links" can be diagnosed from a screenshot
- 🩹 Answers that belong to the *previous* ID are refused: while the plugin still reports the old mode,
  a finished search is the old one finishing, and showing it is what made the list look unchanged

## v0.3.8 (phones/tablets) and v0.3.12 (Android TV)

- 🩹 AIOStreams tabs: a switch can no longer wedge the picker. Tapping the other ID while a switch is
  still in flight now supersedes it instead of being ignored, and closing the sheet cancels it — so
  the tabs stay responsive and "can't switch back" cannot happen
- ✅ Verified against the live server with a real mobile client: after the plugin restarts,
  switching to IMDb resolves `tt16255458 · S2 · E11` and delivers 23 results

## v0.3.7 (phones/tablets) and v0.3.11 (Android TV)

- 🩹 AIOStreams tabs: the two tabs no longer swap places after a switch. The row was ordered by the
  plugin's *current* setting, so a successful switch re-ordered it — the tab you were about to tap
  moved, which looked like the sheet jumping back to the other ID by itself. The order is now fixed
  to whatever was configured when the picker opened
- ✅ Confirmed working in the server log: switching to IMDb resolves `tt16255458 · S2 · E11` and
  returns 23 results

## v0.3.6 (phones/tablets) and v0.3.10 (Android TV)

- 🩹 AIOStreams tabs, properly this time. The plugin identifies the anime from the episode it is
  given: if that episode does not carry its base anime, the plugin looks it up in its own caches —
  which are empty right after the restart that switching the ID causes. It then gives up silently,
  which is why both tabs ended up with no links. Tenji now always sends the anime with the request,
  so the plugin never depends on those caches
- 🩹 While switching, the sheet stays on "switching…" instead of blanking on the plugin's empty
  restart state, and it re-asks until the plugin answers (about 11 seconds of patience) instead of
  giving up after one attempt

## v0.3.5 (phones/tablets) and v0.3.9 (Android TV)

- 🩹 AIOStreams tabs: switching to the other ID no longer fails. Saving the plugin's setting restarts
  it, which briefly removed its episode tab and told the app AIOStreams was gone — the switch then
  gave up and snapped back to the old tab. The re-ask now ignores that gap, the tab stays on the mode
  you picked until the plugin confirms it, and a state from the previous search can no longer end the
  switch early

## v0.3.4 (phones/tablets)

- ✨ AIOStreams: Kitsu / IMDb tabs on the results sheet. Some anime resolve to the wrong season
  through Kitsu (a sequel whose season shares its IMDb entry), which used to mean changing the
  plugin's "Preferred Media ID" by hand in the Extensions page. The tabs now do that for you: they
  switch the plugin's own setting and ask for the same episode again, so only one ID is queried at a
  time and the plugin itself is never modified
- 🦺 The tab row shows a brief "switching…" state while the plugin reloads, and re-asks for the
  episode if the plugin was not listening yet
- 🦺 External player: streams that need headers the app cannot pass on (they would open a player to
  a black screen) are now refused with an explanation instead of being handed over
- ✨ Settings → Player → "Test External Player" plays a small sample clip, so the hand-off can be
  checked without hunting for an episode

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
