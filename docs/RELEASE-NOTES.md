# Dropzone 2.4.6

A targeted polish pass for Time Played on personal and friend profiles: a compact layered panel, three grouped categories, a filtered period total, a segmented distribution bar, and short one-time animations. Empty and unavailable states remain distinct from tracked zero time. Existing profile design, filters, tracking and statistics are preserved. Friend-list labels now consistently use Friends.

## Included from 2.4.5
Adds separate casual/ranked match, private-match and Freeplay timers to personal and friend profiles. Playtime begins with this update; historical durations are not estimated. Menus, pauses, replays and telemetry disconnection gaps are excluded.

Signed-in playtime syncs using daily per-device snapshots, without double-counting repeat uploads. Friend visibility follows existing stats-sharing and accepted-friend settings. Match-type and date filters apply to the displayed time; Freeplay stays separate from performance statistics.

## Included from 2.4.4
Adds All / Ranked / Casual filters to personal and friend profiles. Filters apply consistently to overview statistics, performance charts, records, averages and profile match history, alongside the selected date range. Private and freeplay sessions remain excluded.

## Included from 2.4.3

Fixes a layout regression that prevented mouse-wheel scrolling in the Rocket League tracker. Profiles, match history, settings and long scoreboards now scroll within the app window. The player sidebar also remains accessible in shorter windows. Existing data and functionality are preserved.

## Included from 2.4.2

Rocket League and THE FINALS have a new look, with clearer layouts, richer visuals, and controls designed for a desktop companion.

- **Rocket League workspace:** a compact header, cinematic live and post-match scores, your team shown first, readable match history, redesigned player profiles and friend cards, and grouped tracker settings. Profile charts animate into view once and settle when finished.
- **Coaching overlay:** draw arrows, lines, circles, boxes, freehand strokes and short notes over Rocket League. Includes undo/redo, colors, annotation layers and annotated screenshots. Open it from the tracker or press **Ctrl+Alt+C**; customize the shortcut in Tracker settings. Coaching suspends when another application is focused and returns with the game. Use Borderless or Windowed mode.
- **Match organization:** create and name groups for any recorded matches, then filter history by group, private, casual or ranked. Groups stay on this PC. Only casual and ranked matches contribute to profile statistics; real private matches remain in history.
- **Friends:** a dedicated requests tab, profile pictures, full player profiles, and a short notification when a new request arrives.
- **THE FINALS:** artwork-backed class selection, a compact build browser, a visual weapon and equipment layout, and a redesigned team composition view. News and Videos share the warmer Finals presentation. Copy loadout feedback stays on the button; source dates and patch-review status remain accessible.
- **Dropzone controls and navigation:** the new frosted button, tab and dropdown treatment now extends across the app. Game navigation has consistent artwork frames and selected states, smoother hover behavior, and consistent page transitions. The opening splash no longer flickers or replays.
- **Map and utility polish:** clearer tools over terrain, a stable WARDOGS Gunner sight toggle, properly spaced Tutorial and source controls, and a focused Patch Watch layout. News previews no longer show broken punctuation or Steam image placeholders.

The redesign preserves existing local history, account data, filters and game integrations. THE FINALS recommendations retain their source and review dates; a new appearance does not imply the builds have been reviewed against a newer balance patch.

The coaching overlay uses an external window, without game injection or memory access. Exclusive fullscreen support is not forced. Actual FPS/frametime impact and a complete multi-monitor/controller test matrix have not been benchmarked. The Windows installer remains unsigned.
