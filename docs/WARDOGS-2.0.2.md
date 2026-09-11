# WARDOGS calculator 2.0.2

## Source and scope

Updated the existing Electron/vanilla-JavaScript app, verified as 2.0.1 in package.json, package-lock.json and app/version.js. The original source in `Documents/Codex/2026-09-08/ikm-x20/work/dropzone` was preserved. This recoverable copy is on `wardogs-terrain-workflow`. The firing-table interpolation in wardogs-model.js is unchanged. Other game workspaces remain intact.

## What to use during a match

Choose a map, click Place gun, then click a target. The gun locks automatically. Further clicks replace only the target; all drags pan, including drags beginning on a marker. Move gun explicitly relocates it. Fit gun and target, Clear target and Undo are on the map toolbar. Per-map markers, weapon, heights and view are retained; changing settings does not reset the camera. Gun uses a mint square; target a coral diamond.

Sight distance is the number to enter on the weapon's range display. Ground range is the horizontal map distance, not a corrected setting. Barrel elevation is separately labeled in game MIL. The UI never adds the terrain slope angle or substitutes 3D slant distance.

### Height-adjusted sight distance

- **SPH-2:** optional **Estimate SPH-2 sight distance**, off by default. Uses Apollyon's published experimental 155 mm HE candidate surfaces, then inverts the same arc's flat firing table to estimate the sight readout. Chassis must be level. The original reference table must match exactly or correction is disabled.
- **Mortar:** no supported height-calibration model was found. Nonzero height difference displays no adjusted sight distance. Its existing barrel setting remains explicitly a flat-ground reference. Choose Assume flat ground deliberately to get a flat-ground sight distance.
- Same-height and explicit flat-ground results preserve the existing table exactly. Unknown heights never become zero.
- Candidate low-arc coverage is parts of 1,283–2,629 m, height difference ±40 m. High arc covers parts of 780–2,536 m, height difference ±80 m. Gaps, ambiguous commands, family disagreements, and unreachable cases withhold adjusted settings. These envelopes are computational model consensus, **not in-game certification**.
- Candidate outputs use **10-MIL bins**. Small height differences can yield the same command in both directions; bin rounding can dominate a small correction. Displayed whole metres are a table conversion, not one-metre accuracy. The SPH-2 range-display correspondence itself still requires comparison against the game.
- Example software fixture: 2,000 m ground range, low arc, +20 m gives 220 MIL / estimated 2,046 m sight distance; −20 m gives 200 MIL / 1,979 m. No shots were fired in WARDOGS during this work.

