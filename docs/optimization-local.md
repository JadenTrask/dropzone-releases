# Local optimization pass

- Damage Lab reuses weapon options unless filters change. Closed comparisons are not calculated or rendered; opening one refreshes it with current settings.
- The select enhancer scans only DOM changes containing selects, rather than every result/text update.
- WARDOGS calculator, Damage Lab, Forest, Siege and FINALS modules load on demand. A navigation revision prevents a delayed import from mounting over a newer route. Forest/Siege styles load in their original cascade positions before mounting.
- 311 weapon thumbnails (480px WebP) total 5,693,966 bytes versus 145,850,560 bytes for original images. Originals remain for details and local fallback. This reduces thumbnail transfer/decode costs; it adds thumbnail files to the installation.

Local headless Edge spot measurement: 100 synchronous range-input updates took 76 ms before and 7.4 ms after. Hidden comparison rows: 34 to zero; Damage Lab JS resources: 39 to 28. This is a targeted synthetic check, not a whole-app FPS or startup guarantee.

Validation: all 152 existing tests passed. Browser checks passed for deferred startup, results, option reuse, filters, opening comparisons, thumbnail/full-image fallback, fast navigation, and the five deferred workspaces. No publication or version bump.

## Broader application pass
- Deferred server browser, market, sensitivity, watch and patch UI modules as well as game modules. The same Damage Lab resource count is now 20 JS files (39 before both passes).
- Source status polling: 3s while showing progress/source page, 60s idle, suspended when hidden, immediate check on return. Existing request coalescing retained.
- Source update jobs run at most four concurrently, with independent failures and no duplicate refresh runs.
- League build snapshots have a bounded 64-entry memory cache. Caller mutations do not affect stored results; patch, expiry, explicit refresh and cache-clear behavior are retained.
- Forest marker hover uses a single nearest-distance pass, without allocating/sorting per pointer event. WARDOGS disposal clears tile callbacks and stops pending image loads; evicted tiles release callbacks.
- Gold chart hover uses binary search on pre-parsed timestamps; same-point movements skip DOM updates. Unchanged refresh data preserves the current chart rather than rebuilding it; concurrent refreshes coalesce.
- COD weapon selection preserves list nodes and images. Filtering preserves the details panel when its selected build remains valid.

Reviewed existing protections and retained them: map drawing is already requestAnimationFrame-coalesced; tile caches are bounded; provider requests already coalesce and enforce freshness; source responses and server caches have size limits; desktop background throttling is not disabled; packaging excludes development art/tools via the existing allowlist. No broad CSS reorder or removal of legacy user data.

Validation: 156 tests passed (including concurrency, memory-cache isolation/freshness, nearest-date equivalence and map hover). Browser checks passed for cross-game navigation, delayed imports, sensitivity, armor/regions, thumbnails, chart interaction, hidden-window suspension/resume and full-game layouts. Windows installer built successfully with publishing disabled; checked packaged assets/code match source. The installer retains version 2.2.3 and is a local unpublished build.
