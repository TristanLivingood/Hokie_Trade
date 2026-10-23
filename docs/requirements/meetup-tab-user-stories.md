# User Stories: Hokie Trade - Meeting Tab in the Buyer-Seller Chat

**Scope:** Enhancement of the listing conversation so the buyer and seller can view and
manage the meetup time and location in a dedicated **Meeting** tab instead of relying on
a pinned summary and proposal cards in the message timeline.

**Source of truth for behavior:** `src/meetups/model.ts` (conversation transitions and
Eastern-time validation), `src/meetups/MeetupChat.tsx` (current chat UI), and
`docs/design/ADR-0001-meetup-tab.md` (design decision).

**ID allocation:** This is the first requirements artifact in `docs/requirements/`, so
stories start at `US-001`. Future milestones should add new IDs rather than reuse these.

## US-001 - View the agreed meetup from a dedicated Meeting tab

**Story:** As a buyer or seller in a listing conversation, I want a Meeting tab that shows
the agreed meetup time and location, so that I can confirm logistics without scrolling
through chat messages.

**Acceptance Criteria**

1. Given an open listing conversation, when the conversation screen loads, then a tab
   control labelled "Chat" and "Meeting" is visible and "Chat" is selected by default.
2. Given a conversation with a confirmed meetup, when I select the Meeting tab, then the
   confirmed campus location (name and detail) and start date/time in Blacksburg Eastern
   time, including the zone abbreviation, are visible at the top of the tab without
   vertical scrolling.
3. Given a conversation with no confirmed and no pending meetup, when I select the Meeting
   tab, then I see an empty state that says no meetup is planned yet and a control to
   propose one.
4. Given a conversation with a confirmed meetup and a newer pending change, when I select
   the Meeting tab, then the confirmed plan is shown as the current agreement and the
   pending change is shown separately with its status.
5. Given a confirmed meetup whose start time has passed, when I select the Meeting tab,
   then the details remain visible with a "time has passed" notice and I can still propose
   a new meetup.

**Priority:** Must-have (MoSCoW)

**Related requirements:** PRODUCT.md sections 5.5 and 5.6; ADR-0001

**Assumptions / dependencies:** The conversation is already loaded in memory and contains
at most one confirmed proposal and at most one pending proposal, which is the invariant
enforced by `conversationReducer`. Display formatting reuses `locationLabel` and
`formatMeetupDateTime` so the tab and the chat cards cannot disagree.

## US-002 - Propose or change a meetup from the Meeting tab

**Story:** As a buyer or seller, I want to propose a meetup location, date, and time from
the Meeting tab, so that I can arrange the trade without leaving the conversation.

**Acceptance Criteria**

1. Given no pending proposal and no confirmed meetup, when I activate "Propose meetup" in
   the Meeting tab, then the existing meetup form opens with its default first campus
   location, tomorrow's campus date, and 15:00 Eastern time.
2. Given a confirmed meetup exists, when I activate "Change meetup" in the Meeting tab,
   then the form opens prefilled with the confirmed location, date, and time.
3. Given the form contains a missing or unknown location, a malformed or nonexistent date,
   a time that is not 24-hour `HH:MM`, a daylight-saving gap or ambiguous repeated time, or
   a time that is not in the future, when I submit, then an inline error is shown, the form
   stays open, and the conversation is unchanged.
4. Given valid meetup details, when I submit, then a pending proposal appears in the
   Meeting tab labelled with its proposer, a structured meetup message is appended to the
   Chat timeline, and any confirmed plan remains the current agreement until acceptance.
5. Given a pending proposal that I authored, when I open the Meeting tab, then I see
   "Awaiting response" with Edit and Withdraw actions and no Accept action.
6. Given any pending proposal exists, when I view the Meeting tab, then the primary
   "Propose meetup" or "Change meetup" action is unavailable and explains that a proposal
   is already pending.
7. Given I withdraw my own pending proposal, when the withdrawal completes, then the
   proposal status becomes Withdrawn, a withdrawal event appears in Chat, and the
   previously confirmed plan, if any, remains current.

**Priority:** Must-have (MoSCoW)

**Related requirements:** PRODUCT.md sections 5.5 and 5.6; ADR-0001

**Assumptions / dependencies:** `MeetupForm` remains the only input surface and calls the
existing `propose` action with `replacesId` set to the current pending or confirmed
proposal. Validation stays in `validateMeetup`; the tab does not duplicate validation
rules.

## US-003 - Review, accept, or counter a proposal from the Meeting tab

