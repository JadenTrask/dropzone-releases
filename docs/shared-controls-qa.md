# Shared controls and full application visual QA

## Expanded application review

The later user request extended this review to shared navigation, actions, rail artwork and every reachable consumer page family. This pass uses the actual application and backend at `http://127.0.0.1:4199`, in a separate Electron profile, without navigating the user's open browser. It closes the real What's New and Rocket League onboarding dialogs before inspecting underlying pages. Clipboard writes remain intercepted. Saved builds and appearance changes affect only the isolated QA profile.

Evidence is under `.validation-cache/shared-controls-redesign/after/`. The initial actual-source pass has 18 captures, the state pass has 11, and the corrected navigation pass has 15. The navigation pass verifies transparent inactive game tabs, selected frosted tabs, real pointer hover, keyboard focus, source popovers, and representative 1000px layouts. The state pass includes light appearance and a light dropdown. The correct production rail, including official League, Siege, WARDOGS and Sons of the Forest artwork, was inspected collapsed and expanded.

| Page family | Actual source coverage |
| --- | --- |
| Library and Call of Duty collection | Game cards, rail selection, utility actions |
| Black Ops 7 and Warzone | Public and ranked loadouts, lower attachment/actions area, search-empty state, filters and source disclosure |
| Modern Warfare 4, GTA VI, Gray Zone Warfare | Their current coming-soon/construction pages; MW4 News and Videos remain reachable |
| League | Rift/ARAM/Arena/Mayhem and guide-only compositions, top/lower build areas, champion/opponent/item/mode dialogs, roster and search-empty state, empty and populated Saved builds, Data & settings top/lower |
| Siege | Attack/defense map guide, map dropdown, bans/method disclosures, PC/console rates, chart fit/actual-size dialog, operator roster/defense/search-empty, Ash and Smoke overview/loadout/biography |
| WARDOGS | Calculator, tutorial/help, closed/open/expanded gunner sight, Shot setup/Compare weapons, lower comparison, Gold market, server rows and region menu, sort controls |
| Sons of the Forest | Layer key, search, Shovel detail, toolbar and attribution; terrain checked separately in the real browser |
| News and Videos | Actual contextual pages for BO7, Warzone, MW4, League and Siege; WARDOGS News; Finals detailed coverage in [Finals visual QA](finals-redesign-qa.md) |
| Global utilities | Settings top/lower, appearance dropdown/light mode/focus, Admin access form without submission, Performance disclosure, release updates, sensitivity preset/manual/help, Patch Watch, workspace palette/search |
| Rocket League | Existing complete RL visual matrix retained; actual-source idle/account availability checked; expanded sidebar and login interaction follow-up described below |

The grouped reports are `sweep-cod-report.json` (22 captures), `sweep-league-report.json` (13), `sweep-siege-report.json` (18), `sweep-maps-report.json` (15), `sweep-utility-report.json` (12), `sweep-followup-report.json` (16), and `sweep-final-controls-report.json` (5). Every captured state reports zero document overflow and no missing visible images. Early action failures in the League/map reports are harness-state failures: a persisted guide mode had no item/save action, and a source reload interrupted the forest actions. The follow-up explicitly restores Ranked and successfully opens the dialogs, creates a real isolated Saved snapshot, and opens the Shovel detail. The source-only RL account page has no enabled login form; its password-eye check is performed in a separate enabled-auth fixture rather than treating that absence as an application failure.

### Findings corrected during this expanded pass

