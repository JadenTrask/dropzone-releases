# THE FINALS and shared application controls — source visual QA

## Scope and method

This review follows the primary task: choose a contestant class, browse a build, inspect its equipment, copy it, or choose a team composition; then browse official News and Videos. It checks presentation, responsive layout, selection feedback, error recovery and finite motion. It does not certify game balance, source freshness, accessibility compliance, native-window performance or a packaged release.

The runner is `.validation-cache/qa-finals-redesign.cjs`. It loads the real app HTML, styles and Finals/News/Video modules in an isolated Electron renderer. Builds, teams, official patch metadata, article records, video uploads and archives come from the application's bundled JSON. It uses the real local class/cover assets and the thumbnail URLs present in the official video records. Provider failures and empty responses are deliberately simulated. Clipboard requests are captured in memory without touching the system clipboard, and no video playback or external link is launched.

The window uses a Chromium viewport override with an exact dimension assertion and compositor screenshots. This avoids Windows clamping a hidden native window to the host monitor's work area. The 3840 × 2160 captures represent an exact CSS viewport at device scale 1, not a physical 4K/DPI test.

```powershell
node_modules/.bin/electron .validation-cache/qa-finals-redesign.cjs
node_modules/.bin/electron .validation-cache/qa-finals-redesign.cjs --normal-only
node_modules/.bin/electron .validation-cache/qa-finals-redesign.cjs --responsive-only
```

The source-only runner may require normal outside-sandbox execution to initialize Electron's renderer. It does not build, publish or push. Its isolated profile is under `.validation-cache/qa-finals-redesign-profile`.

## Before evidence

The initial capture set is in `.validation-cache/finals-redesign/before/`. Loadouts and Team Setups were captured at 1440 × 1050 and 2560 × 1440 before the new Finals styles landed. News had already received in-progress markup by its capture, so those two News images are transitional evidence and must not be presented as the original UI.

1. **Choose a class/build:** the large-window loadout area stopped around 1308px wide. Most of the equipment area was label/value text divided by rules, while a broad empty margin surrounded the page. Class controls offered little visual identity.
2. **Inspect the selected loadout:** weapon, specialization and gadgets had nearly equal visual weight. The main weapon did not read as the centerpiece, and gear resembled form fields.
3. **Choose a team setup:** repeated introductory and strategy blocks consumed most of the first viewport before the complete player equipment became visible.
4. **Browse Videos:** real thumbnails provided useful visual content, but repeated flat cards, a wide filter box and uniform typography weakened hierarchy.

The initial run had no document-level horizontal overflow. That did not resolve the composition problems above: overflow checks and visual quality are different checks.

## Completed Finals coverage

At 1440 × 1050: Light, Medium and Heavy; changing build and primary weapon; weapon menu; alternative equipment; source dates and patch status; both team compositions; copy feedback for a build and team; News, Videos, archives, latest uploads and a selected video poster; empty, first-load failure and cached-refresh failure states.

At 760 × 1000, 1000 × 1050, 2560 × 1440 and 3840 × 2160: all three classes, Team Setups, News and Videos. The 760px case is a stress test below the current desktop minimum width of 1000px.

Automated checks record page bounds, exact viewport size, document overflow, elements escaping the viewport, broken image URLs, selected class/build, running animations and settled JavaScript animation-frame requests. Visual inspection additionally checks class identity, equipment hierarchy, centering, type size, readable spacing, menu placement, error copy and use of available space.

## Final result

The full source pass captured **52 states with zero errors and zero unavailable-image warnings**. A further three open status menus at 760px and six updated wide layouts at 2560px/3840px passed separately. Evidence is in `.validation-cache/finals-redesign/after/`, with the complete `report.json`, plus `status-report.json` and `wide-report.json` for the targeted follow-ups.

All six behavioral assertions passed: selecting Light chose its real initial build; changing the weapon changed the copied loadout; copy confirmation appeared on the action itself and reset; team copy included all three players; selecting a video kept playback unloaded. None of the 52 settled captures had a visible running animation or made a JavaScript animation-frame request during the 300ms idle observation. This is a bounded renderer observation, not an FPS or energy benchmark.

The visual review found and resolved several concrete issues during implementation:

- The initial loadout composition pushed Copy below the normal first viewport. Reduced redundant height now keeps the complete equipment and Copy action visible at 1440 × 1050.
- The first featured video was tall enough to hide its title and enlarged a small thumbnail excessively. Its horizontal image/title composition now keeps both visible, with intentional smaller-width reflow.
- The video search inherited a second input border. The single combined search surface now renders correctly.
- Status details could extend past the right edge in the 760px stress case. Actual open menus were recaptured after the anchoring fix and are bounded/readable on Loadouts, News and Videos.
- Switching from an event archive to Latest uploads retained the old archive heading and playlist action. The two-capture `media-report.json` follow-up confirms the heading/action/player are reset, and a failed refresh retains the cached video cards.

The final normal loadout, team and media pages have clear primary information and action grouping. Frosted active controls replaced the old orange tab underline. Class artwork and actual equipment names give loadouts stronger identity, team roles are comparable at a glance, and source freshness remains accessible without dominating the page. Large layouts stop at deliberate content widths. The 760px layout keeps class selection usable and converts the build list to an intentional horizontal scroller rather than shrinking every desktop column.

### Limits

These captures use current source, not the packaged release. Provider error/empty paths and clipboard effects are simulated as described above. Actual backend refresh availability, YouTube embedding, operating-system clipboard writes, native DPI scaling and game performance require separate checks. Existing low-resolution video thumbnails can remain soft in the large playback poster; no replacement image or invented data was introduced. The rail in the Finals fixture uses real assets and production classes, but its scripted hover behavior is checked separately in the actual source app.

The later full-application review, shared controls, rail behavior and Rocket League sidebar follow-up are documented in [shared-controls-qa.md](shared-controls-qa.md).
