# ClothePickr Desktop (Tauri v2)

This project now supports desktop builds with Tauri while keeping the existing web/PWA flow.

## Local Prerequisites

### Windows (for `nsis` + `msi`)
- Rust toolchain (`rustup`, `cargo`, `rustc`)
- Visual Studio C++ Build Tools (MSVC)
- WebView2 Runtime
- NSIS
- WiX Toolset (required for `msi`)
- Bun 1.3+

### Linux (for `appimage` + `deb`)
- Rust toolchain (`rustup`, `cargo`, `rustc`)
- Bun 1.3+
- GTK/WebKit dependencies for Tauri (for example: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`)
- Packaging tools:
  - `appimagetool` + `patchelf` (AppImage)
  - `dpkg` (Debian package)

## Commands

```bash
# Web
bun run dev
bun run build

# Desktop dev
bun run tauri:dev

# Windows bundles (run on Windows host)
bun run tauri:build:win

# Linux bundles (run on Linux host)
bun run tauri:build:linux
```

## PATH helper for Rust

`scripts/tauri.mjs` prepends `~/.cargo/bin` to `PATH` when it exists.
This helps when `cargo`/`rustc` are installed but not visible in the current shell session.

## Output Artifacts

Tauri bundle outputs are generated under:

```text
src-tauri/target/release/bundle/
```

Expected folders by target:
- `nsis/`
- `msi/`
- `appimage/`
- `deb/`

## Verification Checklist

1. Install the generated package.
2. Launch ClothePickr and verify:
   - category/item/outfit CRUD
   - laundry status transitions
   - photo attach/view/remove
   - backup export/restore
3. Close and reopen app; verify data persistence.
4. Confirm PWA update prompt does not appear in desktop runtime.
5. Uninstall and validate uninstall completes cleanly.

