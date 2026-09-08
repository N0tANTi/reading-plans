# Current state

Verified 2026-09-08: Gazette uses React/Vite and Markdown; repository has 10 columns. Active server App.jsx matches the repository baseline after newline normalization.

Editorial revision adds restrained monochrome styling, column search, collapsible section navigation, 16–24px reading size, focus mode, next-column navigation and shareable `?plan=` links with browser history support. Existing upload/update forms and Markdown content remain intact.

Validation: production build, ESLint and four existing server tests passed. Browser checked search, column switching, directory expansion/jump, font size, mobile layout at 390px, dark mode and focus mode.

Limitations: fonts still use the existing external Google Fonts request; bundle warning exceeds 500kB because all Markdown is eagerly included. Upload submission was not exercised against production. Release status is recorded in dated history.
