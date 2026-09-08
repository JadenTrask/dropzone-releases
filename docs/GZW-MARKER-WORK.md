> Disabled in Dropzone 1.2.1: Gray Zone Warfare shows Under construction. This document describes the previous implementation.

# Gray Zone Warfare — 1.2.0

Data checked September 7, 2026. Marker use is authorized by permission confirmed by the app owner.

## Marker coverage

Source: https://gzwtacmap.com/maps/lamang — map revision 0.4.

The normalized snapshot contains 4,921 approved, published markers. It excludes 41 unapproved/unpublished entries from the raw response. Coverage includes 55 LZs, 57 key spawns, 291 intel locations, 168 buried caches, 10 Easter eggs, containers, doors, POIs and other supplied categories. The separate objective list contains 490 entries across 198 missions. Counts are a snapshot, not a guarantee of every location in the game.

LZs use a square LZ icon and always-visible names. The Markers tab provides search, category filters and show-all/essential presets. Dense non-LZ markers cluster at wider zoom levels. Click clusters to zoom, or click a marker for coordinates and its source. Markers indicate possible loot locations; loot is not guaranteed.

Missions combine the original 307-entry mission/contract index with 13 map-only mission names in this snapshot. Selecting a mission focuses its source-supplied objectives where available. Other entries show only a known approximate region. Full instructions remain on linked guides. The Keys tab retains 127 key/keycard descriptions; exact key spawn markers are a separate category.

## Coordinates and terrain

The marker source uses metre coordinates in a 14,000 by 8,000 extent. Its game-grid conversion is X = 100 + longitude/100, Y = 100 + latitude/100. These coordinates are retained at source precision.

The reference image CDN returned HTTP 403. No access restriction was bypassed. The original 9027 by 5029 terrain image from https://github.com/ZedimAits/GZW_map remains bundled, with approximate grid calibration and an unknown game revision. Terrain and current markers can differ. The status bar and Data & help disclose this; a permitted current image export would enable replacement.

## Controls and saved data

Drag to pan; scroll to zoom around the pointer; cursor coordinates follow the mouse. Arrow keys pan; plus/minus zoom; zero fits the map. Select your faction for applicable objectives and separate mission progress, collected keys, notes and pins. Plan route draws straight segments, not a terrain-aware path. Export/Import preserves local progress backups.

## Refresh

Mission/key data, marker data and official patch feeds each request fresh data on every launch and every 15 minutes. A new process checks despite a recent disk cache. Failed requests preserve the previous data and its timestamps, and display a failure. Public data updates need no rebuild. Provider format changes, terrain assets and new functionality can require an app update.

Sources: GZW Data API (https://gzw-data.dev/), GZW Tac Map (https://gzwtacmap.com/), community wiki and the terrain repository above. Source author account identifiers are not retained. Marker fetch time is not a source edit date; the source supplies no last-edit timestamp.
