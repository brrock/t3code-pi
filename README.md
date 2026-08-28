# T3 Code Pi

A maintained Pi coding-agent fork of [T3 Code](https://github.com/pingdotgg/t3code).

This repository keeps the Pi integration as an upstream-portable patch series, then builds and publishes fork-branded server and desktop releases.

## What updates automatically

| Surface | Update path |
| --- | --- |
| Background-service server | The server installs an exact `@brrock/t3-pi@<version>` runtime, validates it, starts it as a trial, and rolls back if startup fails. |
| Desktop app | Electron checks `brrock/t3code-pi` GitHub Releases for its channel, downloads the matching installer, and installs on the user’s chosen restart. |
| CLI / new server installs | npm publishes `@brrock/t3-pi` under `latest` for stable releases and `nightly` for nightly releases. |

Desktop-managed servers update with the desktop app. Linux background-service servers use the server trial/rollback updater. Foreground CLI servers remain manual by design.

## Agent-backed patch maintenance

Patch maintenance is deliberately agent-driven, not a blind scheduled job.

```sh
npm run maintain -- --latest-only --channel=stable
npm run maintain -- --latest-only --channel=nightly
```

The tool selects the newest upstream GitHub Release for each requested channel, checks out its immutable release tag, applies the most recent Pi patch series when the required base is present, and regenerates only that release’s series. It does not backfill older releases unless explicitly requested.

If an upstream change causes a conflict, maintenance exits nonzero, retains the attempted patch files, and writes a conflict manifest under `patches/<channel>/<upstream-tag>/manifest.json`. The agent is instructed to inspect that error, repair the patch in a disposable upstream clone, run focused tests, regenerate the series, and rerun maintenance. It must never publish a deferred or conflicted manifest.

After a verified `applied` result, the agent commits and pushes the patch directory before dispatching a release.

## Publishing a release

Publishing is manual-only (`workflow_dispatch`), so an authorized agent or maintainer explicitly chooses the upstream release. The supplied version must exactly equal `upstream_tag` without its leading `v`:

```sh
gh workflow run release.yml \
  -f channel=nightly \
  -f upstream_tag=<upstream-tag> \
  -f version=<exact-semver>
```

The workflow:

1. verifies the committed patch manifest;
2. applies the Pi series to the exact upstream release;
3. applies the fork release identity (`@brrock/t3-pi`, `brrock/t3code-pi`, and the fork desktop app ID);
4. publishes npm with GitHub OIDC trusted publishing and provenance;
5. builds desktop updater assets for macOS, Windows, and Linux;
6. forwards the upstream T3 Code release notes, adds a Pi-fork footer, and creates the GitHub Release.

Configure npm trusted publishing for `@brrock/t3-pi` to trust this repository and `.github/workflows/release.yml`. No long-lived `NPM_TOKEN` is used.

## Unsigned macOS builds

Desktop releases are intentionally unsigned. The packaged macOS app makes a best-effort attempt to remove `com.apple.quarantine` from its own app bundle when an updated app has launched. This cannot bypass Gatekeeper if macOS prevents the first launch; users may need to approve the initial install in macOS security settings. Signing and notarization are required for fully unattended macOS installs.

## Repository layout

- `patches/base/` — immutable Pi seed series for the current upstream base.
- `patches/stable/` and `patches/nightly/` — per-upstream-release patch history and manifests.
- `tools/maintain-upstream.mjs` — upstream release discovery and patch carry-forward.
- `tools/prepare-release-source.mjs` — fork identity and updater overlay applied only to release source.
- `.github/workflows/release.yml` — manual trusted npm + desktop updater release pipeline.

See [AGENTS.md](./AGENTS.md) for the maintenance contract.