Source: [experimental release policy](https://github.com/apollyon-sys/wardogs-calculator/blob/b1463dab45fb7871a893f14d17f0064ef48e3724/data/ballistics/terrain-context.json), [candidate implementation](https://github.com/apollyon-sys/wardogs-calculator/blob/b1463dab45fb7871a893f14d17f0064ef48e3724/js/features/experimental-terrain-correction.js). The payloads explicitly require held-out validation. Original MIT attribution is retained. Full candidate JSON, its reference weapon table and source policy are bundled under app/data/wardogs/correction.

## Terrain data and maps

**No map currently has independently game-validated automatic heights in this release.** All three have offline automatic **community estimates**, plus manual ground-height entry, above-ground offsets and an explicit flat-ground mode. Absolute terrain datum and exact game build are unresolved, so automatic values are displayed relative to gun ground. Gun ground is the reference zero, not a claim that the gun is at sea level. Manual heights must share a user-chosen reference. Moving a point clears its measured override/offset; Undo restores it.

Source snapshot: apollyon-sys/wardogs-calculator `b1463dab45fb7871a893f14d17f0064ef48e3724`, assets-v1 collision terrain. [Terrain documentation](https://github.com/apollyon-sys/wardogs-calculator/blob/b1463dab45fb7871a893f14d17f0064ef48e3724/docs/terrain.md).

| Map | Terrain coverage, game coordinates | Quad offsets X/Y | Vertical source transform | Limits |
|---|---|---|---|---|
| Bakurani | See bundled coverage manifest; chunk X16–31, Y12–27 | 8160 / 14280 | 0.5 + localZ × 9 m | Absolute datum unresolved; community landmark evidence only |
| Ozeti | X0–161.58, Y1.62–163.20 | 81 / 8241 | 0.04 + localZ × 9 m | Missing eastern terrain strip remains unavailable; upstream mapping evidence text references Bakurani |
| Zestafona | X0–163.20, Y0–163.20 | 0 / 8160 | 1225 + localZ × 5.85 m | Upstream coordinateMappingEvidence is empty; independent landmark/altitude verification needed |

Each game coordinate unit is 100 m. Terrain maps X with +50 landscape quads per game unit and Y with −50; original vertices are 2 m apart. The bundled dataset retains alternate source vertices: 4 m resolution, 256 × 256 samples per chunk, 256 chunks per map. Per-chunk little-endian uint16 values retain their original min/max decoding; bilinear interpolation samples between vertices. Manifests retain origin, orientation, units, scale, source hash and game-build uncertainty. Missing coverage, unavailable chunks, invalid inputs and failed integrity checks produce unavailable states. No heights derive from image brightness or geography.

The provider caches manifests, deduplicates pending chunks, checks SHA-256 and uses a 48-chunk LRU. Revision tokens discard obsolete marker/map lookups. Camera coordinates never enter the terrain sampler. No trajectory/obstruction profile is claimed: trees, buildings and chassis tilt are not evaluated.

Zestafona's exact name is present in the current community calculator and its map configuration. Added 590 source map tiles through zoom 5 with its supplied bounds, scale, orientation and tower coordinates. Visual landmarks follow the source tile/grid registration; independent in-game landmark checks remain outstanding. The exact first-availability date of September 10 could not be established from the official posts checked. This release does not assert that date. Bakurani/Ozeti imagery and calibration remain unchanged.

### Research boundaries and reuse

[WARDOGS Zone](https://wardogs.zone/calculators/artillery) describes the equivalent sight-range concept, but no open, validated implementation/calibration was obtained; its stated weapon limits differ from Dropzone's existing tables. MetaForge's ballistics page concerns weapon damage/TTK and does not establish an artillery height model. Another public wiki uses a drag-free real-world gravity approximation, which was not adopted. No proprietary calculator implementation was copied.

Code and community data were reused from the MIT-licensed Apollyon repository with attribution and its exact license retained. WARDOGS imagery and game-derived assets remain property of the game rights holders; the community MIT license is not evidence of a separate publisher asset license or endorsement. No official publisher asset reuse grant was found. This follows the existing app's credited independent companion distribution; no generated map assets were used.

## What will validate or improve accuracy

For each map, supply the exact game build, a licensed heightmap or collision mesh, its units/origin/rotation/vertical scale and datum, and at least three widely spaced identifiable landmarks with in-game X/Y and ground altitude. Prefer a fourth held-out point and a shoreline/flat reference. Retain coverage and missing-data markers. A raw overhead image alone cannot enable verified heights. Blender can inspect supplied legitimate meshes.

For each weapon/ammunition/charge and arc, record same-height range versus game MIL and sight-range readout, then known uphill/downhill height differences at several horizontal ranges. Keep the SPH-2 level and record gun/target platform heights. Observe actual impact coordinates, not only whether a shot appears close. Test near minimum/maximum range, model-bin boundaries, and at least one held-out position per height/range band. Mortar correction needs these measurements or documented game trajectory parameters; a flat table alone is insufficient.

## Validation record

- 116 automated tests passed before splash integration, covering all existing game/provider/update tests plus terrain coordinate transforms, metre/sign handling, missing/corrupt data, map isolation, duplicate requests, stale lookup cancellation, pointer pan/placement/lock behavior, original same-height table rows, candidate uphill/downhill fixtures and unreachable/unsupported shots.
- All 768 compact terrain chunks and all 590 Zestafona tiles verified against recorded SHA-256 and lengths. The download pipeline verified the original terrain chunk hashes before preprocessing.
- Browser workflow exercised in an isolated test origin: gun placement, automatic target mode/lock, target replacement, dragging, exact coordinates, SPH-2 arcs, height typing and reload persistence. Immediate input updates were fixed after this walkthrough exposed a stale-input interaction.
- Browser preview uses the real renderer, not a mockup. Native window controls, updater installation and file dialogs require desktop testing. External feed refresh failures remain visibly labeled; bundled data remains usable offline.
- Further build/native/website results are recorded with the delivered artifacts. Software checks do not certify in-game accuracy.

## Run and design source

Run `npm ci`, then `npm start` for Electron, or `npm run preview` for the real browser renderer (default localhost:4173). The working session preview uses localhost:4181. For an animation preview add `?intro=1`; add `&game=wardogs` to enter the calculator afterward. The Blender source is design/Dropzone-Intro.blend; scripts/create-splash.py and encode-splash.py reproduce the original 54-frame ident. Reduced motion uses a static frame. The same final frame bridges the startup window to the ready app; network feeds never gate it, and recovery has a timeout.
