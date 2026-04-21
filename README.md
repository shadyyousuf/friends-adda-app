# Friends Adda

Friends Adda is a TanStack Start + Vite PWA for managing group events, member approvals, and shared money tracking with Supabase.

## Local setup

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env`.
3. Set these required environment variables in `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Start the app with `pnpm dev`.

The dev server prefers port `3000`. If that port is already in use, Vite will automatically move to the next available port such as `3001`.

If either required Supabase variable is missing, the app fails fast during startup from [`src/utils/supabase.ts`](src/utils/supabase.ts).

## Available scripts

- `pnpm dev` starts the local development server.
- `pnpm build` builds the production client and server bundles.
- `pnpm preview` previews the production build locally.
- `pnpm typecheck` runs TypeScript without emitting files.
- `pnpm test` runs the Vitest suite.
- `pnpm test:e2e` runs the Playwright suite.
- `pnpm lint` runs ESLint.
- `pnpm format:check` checks formatting with Prettier.

## PWA assets

Installed-app metadata comes from [`public/manifest.json`](public/manifest.json). Browser tab icons and Apple touch icons are linked from [`src/routes/__root.tsx`](src/routes/__root.tsx), but installed PWAs use the manifest entries instead.

The manifest is intentionally checked in and used directly. [`vite.config.ts`](vite.config.ts) sets `manifest: false`, so `vite-plugin-pwa` does not generate a replacement manifest at build time.

Top-level assets in `public/` are now the source of truth for installed-app icons:

- `/logo192.png`
- `/logo512.png`
- `/logo1024.png`
- `/favicon.ico`

Files under `public/pwa/` are kept for install screenshots only:

- `/pwa/dashboard-seeded.svg`
- `/pwa/event-detail-seeded.svg`

If you change installed-app icons and still see the previous icon after rebuilding:

1. Uninstall the previously installed Friends Adda app.
2. Clear site data or do a hard refresh in the browser.
3. Reinstall the app so the browser fetches the updated manifest and cached assets.
