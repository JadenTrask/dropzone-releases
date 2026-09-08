# Dropzone app releases

This package is **1.2.0**, configured for the public GitHub repository **JadenTrask/dropzone-releases**. The user confirmed the earlier Beta 2 to 1.0.0 automatic upgrade worked. This version's release assets have been prepared here; publishing and a native Windows upgrade to 1.2.0 remain to be checked.

## Behavior

- A two-second local splash opens before the main window, without waiting for network feeds.
- The Windows NSIS installer runs for the current user and adds Start menu/desktop shortcuts.
- App updates checks on launch, every six hours, and after waking if due.
- Downloads run in the background. The user chooses **Restart & update**; closing does not silently install.
- App releases are separate from the 15-minute game-data checks.
- Stable releases only; downgrades and NSIS web installers are disabled.
- Existing saved data retains the current profile directory. Uninstalling does not delete it.
- Older portable ZIPs cannot install updates and need the setup file once.

## Build and publish

On a Windows build machine:

```text
npm ci
npm test
npm run version:set -- 1.2.0
npm run package:installer
```

The package command never publishes automatically. Keep appId `com.dropzone.desktop` and the existing release destination. Output goes to `release/installer`.

Upload the setup EXE, its blockmap, and `latest.yml` as three separate assets on the same stable GitHub release tagged `v1.2.0`. Uploading the ZIP alone does not enable updates. See `PUBLISH-RELEASE.md`.

Use a new, higher version for every changed installer, such as 1.1.1. Never replace a published version with different bytes. Before announcing a release, test updating from the previous installed version and confirm restart and saved data preservation.

## Release configuration

`release-feed.json` is already configured. To change it intentionally:

```text
npm run configure:updates -- github OWNER REPOSITORY
```

An owned HTTPS release directory is also supported:

```text
npm run configure:updates -- generic https://YOUR-HOST/updates/
```

Users need no GitHub account. Never bundle a GitHub token in an installer. For generic hosting, upload EXE/blockmap first, then `latest.yml` last.

## Signing and verification

The installer is unsigned. Windows may display an unknown-publisher warning. SHA-512 update metadata verifies download integrity; it does not establish a publisher identity. A publisher-owned signing certificate remains a separate setup task.

Automated updater tests cover destination validation, disabled portable/development installs, coalesced requests, failed downloads/retry, explicit installation, and splash timing/cancellation. Native Windows testing of this build is still required. See `VALIDATION.md`.

References: https://www.electron.build/v26/docs/features/auto-update/ and https://www.electron.build/docs/nsis/