- Shared top navigation initially boxed every tab. It now follows Rocket League's plain muted inactive/selected glass pattern, including Damage section navigation. Ordinary actions and filters retain their material.
- The WARDOGS gunner tab moved away from a stationary pointer because a generic hover transform replaced its positioning transform. With the fix, its rectangle is identical before/after a 750ms hover, both closed and open. Measured transform is `matrix(1, 0, 0, 1, -111.359, -21.3984)` in both states; only opening the drawer changes its horizontal position.
- WARDOGS controls lacked contrast over real bright terrain. One restrained toolbar backing, readable inactive/disabled controls, and a dark gunner toggle were verified over the actual map by the root agent. Tutorial steps 1, 7 and 8 were inspected in that real browser as well.
- Sons of the Forest zoom/Fit controls were hard to read over snow. The root agent verified their new backing, padded attribution action and Shovel popup over actual terrain. Offscreen screenshots did not render map tiles and are not evidence for terrain rendering.
- Market attribution and server-sort actions were pinched; final follow-up captures show corrected padding. Damage native selects now match the surrounding controls without changing their selection behavior.
- League's search-empty roster occupied one narrow grid cell; it now spans the grid. Its mode dialog retained stale purple surfaces; the final modal uses the shared palette.
- News excerpts exposed a raw Steam image token and malformed ellipsis. The backend was restarted after the sanitation fix; all three targeted League/Siege/WARDOGS page checks pass and visible source dates remain present.
- Patch Watch was an ungrouped form in a mostly empty wide page. Its new bounded form was inspected at 1440px and 1000px with zero overflow.

### Reachability and limitations

Sources diagnostics are protected by admin authentication and were not unlocked. `command` redirects to the library; `saved` opens League Saved; `progression`, `planner` and `squad` redirect to WARDOGS Calculator. Dormant route implementations are not counted as separate reachable pages. Gray Zone Warfare currently exposes a construction screen, not its dormant tactical map. The desktop-only quick panel, native update installation, external source opening, live coaching input, game FPS/frametime, cloud writes and real authentication submission are outside this visual pass. The existing Rocket League synthetic data review and native integration tests remain separate evidence.

Normal layouts and all meaningful reachable page families were visually inspected; this is not every possible player, item, provider response, filter combination, DPI value or operating-system dialog. Reports retain failed harness attempts for auditability rather than silently removing them. No push or publication was performed by this runner.

## Final targeted verification

The shared-app reports contain **160 capture operations across 149 distinct screenshot filenames**, excluding the discarded initial sidebar baseline. These include intermediate findings and their explicitly named replacements; the most recent targeted files are authoritative for a changed surface. The separate Finals matrix and Rocket League matrix are not included in that count.

- `sweep-polish-report.json`: seven captures, zero errors/warnings. One and two genuinely saved League builds at 1440×1050 and 1000×900 now use 48px item icons within bounded cards. The two-snapshot assertion passed. Siege's actual-size chart is centered, workspace results have clear gaps, and Sensitivity Help source actions are separated.
- `sweep-rl-sidebar-after-report.json`: eight captures, zero errors/warnings. Populated, idle, local 30-day signed-out and collapsed states at 1440px; responsive 1000px/2560px; enabled-login presentation; and a held password-eye button. The sidebar has a compact identity, readable recent-form chips and continuous background fade. The eye's rectangle remains fixed during the 250ms press.
- `.validation-cache/rl-redesign/report.json`: the complete 40-view Rocket League matrix was rerun after the shared changes, with zero errors/warnings. It covers normal 1440px, narrow 760px, large 2560px and exact 3840×2160. Own orange team remains left/first, profile/settings widths remain bounded, and observed settled profile states request zero JavaScript animation frames.
- `.validation-cache/rl-redesign/lower-report.json`: two lower-chart views were recaptured after waiting 1100ms after scrolling newly visible charts into view. Both pass with zero idle frame requests; these replace earlier screenshots taken during the entrance animation.
- `.validation-cache/rl-redesign/requests-report.json`: final normal/narrow outgoing-request action wrapping passes in two captures with zero errors/warnings.

The original broad Rocket League runner already activated its lazy base stylesheet by rewriting the served HTML. The newly added sidebar fixture initially omitted that step, creating a false missing-auth-layout finding. Its corrected eight-capture pass loads the base stylesheet at the production link position; the earlier sidebar/auth artifact is discarded. No authentication request or account mutation was made.

No unresolved visual defect was found in the final reviewed reachable page families. This statement is bounded by the explicit native/admin/provider/DPI limitations above and does not certify every combinatorial state or runtime performance.
