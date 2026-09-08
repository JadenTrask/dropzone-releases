# Current status — 1.2.1

Gray Zone Warfare is under construction. Its map, mission, key and patch-note feeds are disconnected from the app and do not run on launch, periodically, or through manual source checks.

# Added in 1.2.0 (historical)

GZW marker coordinates now have a separate launch/15-minute source feed. Terrain imagery remains bundled and older. Siege has separate official catalog/chart and hosted editorial-guide feeds. Guides update without an installer rebuild when a reviewed feed is published to the website. This does not automate tactical review. Ban tables are tied to chart identity and hidden after charts change until reviewed. See SIEGE.md and GRAY-ZONE-WARFARE.md.

# Game-data refresh coverage

Connected feeds make fresh requests on every application launch, every 15 minutes while running, and after the PC wakes. Starting the EXE while an existing instance is running also starts a refresh. Returning focus after 15 minutes triggers a check. Identical in-flight requests share one download. HTTP requests ask intermediaries to revalidate rather than reuse a local HTTP response.

Provider instances also refresh on first use independently of the startup scheduler. A recent disk or bundled snapshot cannot suppress this check. Pages may display their previous data while a check runs. After the check cycle completes, open pages load the result. A selected League build is refreshed at that point; saved snapshots and user-edited builds are preserved.

| Data | What updates | What does not |
| --- | --- | --- |
| League catalog | Riot's champion, item, rune and spell data | No guarantee that Riot publishes Data Dragon at the same moment a patch reaches every region |
| League builds | Selected champion, mode, role, rank, region and matchup from its supported source; checked on first use each session and after 15 minutes | Guide-only modes have no verified in-app feed. Mayhem and Normal/Quickplay retain their foundation labels. The app does not pre-download every combination |
| BO7 public/ranked and Warzone battle royale/ranked | The four separate CODMunity feeds: attachment sets, editorial tiers and published metadata | BO7's M15/MPC eligibility filter is bundled and must be reviewed separately. No automatic rules certification |
| THE FINALS | Community class builds, alternatives, source patch/review date, and official patch feed | Composition choices, roles and fixed weapon picks are bundled. Existing team slots resolve their source build's current equipment; a removed build or fixed weapon makes the slot unavailable |
| WAR DOGS | Mortar and SPH-2 firing tables, plus calibration comparisons for both maps | Map images use a pinned revision. Changed map geometry disables elevation until an app update. No release-accuracy, terrain or tilt validation |
| Gray Zone Warfare | None — under construction | GZW tools and all GZW feeds are disabled; previously saved local progress is retained |
| Patch notes | Official game-filtered posts and dates | Full articles open externally. A new patch does not itself revise community builds |
| Videos | Official uploads, public playlist catalog and broadcast archive | Selected playlist contents refresh on first opening and expiry, not all playlists at launch. Public-page limits still apply. Channel identities and featured archive links are bundled |
| MW4 | The linked official release announcement | New game support does not unlock automatically |
| Saved builds/targets | User changes | Snapshots are not overwritten by background downloads |
| Progression | External community services opened by the user | No native Steam stats synchronization |

`Sources` lists each source's last successful download, publication/review date when supplied, attempt time, and error. These are separate dates. THE FINALS loadout review is compared with the latest gameplay patch; store releases appear first by date on the patch page while retaining their label.

A failed or invalid response keeps the last valid snapshot and its original dates. The error remains visible when a page reloads its cached data. The next request after one minute retries, and the Refresh button retries immediately. If no valid snapshot exists, the source is unavailable. Normal live-feed changes require no rebuild, but provider format changes, bundled policies/strategy/map changes, app code, and new game support can require a new app release. A configured installed build can receive that release through the app updater. There is no connected maintained remote configuration service for those bundled choices.

Automatic download is not a guarantee that a publisher's recommendations reflect the latest game balance. Dropzone cannot produce an updated recommendation before its source publishes one.

App release updates are configured separately from these game feeds. See `APP-UPDATES.md`. The installed app is configured for `JadenTrask/dropzone-releases`.
