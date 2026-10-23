const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  campusDate, validateMeetup, formatMeetupDateTime, createConversation, conversationReducer,
} = require(process.env.HOKIE_MEETUP_MODEL);

const now = Date.parse('2026-10-22T16:00:00Z');
const details = { locationId: 'newman', date: '2026-10-23', time: '15:30' };
const propose = (state, id = 'first', from = 'buyer', changes = {}) => conversationReducer(state, {
  type: 'propose', id, from, details: { ...details, ...changes }, now,
  replacesId: state.pendingId ?? state.confirmedId ?? undefined,
});
const accept = (state, proposalId, actor = 'seller', at = now) => conversationReducer(state, {
  type: 'accept', proposalId, actor, now: at,
});

test('campus dates and UTC instants stay correct in summer and winter', () => {
  assert.equal(campusDate(Date.parse('2026-10-23T02:00:00Z')), '2026-10-22');
  assert.equal(campusDate(Date.parse('2026-12-31T23:30:00Z'), 1), '2027-01-01');
  const summer = validateMeetup(details, now);
  const winter = validateMeetup({ ...details, date: '2026-12-12' }, now);
  assert.equal(summer.valid, true);
  assert.equal(winter.valid, true);
  assert.equal(summer.startsAt, Date.parse('2026-10-23T19:30:00Z'));
  assert.equal(winter.startsAt, Date.parse('2026-12-12T20:30:00Z'));
  assert.match(formatMeetupDateTime(summer.startsAt), /3:30\s?PM/);
  assert.match(formatMeetupDateTime(summer.startsAt), /EDT/);
  assert.match(formatMeetupDateTime(winter.startsAt), /EST/);
});

test('required location, date format, real dates, and time bounds are validated', () => {
  for (const changes of [
    { locationId: '' }, { locationId: 'unknown' }, { date: '' },
    { date: '10/23/2026' }, { date: '2026-02-30' }, { date: '2027-02-29' },
    { date: '2026-13-01' }, { time: '' }, { time: '24:00' },
    { time: '15:60' }, { time: '3:30' },
  ]) {
    const result = validateMeetup({ ...details, ...changes }, now);
    assert.equal(result.valid, false, JSON.stringify(changes));
    assert.ok(result.error.length > 0);
  }
  assert.equal(validateMeetup({ ...details, date: '2028-02-29' }, now).valid, true);
  assert.equal(validateMeetup({ ...details, date: ' 2026-10-23 ', time: ' 15:30 ' }, now).valid, true);
});

test('past and exactly-current meetups cannot be proposed', () => {
  assert.equal(validateMeetup({ ...details, date: '2026-10-21' }, now).valid, false);
  assert.equal(validateMeetup({ ...details, date: '2026-10-22', time: '12:00' }, now).valid, false);
  assert.equal(validateMeetup({ ...details, date: '2026-10-22', time: '12:01' }, now).valid, true);
});

test('daylight-saving gaps and ambiguous repeated times are rejected', () => {
  assert.equal(validateMeetup({ ...details, date: '2027-03-14', time: '02:30' }, now).valid, false);
  assert.equal(validateMeetup({ ...details, date: '2026-11-01', time: '01:30' }, now).valid, false);
  const unambiguous = validateMeetup({ ...details, date: '2026-11-01', time: '02:30' }, now);
  assert.equal(unambiguous.valid, true);
  assert.equal(unambiguous.startsAt, Date.parse('2026-11-01T07:30:00Z'));
});

test('proposals are structured messages and only the recipient can accept', () => {
  const initial = createConversation();
  const state = propose(initial);
  assert.equal(initial.pendingId, null);
  assert.equal(state.pendingId, 'first');
  assert.deepEqual(state.messages.at(-1), { id: 'first', type: 'meetup', proposalId: 'first' });
  assert.equal(accept(state, 'first', 'buyer'), state);
  const confirmed = accept(state, 'first');
  assert.equal(confirmed.confirmedId, 'first');
  assert.equal(confirmed.pendingId, null);
  assert.equal(confirmed.proposals.first.status, 'accepted');
});

test('either participant can originate a proposal', () => {
  const state = propose(createConversation(), 'seller-first', 'seller');
  assert.equal(accept(state, 'seller-first', 'seller'), state);
  assert.equal(accept(state, 'seller-first', 'buyer').confirmedId, 'seller-first');
});

