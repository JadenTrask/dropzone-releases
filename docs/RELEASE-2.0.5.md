# Dropzone 2.0.5

- Fixed the MetaForge panel collapsing to an invisible width. Page readiness no longer waits indefinitely for advertising subframes. Failed loads show recovery controls.
- Navigation collapses to icons and expands on hover or visible keyboard focus.
- Native WARDOGS progression dashboard supports reviewed JSON imports, manual snapshots, export and local history. Missing values remain unknown.
- Damage lab includes a clickable 12-region body diagram, independent helmet/body armor controls, range and health settings, and comparison across 34 listed weapons. 28 have published hit-location profiles.

## Important limits

Automatic account progression sync is **not implemented**. A provider-approved API or export is needed; website sign-in alone does not sync. Import accepts the template offered in the app and Dropzone snapshots. It does not claim to accept an undocumented MetaForge export.

Damage values are a community reference approximation, not in-game accuracy validation. Sources are linked per weapon in app/data/wardogs/damage-reference.json. Armor coverage and reductions follow the public MetaForge reference. Range interpolation is linear between published endpoints. Armor durability loss, plate breakage, travel time, reloads, attachments and special ammunition are not modeled. Hits and firing time assume constant damage. Buckshot results are per pellet and unavailable against armor. Galil, Compound Bow and explosive weapons have no complete supported profile; unknown values remain unavailable. The body diagram is schematic, not the game collision mesh.

Public reference: https://metaforge.app/wardogs/database/weapons/m4
Provider integration terms: https://metaforge.app/terms and https://wardogs.tools/terms

## Verification

127 automated checks passed, including existing artillery, coordinate, terrain, save, updater and provider tests. Desktop rendering checked in an isolated profile; MetaForge displayed its actual progression page after the layout fix. Damage lab rendered its body controls and weapon comparison, and unsupported range displayed no result. No shots were tested in WARDOGS, and no account synchronization is claimed.
