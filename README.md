Warning: truncated output (original token count: 5058)
Total output lines: 226

# Dropzone

Version 2.0.3 · Windows x64

A Windows companion for League of Legends, Call of Duty, THE FINALS, WARDOGS, Rainbow Six Siege, and Sons of the Forest. Gray Zone Warfare is under construction.

## New in 2.0.3

- A first-use WARDOGS guide with highlighted controls and a Tutorial replay button.
- A transparent Blender opening that reveals the app in one window.

### Included from 2.0.2

- WARDOGS: Zestafona, offline community terrain estimates, manual heights and structure offsets.
- Prominent sight distance with an optional experimental SPH-2 height correction. Mortar correction remains unavailable without calibration.
- Clear gun/target placement, automatic gun lock, drag-to-pan, undo, fit shot and per-map state.
- A Blender-rendered 3D opening ident that transitions into the ready app.

See [accuracy limits, data provenance and validation](docs/WARDOGS-2.0.2.md). Community terrain and firing estimates are not independently game-validated.

## New in 2.0

- A centered game library with balanced cards and a sidebar for switching between games. Titles in development have their own section.
- A consistent charcoal interface with softer accents, clearer spacing, and more readable controls across game workspaces.
- A simpler League workspace that brings champion builds, filters, runes, and saved builds into the shared app layout.
- A compact Sources overview with game/status filters, grouped rows, and expandable dates, review preferences, and coverage details.
- Text-size shortcuts remain available while using the Sons of the Forest map.

The existing game tools, saved builds, map progress, targets, source preferences, and text settings retain their existing storage formats and app profile. See [the 2.0 release notes](docs/RELEASE-NOTES.md).

## Install or update

