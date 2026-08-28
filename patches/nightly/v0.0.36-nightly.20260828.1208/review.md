# Provider capability review: v0.0.36-nightly.20260828.1208

- **Exact target:** `v0.0.36-nightly.20260828.1208` (`b0ae3f3a8527bdcccb6a5cbda93548ad66fbcfea`), published 2026-08-28.
- **Manifest:** `applied`; the two regenerated Pi patches apply cleanly to the immutable tag.

## Exact release diff

The provider-facing change from `v0.0.36-nightly.20260827.1207` is `94401d01b fix(codex): accept Codex 0.150 account plans`. Codex account-plan metadata is specific to the Codex runtime. Pi RPC exposes provider/model discovery but has no account-plan capability or event, so no defensible Pi mapping exists.

## Current provider review

Codex, Claude, Cursor, Grok, and OpenCode implementations were inspected. The current Grok adapter additionally exposes CLI-discovered `$` skills (`grok inspect --json`), plan-mode proposal projection, and Grok-specific approval/session reliability. These are not silently treated as Pi support: Pi has no RPC messages for a remote provider's native skill catalog, account plan, or Grok plan-mode/approval protocol. They remain genuine Pi/RPC blockers rather than fabricated equivalents.

The existing Pi series already covers the feasible shared capabilities required for this target: provider/model discovery, prompts, streamed text and reasoning, tool lifecycle rows, input/approval handling, stop/abort, thinking controls, MCP extension injection, text generation, and provider-labelled UI model names. No newly feasible shared capability was found to port.

## Verification

Focused patched-source tests passed:

```sh
vp run --filter t3 test \
  src/provider/Layers/PiProvider.test.ts \
  src/provider/Layers/PiAdapter.test.ts \
  src/provider/Layers/piThinkingCapabilities.test.ts \
  src/provider/piT3McpInjection.test.ts
```

Result: 4 files and 12 tests passed.
