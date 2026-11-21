// Tests for the PM2.3 Meeting tab: the derived meeting view, the form
// defaults/prefill it feeds, and the presentation state that keeps drafts alive.
// Requirements: docs/requirements/meetup-tab-user-stories.md (US-001 - US-004).
const assert = require('node:assert/strict');
const { test } = require('node:test');

const model = require(process.env.HOKIE_MEETUP_MODEL);
const {
  selectMeetingView, proposalStatusText, meetupFormDefaults, meetupFormSeed, participantName,
} = require(process.env.HOKIE_MEETING_VIEW);
const {
  CHAT_TAB, MEETING_TAB, createConversationViewState, conversationViewReducer,
} = require(process.env.HOKIE_VIEW_STATE);

// 2026-10-22 16:00 UTC is noon in Blacksburg (EDT).
const now = Date.parse('2026-10-22T16:00:00Z');
const details = { locationId: 'newman', date: '2026-10-23', time: '15:30' };

const propose = (state, id = 'first', from = 'buyer', changes = {}) => model.conversationReducer(state, {
  type: 'propose', id, from, details: { ...details, ...changes }, now,
  replacesId: state.pendingId ?? state.confirmedId ?? undefined,
});
const accept = (state, proposalId, actor = 'seller', at = now) => model.conversationReducer(state, {
  type: 'accept', proposalId, actor, now: at,
});
const withdraw = (state, proposalId, actor = 'buyer') => model.conversationReducer(state, {
  type: 'withdraw', proposalId, actor,
});
const selectTab = (state, tab) => conversationViewReducer(state, { type: 'selectTab', tab });
const typeDraft = (state, from, text) => conversationViewReducer(state, { type: 'draft', from, text });

// ---------- US-001: viewing the agreed meetup ----------

test('US-001.1 a conversation opens on Chat and the tab control offers Chat and Meeting', () => {
  const state = createConversationViewState();
  assert.equal(CHAT_TAB, 'chat');
  assert.equal(MEETING_TAB, 'meeting');
  assert.equal(state.tab, 'chat');
  assert.equal(selectTab(state, MEETING_TAB).tab, 'meeting');
  assert.equal(selectTab(selectTab(state, MEETING_TAB), CHAT_TAB).tab, 'chat');
});

test('US-001.2 a confirmed meetup exposes campus location detail and Eastern date/time', () => {
  const confirmed = accept(propose(model.createConversation()), 'first');
  const view = selectMeetingView(confirmed, 'buyer', now);

  assert.equal(view.state, 'confirmed');
  assert.equal(view.confirmed.id, 'first');
  assert.equal(view.pending, undefined);
  // Name and detail, so the Meeting panel and the Chat card cannot disagree.
  assert.equal(model.locationLabel(view.confirmed.details.locationId), 'Newman Library · Main entrance');
  assert.equal(model.locationLabel('unknown'), 'Campus location');
  assert.match(model.formatMeetupDateTime(view.confirmed.startsAt), /Oct 23, 2026/);
  assert.match(model.formatMeetupDateTime(view.confirmed.startsAt), /3:30\s?PM/);
  assert.match(model.formatMeetupDateTime(view.confirmed.startsAt), /EDT/);
  assert.equal(view.isConfirmedPast, false);
});

test('US-001.3 with no plan the view reports an empty state that can propose', () => {
  const view = selectMeetingView(model.createConversation(), 'buyer', now);
  assert.equal(view.state, 'none');
  assert.equal(view.confirmed, undefined);
  assert.equal(view.pending, undefined);
  assert.equal(view.canPropose, true);
  assert.equal(view.needsAction, false);
});

test('US-001.4 a pending change keeps the confirmed plan as the current agreement', () => {
  const confirmed = accept(propose(model.createConversation()), 'first');
  const changed = propose(confirmed, 'rescheduled', 'buyer', { time: '17:00' });
  const view = selectMeetingView(changed, 'seller', now);

  assert.equal(view.state, 'confirmed-with-change');
  assert.equal(view.confirmed.id, 'first');
  assert.equal(view.confirmed.details.time, '15:30');
  assert.equal(view.pending.id, 'rescheduled');
  assert.equal(view.pending.details.time, '17:00');
  assert.equal(view.canPropose, false);
});

