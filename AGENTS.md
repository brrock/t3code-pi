# T3 Code Pi fork

This repository stores the Pi adaptation of `pingdotgg/t3code`; it is not a T3 Code checkout. The disposable upstream worktrees are `clones/stable` and `clones/nightly` and are ignored by Git.

## Channels and patch history

- `patches/base/<base>` holds the immutable direct Pi port for its recorded upstream base. It is the seed series, not a release history entry.
- `patches/stable/<tag>` tracks non-prerelease GitHub Releases once they contain the direct-base commit.
- `patches/nightly/<tag>` tracks GitHub prereleases.
- Each directory has an ordered `git format-patch` series and `manifest.json`. Never edit a patch in place or overwrite an old directory. Resolve a new upstream version by producing its own directory.
- `manifest.json` status is `applied`, `deferred`, or `conflict`. A conflict is not handled and must make the maintenance run fail.

## Agent maintenance contract

On the **first run**, preserve and use the configured `patches/base/<base>` series as the source for the first compatible nightly; do not create a release folder by copying an old V2 series. Run `node tools/maintain-upstream.mjs --dry-run` first, then run it without `--dry-run` only from a clean maintenance checkout. It uses `gh api` to enumerate **GitHub Releases**: non-prereleases for stable and prereleases for nightly. It handles missed releases in published order. Committed manifests are the durable completion history; ignored `.state/releases.json` is only a local checkpoint.

The maintenance agent commits patch directories and docs/config changes itself. There is intentionally no scheduled GitHub maintenance workflow. Do not commit `clones/` or `.state/`.

When a nightly contains the required base, the tool checks out that exact release target, carries the previous successful patch series forward, applies it with `git am`, and regenerates it. Fix conflicts in that temporary clone, rerun the tool, and commit the resulting version directory. Do not mark a conflict as applied.

## Pi maintenance

The direct base supports Pi RPC sessions, prompts, streamed text/reasoning, native tool lifecycle rows, stop/abort, provider/model discovery, and provider-labelled model names such as `[anthropic] Claude Sonnet`. Continue porting PR #7211 behavior at the provider boundary as the current-tree adapter evolves, retaining focused tests for each behavior.

## Releases and updater assets

After the agent has committed and pushed a verified applied patch directory, dispatch `.github/workflows/release.yml` with its channel, upstream tag, and an exact semver version. It builds the patched source, applies the fork identity from `release.config.json`, publishes the `@brrock/t3-pi` npm CLI under `latest` or `nightly`, builds unsigned Electron installers/updater manifests, then creates the matching GitHub release.

Configure npm **trusted publishing** for `@brrock/t3-pi` to trust this repository's `release.yml` workflow; the workflow uses GitHub OIDC and deliberately has no `NPM_TOKEN`. This fork intentionally publishes unsigned Electron builds, so users may have to bypass their OS trust prompt on first install. The server updater installs the fork npm package; desktop clients use the fork GitHub Release feed. Never publish a manifest that is deferred or conflicted.
