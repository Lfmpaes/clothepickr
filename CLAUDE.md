# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Vite dev server
bun run build        # TypeScript check + Vite production build
bun run typecheck    # TypeScript strict-mode check only
bun run lint         # ESLint
bun run test         # Vitest with coverage
bun run test:watch   # Vitest in watch mode
bun run test:e2e     # Playwright E2E tests
```

Run a single test file: `bun run test -- src/path/to/file.test.ts`

See `AGENTS.md` for domain rules, data model, and Definition of Done.

## Architecture

### Local-first Data Layer (`src/lib/db/`)
- **Dexie** (IndexedDB) is the sole persistence layer — never call IndexedDB directly from components.
- `schema.ts` defines two DB versions: v1 (core tables) and v2 (adds `syncMeta` + `syncQueue` for cloud sync).
- `repositories.ts` exposes `ItemRepository`, `CategoryRepository`, `OutfitRepository`, `LaundryRepository` — all component data access goes through these interfaces.
- On startup, `reconcileDefaultCategories()` normalizes the 8 built-in categories and deduplicates any existing data.
- Use `useLiveQuery` from `dexie-react-hooks` to reactively bind components to IndexedDB queries.

### Optional Cloud Sync (`src/lib/cloud/`)
- Supabase is used for auth and cloud storage; the app works fully without it.
- `sync-engine.ts` orchestrates bi-directional sync: reads the offline `syncQueue`, applies remote deltas, and persists a sync cursor in `syncMeta`.
- `queue.ts` captures all local mutations as operations (`upsert`/`delete`) when the user is online — writes flow through repositories, not directly to Supabase.
- `mappers.ts` converts between local Dexie types and remote Supabase row types.
- Auth uses Supabase magic-link OTP; the callback route is `/auth/callback` (outside `AppShell`).

### Feature Modules (`src/features/`)
Vertical slices: each feature owns its pages, components, and hooks. Features import from `src/lib/` but not from each other.

### Routing (`src/app/App.tsx`)
Routes are `React.lazy()`-loaded with `Suspense`. The `AppShell` layout wraps all main routes; `/auth/callback` is a standalone route outside the shell.

### Domain State Machine (`src/lib/domain/statusMachine.ts`)
All laundry status transitions go through `ClothingStatusMachine`. Valid path: `clean → dirty → washing → drying → clean`. Manual override to any status is permitted from item detail.

### Validation (`src/lib/validation/schemas.ts`)
Zod schemas are defined for all create/update inputs. All write operations must be validated before hitting the repository.

### i18n (`src/lib/i18n/`)
Supports `en-US` and `pt-BR`. Locale is stored in localStorage via `LocaleContext`. All user-facing strings should go through the translation helpers.

### Build / Bundle
Vite is configured to split vendor chunks (react, dexie, forms, icons) for caching. PWA via `vite-plugin-pwa` with Workbox auto-update strategy.
