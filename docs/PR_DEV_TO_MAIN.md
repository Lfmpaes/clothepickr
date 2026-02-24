# PR: Merge `dev` into `main`

## Title
`feat: merge dev into main (color system, custom selectors, UI polish, build optimization)`

## Summary
This PR merges the latest `dev` work into `main`, delivering:
- standardized item color system with predefined palette and filtering
- fully custom app-styled selectors (replacing system-default look)
- improved color picker UX with square color swatches
- themed scrollbar styling and selector dropdown scrollbar tuning
- build/chunk optimization to avoid large-chunk warnings

## Scope of Changes

### 1) Color Standardization
- Added shared color palette and helpers in `src/lib/colors.ts`
- Enforced color values via validation schema (`zod enum`)
- Added color-aware filtering in items repository
- Added color filter on Items page

### 2) Selector UX Upgrade
- Replaced native select usage with a custom dropdown component in `src/components/ui/select.tsx`
- Migrated selector usage in:
  - `src/features/items/item-form.tsx`
  - `src/features/items/items-page.tsx`
  - `src/features/items/item-detail-page.tsx`
  - `src/features/settings/settings-page.tsx`
- Added `src/components/color-swatch.tsx` for visual color icons
- Applied special options behavior:
  - `All colors`: RGB gradient square icon
  - `No color`: no icon

### 3) Scrollbar Styling
- Added global themed scrollbar styling in `src/index.css` (light/dark)
- Tuned dropdown scrollbar inset and alignment to keep content flush left and bar away from right edge

### 4) Build Optimization
- Added route-level lazy loading in `src/app/App.tsx`
- Added Rollup `manualChunks` in `vite.config.ts`
- Outcome: no `>500kB` chunk warning in build output

## Commit Range Included
- `182efe6` feat-standardize-item-colors
- `aefd28f` feat-color-swatch-in-selectors
- `9cc51e5` feat-split-chunks-and-restyle-select
- `c87a2f5` feat-custom-select-and-color-swatch-icons
- `52a09ab` feat-theme-scrollbars
- `207c06c` tweak-scrollbar-contrast-and-inset
- `7e20297` fix-select-scrollbar-inset-and-alignment

## Validation
Executed successfully on `dev`:
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run build`

## Diff Summary (`main..dev`)
- `16 files changed`
- `620 insertions`
- `101 deletions`

## Notes
- No backend or migration risk (local-first app; schema validation tightened for color values).
- Existing items with unknown color values are normalized to empty color in form workflows.

## Suggested Merge Steps
1. Open PR from `dev` to `main`.
2. Use this document as PR description.
3. Squash merge (recommended) or merge commit based on your release preference.
