# Rocket League tracker

## Source and setup

Authoritative protocol: https://www.rocketleague.com/developer/stats-api (checked 26 September 2026).

In Rocket League's installation folder, edit `TAGame/Config/TAStatsAPI.ini` (or `DefaultStatsAPI.ini`) under `[TAGame.MatchStatsExporter_TA]`. Set `PacketSendRate=10` and `WebPort=49124`, then restart the game. TCP Port must be different from WebPort. Dropzone uses only the loopback WebSocket. The Tracker settings page includes these steps and lets users match a different WebPort.

Select your player once from the live roster, or enter your exact platform PrimaryId. The API's viewed Target is not reliable evidence of local player identity. No account lookup, rank, MMR or pre-installation career history is implied.

## Architecture and resource limits

- Electron starts one dedicated worker independent of the selected page. Node's built-in WebSocket and SQLite require no new production dependencies.
- Protocol: case-sensitive `Event` / `Data`; outbound replay controls use `Command` / `Data`.
- Only allowlisted summary fields are retained. No ball positions, boost frames or vehicle telemetry is saved.
- At most 32 player summaries, 256 important match events, 128 replay goal markers and 64 recently finalized IDs stay in memory. Incoming messages above 256 KiB are rejected before parsing. JSON itself is parsed only on the worker.
- Visible live snapshots are coalesced to 5 Hz in Auto, 10 Hz in Normal, and 1 Hz in Low resource mode. Hidden pages and minimized windows receive no snapshots. Charts only change with match history or user filtering.
- Retry waits grow from 2 to 60 seconds. Process detection runs only on initial/slow connection attempts, with a hidden, time-limited tasklist process. There is no high-frequency process scan. Disabling tracking closes the socket and cancels retries.
- A compact recovery checkpoint is saved at most once per 30 seconds during matches, plus end/disconnect boundaries. No disk write per telemetry frame.
- SQLite WAL stores matches, sessions and preferences in the app profile's `rocket-league/history.sqlite`. Each match summary contains its bounded roster and event list. Failed final saves are retained in a bounded eight-summary retry queue; exhaustion is reported rather than allowed to grow without limit. Database primary keys deduplicate MatchGuid. Missing IDs receive local IDs. Pages query 25 history rows at a time; analytics project only summary fields (not event arrays) and iterate rather than loading unlimited histories into memory; charts retain at most 100 points.
- Settings → Performance samples only on demand, or every five seconds while explicitly enabled, expanded and visible. CPU sums Electron process metrics; RAM sums working sets and may double-count shared pages. GPU usage is omitted because no cheap, reliable percentage is supplied here.

## Match integrity

A complete career match needs a creation/initialization event, a documented winner, and the selected player's identity/team. Late joins, interrupted connections and recovered checkpoints are labelled partial/incomplete and excluded from aggregates. The system does not infer a loss from game closure. Finalization waits briefly after MatchEnded for trailing stats; PodiumStart or MatchDestroyed may finalize sooner. Dropped players retain last-known stats. Duplicate completed records cannot be overwritten by a partial copy.

ReplayCreated switches into a separate replay mode. Goal replays do not create new match records. An ambiguous replay seen on initial connection is not recorded. Replay load, seek and speed use documented commands; seeking is restricted to detected replay playback. Commands are sent to the game, not claimed successful without game state. The API does not enumerate saved replay files, so loading uses an explicit filename. Goal jump markers use observed replay Elapsed time, never a fabricated conversion from match countdown.

Automatic sessions begin with recorded activity, persist across short restarts, and expire after 90 minutes without a recorded match. Users can explicitly start/end sessions. Turning off new history does not delete existing records.

## Existing app optimizations

Removed the unconditional WARDOGS server fetch at startup; its page/badge request data when needed. Player-count timers stop when hidden and resume on visibility. Personal alerts are idempotent and skip hidden-document work. Automatic source refreshes are deferred while the Rocket League worker reports an active match. Existing sources, saved data and navigation remain available.

## Validation limits

Tests exercise the official documented message shapes, real local WebSocket ingestion, SQLite persistence/restart, duplicate results, partial matches, replays, bounded events, missing stats and hidden renderer suppression. A browser preview displays a desktop-required state; it does not impersonate a running game.

A local synthetic benchmark processed 100,000 six-player UpdateState messages (including JSON parsing) in 581 ms, retaining six player summaries. This is not an in-game performance measurement.

Live Rocket League capture, actual replay-command acceptance, in-game CPU/GPU impact and installed-app upgrade require a real game session. Automated protocol fixtures are not evidence of those checks. No absolute zero-impact claim is made.

## First-use setup assistant

The first visit opens one setup checklist: game configuration, socket connection, and confirmed live telemetry. Dismissal is remembered locally; Tracker settings can reopen it. Browser preview shows the tutorial but cannot read or modify game files.

Desktop detection checks Steam (including registered libraries) and Epic manifests, with a native folder picker fallback. Only a validated Rocket League installation and its existing TAStatsAPI.ini or DefaultStatsAPI.ini can be edited. Existing enabled configuration is preserved and its WebPort is adopted. Enable tracking saves a byte-for-byte timestamped backup before updating the exporter section, preserves UTF-16/UTF-8 encoding and unrelated sections, and handles TCP/WebSocket port conflicts. A game restart is needed after changes. Protected folders may require manual setup if Windows denies access.

A read-only check on the development PC found the Steam installation already enabled (PacketSendRate 1, WebPort 49124); no real game config was changed. Fixture tests cover edits, backups, repeat runs, port conflicts and tutorial persistence/reopening.

Live-game verification: the installed game sends Data as a JSON-encoded string, rather than the object shown in the reference examples. Both formats are supported. A read-only probe verified four players and the running clock with zero malformed updates after this fix. Setup deduplicates Windows paths case-insensitively. Connection alone is explicitly distinguished from receiving stats.

Performance and match history default to the last 30 days, with 7-day, 14-day and all-history choices. The selected window is remembered locally and filters by recorded match start time. Signed-out local history is a rolling 30 days. Signed-in history supports 365 days; optional cloud records also use a rolling 365-day window. Older local records are removed when the policy is applied and before new match saves. Career includes complete records in the retained window; performance totals include every qualifying match in the chosen period. Charts remain capped at the latest 100 points, with an explanatory note when necessary. History is paginated in batches of 25. No pre-installation account history is imported.

## Player profiles — Test 8 (2026-09-26)
Cloud records retain Score, Goals, Assists, Saves, Shots, Touches, CarTouches and Demos, plus observed EpicSaves, CrossbarHits and TimesDemolished event counters. Overtime, team/opponent scores and playlist ID are included when available. Raw spectator vehicle telemetry, rank/MMR and other players' personal data are not uploaded. Missing older fields stay unknown. Extra counters cannot be recovered from older recordings. Re-sync can backfill retained match metadata; cloud upserts merge keys so an older client cannot remove newer fields.
Friends open a separate profile with Overview, Matches and Performance, 30/90/365-day filters, complete personal stat rows, totals, averages, records and daily charts. Profiles remain protected by existing accepted-friend/sharing policies. Account editing lives in the top-right Account tab; selected profile photos sync immediately.
Validation: 15 account/tracker/profile tests passed; affected seven tests passed again after final changes. Authenticated demo save + real accepted-friend read verified extra fields and unknown-field filtering in a rolled-back hosted transaction. Desktop and 700px profile renders had no horizontal overflow. Test 8 is local-only.
