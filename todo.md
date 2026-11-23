# To do

## Add

- [ ] **Keep the phone's status bar, still no browser bar.** Fullscreen hides the phone's time and battery icons, so do
  not use fullscreen. The installed app must still never show the top bar with the page title and URL.
  - Likely fix: `"display": "standalone"` in `public/manifest.webmanifest` (status bar stays, no browser bar).
  - Then check `--app-top` in `styles/globals.css`: with the status bar back, the extra 16px above the header may no
    longer be wanted. Colour the status bar to match the header (`theme_color`, and the `theme-color` meta that
    `lib/theme.js` switches for dark).
  - Remove and reinstall the app to pick up the manifest change. Update `docs/pwa-fullscreen.md`.

## Fix

- [ ] **Occupancy view on phones: barely anything is visible**, not even the `3/18` style counts.
