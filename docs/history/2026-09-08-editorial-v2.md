# 2026-09-08 second editorial revision

- Implemented user feedback: removed duplicate main masthead; added sticky right outline with automatic active-section tracking and internal scrolling; retained collapsible directory below 1280px and in focus mode.
- Newest-upload-first order uses original timestamp metadata; oldest same-day entries retain legacy order. No Markdown or upload service changes.
- Added self-hosted Playfair Display normal/italic and Albert Sans, both Fontsource 5.3.0. Server package installation preserves its existing custom build script.
- Source `b01ef3d` pushed before release. Local build/lint and all four server tests passed. Browser verified click/scroll outline highlighting and 390px layout without page overflow. Public page, JS, CSS and italic font returned HTTP 200; remote rendered browser verification remains unavailable from the earlier timeout.
- Published assets `index-nohq91Y0.js` and `index-DkHdUIxZ.css` after server build. Old assets retained.
- Rollback backup `/home/anti/apps/reading-plans/backups/editorial-20260908-v2/` contains App.jsx, main.jsx, package manifests and `served/`. Restore these sources and served index/assets; additional unused CSS/font assets may remain harmlessly. Runtime upload configuration was preserved.
