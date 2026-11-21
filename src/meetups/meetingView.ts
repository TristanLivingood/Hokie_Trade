import { CAMPUS_LOCATIONS, campusDate } from './model';
import type { Conversation, MeetupDetails, MeetupProposal, Participant } from './model';

/** Default time the meetup form offers: 3:00 PM in Blacksburg. */
export const DEFAULT_MEETUP_TIME = '15:00';

export type MeetingState = 'none' | 'pending' | 'confirmed' | 'confirmed-with-change';

/**
 * Everything the Meeting panel needs, derived from a single Conversation.
 *
 * This is the only place that decides which meetup actions are available.
 * `conversationReducer` remains the authority for stale or duplicate actions,
 * so hiding an action here can never widen what the domain model allows.
 */
export type MeetingView = {
  confirmed?: MeetupProposal;
  pending?: MeetupProposal;
  state: MeetingState;
  canPropose: boolean; // no pending proposal
  canAccept: boolean; // pending from the other participant, still in the future
  canEdit: boolean; // pending authored by the viewer
  canWithdraw: boolean; // pending authored by the viewer
  canSuggestChange: boolean; // pending from the other participant, even when it expired
  isConfirmedPast: boolean;
  isPendingPast: boolean;
  needsAction: boolean; // pending exists and the viewer is its recipient
};

export function selectMeetingView(
  conversation: Conversation,
  viewer: Participant,
  now: number = Date.now(),
): MeetingView {
  const confirmed = conversation.confirmedId
    ? conversation.proposals[conversation.confirmedId]
    : undefined;
  const pending = conversation.pendingId
    ? conversation.proposals[conversation.pendingId]
    : undefined;
  const isOtherProposal = pending ? pending.from !== viewer : false;
  const isOwnProposal = pending ? pending.from === viewer : false;
  const isPendingPast = pending ? pending.startsAt <= now : false;
  const state: MeetingState = pending
    ? (confirmed ? 'confirmed-with-change' : 'pending')
    : (confirmed ? 'confirmed' : 'none');

  return {
    confirmed,
    pending,
    state,
    canPropose: !pending,
    canAccept: isOtherProposal && !isPendingPast,
    canEdit: isOwnProposal,
    canWithdraw: isOwnProposal,
    canSuggestChange: isOtherProposal,
    isConfirmedPast: confirmed ? confirmed.startsAt <= now : false,
    isPendingPast,
    needsAction: isOtherProposal,
  };
}

/** Text status shared by the Chat card and the Meeting panel so they cannot disagree. */
export function proposalStatusText(
  proposal: MeetupProposal,
  conversation: Conversation,
  now: number = Date.now(),
): string {
  const isPending = proposal.status === 'pending' && conversation.pendingId === proposal.id;
  if (isPending) return proposal.startsAt <= now ? 'Time has passed' : 'Awaiting response';
  if (proposal.status === 'accepted' && conversation.confirmedId === proposal.id) return 'Confirmed';
  if (proposal.status === 'withdrawn') return 'Withdrawn';
  return 'Replaced';
}

export function participantName(person: Participant, seller: string): string {
  return person === 'buyer' ? 'Buyer' : seller;
}

/** Defaults for a brand-new proposal, expressed in the Blacksburg campus calendar. */
export function meetupFormDefaults(now: number = Date.now()): MeetupDetails {
  return {
    locationId: CAMPUS_LOCATIONS[0].id,
    date: campusDate(now, 1),
    time: DEFAULT_MEETUP_TIME,
  };
}

/**
 * Details used to prefill the form for a change. Returns a copy so editing the
 * form cannot mutate the stored proposal.
 */
export function meetupFormSeed(proposal?: MeetupProposal): MeetupDetails | undefined {
  return proposal ? { ...proposal.details } : undefined;
}
