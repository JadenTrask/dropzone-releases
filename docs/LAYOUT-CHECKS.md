# Workspace layout contract

`app/page-layout.css` owns the width and outer padding of standard `.hub-main` pages. The scroll surface fills the workspace; padding centers a single content column. All game tools use the same column. Reading-oriented utility screens set `--page-content-width` on the page, not on its children.

Do not add max-width or automatic horizontal margins to `.hub-main > *`. Do not add page-specific `!important` widths or gutters. Those competing rules caused headers and controls to align independently of their content. Components can manage internal grids and spacing; a deliberately compact control can use `width: fit-content` with zero horizontal margins. SOTF and GZW maps have dedicated full-bleed layouts.

The toolbar keeps the breadcrumb on one line so a longer page name does not move every workspace down. WARDOGS page headers and content share the same outer boundary.

## Validation

Run `npm test` for calculation, persistence and tutorial geometry tests.

With the preview running, run `npm run test:layout`. It uses the existing Electron dependency to open an invisible, isolated test window. It compares actual left/right section edges, page overflow, and WARDOGS header positions across 117 combinations of page, viewport, theme and text size, including FINALS and Siege sub-tabs. It also checks 18 Brava/Striker profile cases for aligned equipment card edges and image positions, including absent subtitles and uneven equipment counts. It requires populated preview data for the tested pages; unavailable feeds fail the check rather than silently passing an empty screen.

The default preview address is `http://127.0.0.1:4177`. Set `DROPZONE_PREVIEW_URL` to test another port. Set `DROPZONE_LAYOUT_SHOTS` to an output directory to also capture 1920px dark/light screenshots. Test storage uses an isolated browser partition and does not touch the user's app preferences.

Run this check after shared CSS or workspace structure changes and before preparing a release. Also inspect the affected screen visually: aligned outer edges do not prove every internal control is usable.

For the Damage Lab, exercise adding/removing up to six weapons, changing the baseline, shared target settings, unsupported data and restoration after reopening. For the tutorial, inspect all eight steps after resize: arrow tips must meet the highlighted edge midpoint, including when the card is moved to fit the viewport.

Operator equipment columns share heading and card rows through CSS subgrid. Use content-driven shared rows rather than independent card heights; the two-column layout shares rows within each pair of categories.
