# Dropzone 2.5.4

- **Modern Warfare 4:** dedicated multiplayer attachment recommendations now lead the Call of Duty collection. Black Ops 7, Warzone and existing saved builds remain separate and available. MW4 ranked loadouts are not connected.
- **Rocket League transitions:** tabs now use an opacity-only fade. Removed screen-capture transitions that could resize content and interrupt glass backdrop rendering. The released navigation design and hover collapse remain in place.
- **Weapon browsing:** selecting another gun fades only its loadout preview and keeps the weapon list in place. Cards gently shrink at the scroll edges. Removed duplicate search focus outlines.

The experimental iOS-style redesign is not included. Reduced-motion preferences skip the new fades and scroll motion. Provider failures retain the last valid loadout feed.

All 344 Node tests passed; publication repeats the complete Node test suite and artifact-integrity checks. Browser preview checks covered Rocket League tabs, MW4 selection and WARDOGS navigation. Native installation, installed-version upgrade, signed-in profiles, live gameplay and GPU behavior across other PCs were not exercised. The Windows installer remains unsigned.
