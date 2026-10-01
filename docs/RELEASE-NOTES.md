# Dropzone 2.5.2

- **Rocket League AI Overview:** choose Nice Coach or Brutal Coach, then copy a ready-to-use analysis prompt for your preferred AI. The prompt covers retained local and available account history, separates complete and partial recordings, and labels missing data. No AI API is called and no prompt is displayed in the app.
- **Game artwork behind Videos:** the supplied Siege, League of Legends, RLCS and THE FINALS logos now sit behind their Videos workspaces. Artwork stays centered during scrolling, with the existing clear-glass panels diffusing the background.
- **Rocket League navigation:** AI Overview appears beside Tracker settings, with Videos as the final tab. Existing content fades and the stable navigation header are preserved.

AI Overview uses recorded gameplay statistics, not official lifetime totals or rank/MMR history. Copying places those statistics in a prompt for you to paste; nothing is automatically sent to an AI service. Nice and Brutal use the same evidence, with constructive or blunt coaching instructions respectively. Gray Zone Warfare remains **Under construction**.

The 341-test Node suite and the completed headless layout, clipboard-fixture, transition and artwork checks passed; details and coverage limits are recorded in docs/VALIDATION.md. Real-account prompt export, the Windows clipboard, native installation, installed-version upgrade, streamed playback and real gameplay remain unverified in this pass. The Windows installer remains unsigned. No provider keys or private validation fixtures are shipped.
