# Publish Dropzone 1.2.2

Run `npm ci`, `npm test`, then `npm run package:installer` on a build machine.
Use tag **v1.2.2**, title **Dropzone 1.2.2**, in
https://github.com/JadenTrask/dropzone-releases/releases/new.

Upload these files separately from `release/installer/`:

- Dropzone-Setup-1.2.2-x64.exe
- Dropzone-Setup-1.2.2-x64.exe.blockmap
- latest.yml

Publish as the latest stable release. Existing Windows installations use the
same release feed and can receive this version through App updates.

The release targets Windows x64. The installer is unsigned, as in 1.2.1.
macOS support is deferred. Browser-renderer tests and packaging checks were
performed on macOS; installation and upgrade execution on Windows were not
available in this workspace.