test('US-001.5 a confirmed meetup whose time has passed stays visible and can be replaced', () => {
  const confirmed = accept(propose(model.createConversation()), 'first');
  const startsAt = confirmed.proposals.first.startsAt;

  const past = selectMeetingView(confirmed, 'seller', startsAt + 1);
  assert.equal(past.isConfirmedPast, true);
  assert.equal(past.confirmed.details.locationId, 'newman');
  assert.equal(past.canPropose, true);

  // The boundary is inclusive: at the start time it has already passed.
  assert.equal(selectMeetingView(confirmed, 'seller', startsAt).isConfirmedPast, true);
  assert.equal(selectMeetingView(confirmed, 'seller', startsAt - 1).isConfirmedPast, false);
});

// ---------- US-002: proposing or changing a meetup ----------

test('US-002.1 the form defaults to Newman, tomorrow in Blacksburg, and 15:00 Eastern', () => {
  const defaults = meetupFormDefaults(now);
  assert.deepEqual(defaults, { locationId: 'newman', date: '2026-10-23', time: '15:00' });
  assert.equal(model.validateMeetup(defaults, now).valid, true);

  // 02:00 UTC is still the previous evening in Blacksburg, so "tomorrow" moves.
  const eveningBefore = meetupFormDefaults(Date.parse('2026-10-22T02:00:00Z'));
  assert.equal(eveningBefore.date, '2026-10-22');
  assert.equal(eveningBefore.time, '15:00');
});

test('US-002.2 changing a meetup prefills the stored details without exposing them', () => {
  const confirmed = accept(propose(model.createConversation()), 'first');
  const seed = meetupFormSeed(confirmed.proposals.first);

  assert.deepEqual(seed, details);
  seed.time = '09:00';
  assert.equal(confirmed.proposals.first.details.time, '15:30');
  assert.equal(meetupFormSeed(undefined), undefined);
});

test('US-002.4 a valid proposal becomes pending, posts a meetup message, and keeps the agreement', () => {
  const confirmed = accept(propose(model.createConversation()), 'first');
  const changed = propose(confirmed, 'rescheduled', 'buyer', { time: '17:00' });

  assert.deepEqual(changed.messages.at(-1), {
    id: 'rescheduled', type: 'meetup', proposalId: 'rescheduled',
  });
  const view = selectMeetingView(changed, 'buyer', now);
  assert.equal(view.state, 'confirmed-with-change');
  assert.equal(view.confirmed.details.time, '15:30');
  assert.equal(view.pending.details.time, '17:00');
});

test('US-002.5 and US-003.6 your own pending proposal offers edit and withdraw but no accept', () => {
  const pending = propose(model.createConversation(), 'mine', 'buyer');
  const view = selectMeetingView(pending, 'buyer', now);

  assert.equal(view.state, 'pending');
  assert.equal(view.canAccept, false);
  assert.equal(view.canEdit, true);
  assert.equal(view.canWithdraw, true);
  assert.equal(view.canSuggestChange, false);
  assert.equal(view.needsAction, false);
});

test('US-002.6 any pending proposal blocks proposing or changing again', () => {
  const pending = propose(model.createConversation(), 'mine', 'buyer');
  assert.equal(selectMeetingView(pending, 'buyer', now).canPropose, false);
  assert.equal(selectMeetingView(pending, 'seller', now).canPropose, false);
  // Once it is resolved the primary action comes back.
  assert.equal(selectMeetingView(accept(pending, 'mine'), 'buyer', now).canPropose, true);
  assert.equal(selectMeetingView(withdraw(pending, 'mine', 'buyer'), 'buyer', now).canPropose, true);
});

