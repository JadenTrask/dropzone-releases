# Visual updates and admin mode

The next regular installer installs visual-v1 support. Older installed versions cannot receive these packages. A website deployment does not update an installed app.

## What can ship without a new installer

- Startup blur strength and zoom amount.
- Shared page gutter, Settings card padding and spacing.
- Startup logo PNG (same 1536×1024 approved board/crop layout) and rail/title icon PNG.
- Existing game feeds already refresh without an installer.

Behavior, new pages, arbitrary CSS, calculation fixes, native integration and security fixes still require a regular app release. Explain which category a future change falls into before shipping it. The current server, News and admin changes require a regular release.

## Publishing a visual package

Edit a copy of `visual-updates/baseline.json`. Increment `revision` above every previously published revision; keep `compatibility: visual-v1`. Supported numeric ranges are enforced in `core/visual-updates.cjs`. Optional `assets.startupLogo` and `assets.brandIcon` accept PNG data URLs up to the enforced size/dimension limits. Preserve the startup image's existing crop geometry; use the original approved artwork, not a screenshot.

Set `DROPZONE_VISUAL_SIGNING_KEY` to the private PEM key path, then run:

```
node scripts/sign-visual-update.cjs visual-updates/baseline.json visual-updates/stable.json
```

The local private key is kept OUTSIDE this repository in `../.release-tools/visual-signing/private.pem`. Back it up securely; never commit or distribute it. Only its public key is bundled. Publish the signed `visual-updates/stable.json` on the repository's main branch. This visual-only commit does not need an installer tag. Do not change the feed public key without a regular release.

The app checks at startup, verifies the signature and allowlisted data, atomically caches a newer revision, and applies it on the next launch. Offline or invalid downloads keep the previous visuals. To revert, sign the last good settings with a HIGHER revision. No JavaScript, HTML or arbitrary remote CSS is accepted. A PNG replaces an asset, not the Windows executable/taskbar icon.

## Admin mode

Open Settings → Admin access and enter the owner password. A successful unlock exposes Sources in the rail and Settings. Lock admin hides it again. Installed app access resets when the process closes; preview access uses a per-browser HTTP-only session cookie. The old --admin flag and preview environment bypass have been removed.

Only a randomly salted scrypt hash is shipped, never the password. Guess attempts are rate limited. This protects the normal UI; it cannot stop someone patching their own local application or trying offline guesses against the hash. Sources contains diagnostics, not privileged backend access. Admin mode uses the same app and update feeds.

Local preview verifies and applies the signed repository package on reload; the installed app stages downloaded packages for the next launch. The feed becomes available after the signed file is published to main.
