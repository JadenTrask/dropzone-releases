# Dropzone 2.1.1

Includes the complete 2.1.0 gameplay update below, plus a verified correction for personal patch alerts when Steam supplies a CDN announcement URL. Dropzone now matches the announcement in the official public Steam news feed and reads its full contents. Invalid range-breakpoint input also exits safely.

132 application checks and the shared-room checks pass. The published squad service was verified with a temporary room, then the room was closed. Automatic account synchronization and in-game accuracy remain unverified or unavailable as described below.

# Dropzone 2.1.0

- Open a compact, always-on-top version of the actual app with Ctrl Alt D. Choose another shortcut in Tools; return with Full app. Borderless games are supported; exclusive fullscreen can obscure it.
- Find games, tools, saved COD builds and pins with Ctrl K. Reopen the last workspace on launch and retain WARDOGS map cameras between sessions.
- Create WARDOGS squad rooms with expiring invite codes, named target/rally/gun/note markers, local saved plans and opt-in live target sharing. Follow a spotter target without moving your gun. Room members must use matching map calibration.
- Plan WARDOGS weapon unlocks from your local progression: owned, eligible, locked and unknown states; unlock budgets; next level milestone; saved goals; an owned-weapon recommendation using the current damage scenario. Unlock fees are not deployment kit prices.
- Compare weapon firing time and estimated range breakpoints. Add verified 5.56 FMJ/AP/HP first-hit coefficients and complete the Galil profile. Other calibers' AP/HP coefficients and armor durability are unavailable.
- Check official patch pages for mentions of saved weapons, attachments, champions and extra watch-list items. Checks run while the app is open and can be disabled. Mentions link to the source; they do not automatically mean a buff or nerf.

**Account import:** snapshots can be entered or imported locally. Automatic WARDOGS / MetaForge account synchronization is not available because no supported integration endpoint has been established. Signing into the optional provider browser does not import progression.

**Accuracy:** damage and terrain remain dated community reference models, not in-game measurements. Armor breakage, recoil, reloads, attachments and hit probability are not modeled. Mortar height correction remains unavailable; the SPH-2 correction remains experimental. Unknown data stays explicit.

**Privacy:** progression, loadouts, pins and saved plans stay on your PC. Connecting to a squad room sends only its map and shared markers to Dropzone's website. Anyone with the invite code can edit the room. Rooms expire after eight hours and creators can close them sooner. Automatic target sharing starts off. See the website privacy statement.

**Verification:** existing app checks, focused ammo/unlock/patch/quick-panel checks and database room tests passed. Two isolated app clients exchanged live targets; the gunner's range updated from 600 m to 550 m with the gun unchanged. The native compact panel opened successfully. Computer control was stopped before the native global-keyboard workflow could be completed. No in-game shots were tested.

# Dropzone 2.0.4

- Open MetaForge progression, player profile and career tables inside the WARDOGS Progression tab.
- Keep remote content in an isolated browser session with no access to Dropzone's local data or desktop bridge.
- Add Reload, clear loading/error feedback, and Open in browser for site or login restrictions.
- Preserve MetaForge branding, content and sign-in; no scraping or automatic progression import.

# Dropzone 2.0.3

- Add a first-use WARDOGS tutorial with highlighted controls, arrows, and a permanent Tutorial replay button.
- Replace the opening badge with a transparent Blender emblem and a single-window reveal; prevent the brief library flash.
- Widen the website on large screens and update download links to 2.0.3.

# Dropzone 2.0.2

- Add Zestafona alongside Bakurani and Ozeti, with pinned offline map imagery.
- Add automatic community terrain estimates, manual gun/target heights, structure offsets, signed height differences and an explicit flat-ground mode.
- Put sight distance first. SPH-2 offers an opt-in experimental 155 mm HE height correction and equivalent range readout. Mortar height correction is unavailable pending calibration; no invented adjustment is shown.
- Make gun placement automatically switch to a locked-gun target workflow. Add Move gun, Clear target, Undo and Fit gun and target; dragging always pans.
- Keep map views and markers independent per map. Protect against stale terrain lookups and corrupt/missing data.
- Add an original Blender 3D opening animation with a single-window transition and reduced-motion fallback.

**Accuracy:** terrain is a community estimate, not independently game-validated altitude. SPH-2 corrections use experimental 10-MIL candidate bins on a level chassis; game validation is still required. Buildings, trees and trajectory clearance are not evaluated. Existing flat-ground tables are preserved. Full limits and calibration checklist: [WARDOGS 2.0.2](WARDOGS-2.0.2.md).

Saved builds, locations and preferences retain the existing profile.

## Previous release: 2.0.1

- Fix Sons of the Forest map icons failing to open location details.
- Prevent the map from getting stuck in drag mode after clicking a marker or losing pointer capture.
- Add recognizable cave, weapon, tool and other item icons to the map, map key and location list.
- Advance the app version to 2.0.1 so existing 2.0.0 installations can detect the update.

Saved locations and map preferences are preserved.