test('US-002.7 withdrawing your proposal posts an event and restores the agreed plan', () => {
  const confirmed = accept(propose(model.createConversation()), 'first');
  const pending = propose(confirmed, 'change');
  const withdrawn = withdraw(pending, 'change', 'buyer');

  assert.equal(withdrawn.pendingId, null);
  assert.equal(withdrawn.proposals.change.status, 'withdrawn');
  assert.equal(withdrawn.messages.at(-1).text, 'Buyer withdrew the meetup proposal.');

  const view = selectMeetingView(withdrawn, 'buyer', now);
  assert.equal(view.state, 'confirmed');
  assert.equal(view.confirmed.id, 'first');
  assert.equal(view.needsAction, false);
  assert.equal(view.canPropose, true);
  // A second withdrawal is a no-op.
  assert.equal(withdraw(withdrawn, 'change', 'buyer'), withdrawn);
});

// ---------- US-003: reviewing, accepting, or countering ----------

test('US-003.1 the recipient sees the proposer and can accept or suggest a change', () => {
  const pending = propose(model.createConversation(), 'first', 'buyer');
  const view = selectMeetingView(pending, 'seller', now);

  assert.equal(view.pending.from, 'buyer');
  assert.equal(model.locationLabel(view.pending.details.locationId), 'Newman Library · Main entrance');
  assert.equal(view.canAccept, true);
  assert.equal(view.canSuggestChange, true);
  assert.equal(view.canEdit, false);
  assert.equal(view.canWithdraw, false);
  assert.equal(view.needsAction, true);
  assert.equal(view.canPropose, false);
});

test('US-003.2 accepting clears the pending state and posts a confirmation event', () => {
  const pending = propose(model.createConversation(), 'first');
  const confirmed = accept(pending, 'first', 'seller');

  assert.equal(confirmed.pendingId, null);
  assert.equal(confirmed.proposals.first.status, 'accepted');
  assert.match(confirmed.messages.at(-1).text, /Seller accepted\./);
  assert.match(confirmed.messages.at(-1).text, /confirmed/);

  const view = selectMeetingView(confirmed, 'seller', now);
  assert.equal(view.state, 'confirmed');
  assert.equal(view.pending, undefined);
  assert.equal(view.needsAction, false);
  assert.equal(view.canAccept, false);
});

test('US-003.3 suggesting a change supersedes the old proposal and flips who can accept', () => {
  const pending = propose(model.createConversation(), 'first', 'buyer');
  const counter = propose(pending, 'counter', 'seller', { locationId: 'squires', time: '16:00' });

  assert.equal(counter.proposals.first.status, 'superseded');
  assert.equal(counter.pendingId, 'counter');
  assert.equal(selectMeetingView(counter, 'buyer', now).canAccept, true);
  assert.equal(selectMeetingView(counter, 'seller', now).canAccept, false);
  assert.equal(selectMeetingView(counter, 'seller', now).canEdit, true);
});

test('US-003.4 an expired pending proposal cannot be accepted but can be replaced', () => {
  const pending = propose(model.createConversation(), 'first', 'buyer');
  const startsAt = pending.proposals.first.startsAt;
  const view = selectMeetingView(pending, 'seller', startsAt);

  assert.equal(view.isPendingPast, true);
  assert.equal(view.canAccept, false);
  assert.equal(view.canSuggestChange, true);
  assert.equal(view.needsAction, true);
  assert.equal(view.canPropose, false);
  assert.equal(proposalStatusText(pending.proposals.first, pending, startsAt), 'Time has passed');
});

test('US-003.5 superseded, withdrawn, and accepted proposals never offer accept', () => {
  const pending = propose(model.createConversation(), 'first', 'buyer');

  const withdrawn = withdraw(pending, 'first', 'buyer');
  assert.equal(selectMeetingView(withdrawn, 'seller', now).canAccept, false);
  assert.equal(proposalStatusText(withdrawn.proposals.first, withdrawn, now), 'Withdrawn');

  const superseded = propose(pending, 'counter', 'seller', { time: '16:00' });
  assert.equal(selectMeetingView(superseded, 'seller', now).canAccept, false);
  assert.equal(proposalStatusText(superseded.proposals.first, superseded, now), 'Replaced');

  const accepted = accept(pending, 'first', 'seller');
  assert.equal(selectMeetingView(accepted, 'seller', now).canAccept, false);
  assert.equal(proposalStatusText(accepted.proposals.first, accepted, now), 'Confirmed');
});

// ---------- US-004: keeping both tabs consistent ----------

