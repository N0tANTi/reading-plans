# Current state

Verified 2026-09-08: Gazette uses React/Vite and Markdown; repository has 10 columns. Active server App.jsx matches the repository baseline after newline normalization.

Editorial revision adds restrained monochrome styling, column search, section navigation, 16–24px reading size, focus mode, next-column navigation and shareable `?plan=` links with browser history support. The second revision removes the repeated main masthead, uses a sticky right outline from 1280px with automatic section highlighting, and keeps a collapsible directory on smaller screens and in focus mode. Playfair Display and Albert Sans are self-hosted through Fontsource. Existing upload/update forms and Markdown content remain intact.

Columns sort newest upload first using timestamp-valued `order`, falling back to the original `date`; the initial three same-day entries retain their legacy order. Updating a body preserves its upload order.

Validation: production build, ESLint and four existing server tests passed. Browser checked search, column switching, directory expansion/jump, font size, mobile layout at 390px, dark mode and focus mode.

Second-revision browser checks: sidebar order, removal of duplicate masthead, right outline click and scroll tracking, and 390px mobile fallback without horizontal page overflow passed.

Limitations: existing Noto/Spectral fonts still use Google Fonts; new Playfair/Albert fonts load locally. Bundle warning exceeds 500kB because all Markdown is eagerly included. Upload submission was not exercised against production. Release status is recorded in dated history.
