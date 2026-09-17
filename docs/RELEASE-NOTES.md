# Dropzone 2.3.3

- Added password-protected Admin access in Settings. Sources stays hidden until unlocked; admin can be locked again without restarting. Password verification uses a salted scrypt hash, and repeated guesses are rate limited.
- Added signed visual micro-updates for supported startup animation settings, logo PNGs and layout spacing. Downloaded changes apply on the next launch; offline use retains cached visuals.
- Cleaned up Settings spacing and aligned WARDOGS calculator, server browser, market, damage and News headings.
- Preload WARDOGS servers on startup and make manual Refresh bypass the request cache. Show the successful check time separately from the source snapshot time.
- Rename game Patch notes tabs to News.
- Preserve public loadout freshness labels while moving detailed source diagnostics behind Admin access.
- Stop flagging unchanged ranked data solely because its publication date is old.
- Repair the official Rainbow Six Esports playlist and broadcast feed URLs.
- Preserve the orange logo, white startup wordmark and transparent blur over the app.

This release installs visual-update support; previous versions need this regular update first. Admin access hides diagnostic UI, not a privileged online service.

Validation: 161 automated tests passed locally. Browser checks covered wrong/correct passwords, separate browser sessions, locking again, Settings in both themes, WARDOGS alignment, live server refresh and Siege archives.
