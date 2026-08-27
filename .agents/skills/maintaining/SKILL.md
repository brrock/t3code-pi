---
name: maintaining-t3code-pi
description: Carry the Pi patch series across upstream T3 Code GitHub Releases and prepare a fork release.
---

# Maintaining T3 Code Pi

Run from the root of this repository. This is a patch-maintenance repository, not the application checkout.

## Routine

1. Ensure `gh auth status` can read `pingdotgg/t3code`, and ensure this repository is clean except for deliberate maintenance work.
2. Inspect missed upstream releases without modifying state:
   ```sh
   node tools/maintain-upstream.mjs --dry-run
   ```
3. Process them in order:
   ```sh
   node tools/maintain-upstream.mjs
   ```
   Stable is every non-draft, non-prerelease GitHub Release. Nightly is every non-draft GitHub prerelease. The tool records immutable release tag/target metadata in each manifest; committed manifests, not ignored `.state/releases.json`, are the durable checkpoint.
4. Inspect every new `patches/<channel>/<tag>/manifest.json`.
   - `applied`: inspect the regenerated ordered patches and run the targeted T3 tests from the corresponding `clones/<channel>` checkout.
   - `deferred`: commit it only when its reason is expected. Stable Pi is deferred until Orchestrator v2 ships. Nightlies before the V2 base are also deferred.
   - `conflict`: do **not** commit a pretend success. Repair the retained patches in that version directory (using the channel clone to test them), then rerun the tool; it retries conflict directories instead of replacing them with the old baseline.
5. Commit the new patch directories, manifest changes, and any intentional maintenance code/doc changes. Never commit `clones/` or `.state/`.

## Pi baseline

`patches/nightly/orchestrator-v2-pr-7211` is a faithful `git format-patch` series from [pingdotgg/t3code#7211](https://github.com/pingdotgg/t3code/pull/7211), through its current head recorded in that directory's manifest. It depends on Orchestrator v2, so it must not be backported as a v1 provider.

When upstream changes Pi, provider contracts, event ingestion, permissions, session state, tools/MCP, or subagents, adapt at the provider boundary and retain focused tests for the behavior being bridged. Keep orchestration-independent changes minimal.

## Publish

Only after an agent-maintained manifest is committed and pushed, manually dispatch **Publish Pi fork release** with the exact `channel`, `upstream_tag`, and a distinct `fork_tag`.

The workflow rejects nightly manifests that are not `applied`. It attaches a patched source archive automatically. For desktop auto-update, upload signed installers, blockmaps, and updater YAML files as workflow assets. Do not represent a source-only release as an auto-update-capable desktop release.
