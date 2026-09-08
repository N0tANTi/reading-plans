# 2026-09-08 Chinese UI and motion refinement

- Source `d402472` pushed before release. Chinese utility text uses explicit PingFang/Microsoft YaHei UI fallbacks with adjusted sizing. Body serif styling remains intact.
- Outline starts collapsed, toggles open/closed on the right, supports Escape and inert hidden contents; mobile panel is above the bottom-right top button. Smooth anchor scrolling, short target highlight and column entrance animation respect reduced motion.
- Build, lint and four existing tests passed. Browser checked collapse (zero panel height), section location/highlight, column navigation and mobile bounds (390px, no horizontal overflow; expanded control remains in viewport).
- Server build passed; HTTPS page and `index-CP0c_9D3.js` / `index-g5wKJ23d.css` returned 200. Rendered production inspection remains limited by the earlier remote browser timeout.
- Backup: `/home/anti/apps/reading-plans/backups/editorial-20260908-v3/`, with original App.jsx/main.jsx and `served/`. Restore those files to roll back. No Markdown, upload service or runtime configuration changed.

Scrollbar follow-up: d35a19d replaces white native tracks with transparent tracks and theme-matched thin thumbs, including hover/focus emphasis and forced-colors fallback. Local dark-mode screenshot, build/lint/tests passed; production page/CSS returned 200. Backup: /home/anti/apps/reading-plans/backups/scrollbars-20260908/ (previous CSS source and index); old hashed assets retained.
