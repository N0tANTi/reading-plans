# 2026-09-08 editorial release

- Source revision: `7ae88b2`, pushed to GitHub main before deployment.
- Updated only App.jsx, main.jsx and editorial.css in `/home/anti/apps/reading-plans/src/`. Server Markdown, package scripts, upload service and runtime configuration were preserved.
- Server Vite build passed. Published new hashed assets followed by atomic index replacement; old assets retained.
- HTTPS page and assets `index-CggiG2zf.js`, `index-gys4guZm.css` all returned 200.
- Local browser validation passed for desktop/mobile layout, dark mode, search, column switching, directory navigation, font size and focus mode. Remote browser navigation timed out, so a rendered production check remains unverified.
- Rollback backup: `/home/anti/apps/reading-plans/backups/editorial-20260908/` contains original frontend sources and `served/` assets. Restore App.jsx/main.jsx and the served index/assets to undo the release.
- Existing server source under `/srv/reading-plans/src` is stale; do not use it for future edits.
