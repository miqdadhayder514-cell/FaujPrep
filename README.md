# React + TypeScript + Vite

## SEO build output

Set `VITE_SITE_URL` to the canonical deployed origin (`https://fauj-prep.vercel.app`) in the deployment environment before a production build. The build uses the Supabase anon key and existing public row-level security policies to generate route-specific HTML metadata and `dist/sitemap.xml` from published public content, including active free mock tests. Premium content and private or query-based routes are excluded. `dist/robots.txt` blocks private routes; `dist/404.html` is the branded not-found document for hosts that support a conventional static 404 page.

Without `VITE_SITE_URL`, the app still sets runtime canonical URLs from the browser origin, but build-generated sitemap locations and static canonical tags are omitted rather than guessed.

## Direct page refreshes

The Vercel deployment uses `vercel.json` rewrites to send client-routed pages (including interview categories, payment pages, account, and admin routes) to the React entry point when opened directly or refreshed. Routes with generated SEO HTML shells are left untouched.

## Interview practice

Personal, academic, general-knowledge, current-affairs, defense, rapid-fire, and mock interview practice each require a one-time PKR 50 purchase. Candidates submit payment proof through the existing manual-payment flow; the category unlocks only after an administrator approves the purchase in the admin payment queue. Apply `supabase/migrations/044_paid_interview_category_practice.sql` followed by `supabase/migrations/045_interview_category_price_pkr_50.sql` after the earlier migrations to enable the category products and server-side price checks.

Each practice answer leads to a category-specific interviewer follow-up and a 10-point coaching rubric. After submission, candidates see a curated, question-specific sample answer to learn from and personalize honestly. Scores are generated locally; they are not AI-generated and do not verify factual accuracy.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
