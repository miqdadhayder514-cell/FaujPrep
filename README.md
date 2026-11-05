# React + TypeScript + Vite

## SEO build output

Set `VITE_SITE_URL` to the canonical deployed origin (`https://fauj-prep.vercel.app`) in the deployment environment before a production build. The build uses the Supabase anon key and existing public row-level security policies to generate route-specific HTML metadata and `dist/sitemap.xml` from published public content, including active free mock tests. Premium content and private or query-based routes are excluded. `dist/robots.txt` blocks private routes; `dist/404.html` is the branded not-found document for hosts that support a conventional static 404 page.

Without `VITE_SITE_URL`, the app still sets runtime canonical URLs from the browser origin, but build-generated sitemap locations and static canonical tags are omitted rather than guessed.

## Direct page refreshes

The Vercel deployment uses `vercel.json` rewrites to send client-routed pages (including interview categories, payment pages, account, and admin routes) to the React entry point when opened directly or refreshed. Routes with generated SEO HTML shells are left untouched.

## Interview practice

Personal, academic, general-knowledge, current-affairs, defense, rapid-fire, and mock interview practice each require a one-time PKR 50 purchase. Candidates submit payment proof through the existing manual-payment flow; the category unlocks only after an administrator approves the purchase in the admin payment queue. Apply `supabase/migrations/044_paid_interview_category_practice.sql` followed by `supabase/migrations/045_interview_category_price_pkr_50.sql` after the earlier migrations to enable the category products and server-side price checks.

Each practice answer leads to a category-specific interviewer follow-up and a 10-point coaching rubric. After submission, candidates see a curated, question-specific sample answer to learn from and personalize honestly. Scores are generated locally; they are not AI-generated and do not verify factual accuracy.

## Paid PMA e-book

The E-books page offers `../e-books/PMA Long Course 160 Preparation.pdf` for PKR 350 and displays the cover in `public/images/pma-lc160-preparation-book-cover.png`. Apply `supabase/migrations/062_pma_lc160_preparation_ebook.sql` after the earlier payment and paid-note migrations. Upload the PDF to the private `paid-notes` bucket by running `npm run upload:paid-notes -- --product=pma-lc160-preparation-book` from `my-app` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in the local environment. The e-book download requires an admin-approved purchase for the book, including for Pro/Premium subscribers; payment screenshots continue to use the existing manual-review workflow.

## ISSB Deputy President Interview Preparation

The separate `/issb/deputy-president-interview` module includes the supplied 180-question learning bank, candidate-owned learning progress/profile/roadmap, current-affairs preparation sourced from administrator-maintained entries, and timed practice simulations. Practice sessions can use local coaching without AI; optional per-answer AI coaching and AI interviewing both require explicit consent. The AI is a practice facilitator, not an ISSB official, and its coaching is not an official assessment.

To enable account sync and AI practice:

1. Apply `supabase/migrations/060_issb_psychological_interview.sql` if it is not already applied; the AI function uses its server-side request limiter. Apply `supabase/migrations/061_deputy_president_interview.sql` for cross-device profile, progress, and interview-history sync and the `current_affairs` verification fields. The AI conversation itself is sent as consented, bounded request context and does not require the 061 session tables.
2. Deploy the Edge Function with `supabase functions deploy deputy-president-interview`.
3. Configure the function secrets in Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `OPENAI_API_KEY`. Optionally set `OPENAI_MODEL` and comma-separated `DEPUTY_INTERVIEW_ALLOWED_ORIGINS`. Never put the service-role or provider key in a `VITE_` variable or browser code.
4. Populate current-affairs source and verification details in the existing admin editor. These entries are not automatically fact-checked; editors should maintain the source and as-of date.

Without migration 061, the page keeps profile, progress, and session history on the device. AI practice still needs the deployed function, configured server-side secrets, and migration 060 for rate limiting; the interface reports a clear connection error if the AI function is unavailable.

Run the focused content/integration assertions with `node --test scripts/deputy-president-interview.test.mjs` from `my-app`; `npm run lint` and `npm run build` validate the app.

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
