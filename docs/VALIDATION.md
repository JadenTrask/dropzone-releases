## 2.4.9 - 1 October 2026

The owner requested that Gray Zone Warfare be closed as Under construction and approved publishing the accumulated regression fixes. Version 2.4.8 was already public; this update uses a new version and preserves its release.

- All 284 Node tests passed against versioned 2.4.9 source, with no failures or skips. All 34 changed/new JavaScript files passed syntax checks; diff whitespace checks passed.
- The final headless renderer matrix passed 110 captures and 27 interaction flows with zero recorded errors at 1920x1080, 2560x1440, 3840x2160 and 1000x900. This includes active game workspaces, Settings, update states and keyboard/dialog behavior. Counts describe automated checks, not exhaustive manual QA.
- A separate construction-gate run passed 20 flows and four captures: Home, rail, direct routes, old contextual news/video URLs, restored workspaces and browser history cannot reopen GZW tools. No GZW module, canvas or terrain requests loaded. Other game routes remained usable. The construction screen and Home placement were inspected as actual screenshots, including narrow and 4K captures.
- Before the final GZW closure/version change, focused regression runs passed 36 interaction captures, nine GZW motion captures, four shared-search captures, 20 detail-state captures, five final-control captures and eight fresh Apex-profile captures. GZW's map implementation and data are retained but are not shipped as an available feature. These overlapping runs are not added up as unique screens.
- A fresh authenticated Apex request through the existing production account boundary returned HTTP 200 on October 1 at 03:15:22 UTC. The normalized response supplied one rank, two overview metrics and 22 legends. Renderer checks replayed that real response; not-found/quota/auth UI states in that renderer run were explicitly simulated. No credentials or private response fixtures are included in source or packages.
- Controlled headless timing checks showed destination DOM creation no longer waits for a delayed provider response. Optional idle warmup loads at most two small local modules, without provider calls, maps or images. This is not a guarantee of native or in-game performance.
- Startup preference status/save/failure paths passed mocks. The setting defaults off and is restricted to installed Windows copies; no actual Windows startup entry was written during validation.
- Parent review accepted the representative updated workspace captures. Pixel review covered shared material, padding, Wardogs controls, Finals equipment, CoD details, Apex profile/recents, Sons, Siege, Settings and supporting states. The approved clear-glass direction is preserved.
- Native installation/upgrade, real Windows boot, full multi-monitor behavior and resource impact while gaming remain unverified. The earlier focus-stealing error was not conclusively identified. Validation ran in isolated background/headless processes.
- The existing release workflow must separately verify the exact committed source, Windows x64 installer, ASAR contents, update metadata and hashes of all four uploaded release artifacts before publication.

## 2.4.8 - 1 October 2026

The owner approved the clear neutral glass direction on October 1: visible artwork, modest blur and thin reflective white edges. The full renderer matrix was repeated on that material. Follow-up pixel review corrected light-mode field contrast and removed opaque nested search fills without changing the approved dark theme.

Static release preparation verified matching version metadata, inclusion of new runtime modules/assets, exclusion of private validation evidence, the established GitHub update feed and no flagged credential patterns across 496 source text files. This is not a built-installer or complete security guarantee.

