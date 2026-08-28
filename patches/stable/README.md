# Stable channel policy

The current direct Pi patch base is `a6797b3b97dca6b6941574ff062d069c45c89b9a`. Maintenance inspects only the latest stable GitHub Release and records it as `deferred` when that exact immutable tag does not contain the base. It never applies or publishes the Pi series to a deferred stable release.

When a future stable tag contains the required base, run `node tools/maintain-upstream.mjs --latest-only --channel=stable` to create that one reviewed ordered patch series. Older stable tags are not backfilled unless explicitly requested.
