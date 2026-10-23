# ADR-0001: Present meetup logistics in a dedicated Meeting tab

- **Status:** Proposed
- **Date:** 2026-10-23
- **Deciders:** System Architect, UX/UI Designer, Product Manager, Build

## Context

Hokie Trade conversations already support structured meetup proposals. The pure reducer
in `src/meetups/model.ts` stores `MeetupProposal` records keyed by ID, tracks at most one
`pendingId` and one `confirmedId`, and enforces the rules that matter: only the recipient
can accept, only the proposer can withdraw, expired proposals cannot be accepted, and a
pending change does not replace the confirmed plan until it is accepted.

The current `MeetupChat` screen presents all of that inside one scrolling surface: text
messages, structured proposal cards, and a confirmed-plan banner pinned above the
timeline. That works while a thread is short, but it has three problems as the
enhancement is added:

1. The agreed time and location compete with ordinary messages for attention.
2. Proposal cards and the pinned banner expose overlapping actions, so it is unclear
   which surface is authoritative.
3. Accepting or changing a meetup requires finding the right card in the timeline, then
   switching demo roles to verify the other side.

The requested enhancement is a **Meeting tab** in the buyer-seller conversation. The
design must satisfy these forces:

- **Single source of truth:** both tabs must read the same `Conversation`; a proposal
  accepted in one tab must be reflected immediately in the other.
- **No new infrastructure:** the prototype uses React Native/Expo, a single `App.tsx`
  screen enum, no router, and in-memory state. A tab must not require a navigation
  library, a backend, or a schema migration.
- **Preserved behavior:** all existing reducer rules and the Eastern-time validation in
  `validateMeetup` remain the authority; the UI may hide invalid actions but cannot
  weaken them.
- **Testability and accessibility:** meetup state derivation should be testable without
  rendering, and tab semantics must be exposed to assistive technology.
- **Small team, semester scope:** the change should be implementable by refactoring the
  existing component rather than rewriting the messaging stack.

## Decision

We will add a two-tab control to the conversation screen:

- **Chat** remains the default tab and keeps the message timeline, composer, and
  read-only meetup cards that link to the Meeting tab.
- **Meeting** becomes the canonical surface for meetup logistics: confirmed plan,
  pending proposal, status, and all mutating actions (propose, change, edit, accept,
  withdraw).
- Both tabs render from the same `Conversation` object. Tab selection is local view
  state (`useState<'chat' | 'meeting'>`), not a field in the domain model.
- No new reducer action or persisted field is introduced. The Meeting panel dispatches
  the existing `ConversationAction` values (`propose`, `accept`, `withdraw`) and reuses
  `MeetupForm` unchanged.
- Mutating meetup controls are removed from the Chat timeline cards. A card remains a
  record of what was proposed, shows its current status, and offers "View in Meeting".
  This gives each action exactly one home.
- A pure selector, `selectMeetingView(conversation, viewer, now)`, derives everything
  the panel needs. It is the only place that decides which actions are available.

### Component view

```
ConversationScreen (currently MeetupChat)
|
+-- ConversationTabs ........................ "Chat" | "Meeting" (+ action-needed badge)
|
+-- ChatPanel
|   +-- MessageTimeline ..................... text bubbles, events, read-only meetup cards
|   |   +-- MeetupCard ...................... status + "View in Meeting"
|   +-- Composer ............................ draft text, send, "Trade complete"
|
+-- MeetingPanel
    +-- ConfirmedPlanCard ................... location, date/time, "time has passed" notice
    +-- PendingProposalCard ................. proposer, details, status, actions
    +-- EmptyState .......................... "No meetup planned yet" + Propose meetup
    +-- Propose / Change button ............ disabled while a proposal is pending
    +-- MeetupForm (modal) ................. existing component; validation unchanged
             |
             v dispatch(ConversationAction)
      conversationReducer(state, action) ... existing pure reducer, unchanged
             |
             v Conversation
      selectMeetingView(...) ................ derived view model
```

### Derived view model

