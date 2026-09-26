# ADR: Split AssistantWidget into modules (file-size-500)

Date: 2026-09-26

## Context

`AssistantWidget.tsx` grew to 774 lines after the chat-sessions view
(list / rename / delete / open), follow-up prompts, and the stop button
landed. Vera's `file-size-500` gate blocks any commit touching an
oversized file, and the rule requires modularizing - never stripping
features.

## Decision

Split by responsibility, keeping all state and send/session logic in the
widget shell:

- `assistantContent.ts` - prompt pools, segment copy, route/view contexts
- `AssistantBrand.tsx` - `AssistantLockup`, `AiBadge`
- `AssistantSessionsPanel.tsx` - past-chats list, rename form, delete
- `AssistantThread.tsx` - empty state, message list, pending, error card
- `AssistantComposer.tsx` - follow-ups, composer form, footnote
- `AssistantWidget.tsx` - hooks, send/resend/session actions, shell (~397 lines)

Related fixes in the same commit: `AssistantWidget` moved inside
`ConfirmProvider` (useConfirm crash), `as const` on message roles
(tsc errors), footer em-dash removal (no-long-dashes gate).

## Consequences

- Every assistant file is under 500 lines; Vera fast + `tsc -p tsconfig.app.json` pass.
- `App.tsx` import unchanged (`AssistantWidget` named export preserved).
- Future widget work must keep each module under the limit - extract before growing.