- 273 automated tests passed against versioned 2.4.8 source. Diff whitespace and changed JavaScript syntax checks passed.
- The final revised glass theme passed 112 headless Edge captures and 29 interaction flows with zero reported errors. Captures verified actual PNG dimensions at 1920x1080, 2560x1440, 3840x2160 and 1000x900. All 96 requested terrain images loaded without network failures. These are renderer checks with labeled fixtures, not exhaustive native application QA.
- Actual authenticated Apex production lookup returned HTTP 200 and a guarded profile contract. Separate actual checks verified unauthenticated 401 and bounded quota 429. Profile renderer checks replayed the recorded real contract; not-found and other UI states were simulated and are not claimed as live provider outcomes.
- Follow-up runs passed 43 state captures / 13 flows and 12 actual-profile replay captures / 5 flows. Wardogs tutorial transparency and Escape dismissal are regression-checked. Finals redundant primary-weapon filler is removed. Screenshots were inspected for composition, typography, artwork and material consistency, not only overflow.
- The final navigation pass covered 83 captures / 21 flows; the shared shell and command palette passed 6 captures / 2 flows. These overlapping runs are reported separately rather than added up as unique screens.
- After the last search-surface correction, 46 additional module/state captures and 12 interaction flows passed with zero errors. The corrected CoD field and palette were visually inspected. All 45 changed/new JavaScript modules passed syntax checks, and the application-content ASAR matched 5,211 configured source files.
- After the user's reported focus-stealing error, validation uses hidden, isolated, headless Edge processes only. The original error was not identified. An independently reproduced hidden-document view-transition rejection was fixed and unit-tested; it is not established as the cause of the user's dialog.
- Native installation/upgrade, gameplay resource impact, embedded video playback and the full multi-monitor matrix remain unverified. Earlier 117-case layout and Rocket League wheel checks predate the final theme and are not represented as fresh runs.
- Local application-content ASAR verification compares every configured application file against its source bytes. The established release workflow separately builds Windows x64, verifies the exact commit, installer/update metadata and all four uploaded artifacts before publication; local renderer tests do not substitute for those gates.

## Unreleased Rocket League integration - 26 September 2026

- All 189 automated tests passed, including eight Rocket League model, socket/storage and UI checks. Targeted checks passed again after final query and display refinements.
- Real loopback WebSocket fixture verified match persistence, restart, replay exclusion and zero hidden UI snapshots. Crash recovery and corrupt-database isolation passed.
- Electron 44 runtime exposes WebSocket and node:sqlite. An ASAR-packaged tracker worker started successfully and reported its SQLite database ready.
- Browser review covered Rocket League navigation, waiting state and setup. Populated scoreboard, analytics/chart stability, history detail and subscription disposal were verified with DOM fixtures.
- Synthetic ingestion: 100,000 six-player JSON UpdateState messages in 581 ms; six players retained. This is not an in-game performance guarantee.
- Actual Rocket League live capture, replay command acceptance, installed upgrade and resource impact during a real match remain unverified. No release was published.

## 2.3.7 - 24 September 2026

All 181 automated tests passed. JavaScript syntax and diff whitespace checks passed. Native installation and installed-version upgrade were not tested locally; the release workflow verifies packaging and uploaded assets.

## 2.3.6 — 23 September 2026

181 automated tests passed. SPH-2 optic transcription covers 139 marks; shared calculation/display, interpolation, peak and compass regression checks pass. Calculator and sight visually reviewed in local preview. Native installation and upgrade not tested locally.

# Version 2.3.5 validation

- All 175 automated tests passed on Node 24.13.0.
- Native Chromium layout checks passed 117 workspace cases plus Damage Lab, FINALS and Siege sub-tabs, including light mode and enlarged text.
- Local browser reviews covered calculator controls and markers, gunner sight, live server totals, Server Status and Gold Market.
- Native installation and installed-version upgrade were not exercised locally. Release packaging and uploaded asset integrity are verified by the Windows release workflow.

# Version 2.3.2 validation

- All 156 automated tests passed.
- Browser checks covered 11 light-mode screens, League and Siege subviews, theme persistence and System appearance changes. Dark COD presentation was visually checked.
- Canvas pixel checks verified Forest and WARDOGS light backgrounds after pan, zoom and live theme switching.
- Original-logo startup was visually inspected; readiness, reduced motion and bounded recovery tests passed.
- Native installation and installed-version upgrade were not exercised. Remote data refresh was unavailable in some previews; bundled data was used.

# Version 2.3.1 validation

- 156 app tests passed, including destination readiness, native startup sequencing and reduced motion.
- Browser screenshots inspected the supplied startup lockup, dark WARDOGS, sensitivity and damage tools, plus light Settings and WARDOGS. No renderer errors were reported.
- Native installation and an installed-version upgrade have not been exercised for this patch.

# Version 2.3.0 validation — September 16, 2026

