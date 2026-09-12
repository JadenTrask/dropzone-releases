# Dropzone 2.2.0 — local release handoff

The owner authorized app and website publication on September 12, 2026. Release checks: 146 application tests and five website/service tests passed. The Windows release workflow verifies artifacts before publication.

Latest source changes (September 12): the Tonight dashboard has been removed at the owner's request. The library can prioritize the owner's main games, and Game tools opens the selected game's builds directly. Session tracking is optional under More tools → History. The Windows installer was rebuilt after removing Tonight, VALORANT and Marvel Rivals. Packaged game registry and UI files were compared with the current source successfully. The earlier ZIP archive remains an older snapshot.

The latest local pass also connects session selections/recaps, game-specific planning fields, FINALS class equipment validation, multi-floor sketch boards, linked screenshot notes, compatible goal groups, timestamped clip notes, calculator-result pins, per-game accessibility presets and contextual feedback. Focused checks passed for saved notes/goals, session restoration and collected records, prerequisite loops, FINALS equipment restrictions, and backup image-reference preservation. Final browser inspection confirmed Tonight, VALORANT and Marvel Rivals are absent. The full earlier expansion remains incomplete; do not describe it as fully shipped.

## Run

- Windows installer: `release/installer/Dropzone-Setup-2.2.0-x64.exe`.
- Source: `npm install`, then `npm start` for Electron or `npm run preview` for the same web interface.
- The current preview is `http://localhost:4184/?game=command`.
- For the unpublished sync service, run `npm run dev` in the adjacent `dropzone-site` project. Run the app preview with `RIFT_PORT=4184` and `DROPZONE_WORKSPACE_LOCAL=1`. The service binds only to `127.0.0.1:4195`.
- Desktop builds contact the published service, so new encrypted sync remains unavailable there until deployment. Exported backups and share codes work without it.

## What is implemented

| Area | Implemented behavior | Boundaries |
| --- | --- | --- |
| Game-first navigation | Main-game library selection, game-specific builds/tools, optional session tracking and recaps | Tonight dashboard removed; launchers must be selected locally in the Windows app |
| Workspace switching | Optional running-process detection, restore last tool, keyboard search and existing quick panel | No game-memory access; detection does not focus Dropzone; not every game executable is recognized |
| Builds and personal wiki | Searchable builds, matchup notes, tags, linked entries, measurements and comparisons | Manual metrics need matching units and test conditions; no fabricated ranked recommendations |
| Strategy boards | Numbered markers, arrows, boxes, optional user image, undo and PNG export | Image-relative planning, not calibrated game-map geometry |
| Squad planning | Editable team slots, role/utility coverage checklist, share packs | Role coverage is a planning aid, not a predicted win rate |
| Second screen | Opt-in LAN server, visible phone URLs, shared selected cards, editable ready/pick slots, version conflicts | Same trusted network; eight-hour links; Windows firewall may require a user decision; no internet relay |
| Practice | Starter drills, timers, manual benchmark history, linked notes | No automatic aim scoring or match telemetry |
| Goals | Manual progress, linked prerequisites, deadlines and cost notes | No automatic universal game-account/challenge synchronization |
| Calendar | One-time events, local reminders, reviewed ICS import/export | App must be open for reminders; recurring and named-timezone imports are rejected with explanations |
| Clips | Local video or source links, notes, segment playback, original/real-time WebM export | Not automatic game capture; export requires runtime captureStream/MediaRecorder support and the view to remain open |
| Settings | DPI/sensitivity/binds profiles, explicitly selected text-file backups, confirmed restore and undo | No guessed settings paths or silent edits to game files |
| Readiness | Opt-in local microphone meter, output test tone, available device lists | Hardware battery/game-update checks are not connected; voice depends on runtime speech support and may use its speech provider |
| Performance | Imported frame-time CSV, average FPS, slowest-1% mean FPS and p99 frame time, comparisons | No injected FPS overlay, automatic hardware tuning or gameplay measurement |
| Calculators | Physical sensitivity conversion using supplied yaw constants, display units, constant-damage breakpoint | Generic formulas are labeled; not substitutes for verified game behavior |
| Packs | Reviewed data-only JSON/code imports with remapped IDs, linked plans and routines | Max 100 entries per pack; attached local media is not carried by share codes |
| Backups | App saves/preferences, imported media and native settings backups; reviewed restore and rollback JSON | Credentials and launcher paths excluded; media limited to 250 MB per export; original media preserved when restoring |
| Private workspace sync | AES-GCM encryption on device, capability code, conflict-preserving merge, versioned writes, deletion | Local server verified; unpublished. Session-center records only, 500 KB plaintext; no media or automatic continuous sync; server cannot recover a lost key |
| Accessibility | Existing text scaling, high-contrast session cards, reduced motion, keyboard navigation | No automatic game-specific accessibility changes |
| Feedback | Reviewed local report with app version, export and native memory summary | Does not send a message or attach private files automatically |

## Games and data

VALORANT and Marvel Rivals were removed at the owner's request. Earlier research snapshots remain development references only.

Existing League, COD, THE FINALS, Siege and WARDOGS tools remain in place. Their saves can be used alongside the session center; the copy-existing action supports League, COD and THE FINALS. Sons of the Forest receives no new game-specific features.

WARDOGS uses horizontal ground range and the original flat-ground firing tables. Experimental height correction has been removed. Community terrain estimates and manual heights remain reference information only. No new in-game accuracy claim is made.

The squad page now uses a consistent centered content edge for its heading, status, form and saved plans. A connected room displays its full, selectable invite code; disconnected rooms have no active code to show.

## Verification and remaining manual checks

Automated checks cover existing game services and WARDOGS behavior, new game registration, pack/import validation, rollback on failed saves, media ID preservation, bounded decompression, calendar units and unsupported cases, encryption/tampering/conflicts, launch selection, actual local HTTP pairing, and simulated session/squad UI flows. Site tests exercise real SQLite migrations and room/workspace authorization and concurrent writes.

The Windows installer and website bundle are built locally. The app has not been launched over the owner's running game. Real desktop visual inspection, phone/Wi-Fi operation, microphone device switching, native clip capture and game launching still need a user-approved interactive pass. Software tests are not in-game performance or ballistics validation.

Website changes and the new database migration are staged only. On a future authorized release, publish the matching installer before changing public download links, apply the added migration through the existing Sites deployment, then verify both public services. Preserve Cloudflare Web Analytics and the updated privacy disclosure.

