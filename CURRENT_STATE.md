# Current state

Verified 2026-09-08: Gazette uses React/Vite and Markdown; repository has 10 columns. Active server App.jsx matches the repository baseline after newline normalization.

Editorial revision adds restrained monochrome styling, column search, section navigation, 16–24px reading size, focus mode, next-column navigation and shareable `?plan=` links with browser history support. The second revision removes the repeated main masthead, uses a sticky right outline from 1280px with automatic section highlighting, and keeps a collapsible directory on smaller screens and in focus mode. Playfair Display and Albert Sans are self-hosted through Fontsource. Existing upload/update forms and Markdown content remain intact.

Columns sort newest upload first using timestamp-valued `order`, falling back to the original `date`; the initial three same-day entries retain their legacy order. Updating a body preserves its upload order.

Validation: production build, ESLint and four existing server tests passed. Browser checked search, column switching, directory expansion/jump, font size, mobile layout at 390px, dark mode and focus mode.

Third revision: the outline starts collapsed, expands on the right, and toggles closed or closes with Escape. Hidden links are inert. Mobile uses a bottom-right floating panel; focus mode keeps this optional control. Expansion uses a 340ms transition, columns fade in over 360ms, and anchor jumps scroll smoothly with a brief target highlight. Reduced-motion preferences disable these effects. Chinese UI text explicitly uses PingFang/Microsoft YaHei UI fallbacks, with larger search and hint text; editorial body typography remains separate.

Browser checks: sidebar order, outline expansion/collapse, section jump/highlight, column switching and 390px mobile panel checked. Build, lint and four existing tests pass.

Limitations: existing Noto/Spectral fonts still use Google Fonts; new Playfair/Albert fonts load locally. Bundle warning exceeds 500kB because all Markdown is eagerly included. Upload submission was not exercised against production. Release status is recorded in dated history.

Sidebar refinement (2026-09-08): removed visible upload-order and search labels while retaining the input accessible name. Auxiliary Chinese text now uses self-hosted Noto Sans SC Variable; column numbers use Playfair Display lining/tabular figures. Build, lint and four tests passed; local light/dark visual checks passed. Production page, JS/CSS and a Noto font asset return HTTP 200.

Follow-up sidebar typography: column titles now use self-hosted Noto Serif SC, and numbers use Cormorant Garamond 300 italic at 18px (supersedes the Playfair numbering above). Deployed abe99c2; build, lint, four tests, local desktop visual check and production page/CSS/JS/both font HTTP checks passed.
