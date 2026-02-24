# AGENTS.md

## Project
ClothePickr is a mobile-ready web app for personal wardrobe management.

## Product Goals
1. Catalog clothes by category.
2. Track laundry lifecycle per clothing item: `clean`, `dirty`, `washing`, `drying`.
3. Build and save favorite styles/outfits by selecting clothing items across categories.
4. Work offline as a PWA with local-only data storage in v1.

## v1 Scope
- In scope: categories (default + custom), clothing CRUD, state transitions, filtering/search, outfit/style CRUD, optional local photos, responsive mobile-first UX.
- Out of scope: cloud sync, multi-user auth, social sharing, AI suggestions, push notifications.

## Stack
- Runtime/package manager: Bun
- App tooling: Vite
- UI framework: React + TypeScript
- UI components: shadcn/ui + Tailwind CSS
- Local persistence: IndexedDB (Dexie)
- Forms/validation: React Hook Form + Zod
- Routing: React Router
- Tests: Vitest + React Testing Library + Playwright
- PWA: vite-plugin-pwa

## Core Domain Rules
- Clothing status enum: `clean | dirty | washing | drying`.
- Allowed lifecycle path: `clean -> dirty -> washing -> drying -> clean`.
- Manual override to any status is allowed from item details.
- Categories include defaults and user-defined custom categories.
- Favorite style/outfit is a named set of item IDs with flexible composition (any categories, any count).

## Data Model (v1)
- Category: `id`, `name`, `isDefault`, `archived`, `createdAt`, `updatedAt`
- ClothingItem: `id`, `name`, `categoryId`, `status`, `color`, `brand`, `size`, `notes`, `seasonTags[]`, `photoIds[]`, `createdAt`, `updatedAt`
- PhotoAsset: `id`, `itemId`, `blob`, `mimeType`, `width`, `height`, `createdAt`
- Outfit: `id`, `name`, `itemIds[]`, `occasion`, `notes`, `isFavorite`, `createdAt`, `updatedAt`
- LaundryLog: `id`, `itemId`, `fromStatus`, `toStatus`, `changedAt`

## UX Requirements
- Mobile-first responsive layout.
- Quick actions for status updates from list cards.
- Filters by category, status, favorites, and text search.
- Outfit builder with multi-select items and preview cards.
- Accessibility baseline: keyboard navigation, visible focus, semantic labels, and color contrast.

## Project Structure
- `src/app` app shell and routing
- `src/features/categories`
- `src/features/items`
- `src/features/laundry`
- `src/features/outfits`
- `src/components/ui` shadcn components
- `src/lib/db` Dexie schema and repositories
- `src/lib/validation` zod schemas
- `src/test` unit/integration helpers
- `e2e` Playwright tests

## Engineering Rules
- TypeScript strict mode enabled.
- Repository pattern between UI and persistence layer.
- No direct IndexedDB calls from React components.
- Validate all write operations with zod.
- Keep state transitions centralized in a domain service.

## Commands
- Install deps: `bun install`
- Dev server: `bun run dev`
- Build: `bun run build`
- Unit/integration tests: `bun run test`
- E2E tests: `bun run test:e2e`
- Lint: `bun run lint`
- Typecheck: `bun run typecheck`

## Definition of Done
- Feature implemented with tests.
- Mobile viewport behavior verified.
- No TypeScript errors.
- Lint passes.
- PWA installability verified.
