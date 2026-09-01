# Pi patch review — v0.0.38-nightly.20260901.1243

Pi now accepts the same attachment flow as other path-capable providers: image attachments are embedded through Pi RPC, while generic files remain available to the agent through the safe attachment path included in the prompt by ProviderService. It no longer rejects a turn simply because it also contains a generic upload.

Focused verification passed:
- `PiAdapter.attachments.test.ts`
- `PiAdapter.test.ts`
- `ProviderService.test.ts`