- 156 automated app tests pass, including startup readiness and reduced-motion handling for the new vector intro.
- Real browser previews of WARDOGS, sensitivity conversion and Call of Duty were captured with the approved Waypoint branding. WARDOGS marker placement produced a 486 m / 45 degree solution.
- The Windows x64 installer builds with the new icon and wordmark. Native installation, upgrading an installed copy and live game accuracy were not tested for this release.
- The website retains SEO metadata and feature URLs, with six scroll-driven chapters and a Blender-rendered Waypoint sequence. Forward/reverse scrolling, rapid scroll jumps, anchor links, game switching, reduced motion, mobile overflow and no-JavaScript content were checked. Eleven existing website tests pass.

## Historical validation

# Version 2.0.0 validation — September 8, 2026

- All 101 automated tests pass on Windows with Node 24.13.0, including source parsing, saved snapshot models, app updater behavior, release artifact verification, map keyboard handling, and renderer lifecycle regressions.
- Browser checks exercised the balanced library, game navigation, League Rift/ARAM/Arena rendering and saves, BO7 public/ranked variants and saved attachments, Finals three-player team saves, Siege operator search/side selection/chart dialogs, source filtering, and map controls.
- At 1000 by 720 with 200% app text, map sidebars and controls remain scrollable. WARDOGS coordinate entry produced the expected 400 m / 90.0 degree shot, saved and restored a named target. Sons of the Forest search, layer restoration and found-item persistence were checked.
- A real Windows x64 NSIS install upgraded an existing 1.2.2 installation successfully. The 2.0 app reused the existing legacy profile, retained its 115% text preference and all three existing League saves, and opened an original dated build snapshot.
- Native clipboard output contained the saved champion and item names. The native Save dialog exported valid League item-set JSON for that saved champion.
- The installed Windows app played an official League match in its embedded YouTube player. Returning directly to League removed the player; a regression test also verifies removal and invalidation of pending video requests.
- The website was checked at desktop and phone sizes with no broken images or horizontal overflow. The existing Siege JSON feed and legal pages remain in the site artifact.
- The release workflow separately verifies exact committed app/source bytes, Windows x64 packaging, updater metadata, and hashes of all four uploaded draft assets before publication. These artifact gates are separate from UI checks.
- Limits: the hosted automatic updater install path and in-game numerical accuracy were not exercised by these local checks. Live upstream feeds may be old or temporarily unavailable; the Sources screen retains those warnings. Gray Zone Warfare remains in development.

## Historical validation

# Version 1.2.2 validation — September 8, 2026

- All 91 tests pass (87 existing plus 4 Sons of the Forest tests).
- Validated every marker, category, referenced screenshot and all 341 map tiles.
- Renderer checks passed for page loading, Show all / Hide all, item search, underground details, found-item persistence, hide-found filtering and leaving/reopening the page. No renderer errors were logged.
- Map rendering uses the source map’s 250-pixel tile calibration.
- Packaged as a Windows x64 NSIS installer with the existing GitHub update feed.
- Native Windows installation and upgrade testing was not available on this Mac.

## Historical validation

# Version 1.2.1 validation — September 7, 2026

- All 87 existing automated tests pass.
- Gray Zone Warfare is marked Under construction; GZW map and mission APIs, renderer mounting and scheduled checks are disconnected.
- GZW patch-note feeds are excluded from service creation and manual/automatic source checks.
- Website labels remain Coming soon regardless of the latest downloadable version.
- Existing local saved progress is preserved.
- Native Windows launch and upgrade confirmation are still needed. The installer remains unsigned.

## Historical validation

# Version 1.2.0 validation — September 7, 2026

