# Rocket League design QA

final result: passed

## Scope and visual truth
Reference direction, not a pixel clone: the user's Tracker Network welcome, live, history, and performance screenshots. Dropzone branding, existing application navigation, supported live statistics, and automatic setup remain.

Sources:
- C:/Users/Jaden/Pictures/Screenshots/Screenshot 2026-09-26 050620.png (1141 x 837)
- C:/Users/Jaden/Pictures/Screenshots/Screenshot 2026-09-26 050624.png (1051 x 865)
- C:/Users/Jaden/AppData/Local/Temp/codex-clipboard-e1c93bb1-46c1-4285-a600-301db186cda5.png (1935 x 1075)
- C:/Users/Jaden/AppData/Local/Temp/codex-clipboard-db4d65fe-0c6d-4818-bea2-1412003dd337.png

Implementation captures: .validation-cache/rl-welcome.png, rl-setup.png, rl-setup-small.png, rl-live.png, rl-history.png, rl-performance.png. Browser preview also inspected in Codex. Desktop captures use a 1600 x 1000 CSS content viewport, Windows 1.5x image density (2400 x 1503 capture); small setup uses 1024 x 768. Comparison uses app content regions, excluding native chrome; references have different sizes and are compared proportionally, not pixel-identically. Test fixtures supply populated statistics; they are not included in the product.

## Findings and fixes
- P2: Initial performance page repeated extensive metric rows above charts. Fixed with four summary values, two-column charts first, and expandable career details. Final performance capture reviewed alongside the supplied performance screenshot.
- P2: Global application background masked the navy content surface. Fixed with an explicit scoped main-panel background and recaptured.
- P2: Bright sidebar art competed with player text. Shifted the crop to the darker side; final captures reviewed for readable labels.
- Screenshot harness initially captured stale hidden-window frames. Disabled frame throttling and increased paint wait; final captures show populated content. No console errors recorded in rl-design-results.json. No horizontal page overflow in measured captures.

## Required surfaces
Typography: condensed display headings (Impact on Windows) echo the reference; Segoe UI body text preserves app conventions. Long player names wrap.
Layout: persistent player summary, compact navigation, divided team tables, dense alternating history rows, and two-column performance figures. Narrow windows hide the secondary profile column and stack charts.
Colors: navy/cobalt surfaces, pale lavender text, orange selection and primary actions, blue/orange teams. Chart color varies by metric.
Assets: original generated car-soccer stadium art, reused official Dropzone mark. No TRN logo, advertisements, fabricated avatars, ranks, or MMR copied into the interface.
Copy: internal arena filenames and playlist numbers removed; match format is derived from observed team rosters. Unknown sessions use a plain fallback. Setup accurately separates settings, connection, and stats reception.

## Interaction checks
Welcome opens, Get started reveals automatic setup, closing persists dismissal, help reopens it. Live view, performance navigation and filters, history/detail, and leave cleanup covered by UI tests. Existing live parser regression tests still pass. Small setup retains reachable actions with dialog scrolling. Eleven focused Rocket League tests pass.

## Intentional differences
No account-wide ranks, external profile avatars, advertisements, TRN scores, or unverified playlist-name mappings. Charts use existing per-match recorded data rather than pretending to have daily account history. App-owned navigation remains.

## Follow-up polish
P3: Add independently verified arena and playlist display names when a reliable mapping is available.

Follow-up: date filters changed to 7 / 14 / 30 days / all history, default 30 days. Regression tests prove 35 matches in a 30-day window are included rather than capped at ten, with older matches retained. Twelve Rocket League tests pass.
