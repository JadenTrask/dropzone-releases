# WARDOGS reference materials

Dropzone uses the original coordinate calibration and game firing tables from
[Apollyon's WARDOGS Artillery Calculator](https://github.com/apollyon-sys/wardogs-calculator).
The table interpolation in `app/wardogs-model.js` follows that project's logic.
The original MIT notice is included in `WARDOGS-calculator-MIT.txt`.

Bundled map imagery and calibration were obtained from revision
`c3252c9d24a22d1aad5d3fa4408807aef591bb56` on September 6, 2026.
`app/data/wardogs/assets.json` records each bundled map tile and its SHA-256.
The maps' playable bounds and image bounds are kept separate. Original radio
tower coordinates are converted from metres to the game's displayed units.

Version 2.0.2 adds Zestafona tiles, three community collision-terrain datasets,
and opt-in experimental SPH-2 candidate resolvers/data from Apollyon's revision
`b1463dab45fb7871a893f14d17f0064ef48e3724`. The MIT notice above applies to
reused source code and community data under that repository's license. Source
manifests and SHA-256 hashes are retained. Terrain is downsampled from 2 m to
4 m; its absolute datum and exact game build are not independently verified.
The candidate solver's held-out validation remains outstanding. See
`docs/WARDOGS-2.0.2.md` for transforms, provenance and accuracy limits.

The 3D opening emblem and animation were created for Dropzone in Blender from
the app's existing brand.svg. The editable scene and reproduction script are
included in the source distribution.

WARDOGS names, trademarks, game maps, and artwork belong to their respective
rights holders, including BULKHEAD and Team17. The MIT license for the reference
project and Dropzone does not grant ownership of those third-party assets.
Dropzone is an independent companion and is not endorsed by the game's creators.

MetaForge is linked as an additional map reference. Its site code, account
services, and overlays are not copied into this app.

Official patch posts remain with their publishers. The app stores titles, dates,
short previews, and official links; it does not redistribute complete articles.


# Gray Zone Warfare reference materials

Mission and key records come from the [GZW Data API](https://gzw-data.dev/),
maintained by ZoniBoy00. Its [source project](https://github.com/ZoniBoy00/gzw-data)
is MIT licensed; the original license text is in `GZW-data-MIT.txt`.
The data index derives from Gray Zone Warfare Wiki contributors. See
https://gray-zone-warfare.fandom.com/wiki/Gray_Zone_Warfare_Wiki and the
[CC BY-SA license](https://creativecommons.org/licenses/by-sa/3.0/).
Dropzone merges categories, normalizes fields, and generates guide links.
These data credits do not imply that every linked guide exists or is current.

The terrain image was retrieved from
https://github.com/ZedimAits/GZW_map/blob/main/GZW_Map.jpg on September 6, 2026.
Dropzone creates WebP tiles and an overview from that image. No code from
that map project is copied. Its image revision date is unknown. The image
SHA-256 and source are recorded in `app/data/gzw/map.json`.
The estimated grid is aligned to an in-game screenshot published at
https://gray-zone-warfare.fandom.com/wiki/Locations.

Region centers are approximate annotations. Landing-zone cells are adapted
from the Ban Pa and Blue Lagoon wiki pages, credited individually in
`app/data/gzw/locations.json`. They are a partial list, not exact coordinates.
The data and coordinates retain their applicable upstream licenses.

Gray Zone Warfare, its maps, names, artwork and trademarks belong to MADFINGER
Games and their respective rights holders. Dropzone's MIT software license
does not grant ownership of game imagery. Dropzone is an independent fan
companion and is not endorsed by MADFINGER Games.

GZW Tac Map supplies the approved markers and objective positions in version 1.2.0, used with permission confirmed by the app owner. Source links and categories are retained; private author account fields are removed. Its site code is not copied. Its terrain CDN refused download, so its map tiles are not bundled.

# Rainbow Six Siege

Operator and map metadata, icons, portraits, promotional art and official statistics charts are from Ubisoft public catalogs and Designer’s Notes. All Siege names, artwork and trademarks belong to Ubisoft and their respective rights holders. Dropzone’s software license does not grant ownership of those materials. Editorial map guides are Dropzone content; they are not Ubisoft endorsements. See docs/SIEGE.md for data dates and limits.

# Sons of the Forest reference materials

The offline island tiles, 1,023 location records, category definitions, icons,
and reference screenshots are from Leon Machens / The Hidden Gaming Lair's
[Sons of the Forest Map](https://github.com/lmachens/sons-of-the-forest-map),
revision `03fa2370ed1bf95ea628332c357f43012524ab43` (November 18, 2025),
retrieved September 8, 2026. The original MIT license is in `SOTF-map-MIT.txt`.
`app/data/sotf/map.json` retains the exact source revision and source dates.
Game names, map imagery and artwork belong to Endnight Games and their rights
holders; the project's MIT license does not transfer those rights.
Item guides link to the Sons of the Forest Wiki; wiki articles are not bundled.