- All 87 automated tests pass, including marker coordinate decoding, approval filtering, invalid data rejection, faction objectives, map-only mission merging, Siege operator sides, chart patch/platform separation, guide lineups, chart-linked rates and fresh-process/offline behavior.
- Actual public GZW marker requests succeeded: 4,921 approved markers, 55 LZs, 490 objective entries, 198 mission names, revision 0.4. The combined index contains 320 missions in this snapshot.
- Actual Ubisoft catalog/chart requests succeeded: 78 operators, 14 Ubisoft-listed ranked maps, eight charts. Official charts measure Y11S2.3; the current patch announcement is Y11S3. No verified live per-map pick/ban rates are claimed.
- All 101 bundled Siege image assets decoded successfully. Website local asset references and JavaScript syntax checked.
- Renderer smoke checks mounted, refreshed and exercised 17 Siege and nine GZW interaction branches without exceptions; this is not a visual browser test. The deployed Siege guide endpoint returned a live valid feed with 14 guides.
- Repacked runtime verified 2,357 archived files and preserved all 14 executable code sections. Installer verification is recorded separately with the release package.
- Native Windows visual layout, installation and 1.1.0-to-1.2.0 upgrade confirmation are still needed. The installer remains unsigned.
- GZW terrain CDN returned HTTP 403. Bundled terrain is the previous approximately calibrated image, not the current reference tiles. This limitation is displayed in the UI and website.

Earlier validation history follows; earlier coverage statements apply to their named versions only.

# Dropzone 1.1.0 validation — September 6, 2026

**Current release:** Gray Zone Warfare tactical map, mission/key browser, faction-specific local progress, pins, route measurements and official patch-note previews. This replaces the 1.0.2 Under construction placeholder.

**Automated checks:** all 78 tests pass. The 12 new GZW cases cover dataset merging, source-version consistency, pagination, refresh despite a recent disk cache, failed-refresh timestamp preservation, concurrent checks, faction/region resolution, composed filters, invalid backups/coordinates, distance calculations, detail-panel camera focus, and bundled map asset coverage. Twelve changed JavaScript modules pass syntax checks. All 45 map tiles plus the overview fully decode at the expected dimensions.

**Live checks:** the production GZW provider successfully fetched 307 unique mission/contract entries and 127 unique keys/keycards across eight API datasets. The upstream data date is September 4, 2026; this live check was performed September 6. The official GZW Steam feed also returned valid developer posts, including the September 3 announcement and August 31 hotfix. These results are bundled as offline fallbacks.

**Coverage:** the API is a community index, not a complete walkthrough/objective database. Exact mission coordinates, full instructions, prerequisites and rewards are not supplied. Region markers and 13 LZ grid-cell centers are incomplete and approximate. The terrain image's patch date is unknown and its grid calibration is estimated against a published screenshot. No in-game accuracy test was available. New mission/key records refresh without a rebuild; map imagery/markers need a separate app/data update.

**Platform limits:** the approved browser preview previously returned ERR_BLOCKED_BY_CLIENT. No alternate rendering route was used to bypass it. Native Windows launch, visual layout at monitor/text scales, and a 1.0.2 → 1.1.0 installed upgrade have not been tested here. The user confirmed the earlier Beta 2 → 1.0.0 upgrade worked. Installer/archive assembly and integrity checks are separate from native execution. The installer is unsigned and has not been published to GitHub from this workspace.

The sections below record earlier releases and their checks; earlier activation notes are historical.

---

# Dropzone 1.0.2 validation

Update-page layout and Gray Zone Warfare placeholder added. All 66 existing tests pass. Native Windows visual confirmation remains required.

# Dropzone 1.0.1 validation — September 6, 2026

**Current change:** a local two-second splash, Windows NSIS installer, app-update service and UI, validated release configuration, and central version metadata. Public version 1.0.1 is reserved for the finished release. Existing fullscreen alignment and cursor coordinates are preserved.

**Automated verification:** 66 tests passed, including nine new app-updater/startup cases. Failure and retry paths, concurrent checks, explicit installation, invalid destinations, portable/development gating, and splash timing/cancellation are covered. JavaScript syntax, CSS parsing, and packaged-file comparisons are also checked. Game providers and numerical firing models are unchanged.

