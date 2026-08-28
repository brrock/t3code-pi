---
name: maintaining-t3code-pi
description: Carry the Pi patch series across upstream T3 Code releases, repair conflicts, review new provider capabilities, and publish fork updates.
---

# Maintaining T3 Code Pi

Run from this repository root. This is patch-maintenance and release infrastructure, not an application checkout.

## Routine

1. Verify `gh auth status` can read `pingdotgg/t3code`, can push `brrock/t3code-pi`, and that the checkout is clean.
2. Read `maintenance.config.json` plus the referenced `patches/base/<base>/manifest.json`. The committed direct Pi base is the only first-compatible-release seed; never revive the removed Orchestrator-v2 series.
3. Inspect the current latest upstream release in each channel before modifying state:
   ```sh
   node tools/maintain-upstream.mjs --latest-only --dry-run
   ```
4. Process only those latest releases:
   ```sh
   node tools/maintain-upstream.mjs --latest-only
   ```
   Stable means the newest non-draft, non-prerelease upstream GitHub Release; nightly means the newest non-draft prerelease. Do not backfill older releases unless the user explicitly requests it. Committed manifests are the durable checkpoint, not `.state/releases.json`.
5. Inspect every resulting `patches/<channel>/<tag>/manifest.json`.
   - **applied:** inspect regenerated patches and run focused tests in the matching disposable `clones/<channel>` checkout.
   - **deferred:** commit only when the recorded base commit is genuinely absent from that upstream target. Do not publish it.
   - **conflict:** the tool exits nonzero, preserves attempted patches, and records the `git am` error. Check out that exact upstream target in a disposable clone, apply/repair the retained patch series, run focused tests, regenerate with `git format-patch`, then rerun maintenance. Never mark a conflict applied or publish it. If no safe repair exists, stop with the manifest, attempted repair, and blocker.
6. On every run, inspect the exact upstream diff and current Codex, Claude, Cursor, Grok, and OpenCode implementations for user-visible capabilities Pi lacks: tools, approvals/input, attachments, session controls, model/thinking controls, MCP/browser, subagents, text generation, lifecycle projection, and all UI entry points. Port small defensible Pi-RPC/extension equivalents with focused tests; explicitly report capabilities Pi cannot express.
7. Commit and push only verified patch directories and intentional maintenance changes. Never commit `clones/` or `.state/`.

## Publish

Publishing is manual-only. After an **applied** manifest is committed and pushed, dispatch the release workflow with the exact channel, upstream tag, and matching semver version (`upstream_tag` without leading `v`):

```sh
gh workflow run release.yml \
  -f channel=nightly \
  -f upstream_tag=<upstream-tag> \
  -f version=<exact-semver>
```

The workflow verifies the manifest, applies the series, overlays fork identity/update configuration, publishes `@brrock/t3-pi` through npm trusted publishing with provenance (`latest` for stable, `nightly` for nightly), builds unsigned desktop updater assets, forwards upstream T3 Code release notes, and creates the fork GitHub Release.

Do not use an npm token. npm trusted publishing must trust `brrock/t3code-pi` and `.github/workflows/release.yml`. Unsigned macOS builds attempt to clear their own quarantine xattr after launch but may still need user Gatekeeper approval on first install.