test('US-004.1 the Chat card and Meeting panel share one status vocabulary', () => {
  const pending = propose(model.createConversation(), 'first', 'buyer');
  assert.equal(proposalStatusText(pending.proposals.first, pending, now), 'Awaiting response');
  const confirmed = accept(pending, 'first', 'seller');
  assert.equal(proposalStatusText(confirmed.proposals.first, confirmed, now), 'Confirmed');
});

test('US-004.2 the derived view reflects a conversation change without a reload', () => {
  const pending = propose(model.createConversation(), 'first', 'buyer');
  assert.equal(selectMeetingView(pending, 'seller', now).state, 'pending');
  const confirmed = accept(pending, 'first', 'seller');
  assert.equal(selectMeetingView(confirmed, 'seller', now).state, 'confirmed');
});

test('US-004.3 an unsent Chat draft survives switching to Meeting and back', () => {
  let state = typeDraft(createConversationViewState(), 'buyer', 'Is 3:30 still good?');
  state = selectTab(state, MEETING_TAB);
  assert.equal(state.drafts.buyer, 'Is 3:30 still good?');
  state = selectTab(state, CHAT_TAB);
  assert.equal(state.drafts.buyer, 'Is 3:30 still good?');
});

test('US-004.3 drafts are kept per participant and cleared only for the sender', () => {
  let state = typeDraft(createConversationViewState(), 'buyer', 'buyer draft');
  state = typeDraft(state, 'seller', 'seller draft');
  state = conversationViewReducer(state, { type: 'clearDraft', from: 'buyer' });

  assert.equal(state.drafts.buyer, '');
  assert.equal(state.drafts.seller, 'seller draft');
  // Switching tabs reuses the same drafts object rather than rebuilding it.
  assert.equal(selectTab(state, MEETING_TAB).drafts, state.drafts);
});

test('US-004.4 reopening a conversation keeps meetup state but returns to Chat', () => {
  const confirmed = accept(propose(model.createConversation()), 'first');
  const reopened = createConversationViewState();

  assert.equal(reopened.tab, CHAT_TAB);
  assert.deepEqual(reopened.drafts, { buyer: '', seller: '' });
  const view = selectMeetingView(confirmed, 'buyer', now);
  assert.equal(view.state, 'confirmed');
  assert.equal(view.confirmed.id, 'first');
});

test('US-004.5 updating one conversation leaves another untouched', () => {
  const first = model.createConversation();
  const second = model.createConversation();
  const before = JSON.stringify(selectMeetingView(second, 'buyer', now));

  const updated = accept(propose(first), 'first');
  assert.equal(selectMeetingView(updated, 'buyer', now).state, 'confirmed');
  assert.equal(JSON.stringify(selectMeetingView(second, 'buyer', now)), before);
  assert.equal(second.confirmedId, null);
});

test('US-004.6 the action-needed indicator appears only for the recipient and clears when resolved', () => {
  const pending = propose(model.createConversation(), 'first', 'buyer');

  assert.equal(selectMeetingView(pending, 'seller', now).needsAction, true);
  assert.equal(selectMeetingView(pending, 'buyer', now).needsAction, false);
  assert.equal(selectMeetingView(accept(pending, 'first', 'seller'), 'seller', now).needsAction, false);
  assert.equal(
    selectMeetingView(propose(pending, 'counter', 'seller', { time: '16:00' }), 'seller', now).needsAction,
    false,
  );
  assert.equal(selectMeetingView(withdraw(pending, 'first', 'buyer'), 'seller', now).needsAction, false);
});

test('US-004.7 participant names and statuses are plain readable text', () => {
  assert.equal(participantName('buyer', 'Jordan Carter'), 'Buyer');
  assert.equal(participantName('seller', 'Jordan Carter'), 'Jordan Carter');

  const pending = propose(model.createConversation(), 'first', 'buyer');
  for (const status of [
    proposalStatusText(pending.proposals.first, pending, now),
    proposalStatusText(pending.proposals.first, pending, pending.proposals.first.startsAt),
  ]) {
    assert.equal(typeof status, 'string');
    assert.ok(status.length > 0);
  }
});