Run **Dropzone-Setup-2.0.0-x64.exe** from the [GitHub releases page](https://github.com/JadenTrask/dropzone-releases/releases). Once 2.0.0 is published, existing installed copies can receive it through **App updates**. Older portable copies need the installer once. The installer remains unsigned.

The release workflow builds and verifies the installer, blockmap, updater metadata, and full source archive before publication. See [the publishing guide](docs/PUBLISH-RELEASE.md). The existence of this source or guide does not mean the release has already been published.

## Previous changes in 1.2.2

Sons of the Forest joined the game library with an offline island map, 1,023 locations, 21 map layers, item search and local found-item progress. See [the map guide](docs/SONS-OF-THE-FOREST.md).

## Previous changes in 1.2.1

- Gray Zone Warfare now shows **Under construction**. Its map, missions, keys, patch notes and background refreshes are disabled.
- Existing GZW progress remains stored on your PC.

## Previous changes in 1.2.0 (GZW support is currently disabled)

- Gray Zone Warfare: 55 permanently labeled square LZ icons; 4,921 approved markers, including 57 key spawns, 291 intel locations, 168 buried caches and 10 Easter eggs. Search and filter marker layers, inspect coordinates, and focus mapped mission objectives.
- The marker source supplies 490 objective entries across 198 missions. Map-only missions are merged into the existing mission index without changing existing progress IDs. Full instructions open in source guides.
- Rainbow Six Siege: map-specific attack/defense lineups and ban suggestions, 78 operators and 14 maps listed as ranked by Ubisoft, PC/console statistics, official charts, patch notes and esports videos.
- Siege guides download from the Dropzone website. Updated guides need no installer rebuild, but editorial recommendations need review after balance changes. Official chart publication dates and measured patches remain visible; no live per-map rates are invented.
- New feeds check on every launch and every 15 minutes, preserving dated saved data when refresh fails.

**Map limitation:** GZW Tac Map’s image server returned HTTP 403. Authorized marker data is included, but the background remains the older, approximately calibrated terrain image. It may differ from the current game. A permitted image export is needed to replace it.

See `docs/GRAY-ZONE-WARFARE.md`, `docs/SIEGE.md`, and `docs/UPDATE-COVERAGE.md` for coverage.

## Earlier public changes

- A separate App updates page, with background downloads and an explicit Restart & update action.
- Per-source mute/unmute controls for review warnings; data checks and failure reporting continue.
- A two-second local splash and per-user Windows installer.
- Update-page alignment and the website footer fix in 1.0.2.

The user confirmed the earlier Beta 2 to 1.0.0 automatic upgrade worked. That historical result is not verification of a 2.0.0 installation or upgrade. Current checks and their limits belong in [the validation record](docs/VALIDATION.md).

The historical development notes below are retained from the source archive and apply only to the versions they name.

## Previous changes in 2.3.3

- Calculator navigation and utility bars use the same full-window edges as the map workspace, including at maximized sizes. Patch notes and other reading pages keep their centered layout.
- Reset the calculator title's inherited negative letter spacing and removed its duplicate game label. The title can wrap and cannot shrink vertically into neighboring controls.
- Map coordinates follow the cursor, stay inside the map edges, and update while panning or zooming.
- Corrected the old League settings text that still said the build cache lasted six hours. Refresh behavior from 2.3.2 is preserved.

## Previous changes in 2.3.2

- Aligned the global toolbar with the game tabs. League search and patch controls now sit beside the tabs; the extra header row is removed.
- The patch page features the newest dated update, including THE FINALS 11.8.0. Store updates keep their own label.
- Every connected feed makes a new network request on launch, even if its disk cache is recent. The same checks run every 15 minutes and after wake from sleep. Launching the EXE while the app is already open also starts a check.
- Failed refreshes remain visible when reopening pages. Retry after a minute on the next request, or use Refresh immediately. Failed checks keep the last valid data and its original timestamps.
- Update status now puts automatic coverage and exceptions at the top. Normal feed changes need no new ZIP. Team-comp choices, BO7 ranked eligibility, map images, provider code and new games still need maintained app data/code updates; there is no connected remote feed for those bundled choices.

See `docs/UPDATE-COVERAGE.md` for exact behavior and limitations.

## Previous changes in 2.3.1

- Removed the WAR DOGS Ballistics tab, weapon index and embedded ballistics websites.

## Previous changes in 2.3.0

- Calculator map fills the remaining window. Range, azimuth and elevation stay in the left sidebar; saved targets and help open in separate dialogs. Secondary sidebar panels can scroll at small window sizes or large text settings, without moving the map or firing readout.
- Smooth cursor-centered zoom, including mouse-wheel delta modes and reduced-motion support. Dragging, fitting, resizing, or keyboard panning cancels pending zoom motion.
- Always-visible minimum/maximum range legend with weapon-specific distances.
- THE FINALS preserves scroll position and keyboard focus when changing loadouts. Patch-page warning banners and section headings align with their content.
- WAR DOGS **Ballistics** tab: searchable/filterable/sortable weapon index, links to WARDOGS.tools TTK range graphs and MetaForge armor rankings, and optional sandboxed website views.
- WAR DOGS **Progression** tab: access to existing community account services. WARDOGS.tools uses Discord plus Steam for its account connection; sign-in happens on its website.

The Ballistics tab described above was removed in 2.3.1. Progression remains an external service; direct Steam progression retrieval is not connected. Dropzone does not receive account tokens or progression. Sources and findings are recorded in `docs/WARDOGS-INTEGRATIONS.md`.

## Previous changes in 2.2.0

- Added a personal **WARDOGS** calculator with Bakurani and Ozeti maps, Mortar and SPH-2 tables, range, compass azimuth, and game HUD elevation in MIL.
- Added pan/zoom, draggable gun and target pins, coordinate entry/paste, gun locking, minimum/maximum range rings, a ruler, radio tower labels, and saved targets with JSON import/export.
- Bundled 1,114 calibrated map tiles for offline use. Closer zoom can fetch extra detail from the same pinned map revision.
- Added **Patch notes** tabs for League, BO7, Warzone, MW4, THE FINALS, and WARDOGS. Official post previews refresh on launch; full notes open on the publisher's website. Steam announcements are distinguished from patch notes.
- Changed League items to compact rows with fixed 48px artwork and readable labels, removing the enlarged-image ho…558 tokens truncated…Ps.
- Added **Warzone → Ranked Resurgence**, using the actual ranked feed and its 13 complete attachment sets in the bundled snapshot.
- Restricted BO7 ranked primary builds to **M15 Mod 0** and **MPC-25**. The M15 has two source variants. The filter also applies to older feed caches and saved snapshots.
- Replaced the corrupt Peacekeeper Mk1 image. All 308 referenced bundled weapon images decode successfully. New online builds can fall back to a bundled image of the same weapon if their image fails.
- Replaced THE FINALS team builder with fixed **HHM** and **HML** recommendations. Each displays three complete player loadouts. No player or weapon selectors appear in the team-comp page.
- Added a persistent **Loadouts / Videos** tab for each game. CDL, Warzone, League, and THE FINALS videos stay on their respective game pages.
- Added official playlists and broadcast archives, including the CDL's 2026 and earlier seasons. Selected playlists show up to 100 publicly returned matches; the embedded full-playlist player and external link provide the rest.
- Aligned THE FINALS section tabs with its content column, aligned player equipment rows, and shortened interface copy.

## Sources and automatic checks

The app checks connected sources at launch, every 15 minutes while open, and when returning after 15 minutes away. **Sources** shows successful fetch times, source edit dates, and failures. Manual refresh is available inside each game and on the Sources page.

A successful download does not establish that a publisher's recommendations are current. The app preserves the original dates, uses a valid saved snapshot when a request fails, and reports the failure. It never substitutes another game's mode.

| Game or feature | Source and coverage |
| --- | --- |
| League | Riot Data Dragon for champions/items; Lolalytics for available measured builds. The selected champion/mode/rank/filter combination refreshes on first use each session, then after 15 minutes. |
| BO7 public | CODMunity's separate public multiplayer attachment feed. |
| BO7 ranked | CODMunity's ranked attachment feed, filtered to the reviewed M15/MPC primary pool. |
| Warzone battle royale | CODMunity's Warzone feed. |
| Warzone ranked | CODMunity's `warzoneranked` page and actual `Warzone Ranked` / `wz-br-ranked` collection. |
| THE FINALS | TheFinalsLoadout.com community loadouts plus Embark's official patch feed. Season 11, loadout-source review September 1 for patch 11.7.0 in this release. |
| WARDOGS | [Apollyon’s calculator](https://wardogs-artillery.com/) for map calibration and game firing tables. [MetaForge](https://metaforge.app/wardogs/map/bakurani) is linked as an additional map reference. |
| Rainbow Six Siege | Ubisoft operator/map catalog and published PC/console ranked charts; map guides from the Dropzone website. |
| Sons of the Forest | Bundled island map, locations, layers, item information, and local found-item progress. |
| Gray Zone Warfare | Under construction. Its tools, patch-note feeds, and background refreshes remain disabled; existing local progress stays stored. |
| Patch notes | Official Riot, Activision, Embark, Ubisoft and WARDOGS developer posts. Titles, dates, short previews, and direct links; full articles are not copied. |
| Videos | Official YouTube RSS, channel playlist pages, and broadcast pages. Selected match playlists refresh when opened or manually refreshed. |
| MW4 | Release-date checks against the linked official announcement. Build support requires a future app update. |

**What still needs a person:** the BO7 primary-weapon pool and THE FINALS composition choices require a new review when rules or balance change. Team recommendations warn when a newer gameplay patch appears. Equipment feeds update automatically, but the app does not autonomously discover or certify new meta compositions. Code updates and new game integrations require a new app release; a configured installed version can receive it through the updater.

CODMunity access uses its public website data, without a private API key or partnership. Attachment sets, codes, source tiers, and estimates are preserved. These feeds do not provide a complete perk/equipment class or certified competitive win rates.

THE FINALS HHM/HML composition evidence comes from commit's Season 11 coverage and the current community specialization/gadget guides. Fixed player equipment is assembled from current community loadouts; it is not claimed to reproduce every attachment or gadget shown in those videos. No official ranked team win-rate feed is connected.

League guide-only and foundation modes keep their original labels. Normal/Quickplay and Mayhem may use explicitly labeled related-mode foundations. Some rotating modes provide external guides rather than an available measured build feed. Queue availability is controlled by Riot. Saved builds retain their original dates and equipment.

## Official competition

Open a game, then **Videos**. Use **Matches & events** to select a season/event playlist or recent broadcasts. Search by team or event title, and use **Show more** to browse loaded matches. **Full playlist** opens YouTube's playlist player, including earlier matches outside the first public page. **Latest uploads** shows that game's official channel feed.

- League: [LoL Esports](https://www.youtube.com/@lolesports)
- BO7/CDL: [Call of Duty League](https://www.youtube.com/@CODLeague)
- Warzone: [Call of Duty](https://www.youtube.com/@CallofDuty), filtered for Warzone uploads and broadcasts
- THE FINALS: [THE FINALS](https://www.youtube.com/@reachthefinals)

Players load only after a click. YouTube controls embedding, regional availability, and age restrictions. Every player has an external YouTube link. MW4's page labels the CDL archive as earlier seasons until MW4 competition begins.

## Get the source on Windows

When the 2.0.0 release is published, download **Dropzone-Source-2.0.0.zip** from the [GitHub releases page](https://github.com/JadenTrask/dropzone-releases/releases), right-click it in File Explorer, and choose **Extract All**. Open the extracted `Dropzone-Source-2.0.0` folder in Codex on your Windows PC.

You can also clone this repository, or choose **Code → Download ZIP** for the current source.

Use Node.js **24.13.0**, the runtime pinned in the Windows release workflow, then run in the project folder:

```powershell
npm ci
npm start
```

Run `npm test` to check the project, or `npm run package:installer` to build the Windows x64 installer. Source downloads contain the offline map assets; installed dependencies and generated installers are excluded.

## Development

Node.js 24.13.0 and npm:

```sh
npm ci
npm start
npm test
npm run package:installer
```

The pinned Electron runtime is included in the Windows distribution. The installer bundles electron-updater and its production dependencies. The source ZIP excludes installed dependencies and release folders.

- `core/games.json`: launcher and mode registry
- `core/game-service.cjs`: validated provider dispatch
- `core/services.cjs`: shared desktop/development services and source checks
- `core/cod-provider.cjs`: separate COD feeds, attachment parsing, eligibility filtering, offline fallback
- `app/data/cod/ranked-policy.json`: reviewed BO7 primary pool
- `core/finals-provider.cjs`: class gear and official patch checks
- `app/data/finals/teams.json`: fixed, dated team recommendations
- `core/media-provider.cjs`, `core/video-archives.cjs`: game-scoped official videos and archives
- `core/wardogs-provider.cjs`: validated firing-table refresh and map calibration comparison
- `app/wardogs-model.js`, `app/wardogs-map.js`, `app/wardogs-ui.js`: calculation, tiled map, and personal target workspace
- `core/patch-provider.cjs`, `app/patches-ui.js`: game-specific official patch feeds
- `app/hub.js`, `app/finals-ui.js`, `app/watch-ui.js`: game interfaces
- `desktop/main.cjs`: isolated Electron shell and allowlisted external links

See [the integration guide](docs/ADDING-GAMES.md) for adding games and [the validation record](docs/VALIDATION.md) for the checks actually completed. Automated tests and package-integrity checks do not establish native installation, upgrade, embedded-playback, or in-game accuracy results.

## Attribution

Dropzone is independent and is not endorsed by Riot Games, Activision, Embark Studios, BULKHEAD, Team17, YouTube, or CODMunity. Game names, artwork, and source data belong to their owners. Source links appear in the app; weapon-image provenance is recorded in `app/assets/weapons/sources.json`. App code is MIT licensed. The MIT license does not transfer ownership of third-party artwork or data.

WARDOGS reference code/calibration credits and the MIT notice are in `third-party/`. Map imagery remains the game rights holders’ property; the source repository’s MIT license does not license the game artwork. Map asset hashes and source revision are recorded in `app/data/wardogs/assets.json`.

