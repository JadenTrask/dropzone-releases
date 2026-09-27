# Rocket League Coaching Overlay — 2.4.2

Open **Coaching overlay** in the Rocket League header, or use **Control+Alt+C**. Settings are in **Tracker settings → Coaching Overlay**. This is a separate transparent desktop window, not a game plugin.

## Controls

- P pencil, A arrow, C ellipse, B box, L line, T text, E whole-stroke eraser.
- Control+Z undo, Control+Y or Control+Shift+Z redo, Delete clear, Control+S annotated capture.
- Escape or the drawing shortcut immediately hides the window and releases mouse input.
- Clear shortcut defaults to Control+Alt+Backspace and is registered only while drawing.
- Drag the toolbar by its grip; it remembers its location and snaps near either screen edge.
- Options include thickness, opacity, custom color, temporary/persistent layers and five coaching presets.

## Storage and lifecycle

The existing Rocket League user-data directory contains `coaching.json`, `coaching-annotations.json`, and `screenshots/coaching-<timestamp>.png`. Open screenshots from Tracker settings. Only persistent-layer changes are saved, after gestures with a short debounce; temporary strokes never write to disk. Persistent drawings survive app restarts. Clear removes both layers; automatic clearing only removes temporary drawings. Undo history is session-only.

The overlay window is created lazily. When disabled it is hidden and ignores mouse input. The native observer is stopped (its compiled interop assembly is cached locally to avoid recompiling on every activation), no drawing frame loop runs, and the clear shortcut is released. Closing Dropzone destroys the overlay and unregisters shortcuts. Minimizing Dropzone does not redraw the overlay. The canvas redraws the retained layer only after an edit/resize; an independent draft canvas batches pointer updates through one animation frame. History is bounded to 60 steps, current drawings to 300 objects / 100,000 points, and each stroke to 4,096 points.

## Window targeting and capture

A Windows helper uses visible RocketLeague.exe window handles, client rectangles and out-of-context WinEvent notifications. It does not read game memory, inject code, change game files, intercept traffic, or automate gameplay. Physical client coordinates convert through Electron's screen-to-DIP conversion. Drawings use normalized positions. Window movement and resizing update the overlay; minimize, process/window loss and switching to another application release the overlay. Display removal exits safely.

Capture is user-triggered only. The overlay is briefly made invisible, one desktop frame is cropped to the Rocket League client, and the drawing renderer composites annotations without its toolbar into a PNG. Capture is rejected if the game spans screens or moves during capture. No continuous capture or video stream is used.

Windows' full-screen Direct3D notification state is used as a conservative compatibility check, not a guaranteed exclusive-fullscreen detector. Borderless / Windowed are the intended modes. True exclusive fullscreen is not forced; no injection or rendering hooks are used. The existing Stats API replay status changes the activation label when available; the overlay does not invent replay controls or automatically pause/resume gameplay.

The PowerShell observer is included via `asarUnpack` so Windows can execute the packaged file directly. The shipped preload exposes only a sender-checked drawing command channel. Screenshot saves accept bounded PNG data and generate their own destination filenames.

## Validation completed

- Unit tests: bounded undo/redo, layer clearing/expiry, normalized HD/1440p/ultrawide/4K drawing, shortcut validation/collision rollback, lazy lifecycle, immediate input release, negative monitor coordinates, screenshot crop/PNG save, persistent saves, and rejection of foreign IPC senders.
- Windows observer C# interop compiled successfully without running or targeting a game.
- Isolated Electron source preview: drawing, text, whole-stroke erasing, undo, PNG composition, Escape, resize through approximately HD/1440p/ultrawide/4K, simulated canvas DPI 1.25 and 1.5. The renderer schedules no further drawing frames while idle/off.
- A later source check targeted the running Rocket League client at 3840×2160 physical resolution with 150% Windows scaling. Switching to a separate foreground window suspended drawing; returning to Rocket League restored the overlay and Escape hid it and released input.
- A complete mixed-monitor/display-mode/controller matrix and FPS/frametime benchmark remain outstanding. No zero-impact performance claim has been validated. See VALIDATION.md for release packaging and publication checks.

Focus changes suspend the visible overlay without ending coaching mode. Returning to Rocket League restores annotations and the selected tool. Clear is unregistered while suspended. The shipped Shift defaults migrate to Ctrl+Alt+C and Ctrl+Alt+Backspace; custom bindings are preserved.
