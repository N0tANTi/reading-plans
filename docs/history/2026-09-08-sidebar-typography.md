# Sidebar typography release — 2026-09-08

Deployed source commits 15e0fa9 and 53541ae to the active Gazette source. Removed redundant sidebar labels, refined search/subtitle typography using locally hosted Noto Sans SC and changed column numbers to Playfair Display at 14px with restrained spacing.

Validation: build, lint, four existing tests and local light/dark visual checks passed. Production page, referenced JS/CSS and a Noto font asset returned HTTP 200. Production browser visual verification remains unavailable due to navigation timeouts. Existing bundle-size warning remains.

Rollback files and previous index: `/home/anti/apps/reading-plans/backups/ui-type-20260908/`. Release used a separate Vite output directory and atomic index replacement, retaining old hashed assets. Runtime configuration and Markdown were preserved.

## Serif follow-up

Deployed abe99c2: self-hosted Noto Serif SC column titles and Cormorant Garamond light italic numbering. Build, lint and four tests passed; local desktop appearance checked. Production HTML, JS, CSS and both new font families returned HTTP 200. Backup: /home/anti/apps/reading-plans/backups/serif-type-20260908/. Same atomic release procedure and existing limitations apply.