**Activation and platform limits:** the destination is now JadenTrask/dropzone-releases, supplied by the user. Repository availability could not be verified here and no release was published. Update checks can fail until stable release assets are hosted. Native Windows installation, splash rendering, and a real hosted update from one installed version to another have not been exercised. See APP-UPDATES.md.

**Live source check from 2.3.2:** all 27 startup jobs passed at 2026-09-06T11:57:58.391Z, with an additional successful Ahri ranked selection. Exact results are in `SOURCE-CHECKS.json`. Providers and bundled data are unchanged in this release, so those results are not represented as a fresh network run.

**WARDOGS data:** both source maps match the bundled calibration. All 1,114 bundled map tiles passed SHA-256 checks and fully decoded as 256 × 256 WebPs (40,452,090 bytes). Tiles cover the playable areas at levels 0–5; online levels 6–7 use the same pinned source revision. Coordinate origin, north-up Y direction, 100 metres per game unit, and independent image bounds follow the reference data. Elevation uses the community game firing tables; it is not a physics simulation.

**WARDOGS limits:** no access to the release build was available. Firing accuracy, map calibration against the release build, vehicle tilt, terrain effects, and actual in-game HUD entry have not been validated. The app permanently labels release accuracy as untested, does not correct terrain/tilt, and suppresses elevation for unsupported ranges/arcs or detected calibration changes. Successful source checks do not remove that label.

**Patch notes:** official titles, dates, short previews, and links are available inside each game's tab. Full notes open on the publisher's website; there is no full-article embed. The WARDOGS Steam feed contains developer announcements; they are not all patch notes. MW4 beta patch notes can be read while full loadout support remains coming soon.

**Bundled recommendations:** BO7 public has 90 attachment sets; BO7 ranked has two M15 variants and one MPC-25 set; Warzone battle royale has 336 sets; Warzone ranked has 13. BO7 ranked's source edit date remains June 15 despite a successful new fetch; the app preserves and flags old source dates. Eligibility review is separately dated September 6 and does not imply automated rule certification.

THE FINALS has 15 community loadouts for Season 11, source review September 1 for patch 11.7.0. Official 11.8.0 is a store-only update; latest gameplay update is 11.7.0. Fixed HHM and HML recommendations resolve exactly three matching classes and five equipment choices per player. Composition evidence is linked and dated; the fixed equipment is assembled from current community loadouts rather than claimed to exactly match a creator's video gear.

**Images:** all 308 referenced bundled weapon images exist and fully decode. The corrupt Peacekeeper Mk1 file was downloaded again and re-encoded into a valid WebP. Its transparent pixels retain alpha; hidden RGB data is not intended to display. A same-weapon fallback index covers later failed remote artwork.

**League item layout:** the former full-card 64px image enlargement and hover zoom were replaced by fixed 48px artwork, separate order numbers, and readable text. Item-dialog artwork is also 48px. Assets were not claimed to have gained resolution.

**Existing zoom checks:** easing preserves the coordinate under the pointer at every frame, agrees at 60/144 Hz, reverses without overshoot, reaches min/max bounds, and leaves the camera unchanged at zero elapsed time. Numerical firing calculations remain unchanged.

**Progression:** native Steam progression is not implemented. The page opens existing community account services. Account linking has not been exercised. The Ballistics tab and website frames from 2.3.0 are removed.

**Layout verification limits:** the approved preview browser rejected the local app with `ERR_BLOCKED_BY_CLIENT` during the prior release. No security barrier was bypassed and no alternate browser/rendering mechanism was used. The existing fullscreen fixes are grounded in the user's screenshot and CSS rules. They have not been visually verified in a running browser or on Windows, including maximization, monitor scaling, or text-size extremes.

**Desktop verification limits:** The application archive and executable version/integrity resources are rebuilt using the same Electron 44.2.0 Windows x64 runtime delivered in 2.3.3. Executable code sections are unchanged. Packaging verifies the EXE architecture, app archive contents, asset inclusion, ZIP CRC integrity, nonzero sizes, and SHA-256 hashes. NSIS was assembled with the packager's built-in static uninstaller reader because Wine cannot create its socket in this environment. This performs file assembly without running Windows code. Native Windows launch and embedded YouTube playback have not been tested. The app is unsigned.

