# Pi patch review — v0.0.37-nightly.20260830.1227

Carries the direct Pi provider/runtime integration, Composer presentation, and desktop updater channel fixes. Adds Pi dynamic tool-call payload visibility: raw Pi RPC tool execution start/end data is retained by the web session timeline and rendered in the expandable tool detail panel.

Focused verification passed:
- `apps/web/src/session-logic.test.ts`
- `apps/web/src/components/chat/MessagesTimeline.test.tsx`
