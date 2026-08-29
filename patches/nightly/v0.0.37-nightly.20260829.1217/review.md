# Pi review — `v0.0.37-nightly.20260829.1217`

- **Immutable target:** `v0.0.37-nightly.20260829.1217` (`2bc9e8ef6ad57a2513e4552e8a0b21d53db859e6`)
- **Manifest:** `applied` after repairing the upstream composer-picker context conflict and regenerating all five ordered Pi patches.
- **Exact upstream delta from the prior latest nightly:** `v0.0.36-nightly.20260829.1215..v0.0.37-nightly.20260829.1217` is PR #8603, “Require human review for pull requests changing product defaults.” It does not modify Codex, Claude, Cursor, Grok, OpenCode, provider contracts, provider Settings, command palette/keybindings, MCP/browser support, attachments, session controls, model/thinking controls, or lifecycle projection.
- **Pi decision:** no new provider capability is applicable in this delta. The repaired patch retains upstream unavailable-model handling and Pi’s concise composer label / qualified hover presentation, covered by the focused `providerIconUtils` test in the patch series.
- **Explicit blocker:** product-default review policy is repository-maintainer workflow, not a Pi RPC or extension capability; no user-facing Pi control can correctly represent it.