Automatic source downloads cannot guarantee current meta recommendations or release-build firing accuracy. Code updates, new games, and changed map assets require a new app release. A configured installer can receive those releases through the updater.

The user confirmed the Beta 2 to 1.0.0 automatic upgrade worked. Version 1.0.1 separates App updates and Sources and adds per-source review-warning preferences. Three additional tests cover persisted mute/unmute, source isolation, refresh-failure visibility, and corrupt preference handling. New navigation has been inspected in source, not visually rendered here.

## 2.2.3 release preparation
Squad Room entry points, saved shortcuts and artillery integration removed. Twelve focused tests passed before packaging. Windows installer built successfully. Live server filters and browser interactions were checked in the preceding implementation turn. No native installation or in-game accuracy testing is claimed. GitHub publication requires authentication in this environment.

Rocket League setup assistant: full suite 191/191 passed. Browser walkthrough steps reviewed in the live preview. Automatic installation discovery was checked against the local Steam installation (already configured); no production game files were modified. Backup and config-edit behavior was tested against temporary UTF-16 fixtures. Real-game capture remains to be verified.

## Rocket League account test deployment — September 26, 2026

Supabase email confirmation and recovery were tested against the configured Resend SMTP service using an explicitly authorized temporary account. Both messages were delivered. Signup verification, personal match upload/readback, password recovery, sign-in with the changed password, and account deletion passed. The temporary account was deleted and the auth users view confirmed no remaining users. The unused SMTP credential was revoked; the active credential has sending-only access restricted to auth.dropzonecompanion.com. No credentials are recorded here.

This was a real backend/auth flow, not a complete installed-app GUI account walkthrough. Earlier database isolation checks passed for private, pending-friend, sharing-disabled, accepted-sharing, and removed-friend cases. The daily cleanup retains a rolling 365 days of cloud matches. Local history is not annually wiped. The desktop build remains local test 4; no public desktop release was published.

## Local test 5 — signup and retention fixes

196 automated app tests passed. Regression checks cover uppercase username acceptance and normalization, password confirmation rejection, populated SQLite player lookup (qualified GROUP BY), and rolling 30/365-day retention including direct detail access. Signup navigation no longer collides with the League game-mode handler. Password visibility controls were exercised in the rendered DOM without sending test signup emails. Test 5 installer built locally; no desktop release published.

## 2.4.0 release validation

201 app tests passed on September 26. History rendering passed wide and narrow layout checks. A WebSocket/SQLite integration check confirmed regular and online Free Play write no match records. Known existing Free Play records are excluded from history, aggregation, and cloud upload. The sidebar toggle was checked in the UI regression fixture. Test 11 packaged successfully. CI will independently build and verify the public installer and source archive. A native upgrade of the final 2.4.0 installer has not been tested.

## 2.4.1 practice recording fix

Read-only validation against the installed database excluded four one-sided private sessions while preserving all 15 completed private matches. Regression coverage includes private practice intake, existing history/detail/analytics filtering, pending crash recovery, cloud upload exclusion, and opponents leaving after being observed. Existing user database files were not modified.

## 2.4.2 local preview

No publication authorized. Added arbitrary named local match groups with create/rename/delete, membership and queue filters. Private and unknown queues are excluded from local aggregates and both profile views; raw private cloud records remain available. Group persistence and deletion isolation are covered by SQLite integration tests. Rendered live, history, profile and settings at 1560px; profile also checked at 760px. No horizontal document overflow. Verified dropdown blue, app rail blue in tracker and original dark on exit, and 240ms width transitions. Render checks used isolated sample data, not user records.

## Local 2.4.2 follow-up: open tracker layouts and coaching

Profiles and charts now use open sections and a shared stats strip; live and match-detail views use separate team tables with a larger scoreline. Friends and requests have separate tabs. App-wide request polling deduplicates bottom-right toasts, which slide away after five seconds. Active tracking has a green pulsing navigation control with reduced-motion support.

