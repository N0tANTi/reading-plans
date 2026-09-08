# Gazette deployment

Target: existing SSH access to `anti@110.42.208.24`. Active source: `/home/anti/apps/reading-plans`. Nginx serves `/srv/reading-plans/gazette-dist/`; upload proxy is `/gazette/api/upload` on port 3001.

1. Verify active source against repository and preserve runtime configuration and Markdown. Do not inspect or copy environment secrets.
2. Commit and push intentional source changes. Back up changed source files and served assets to a dated directory under the active project's `backups/`.
3. Copy only changed frontend sources. Build using the installed Vite binary into a fresh temporary release directory. Do not use the server's `npm run build` for this maintenance, since its custom script removes the served directory.
4. Copy new hashed assets first, then atomically replace `index.html`. Keep old hashed assets available for existing tabs.
5. Verify HTTPS page and referenced assets, and inspect the live browser.

Rollback: restore backed-up frontend files and served index/assets; no service restart is necessary for frontend changes. Upload service and its runtime configuration are unchanged.
