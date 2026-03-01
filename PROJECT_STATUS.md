# ClothePickr — Project Status

> Last updated: 2026-02-28

---

## Overview

ClothePickr is a **local-first wardrobe manager** PWA built with React + Vite. All data lives in IndexedDB (Dexie). Cloud sync via Convex is **optional** — the app works fully offline without any backend.

---

## What Has Been Implemented

### Core App (pre-migration, stable)

| Area | Details |
|---|---|
| **Data layer** | Dexie/IndexedDB — `ItemRepository`, `CategoryRepository`, `OutfitRepository`, `LaundryRepository` in `src/lib/db/` |
| **Domain model** | 5 entities: categories, clothing items, outfits, laundry logs, photos |
| **Status machine** | `clean → dirty → washing → drying → clean` in `src/lib/domain/statusMachine.ts` |
| **Validation** | Zod schemas in `src/lib/validation/schemas.ts` for all create/update ops |
| **i18n** | English (`en-US`) and Portuguese (`pt-BR`) via `src/lib/i18n/` |
| **Routing** | React Router v7 with lazy-loaded feature pages wrapped in `AppShell` |
| **PWA** | `vite-plugin-pwa` with Workbox auto-update strategy |
| **Features** | Items CRUD, outfit builder, laundry log, photo upload, settings |

### Supabase → Convex Migration (completed this session)

The entire optional cloud sync layer was migrated from Supabase to Convex.

#### Convex Backend (`convex/`)

| File | Purpose |
|---|---|
| `schema.ts` | 5 app tables + `authTables` from `@convex-dev/auth` |
| `auth.ts` | Email OTP auth via Resend HTTP API (6-digit numeric codes) |
| `auth.config.ts` | Convex auth config pointing to `CONVEX_SITE_URL` |
| `http.ts` | HTTP routes for `@convex-dev/auth` callbacks |
| `categories.ts` | `upsert`, `markDeleted`, `pullSince` |
| `items.ts` | `upsert`, `markDeleted`, `pullSince` |
| `outfits.ts` | `upsert`, `markDeleted`, `pullSince` |
| `laundryLogs.ts` | `upsert`, `markDeleted`, `pullSince` |
| `photos.ts` | `upsert`, `markDeleted`, `pullSince`, `generateUploadUrl`, `getUrl` |
| `sync.ts` | `wipeAllUserData` — deletes all storage files and rows for a user |
| `users.ts` | `currentUserIdentity` — returns `{ id, email }` for the auth'd user |

**Schema design:** Each table has `userId`, `localId` (client-side UUID), `serverUpdatedAt` (ISO string cursor), `deletedAt` (soft delete), and 3 indexes: `by_user`, `by_user_localId`, `by_user_serverUpdatedAt`.

#### Client Cloud Layer (`src/lib/cloud/`)

| File | Purpose |
|---|---|
| `convex-client.ts` | Singleton `ConvexReactClient`; `isConvexConfigured()` checks `VITE_CONVEX_URL` |
| `convex-auth.ts` | Module-level auth state bridge (user, signIn/signOut fns, listeners) |
| `convex-mappers.ts` | `toConvex*` / `fromConvex*` type converters (`localId` ↔ `id`) |
| `sync-engine.ts` | `ConvexCloudSyncEngine` — push/pull, cursor tracking, photo upload/download |
| `queue.ts` | Sync queue (unchanged — captures local mutations as `upsert`/`delete` ops) |
| `sync-state-store.ts` | Sync state atom (unchanged) |

**Key pattern — `ConvexAuthBridge`**: A React component in `App.tsx` wires `useAuthActions()` and `useQuery(api.users.currentUserIdentity)` into the module-level state in `convex-auth.ts`. This allows non-React code (repositories, sync engine) to access auth without hooks.

#### UI Changes

- **`src/app/App.tsx`**: Conditionally wraps the app in `ConvexProvider` + `ConvexAuthProvider` when Convex is configured. No `/auth/callback` route needed (OTP flow is stateless).
- **`src/features/settings/settings-page.tsx`**: Replaced Supabase auth UI with Convex OTP form (email → receive code → paste code → signed in).
- **`src/lib/i18n/translations.ts`**: Added `cloudSync.sendCode`, `sendingCode`, `codeHint`, `message.codeSent` keys in both locales.

#### Deleted (Supabase artifacts)

- `src/lib/cloud/supabase-client.ts`
- `src/lib/cloud/auth.ts`
- `src/lib/cloud/mappers.ts`
- `src/lib/cloud/types.ts`
- `src/features/auth/auth-callback-page.tsx`
- `supabase/` directory
- `@supabase/supabase-js` npm package