The new coaching feature is described in COACHING-OVERLAY.md. Source-only Electron visual checks cover the redesigned pages, drawing controls and PNG composition. The real Rocket League display/input/performance matrix remains unverified because the game was not running. No further installer build, push or publication was performed.


### Local tracker polish and focus restoration (2026-09-27)
- 218 tests passed, including local-team score/roster order, retained coaching lifecycle across focus loss, legacy shortcut migration, and rail hover lock.
- Source Electron overlay tested against the running Rocket League client at 3840×2160 physical / 150% scaling. A separate foreground test window suspended drawing; explicitly returning Rocket League to foreground restored the same overlay. Escape hid it and released input.
- Fresh wide and 760px preview captures: no document overflow. Orange-team score labels aligned with score centers; donut animation reached 360 degrees. Shared profile styling applies to personal and friend profiles.
- No FPS/frametime benchmark performed. No installer built or release published for this change set.

## 2.4.2 release preparation — September 27, 2026

The user requested the Rocket League and THE FINALS redesigns, followed by frosted controls and consistent game navigation throughout Dropzone. Publication was initially authorized, then explicitly paused again on September 27 before any push or release. The current update remains local for review.

The application suite passes **238/238 tests**, including coaching lifecycle and drawing history, private/practice match exclusion, match groups, profile aggregation, friend notifications, rail hover behavior and official artwork routing, Finals loadout selection/copy, and News/Video lifecycle behavior. The archive-to-Latest uploads regression clears the stale event heading and player. News preview regressions cover removal of Steam media payloads, readable truncation, and repairing saved/offline excerpts without changing source timestamps or stored data.

Rocket League source visual QA covers 40 normal/narrow/large/4K states and eight additional motion captures. THE FINALS covers 52 rendered states plus targeted status-menu, wide-layout and archive-switching follow-ups. See `rl-redesign-qa.md` and `finals-redesign-qa.md` for exact coverage, evidence locations and limitations. These are rendered source checks with isolated data, not a claim of live game performance or an installed upgrade.

Version metadata and in-app release notes target stable 2.4.2. Release packaging must pass the existing exact-commit archive comparison, Windows x64 check, source ZIP completeness, and updater size/SHA512 verification. The publishing workflow also downloads and verifies all four uploaded assets before making the release latest stable. No FPS/frametime benchmark or complete multi-monitor/controller test matrix is claimed.

The later app-wide control, map and player-sidebar follow-ups are verified from source. See [Shared controls and full application visual QA](shared-controls-qa.md) for the inspected page families, corrected findings, screenshot evidence and limits. The earlier local installer predates these final changes and must be rebuilt before distribution. No push, publication or new download was supplied during this final review.

### Final 2.4.2 release candidate

The user subsequently authorized publication before the website refresh. The final source was rebuilt into a Windows x64 installer on September 27, and the full suite passed again: **238 tests, zero failures**. This build includes the final shared controls, player sidebar, map controls and dialog fixes. Publication uses the existing `main` release workflow and its exact-commit packaging, full source archive, updater checksum and uploaded-asset verification gates. A successful local build does not imply a native installed upgrade or FPS benchmark.

## 2.4.3 scrolling hotfix

Native mouse-wheel input reproduced a missed 2.4.2 regression: the Rocket League workspace grid allowed its main panel to grow to content height while the parent clipped overflow. Programmatically moving the hidden parent during screenshot checks did not prove usable scrolling. The grid now bounds its single row to the available window height, stretches the main scroll panel, and permits the shorter player sidebar to scroll when needed. The command bar keeps its height.

The full application suite passed again (238/238), and 20 native wheel scenarios passed across normal, narrow and short windows. The dedicated `npm run test:rl-scroll` Electron regression passed six viewport/sidebar cases locally and failed against the previous stylesheet as expected. The existing release workflow is unchanged. Source evidence: `.validation-cache/rl-redesign/scroll-before-report.json` and `scroll-report.json`. Real in-game performance and native installed upgrades are not inferred from these tests.
