# Apex player service - production lookup update

The authenticated v5 UID validation succeeded with HTTP 200 on September 30,
2026 at 23:06 UTC. The HTTP 406 cause was the upstream Accept header; the
corrected Accept: */* is retained. No new key is needed.

## Deployed configuration

The owner deployed the production lookup to **bright-api** on September 30,
2026. No further deployment or secret entry is currently required.

- Existing project: https://supabase.com/dashboard/project/ejbvztdsshxobfpiinlg/functions
- Endpoint: https://ejbvztdsshxobfpiinlg.supabase.co/functions/v1/bright-api
- Server secret: DROPZONE_APEX_ALS_KEY (entered by the owner; never bundled)
- Verify JWT: enabled. The function also verifies the actual Supabase user.

For a future approved code update, open bright-api's editor, replace the ENTIRE
index.ts with backend/supabase/functions/apex-player/index.ts, and select Deploy
updates. Keep Verify JWT enabled. No secret value belongs in this repository.

## What changes

The diagnostic function now supports normal player lookup. Its fields are based
on the actual authorized v5 response structure: player identity, level, prestige,
Battle Royale rank/RP, selected legend, explicit career kills/wins when supplied,
and per-legend trackers. Missing fields remain absent. It does not sum trackers,
construct a K/D, infer peak rank, or enable match history/leaderboards.

Only an explicit bounded display contract leaves the function. Provider keys,
account tokens, raw responses, bans, party/presence details, and internal provider
metadata are not returned. Image URLs are limited to known provider asset hosts;
credentials, query strings, fragments, and unexpected formats are removed.
The desktop filters the contract again before the renderer receives it.

## Security and quota retained

Verify JWT remains enabled. The function also verifies the actual Dropzone user
through Supabase Auth; the publishable key alone cannot request player data.
DROPZONE_APEX_ALS_KEY and service-role credentials remain server-side.

Requests and provider responses have byte limits and network timeouts. The
existing private service-role rate gate permits at most one provider request
every two seconds across instances. HTTP 429 extends shared backoff. Status
checks authenticate but do not call the provider or consume its quota.

The owner previously executed backend/supabase/apex-rate-limit.sql successfully.
This update changes no tables, policies, profiles, friends, or account settings.
No spending or plan change is authorized. Current project quota is unverified.

## Validation status

Authenticated production lookup succeeded on 2026-09-30 at 23:23 UTC through the
normal encrypted desktop account boundary. The normalized response included one
BR rank, two explicit career metrics, 22 legends, and the selected-legend banner.
An unauthenticated live request returned 401. Concurrent authorized UID lookups
returned one successful profile and one rate-limited response with retryAfter=2.

Local tests cover missing or malformed fields, identity mismatch, unsafe images,
authorization failures, quota contention, provider failures and secret stripping.
The renderer replayed the real normalized contract at 1080p, 1440p, 4K and a
1000px window. Not-found and sign-in-expiry UI responses were simulated; a real
upstream not-found query was not needed. No raw provider payload or credential
is included in the app, logs, captures, or this document.

A returned display name need not be the player's EA lookup name. UID lookup
is available, and the profile shows the UID for identity confirmation. Recent
players and favorites store identity only on this PC; player statistics are not
persistently cached. Match history and leaderboards remain unavailable to new
provider accounts. No invented peak rank, percentiles, or meta tier list is shown.

Provider docs: https://apexlegendsapi.com/documentation
Supabase authentication: https://supabase.com/docs/guides/functions/auth
Repository source: backend/supabase/functions/apex-player/index.ts