---

## Current State

| Check | Status |
|---|---|
| TypeScript (`bun run typecheck`) | ✅ Passes |
| ESLint (`bun run lint`) | ✅ Passes |
| Unit tests (`bun run test`) | ✅ 24 tests pass |
| Convex backend deployed | ✅ `dev:helpful-dogfish-140` |
| OTP email sending | ✅ Via Resend (free tier: own email only) |
| OTP code verification | ⚠️ Needs live test — see Next Steps |

### Environment Variables

| Variable | Where | Description |
|---|---|---|
| `VITE_CONVEX_URL` | `.env.local` (auto) | Convex cloud URL — enables cloud sync when set |
| `VITE_CONVEX_SITE_URL` | `.env.local` (auto) | Convex site URL |
| `CONVEX_DEPLOYMENT` | `.env.local` (auto) | Deployment ID (set by `npx convex dev`) |
| `AUTH_RESEND_KEY` | Convex env (server) | Resend API key for sending OTP emails |
| `AUTH_EMAIL_FROM` | Convex env (server) | From address for OTP emails |
| `SITE_URL` | Convex env (server) | Required by `@convex-dev/auth` (set to Convex site URL) |

---

## Known Issues / Limitations

1. **Resend free tier**: Can only send emails to verified addresses. To use with any email, upgrade Resend plan or add a verified domain.
2. **Photo sync**: Implemented but not yet end-to-end tested (upload via `generateUploadUrl`, download via `getUrl`).
3. **Realtime push**: Convex does not need polling for queries (it's reactive), but the sync engine currently uses a 2-minute interval for push operations. The pull side could be made reactive using Convex's live queries.

---

## Next Steps

### Immediate — Test the OTP flow
1. Start the Convex dev server: `npx convex dev`
2. Start the Vite dev server: `bun run dev`
3. Open Settings → Cloud Sync
4. Enter your email address and click **Send Code**
5. Check your inbox for the 6-digit code
6. Paste the code and confirm sign-in
7. Verify the user badge appears in Settings

### Short-term
- [ ] Test full sync cycle: create an item locally → sync → verify it appears in Convex dashboard
- [ ] Test pull: wipe local data → re-sync → verify items restored
- [ ] Test photo sync: upload a photo → sync → verify download on re-install
- [ ] Test `wipeAllUserData` from Settings (the destructive cloud purge)
- [ ] End-to-end tests (`bun run test:e2e`) — likely need updates for auth flow change

### Medium-term
- [ ] Add Convex live query for real-time pull (replace interval-based polling on the pull side)
- [ ] Upgrade Resend to send to any email (production readiness)
- [ ] Configure `AUTH_EMAIL_FROM` with a proper domain
- [ ] Add error boundary / retry UI for sync failures in Settings
- [ ] Set up production Convex deployment (`npx convex deploy`)

### Long-term / Nice-to-have
- [ ] Conflict resolution strategy for concurrent edits (currently last-write-wins via `serverUpdatedAt`)
- [ ] Selective sync (sync only specific categories)
- [ ] Multi-device sync notification (badge/toast when remote changes arrive)

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                 │
│                                                          │
│  React Components                                        │
│       │  useLiveQuery (reactive)                        │
│       ▼                                                  │
│  Repositories (ItemRepository, CategoryRepository, …)   │
│       │  write                │  read                   │
│       ▼                       ▼                          │
│  Dexie / IndexedDB    ◄───  SyncEngine (pull)           │
│       │                       │                          │
│  SyncQueue (queue.ts)         │ ConvexReactClient        │
│       │  push                 │                          │
└───────┼───────────────────────┼─────────────────────────┘
        │                       │
        ▼   HTTPS               ▼  HTTPS
┌─────────────────────────────────────────────────────────┐
│  Convex Cloud (convex/)                                  │
│                                                          │
│  auth.ts        — Email OTP (Resend)                    │
│  categories.ts  — upsert / markDeleted / pullSince      │
│  items.ts       — upsert / markDeleted / pullSince      │
│  outfits.ts     — upsert / markDeleted / pullSince      │
│  laundryLogs.ts — upsert / markDeleted / pullSince      │
│  photos.ts      — upsert / generateUploadUrl / getUrl   │
│  sync.ts        — wipeAllUserData                       │
│  users.ts       — currentUserIdentity                   │
└─────────────────────────────────────────────────────────┘
```
