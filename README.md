# ClothePickr

ClothePickr is a mobile-ready wardrobe manager built with React, Vite, TypeScript, Tailwind, and shadcn-style UI components.  
It supports offline local data storage with IndexedDB and PWA installability.

## Features
- Clothing catalog with categories (default + custom).
- Laundry lifecycle tracking: `clean -> dirty -> washing -> drying -> clean`.
- Manual status override from item details.
- Outfit/style builder with flexible item combinations.
- Favorite outfit management and dirty-item warnings.
- Optional local photo uploads for clothing items.
- Laundry board with batch transitions and timeline logs.

## Stack
- Bun-compatible project setup
- Vite + React + TypeScript
- Tailwind CSS + shadcn-style component architecture
- Dexie (IndexedDB)
- React Hook Form + Zod
- Vitest + React Testing Library
- Playwright E2E
- vite-plugin-pwa

## Commands
```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

If Bun is installed, you can run the equivalent Bun commands:
```bash
bun install
bun run dev
bun run typecheck
bun run lint
bun run test
bun run test:e2e
bun run build
```

## Routes
- `/` dashboard
- `/items` item list + filters
- `/items/new` create item
- `/items/:id` item details/edit/status/photo/logs
- `/categories` category management
- `/outfits` outfit list
- `/outfits/new` create outfit
- `/outfits/:id` edit outfit
- `/laundry` status board + batch moves
- `/settings` local data reset

