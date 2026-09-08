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
