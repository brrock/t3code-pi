# Provider capability review: v0.0.35

- **Exact target:** `v0.0.35` (`f925d639421844f02b3166d29281905dbba6d529`), published 2026-08-27.
- **Manifest:** `deferred`; `a6797b3b97dca6b6941574ff062d069c45c89b9a` is not an ancestor of this immutable release tag.

## Review

The release notes include Codex 0.150 multi-agent event handling. Codex, Claude, Cursor, Grok, and OpenCode implementations were inspected against the Pi base. No feasible Pi addition can be made to this target because its missing direct Pi base means the Pi provider/RPC adapter cannot be applied or tested safely.

## Genuine blocker

This is a release-ancestry blocker, not a patch conflict: `git merge-base --is-ancestor a6797b3b97dca6b6941574ff062d069c45c89b9a v0.0.35` returns false. The release must remain deferred and must not be published.
