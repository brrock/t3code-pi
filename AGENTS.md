# T3 Code Pi fork

This repository stores the Pi adaptation of `pingdotgg/t3code`; it is not a T3 Code checkout. The disposable upstream worktrees are `clones/stable` and `clones/nightly` and are ignored by Git.

## Channels and patch history

- `patches/stable/<tag>` tracks non-prerelease GitHub Releases. Pi is deferred on stable until Orchestrator v2 is present; do not pretend a v1 release supports Pi.
- `patches/nightly/<tag>` tracks GitHub prereleases. The initial series comes from upstream PR #7211 and requires commit `2d623ac6b41ad1ed25c0473474699866083e0b65` (the Orchestrator-v2 base).
- Each directory has an ordered `git format-patch` series and `manifest.json`. Never edit a patch in place or overwrite an old directory. Resolve a new upstream version by producing its own directory.
- `manifest.json` status is `applied`, `deferred`, or `conflict`. A conflict is not handled and must make the maintenance run fail.

## Agent maintenance contract

Run `node tools/maintain-upstream.mjs --dry-run` first, then run it without `--dry-run` only from a clean maintenance checkout. It uses `gh api` to enumerate **GitHub Releases**: non-prereleases for stable and prereleases for nightly. It handles missed releases in published order. Committed manifests are the durable completion history; ignored `.state/releases.json` is only a local checkpoint.

The maintenance agent commits patch directories and docs/config changes itself. There is intentionally no scheduled GitHub maintenance workflow. Do not commit `clones/` or `.state/`.

When a nightly contains the required base, the tool checks out that exact release target, carries the previous successful patch series forward, applies it with `git am`, and regenerates it. Fix conflicts in that temporary clone, rerun the tool, and commit the resulting version directory. Do not mark a conflict as applied.

## Releases and updater assets

After the agent has committed and pushed a verified patch directory, it may manually dispatch `.github/workflows/release.yml`. The workflow validates the exact manifest and publishes a normal release for stable or a GitHub prerelease for nightly.

The workflow always attaches the patched source archive. To support Electron auto-update, provide signed platform installers, blockmaps, and updater manifests (`latest-*.yml`) through its `assets` input. Those assets must use the fork release version/tag and be signed with the fork's updater signing configuration; unsigned source archives are not desktop updater assets. Never publish a nightly manifest that is deferred or conflicted.
