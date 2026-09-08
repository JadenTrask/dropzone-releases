# Adding games to Dropzone

The launcher reads `core/games.json`. `core/game-service.cjs` validates the selected game and mode and delegates to the registered provider. Games do not share a build feed implicitly. The renderer receives the public registry over the isolated Electron bridge (or `/api/games` in development).

## Add a game or collection

Each entry has a unique lowercase `id`, `parent` (`null` for the opening screen), `kind`, `name`, `shortName`, `eyebrow`, `description`, `theme`, hex `accent`, local `cover`, and `status`.

- `collection` displays its registered children. Optional `childPrompt` customizes its card button.
- `loadouts` uses the shared weapon/attachment renderer and a registered provider.
- `calculator` dispatches to the WARDOGS map/calculation workspace. Other games need their own validated model and explicit route. Set `videos: false` when no appropriate official competition channel is connected.
- `tacmap` dispatches to Gray Zone Warfare’s map, mission/key index and local progress workspace. Its read-only provider is registered independently; it is not a weapon-build feed.
- `finals` uses a dedicated class/gear/team model and the THE FINALS renderer.
- `league` opens the existing dedicated League workspace (`lol`). Games with a different build model need their own renderer and explicit route dispatch; don't force items or skill trees into weapon attachment records.
- `coming-soon` entries include `releaseDate`, `releaseSource`, and `releaseVerifiedAt`. They never request build data or unlock automatically on a calendar date.

Example entry for an independently supported future weapon game:

```json
{
  "id": "future-game",
  "parent": null,
  "kind": "loadouts",
  "provider": "future-provider",
  "sourceName": "Verified build source",
  "name": "Future Game",
  "shortName": "Future Game",
  "eyebrow": "YOUR NEXT GAME",
  "description": "Weapon builds for this game.",
  "theme": "future-game",
  "accent": "#66c4e8",
  "cover": "assets/games/future-game.webp",
  "status": "active",
  "modes": [{"id": "duos", "name": "Duos", "feed": "future-duos"}]
}
```

The launcher card, mode controls, filters, variant switching, save/copy actions, source dates, and stale-feed notices work from these records. Add scoped theme rules to `app/hub.css` for surfaces beyond the accent. Add artwork attribution alongside the asset.

## Register an independent provider

Implement `getBuilds({feed, refresh})`. Register its instance in `core/services.cjs`, which is shared by Electron and the preview. A provider must validate the returned game and mode before caching. It must never substitute another game's feed on failure.

Return:

```js
{
  schema: 1,
  source: 'Verified build source',
  sourceUrl: 'https://the-source.example/game/mode',
  sourceUpdatedAt: '2026-09-01T12:00:00.000Z', // null if not supplied
  fetchedAt: '2026-09-06T12:00:00.000Z',
  cacheState: 'live', // live, cached, bundled, or offline
  methodology: 'Explain the source and ranking method.',
  builds: [{
    id: 'stable-variant-id',
    weapon: 'Weapon name',
    category: 'Assault Rifle',
    playstyle: 'Long Range',
    tier: 'Meta', tierRank: 1, sourceRank: 1,
    attachmentCount: 1,
    attachments: [{slot: 'Optic', name: 'Verified optic', unlock: '', unlockWeapon: ''}],
    code: null,
    image: null, asset: null,
    sourceUrl: 'https://the-source.example/game/weapon',
    updatedAt: null,
    stats: {ads: null, sprintToFire: null, velocity: null, magazine: null}
  }]
}
```

`GameService` adds the validated `game` and `mode` to the response. Dates describe the source, not when a file was packaged. Keep the original dates when serving a saved feed. A failed refresh may return valid cached builds plus an `error` message; the renderer displays the offline notice and still uses those builds.

Tier ranks `0` and `1` are shown by the default **Top meta picks** filter. Other records remain accessible under **All builds**. The renderer groups variants by weapon and playstyle while preserving the provider's order. Validate that a build has every declared attachment. Do not create a loadout code or missing attachment yourself.