test('a counterproposal retires the old card and reverses who can accept', () => {
  const first = propose(createConversation());
  const counter = propose(first, 'counter', 'seller', { locationId: 'squires', time: '16:00' });
  assert.equal(counter.proposals.first.status, 'superseded');
  assert.equal(counter.pendingId, 'counter');
  assert.equal(accept(counter, 'first'), counter);
  assert.equal(accept(counter, 'counter', 'seller'), counter);
  const confirmed = accept(counter, 'counter', 'buyer');
  assert.equal(confirmed.confirmedId, 'counter');
  assert.equal(confirmed.proposals.counter.details.locationId, 'squires');
});

test('the agreed pin survives a pending change until the recipient accepts', () => {
  const first = accept(propose(createConversation()), 'first');
  const pending = propose(first, 'rescheduled', 'buyer', { time: '17:00' });
  assert.equal(pending.confirmedId, 'first');
  assert.equal(pending.proposals.first.status, 'accepted');
  assert.equal(pending.proposals[pending.confirmedId].details.time, '15:30');
  const accepted = accept(pending, 'rescheduled');
  assert.equal(accepted.confirmedId, 'rescheduled');
  assert.equal(accepted.proposals.first.status, 'superseded');
  assert.equal(accepted.proposals[accepted.confirmedId].details.time, '17:00');
});

test('only the proposer can withdraw; withdrawing a change preserves the agreed meetup', () => {
  const confirmed = accept(propose(createConversation()), 'first');
  const pending = propose(confirmed, 'change');
  assert.equal(conversationReducer(pending, { type: 'withdraw', proposalId: 'change', actor: 'seller' }), pending);
  const withdrawn = conversationReducer(pending, { type: 'withdraw', proposalId: 'change', actor: 'buyer' });
  assert.equal(withdrawn.pendingId, null);
  assert.equal(withdrawn.confirmedId, 'first');
  assert.equal(withdrawn.proposals.change.status, 'withdrawn');
  assert.equal(accept(withdrawn, 'change'), withdrawn);
});

test('duplicate and stale accept actions do not add repeated confirmation messages', () => {
  const confirmed = accept(propose(createConversation()), 'first');
  assert.equal(accept(confirmed, 'first'), confirmed);
  assert.equal(accept(confirmed, 'missing'), confirmed);
});

test('an expired pending meetup cannot be accepted', () => {
  const state = propose(createConversation());
  assert.equal(accept(state, 'first', 'seller', state.proposals.first.startsAt), state);
  assert.equal(accept(state, 'first', 'seller', state.proposals.first.startsAt + 1), state);
});

test('a stale open editor cannot overwrite a newer proposal', () => {
  const first = propose(createConversation());
  const second = propose(first, 'newer', 'seller');
  const stale = conversationReducer(second, {
    type: 'propose', id: 'stale', from: 'buyer', details, now, replacesId: 'first',
  });
  assert.equal(stale, second);
  assert.equal(conversationReducer(second, { type: 'propose', id: 'stale', from: 'buyer', details, now }), second);
});

test('invalid proposals leave the conversation unchanged', () => {
  const initial = createConversation();
  assert.equal(propose(initial, 'invalid', 'buyer', { time: '99:00' }), initial);
});

test('independent conversations do not share messages, proposals, or confirmed plans', () => {
  const listingA = createConversation();
  const listingB = createConversation();
  const before = JSON.stringify(listingB);
  const updatedA = accept(propose(listingA), 'first');
  assert.equal(updatedA.confirmedId, 'first');
  assert.equal(JSON.stringify(listingB), before);
  assert.equal(listingA.confirmedId, null);
});

test('blank and duplicate messages are ignored while sender identity is retained', () => {
  const initial = createConversation();
  assert.equal(conversationReducer(initial, { type: 'message', id: 'empty', from: 'buyer', text: '  ' }), initial);
  const state = conversationReducer(initial, { type: 'message', id: 'hello', from: 'seller', text: ' See you there! ' });
  assert.equal(state.messages.at(-1).from, 'seller');
  assert.equal(state.messages.at(-1).text, 'See you there!');
  assert.equal(conversationReducer(state, { type: 'message', id: 'hello', from: 'buyer', text: 'Duplicate' }), state);
});
