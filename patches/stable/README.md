# Stable channel policy

Pi has no stable patch series yet. The PR #7211 implementation depends on Orchestrator v2, which is not available on the legacy stable architecture. `tools/maintain-upstream.mjs` still creates a manifest for every missed stable GitHub Release, records it as `deferred`, and carries no unsupported patch into that release.

When an upstream stable release contains the required Orchestrator-v2 base, change `maintenance.config.json` to a reviewed stable baseline and let the maintenance tool create a distinct ordered patch series for each stable tag.