External source domains must be added explicitly to the Electron `safeSource` allowlist. Remote image domains must be added explicitly to the HTML content security policy; image URLs must be validated in the provider. For bundled weapon images, supply an asset key matching `app/assets/weapons/<key>.webp`. The provider owns request timeouts, response-size limits, cache keys, and source-shape validation. Keep credentials out of renderer code and distributable snapshots.

## Automatic checks and official media

Add the new provider to the UpdateService jobs in `core/services.cjs` so startup and 15-minute checks include it. A job has `id`, `name`, `scope`, `sourceUrl`, `run`, and optional `detail`. Return `fetchedAt` as the last successful fetch and `sourceUpdatedAt` as the publisher's change date (null if unknown). Failures preserve cached metadata. Do not convert a publication date into the time you downloaded it.

`core/source-cache.cjs` provides a reusable bounded HTTPS reader and a validated snapshot cache. Each instance always requests the source on first use, then reuses a successful session result for 15 minutes. Failed attempts stay attached to cached data and retry after one minute on the next request. An explicit refresh bypasses the timer; concurrent requests coalesce. Disk freshness never skips first-session network access. Class/gear games can use a dedicated renderer such as `app/finals-ui.js`; team presets live in `app/data/finals/teams.json`, with an explicit season, reviewed patch, and review date. `app/team-model.js` validates each player against the required class and current source build. Preset players have a fixed `weapon` as well as their source build ID. If the source removes that weapon or build, the preset becomes unavailable until reviewed. There are no player customization controls. Never auto-advance a manual review timestamp during a source fetch.

Game pages have persistent Loadouts (or Calculator), Patch notes, and optional Videos tabs. Patch sources are registered in `core/patch-provider.cjs`, with validated publisher URLs, game filtering, publication/update dates, and last-successful-fetch dates. WARDOGS is the first dedicated map/calculator renderer. Additional pages can be added without renaming the app. Add the page to route dispatch, its UI module, and the game-specific navigation.

For official video support, verify the channel on a publisher-owned site, then add its exact ID, game mapping, and official link to `core/media-provider.cjs`. Add its public feed, playlists, and streams to startup checks and include valid fallback snapshots. Add the game to `app/watch-ui.js` names and the video-route list in `app/hub.js`. `core/video-archives.cjs` reads public channel pages, checks ownership, and fetches selected playlists. Media requests require a single game; there is no mixed-game feed. Validate the channel ID on the feed and every item. Bundled featured broadcasts must keep their original dates and be labeled as archived. Keep player controls visible and retain an external YouTube fallback.

## Enable Modern Warfare 4 later

The `mw4` registry slot is already present. After release, verify a usable, authorized public data source and its actual game/mode identifiers. Add separate validated feeds, bundled snapshots, and modes; then change `status` to `active`. Do not guess an API URL based on BO7 or point MW4 at a BO7 response. Keep unavailable modes disabled.

## Check before packaging

Run `npm test`. Add meaningful provider tests for a recorded valid response, wrong game/mode rejection, incomplete builds, and offline fallback. `test/cod.test.cjs` includes an independent future-provider dispatch check.

Check launcher navigation, mode switches, filters, variants, saved snapshots, source links, and 100–200% text size in the shared renderer. Rebuild with `npm run package:win`. The Windows release contains the registry and providers, so adding a game requires a new app release; there is no remote executable plugin loader or silent code updater.

## Additional WARDOGS maps

Keep playable `bounds`, image `tileBounds`, and `coordinateMetersPerUnit` distinct. Bundle tiles and calibration from one immutable revision. The map renderer uses north-up coordinates, clips to playable bounds, and transforms input coordinates independently of zoom and display density. `scripts/wardogs-assets.py` records the source revision and all bundled tile hashes. A new map needs validated source bounds, tile coverage, appropriate rights-holder attribution, model tests, and a new app release. Never assume an image width is the playable width.


Game-specific extra pages are declared in the registry `pages` array. WAR DOGS exposes `progression`, routed by `hub.js` into `wardogs-progression-ui.js`. This page links to community account services; it does not implement a data provider or account login. The Ballistics page was removed in 2.3.1. Do not reuse another game’s API or ship account credentials.
