# ClothePickr 👕

ClothePickr is a mobile-ready wardrobe management PWA focused on cataloging clothes, tracking laundry status, and building favorite outfits.

## Highlights ✨
- Category-based clothing catalog (default + custom categories)
- Laundry lifecycle tracking: `clean -> dirty -> washing -> drying -> clean`
- Favorite outfit/style builder across categories
- Optional local photo storage per item
- Offline-first local persistence with IndexedDB
- Dark mode + local backup/restore

## Tech Stack 🛠️
- Bun-compatible project setup
- React + TypeScript + Vite
- Tailwind CSS + shadcn-style components
- Dexie (IndexedDB), React Hook Form, Zod
- Vitest + React Testing Library + Playwright

## Quick Start 🚀
```bash
bun install
bun run dev
```

Open the local URL shown in the terminal (typically `http://127.0.0.1:1420`).

## Scripts 📌
```bash
bun run dev        # start development server
bun run typecheck  # run TypeScript checks
bun run lint       # run ESLint
bun run test       # run unit/integration tests
bun run test:e2e   # run Playwright E2E tests
bun run build      # create production build
bun run tauri:dev         # run desktop app in dev mode
bun run tauri:build:win  # build Windows bundles (nsis + msi)
bun run tauri:build:linux # build Linux bundles (appimage + deb)
```

Fallback (if Bun is unavailable): `npm install` and `npm run <script>`.

Desktop packaging prerequisites and verification steps are documented in `docs/desktop-tauri.md`.
