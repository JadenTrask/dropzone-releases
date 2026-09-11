# MetaForge panel in 2.0.4

WARDOGS > Progression opens the live MetaForge website in a native WebContentsView. Progression, player profile and career-table tabs select fixed HTTPS destinations. Reload and Open in browser remain outside the remote content.

The remote session is persistent and separate from the app renderer. It has no preload, Node integration or Dropzone IPC bridge. Web security and sandboxing stay enabled. Device permission requests and downloads are denied. Top-level navigation and login popups are restricted to MetaForge and the named Google, Discord and Steam sign-in hosts. Popup windows retain their opener and show the current origin in the window title. No site content, ads, headers or verification mechanisms are modified. Browser and embedded sessions are separate; browser login does not sign into the panel.

Leaving Progression destroys the view and owned login popup, while preserving the site's session for next time. Layout requests are bounded to the app window and account for text zoom. App dialogs temporarily hide the native view so they remain accessible. Stale requests from a previous mount are ignored.

Validation: focused navigation/isolation, viewport bounds/zoom and cleanup tests passed. The release workflow performs the application build and existing regression checks. This environment's isolated Electron launch returned ERR_FAILED even for the app entry page, so real MetaForge rendering, Cloudflare verification and account sign-in could not be verified here. External-browser fallback is always available. No accounts were linked or progression data imported.
