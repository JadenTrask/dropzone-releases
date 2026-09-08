# WAR DOGS integration findings — September 6, 2026

Historical research for 2.3.0. The Ballistics tab, weapon index and website frames were removed in 2.3.1 at the user’s request. Progression links remain.

## Ballistics

- https://wardogs.tools/ballistics documents 29 firearms, separate helmet/body armor, FMJ/HP/AP, 12 hit locations, range controls, damage breakdown and TTK-vs-range graphs. Its TTK definition counts firing intervals after the first shot; it does not include bullet flight. Damage uses authored per-weapon curves and the site limits modeling to those curves.
- https://metaforge.app/wardogs/ballistics exposes weapon/round filters, independent armor and helmet levels, hit zones, range, TTK/STK rankings, damage and ammo comparisons. Its TTK includes bullet travel. Its visible list includes a Compound Bow, which is also in Dropzone's combined local weapon index.
- These sources differ in coverage and model assumptions. Their numbers should not be mixed into one unlabeled ranking.
- No accessible, documented public WAR DOGS API or reusable complete damage model was found. MetaForge's published API documentation at https://metaforge.app/arc-raiders/api is for ARC Raiders and does not establish WAR DOGS support.
- Direct HTTP requests to the community sites returned 403. No proxy, spoofed client, authentication bypass or alternate browser was used to defeat those responses.
- Dropzone supplies source links, a dated searchable/type/caliber-filtered index and optional standard sandboxed frames. It does not claim the frames will load: the websites may forbid embedding or require their own browser session. Their headers and authentication policies are not altered. External browser links remain available.
- No guessed damage, penetration, falloff, armor-break, pellet, reload or time-to-kill numbers are included. A native solver and automatic weapon-stat feed remain unimplemented.

## Progression

- https://wardogs.tools/account explains its Discord site account followed by a Steam-linked WAR DOGS account. It advertises read-only progression, history, roughly 15-minute refreshes and disconnection from its own account page. It says it uses the client API; it does not document a third-party API for Dropzone.
- https://metaforge.app/wardogs/player-stats offers its own game-profile page. Its authenticated response was not accessed.
- Steam's own documentation https://partner.steamgames.com/doc/features/auth specifies that OpenID verifies a Steam ID. This alone does not supply arbitrary WAR DOGS progression.
- https://partner.steamgames.com/doc/webapi/ISteamUserStats documents separate keyed schema/user-stat APIs. We have no verified WAR DOGS progression schema or supported credentials for that integration.
- Dropzone links to existing account services in the user's default browser. It does not implement Steam sign-in, read game processes, store private authentication tokens, or claim to fetch player progression. Account linking was not tested.

Rocket League was canceled by the user and is not included.
