# Rocket League redesign visual QA

The source runner is `.validation-cache/qa-rl-redesign.cjs`. It starts an isolated Electron renderer and local static server, loads the real application styles and Rocket League modules, and replaces the desktop bridge with synthetic match, profile, friend and coaching-settings data. It never reads an account, changes the game, sends a friend request or builds an installer.

Run from the checkout:

```powershell
node_modules/.bin/electron .validation-cache/qa-rl-redesign.cjs
```

If Electron cannot initialize its GPU process inside the execution sandbox, run this same command with the normal outside-sandbox approval. Do not disable rendering features merely to make the check pass: that would change the material appearance being inspected.

Optional scoped runs:

```powershell
node_modules/.bin/electron .validation-cache/qa-rl-redesign.cjs --normal-only
node_modules/.bin/electron .validation-cache/qa-rl-redesign.cjs --responsive-only
node_modules/.bin/electron .validation-cache/qa-rl-redesign.cjs --skip-4k
node_modules/.bin/electron .validation-cache/qa-rl-redesign.cjs --motion-only
```

Output goes to `.validation-cache/rl-redesign/`. `report.json` records capture dimensions, content-container rectangles, horizontal overflow, team ordering, active animations and profile animation-frame requests after the entrance has settled. The report is overwritten on each run; use the default full run for final coverage. The motion-only run writes a separate `motion-report.json` containing initial, progressing, completed and idle measurements.

The renderer viewport is explicitly set through Chromium device metrics and asserted against each requested width and height. Screenshots use the compositor capture with a matching clip. This avoids Windows silently clamping a hidden native window to the host monitor's work area; the 4K PNGs are genuinely 3840 × 2160.

## Coverage

At 1440 × 1050:

- Connected idle tracker, active tracker with the local player on Orange, and completed match.
- Match history and match details.
- Personal overview (top and lower content), matches, and performance.
- Friends, incoming/outgoing requests, a friend profile, one-friend and empty-friend states.
- Tracker settings (top and expanded lower content) and account settings.
- A profile with just two active days of data.
- A synthetic incoming friend-request notification in the bottom-right corner.

At 760 × 1000, 2560 × 1440 and 3840 × 2160:

- Active tracker, post-match result, history, profile overview, friends and settings.
- Narrow profile matches and lower profile/settings content.

## What must be inspected manually

Open the generated PNGs, including the lower-content captures. Check composition, visual centering, legibility, gradients/materials, statistic grouping, chart labels, density and the consistency of controls. Automated overflow checks cannot establish that a screen looks good.

Document-level horizontal overflow fails the run. Internal scoreboard/profile table scrolling is allowed and excluded from the viewport-escape check. At large widths, profile and settings containers have broad upper-bound guards (1920px and 1440px respectively); the recorded container sizes should still be compared against the intended design.

Chart checks count JavaScript animation frame requests over a settled 500ms interval and list still-running CSS/Web Animations in visible content. A nonzero count is reported for investigation. This establishes that this fixture is not continuously requesting animation frames, not a game FPS or GPU benchmark.

## Final source pass — 2026-09-27

The final full run produced **40 captures with zero errors and zero warnings**: 19 normal, 9 narrow, 6 large and 6 at 4K. Every capture had zero document horizontal overflow. Orange was the local team in the active, post-match and match-detail fixtures, and it remained leftmost in the score and first in the roster. The normal shell, compact history, both profile types, social states, settings, notification and responsive captures were visually inspected. No unresolved clipping or alignment issue was found in these fixtures.

The motion pass produced eight additional profile/settings captures with zero errors. At all four exact viewport sizes, summary counters began at zero, visibly progressed at roughly 300ms, then reached their rounded targets. Visible chart animations completed, and the subsequent 500ms idle sample recorded **zero requestAnimationFrame requests**. The selected game rail uses the same classes and selected-page attributes as production, with the actual local cover assets.

## Boundaries

These are emulated CSS-pixel viewport sizes at device scale 1, not a substitute for testing physical monitor DPI, multi-monitor positioning or the native coaching overlay. The 760px stress case is narrower than the desktop application's current 1000px minimum window width. Backend correctness, actual account permission checks, real telemetry, real game performance and installer packaging are separate validations. No production build, publishing or push was performed by this QA run.
