# Pi review — `v0.0.36-nightly.20260828.1210`

- **Immutable target:** `v0.0.36-nightly.20260828.1210` (`4c51b4c9b6a85d96a22e0df41d5cfd2d8fc9901d`)
- **Manifest:** `applied`; the two Pi provider patches carried forward and applied cleanly.
- **Provider review:** No new user-visible Codex, Claude, Cursor, Grok, OpenCode, or Pi RPC capability was added in the exact `1208..1210` range that can be ported to Pi. The upstream changes affecting desktop are preview-automation status schema wiring and preload-bundle verification.
- **macOS automation prompt investigation:** The exact tag contains one `osascript` use in `apps/desktop/scripts/electron-launcher.mjs`, guarded by `isDevelopment`; it registers URL schemes only for the development launcher. It is not part of a production packaged Electron path. No `NSAppleEventsUsageDescription`, AppleEvents entitlement, or production AppleScript invocation was found in the current tagged source. The repeated macOS “access data from other apps” prompt therefore is not resolved by a Pi-provider patch in this range; validate the fresh production build and capture the macOS privacy prompt’s target app/process if it continues.
