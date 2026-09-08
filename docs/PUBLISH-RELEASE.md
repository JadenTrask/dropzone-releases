# Publish Dropzone 2.0.0

The [Windows release workflow](../.github/workflows/release.yml) builds and publishes to [JadenTrask/dropzone-releases](https://github.com/JadenTrask/dropzone-releases/releases). It creates a draft, verifies the uploaded assets, and only then publishes the latest stable release. This guide describes the process; it is not a publication or runtime-test record.

## Prepare the final source

1. Complete the app changes and checks. Use Node.js **24.13.0**, matching the workflow.
2. Set the version with `npm run version:set -- 2.0.0`. Commit `package.json`, `package-lock.json`, `app/version.js`, and `app/index.html` together with all app, asset, build, script, test, and documentation changes.
3. Update [RELEASE-NOTES.md](RELEASE-NOTES.md), which becomes the release body. Record checks actually completed in [VALIDATION.md](VALIDATION.md); do not infer native installation or upgrade success from unit tests or packaging.
4. Keep `release-feed.json` pointed at `JadenTrask/dropzone-releases`. The workflow refuses a different destination.
5. Push the validated commit to `main`. A change to `package.json`, `app/version.js`, or the release workflow triggers publication. The workflow can also be dispatched manually on `main`. Let it create the version tag; creating `v2.0.0` in advance makes its existing-tag guard skip publication.

The workflow uses a Windows 2022 runner, the committed dependency lockfile, and the repository's `GITHUB_TOKEN` with `contents: write`. It checks out the triggering commit and preserves committed file bytes. No dependency upgrade is part of a release.

## Build and verification gates

The workflow runs these commands in order:

```powershell
npm ci
npm test
npm run package:installer
```

[verify-release.cjs](../scripts/verify-release.cjs) then checks:

- The package, lockfile, packaged app, and Windows executable versions agree.
- The packaged executable is Windows x64. Shipped app, provider, desktop, and attribution files match the exact source commit.
- `latest.yml` names the intended installer and contains its actual byte size and both matching SHA512 values. The blockmap is present and nonempty.
- The full source ZIP contains every expected tracked source file, with each file's contents checked against the commit. It includes app assets, scripts, tests, build configuration, and documentation; dependencies, Git metadata, caches, generated releases, and test output are excluded.

The verifier deliberately rejects changed or missing source files. Version-generation changes must already be committed. The full source archive is made from Git, so untracked source files are not release inputs.

## Release assets

Tag **v2.0.0** and title **Dropzone 2.0.0** are derived from `package.json`. Exactly four files are uploaded from `release/installer/`:

| Asset | Purpose |
| --- | --- |
| `Dropzone-Setup-2.0.0-x64.exe` | Per-user Windows installer |
| `Dropzone-Setup-2.0.0-x64.exe.blockmap` | Installer update blockmap |
| `latest.yml` | Installed-app update metadata |
| `Dropzone-Source-2.0.0.zip` | Complete source for the same commit |

The ZIP opens to `Dropzone-Source-2.0.0/`. Its contents are suitable for `npm ci`, development, tests, and rebuilding; installed dependencies are downloaded separately.

## Draft and publication behavior

After local verification, the workflow atomically creates the tag at the verified commit. It creates a draft release, uploads the four files without overwriting existing assets, and checks their names, sizes, and upload state. It downloads all four assets again and compares their SHA256 hashes with the locally verified build, then rechecks the updater metadata and tag target.

Only after those checks pass does it publish the draft and mark it latest stable. It verifies GitHub reports the expected latest release and records the release URL and source commit in the workflow summary. Check that completed run before updating the website's download/version references.

An existing published release or tag is skipped. An existing draft stops the run. If a run fails after creating a tag or draft, those objects remain for inspection; the workflow does not delete, overwrite, or automatically resume them. A failure before tag creation can be rerun after its cause is resolved. Inspect a partial publication explicitly before deciding how to recover, and use a new version for a corrected already-published release.

Existing installed copies keep the same update feed and app profile. Once published, the release can be offered through **App updates**. Portable/development copies do not use the installed updater. The installer remains unsigned; macOS distribution is not part of this workflow.

These gates prove artifact integrity and source correspondence. Native startup, installation, a real installed-version upgrade, embedded video playback, and in-game calculator accuracy require their own recorded checks.

## Workflow action references

The workflow's `v7` action majors were checked against the official [actions/checkout v7.0.1 release](https://github.com/actions/checkout/releases/tag/v7.0.1) and [actions/setup-node v7.0.0 release](https://github.com/actions/setup-node/releases/tag/v7.0.0). Its draft-to-published transition follows [GitHub CLI release editing](https://cli.github.com/manual/gh_release_edit).