```ts
type MeetingView = {
  confirmed?: MeetupProposal;
  pending?: MeetupProposal;
  state: 'none' | 'pending' | 'confirmed' | 'confirmed-with-change';
  canPropose: boolean;   // no pending proposal
  canAccept: boolean;    // pending exists, viewer is recipient, startsAt > now
  canEdit: boolean;      // pending exists and viewer is proposer
  canWithdraw: boolean;  // pending exists and viewer is proposer
  isConfirmedPast: boolean;
  needsAction: boolean;  // pending exists and viewer is recipient
};
```

`selectMeetingView` lives outside the component (for example
`src/meetups/meetingView.ts`) and is covered by unit tests for the empty, pending,
confirmed, confirmed-with-change, expired, and wrong-actor cases. The reducer remains
the final guard against stale or duplicate actions.

### Interaction rules

- Opening a conversation selects **Chat**. The Meeting tab shows an "action needed"
  badge only when a pending proposal is waiting on the current viewer.
- Selecting Meeting does not mutate the conversation and does not dismiss an unsent
  Chat draft.
- The confirmed plan is rendered first in the Meeting panel and stays visible while a
  change is pending; the pending card states that the current plan remains in effect.
- "Propose meetup" and "Change meetup" open the existing form. Change pre-fills the
  confirmed or pending details and submits with the matching `replacesId`, so the
  reducer's stale-editor guard still applies.
- Accept is offered only to the recipient of a future proposal. Withdraw and Edit are
  offered only to the proposer. Past pending proposals show a "time has passed" notice
  and keep Suggest change available.
- Status is conveyed with text as well as color. Tabs use tab semantics
  (`accessibilityRole`, selected state) and announce status changes; the exact roles are
  verified against the installed React Native version during implementation.

## Consequences

- **Positive:** The agreed plan is one tap away and does not require scrolling. There is
  one authoritative place for meetup actions, which removes the current duplicate
  affordance between the pinned banner and proposal cards. The domain model and its
  tests do not change, so the enhancement is mostly a presentation refactor. The
  selector makes view-state rules directly unit-testable.
- **Negative:** The conversation component grows unless Chat and Meeting are extracted;
  this ADR assumes that refactor. Accepting from Chat now costs an extra tap. The
  "action needed" badge is derived and therefore disappears on app reload with the rest
  of the in-memory prototype. There is still no push or cross-device notification.
- **Follow-ups:**
  1. Extract `ChatPanel` and `MeetingPanel` from `MeetupChat.tsx` and add
     `ConversationTabs`.
  2. Add `selectMeetingView` and unit tests for all states and actor combinations.
  3. Add component/integration tests for tab switching, draft preservation, badge
     clearing, form pre-fill, and disabled actions.
  4. Keep `tests/meetups.test.cjs` passing unchanged; add UI coverage separately.
  5. Run the flow on iOS and Android, including a screen reader pass, and update the
     README "Try meetup scheduling" steps.
  6. Consider whether proposal history and expired-plan cleanup belong in a later
     milestone; neither is required by US-001 through US-004.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Keep the pinned banner and proposal cards as the only meetup surface | Does not satisfy the requested tab, and the details still compete with messages as the thread grows. |
| Add a separate `meeting` screen/route | Loses chat context, requires extending the `App.tsx` screen enum or adding a router, and makes switching between conversation and logistics heavier. Can be revisited if the app moves to Expo Router. |
| Open meetup details in a modal or bottom sheet | Persistent logistics are not scannable, proposal history is awkward, and it does not match the tab requirement. |
| Duplicate Accept/Change actions in both Chat and Meeting | Two competing surfaces for the same state increase the chance of stale UI and make the authoritative action unclear. |
| Store the active tab in `Conversation` | Tab choice is a presentation concern; putting it in the domain model complicates persistence and synchronization for no user-visible benefit. |
| Add a state-management library for tab/conversation state | The existing reducer and local state are sufficient; a new dependency adds cost without addressing the actual requirement. |

## Links

- Requirements: [US-001 through US-004](../requirements/meetup-tab-user-stories.md)
- Current behavior: `src/meetups/model.ts`, `src/meetups/MeetupChat.tsx`,
  `src/meetups/MeetupForm.tsx`, `tests/meetups.test.cjs`
- Product context: `PRODUCT.md` sections 5.5 (Messaging) and 5.6 (Trust and Safety)
- Planned system: `SYSTEM.md` section 3 (data model) and section 4 (routes)
