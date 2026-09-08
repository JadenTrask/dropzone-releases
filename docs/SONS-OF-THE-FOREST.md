# Sons of the Forest — Dropzone 1.2.2

Open Sons of the Forest in the game library, then use Island map.

- The full island map is bundled at five tile resolutions and works offline.
- All 1,023 records from the source snapshot are included, with 21 layers.
- Essentials starts with tools, weapons, caves, bunkers and artifacts (100 markers).
- Show all and Hide all control every layer. Individual checkboxes control each category.
- Search matches names, categories and location descriptions. The item index searches all records, including hidden layers; selecting a result reveals it on the map.
- Scroll / plus / minus zoom; drag / arrow keys pan; Fit island / zero reset the camera.
- Mark as found stores progress locally. Hide found removes completed locations from the map. Filter selections and progress survive restarting the app.
- Underground items are plotted at their island coordinates. Use nearby entrances; this is an island map, not interior cave floor plans. The location selector separates surface and underground items.

Data is a community snapshot, not a live game feed or an exhaustive list of every
random/crafted item spawn. It contains the complete set of locations published
in the credited source revision. It does not read game files or change saves.

Source: https://github.com/lmachens/sons-of-the-forest-map
Revision: 03fa2370ed1bf95ea628332c357f43012524ab43
Source last changed: 2025-11-18. Imported: 2026-09-08.

The coordinate calibration is x east, y north in [-2000, 2000]. Tile names
are z-x-y.webp, with y increasing south. The full map is 4000 world units;
level z divides it into 2^z tiles per axis. Canvas drawing scales to the
viewport and device pixel ratio. All map listeners and animation frames are
disposed when leaving the page. New map data requires an app release.

As in the source renderer, each 256-pixel tile is cropped to its 250-pixel
active area before display, preserving the original coordinate calibration.