**Story:** As the recipient of a meetup proposal, I want to review and accept it or suggest
a change from the Meeting tab, so that we can agree on logistics without hunting through
the message timeline.

**Acceptance Criteria**

1. Given a pending proposal from the other participant, when I open the Meeting tab, then I
   see the proposer, location, date/time, status, an Accept action, and a Suggest change
   action.
2. Given I activate Accept on a proposal whose start time is still in the future, when the
   action completes, then the proposal becomes Confirmed, the pending state clears, the
   Meeting tab shows it as the current agreement, and a confirmation event appears in Chat.
3. Given I activate Suggest change, when I submit valid different details, then the previous
   pending proposal becomes Superseded, a new pending proposal from me appears, and Accept
   is now available only to the other participant.
4. Given the pending proposal's start time is at or before the current time, when I open the
   Meeting tab, then Accept is unavailable, a "time has passed" message is shown, and
   Suggest change remains available.
5. Given a proposal is accepted, superseded, or withdrawn, when I open the Meeting tab, then
   it offers no Accept action; if a duplicate or stale Accept is dispatched, then the
   conversation does not change and no duplicate confirmation event is added.
6. Given I am the participant who created the pending proposal, when I open the Meeting tab,
   then Accept is not offered for my own proposal.

**Priority:** Must-have (MoSCoW)

**Related requirements:** PRODUCT.md sections 5.5 and 5.6; ADR-0001

**Assumptions / dependencies:** Authorization, idempotence, expiry, and replacement remain
enforced by `conversationReducer`; the UI may hide unavailable actions but is not the
security boundary. Times are compared against the campus clock, not the device time zone.

## US-004 - Keep the Chat and Meeting tabs consistent

**Story:** As a buyer or seller, I want both tabs to reflect the same conversation state
immediately, so that I never act on stale meetup details or lose an unsent message.

**Acceptance Criteria**

1. Given I propose, accept, counter, or withdraw in the Meeting tab, when I switch to Chat,
   then the timeline shows the corresponding meetup card or event with the same status.
2. Given a proposal is created or updated, when I switch to the Meeting tab, then it
   reflects the change without reloading or reopening the conversation.
3. Given I have typed an unsent message in Chat, when I switch to Meeting and back to Chat,
   then the draft text is preserved.
4. Given I leave the conversation and reopen the same listing later in the same app session,
   when the conversation screen appears, then its confirmed and pending meetup state is
   preserved and the Chat tab is selected by default.
5. Given two different listing conversations, when I update the meetup state in one, then
   the messages and meetup state of the other are unchanged.
6. Given a pending proposal from the other participant, when I am viewing Chat, then the
   Meeting tab shows a visible "action needed" indicator that clears after I accept,
   counter, or the proposal is no longer pending.
7. Given I use a screen reader, when I switch between tabs, then each tab exposes its name
   and selected state and the current meetup status is available as readable text rather
   than only as a color or icon.

**Priority:** Must-have (MoSCoW)

**Related requirements:** PRODUCT.md sections 5.5 and 5.6; ADR-0001

**Assumptions / dependencies:** Tab selection is local view state, so reopening a
conversation deliberately returns to Chat. The prototype continues to store conversations
in memory; cross-device real-time synchronization is out of scope for this enhancement.

## Non-Goals and Out of Scope

- Calendar export or calendar sync.
- Maps, directions, or geolocation for meetup locations.
- Push or email notifications for new or changed proposals.
- Multiple simultaneous confirmed meetups per conversation.
- A separate full proposal-history list in the Meeting tab; historical proposal cards stay
  in the Chat timeline as the audit trail.
- Backend persistence or multi-user real-time synchronization beyond the existing in-memory
  prototype.
- Any change to the Eastern-time policy or to the three suggested campus locations.

## Traceability

| Story | Design decision | Current code affected |
|-------|-----------------|-----------------------|
| US-001 | ADR-0001: Meeting tab as the canonical logistics surface | `src/meetups/MeetupChat.tsx`, new `MeetingPanel` |
| US-002 | ADR-0001: reuse `MeetupForm` and the `propose` action | `src/meetups/MeetupForm.tsx`, `src/meetups/model.ts` |
| US-003 | ADR-0001: derived `MeetingView` controls; reducer remains the authority | `src/meetups/model.ts`, new `meetingView.ts` |
| US-004 | ADR-0001: one `Conversation` object, tab state only in the view | `App.tsx`, `src/meetups/MeetupChat.tsx` |
