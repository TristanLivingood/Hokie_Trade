/** In-memory conversation state. Every listing owns one Conversation. */
export type Participant = 'buyer' | 'seller';

export const CAMPUS_TIME_ZONE = 'America/New_York';
export const CAMPUS_LOCATIONS = [
  { id: 'newman', name: 'Newman Library', detail: 'Main entrance' },
  { id: 'squires', name: 'Squires Student Center', detail: 'Main entrance' },
  { id: 'drillfield', name: 'Drillfield', detail: 'Burruss Hall side' },
] as const;

export type MeetupDetails = {
  locationId: string;
  date: string; // YYYY-MM-DD in Blacksburg, regardless of the phone's time zone.
  time: string; // HH:mm, 24-hour campus time.
};

export type MeetupProposal = {
  id: string;
  from: Participant;
  details: MeetupDetails;
  startsAt: number;
  status: 'pending' | 'accepted' | 'superseded' | 'withdrawn';
};

export type ChatMessage =
  | { id: string; type: 'text'; from: Participant; text: string }
  | { id: string; type: 'meetup'; proposalId: string }
  | { id: string; type: 'event'; text: string };

export type Conversation = {
  messages: ChatMessage[];
  proposals: Record<string, MeetupProposal>;
  pendingId: string | null;
  confirmedId: string | null;
};

export type ConversationAction =
  | { type: 'message'; id: string; from: Participant; text: string }
  | {
      type: 'propose'; id: string; from: Participant; details: MeetupDetails;
      now: number; replacesId?: string;
    }
  | { type: 'accept'; proposalId: string; actor: Participant; now: number }
  | { type: 'withdraw'; proposalId: string; actor: Participant };

type ValidationResult =
  | { valid: true; startsAt: number; details: MeetupDetails }
  | { valid: false; error: string };

const campusPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CAMPUS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function campusParts(timestamp: number) {
  const values: Record<string, string> = {};
  campusPartsFormatter.formatToParts(new Date(timestamp)).forEach(part => {
    values[part.type] = part.value;
  });
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}

/** A date chip uses the campus calendar, not the device's local date. */
export function campusDate(now = Date.now(), daysAhead = 0): string {
  const [year, month, day] = campusParts(now).date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + daysAhead)).toISOString().slice(0, 10);
}

export function validateMeetup(input: MeetupDetails, now = Date.now()): ValidationResult {
  const details = { locationId: input.locationId, date: input.date.trim(), time: input.time.trim() };
  if (!CAMPUS_LOCATIONS.some(location => location.id === details.locationId)) {
    return { valid: false, error: 'Choose a campus meetup location.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(details.date)) {
    return { valid: false, error: 'Enter the date as YYYY-MM-DD, for example 2026-11-05.' };
  }
  const [year, month, day] = details.date.split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (year < 2000 || year > 2100 || calendarDate.getUTCFullYear() !== year ||
      calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) {
    return { valid: false, error: 'Enter a real calendar date between 2000 and 2100.' };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(details.time)) {
    return { valid: false, error: 'Enter a 24-hour time as HH:MM, for example 15:30 for 3:30 PM.' };
  }
  const [hours, minutes] = details.time.split(':').map(Number);
  const wallClock = Date.UTC(year, month - 1, day, hours, minutes);
  // Eastern time is UTC-4 or UTC-5 in the supported years. Round-trip both
  // candidates through the actual zone rules to detect DST gaps/overlaps.
  const candidates = [4, 5].map(offset => wallClock + offset * 60 * 60 * 1000)
    .filter(timestamp => {
      const campus = campusParts(timestamp);
      return campus.date === details.date && campus.time === details.time;
    });
  if (!candidates.length) {
    return { valid: false, error: 'That time is skipped when the clocks change. Choose another time.' };
  }
  if (candidates.length > 1) {
    return { valid: false, error: 'That time occurs twice when the clocks change. Choose a time after 2:00 AM.' };
  }
  if (candidates[0] <= now) {
    return { valid: false, error: 'Choose a future date and time in Blacksburg (Eastern time).' };
  }
  return { valid: true, startsAt: candidates[0], details };
}

export function locationLabel(locationId: string): string {
  const location = CAMPUS_LOCATIONS.find(item => item.id === locationId);
  return location ? `${location.name} · ${location.detail}` : 'Campus location';
}

export function formatMeetupDateTime(startsAt: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CAMPUS_TIME_ZONE, weekday: 'short', month: 'short', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(startsAt));
}

export function createConversation(): Conversation {
  return {
    messages: [
      { id: 'hello-seller', type: 'text', from: 'seller', text: 'Hey! Yes, the item is still available.' },
      { id: 'hello-buyer', type: 'text', from: 'buyer', text: 'Great! Let’s find a time to meet.' },
    ],
    proposals: {}, pendingId: null, confirmedId: null,
  };
}

/** Reducer guards remain in place even when the UI hides unavailable actions. */
export function conversationReducer(state: Conversation, action: ConversationAction): Conversation {
  if (action.type === 'message') {
    const text = action.text.trim();
    if (!text || state.messages.some(message => message.id === action.id)) return state;
    return { ...state, messages: [...state.messages, { ...action, type: 'text', text }] };
  }
  if (action.type === 'propose') {
    if (state.proposals[action.id]) return state;
    const currentId = state.pendingId ?? state.confirmedId;
    // A modal opened for an older proposal cannot silently replace a newer one.
    if (currentId !== (action.replacesId ?? null)) return state;
    const result = validateMeetup(action.details, action.now);
    if (!result.valid) return state;
    const proposals = { ...state.proposals };
    if (state.pendingId) {
      proposals[state.pendingId] = { ...proposals[state.pendingId], status: 'superseded' };
    }
    proposals[action.id] = {
      id: action.id, from: action.from, details: result.details,
      startsAt: result.startsAt, status: 'pending',
    };
    return {
      ...state, proposals, pendingId: action.id,
      messages: [...state.messages, { id: action.id, type: 'meetup', proposalId: action.id }],
    };
  }
  const proposal = state.proposals[action.proposalId];
  if (!proposal || proposal.status !== 'pending' || state.pendingId !== proposal.id) return state;
  if (action.type === 'withdraw') {
    if (action.actor !== proposal.from) return state;
    return {
      ...state, pendingId: null,
      proposals: { ...state.proposals, [proposal.id]: { ...proposal, status: 'withdrawn' } },
      messages: [...state.messages, {
        id: `${proposal.id}-withdrawn`, type: 'event',
        text: `${action.actor === 'buyer' ? 'Buyer' : 'Seller'} withdrew the meetup proposal.`,
      }],
    };
  }
  if (proposal.from === action.actor || proposal.startsAt <= action.now) return state;
  const proposals = { ...state.proposals };
  if (state.confirmedId) {
    proposals[state.confirmedId] = { ...proposals[state.confirmedId], status: 'superseded' };
  }
  proposals[proposal.id] = { ...proposal, status: 'accepted' };
  return {
    ...state, proposals, pendingId: null, confirmedId: proposal.id,
    messages: [...state.messages, {
      id: `${proposal.id}-accepted`, type: 'event',
      text: `${action.actor === 'buyer' ? 'Buyer' : 'Seller'} accepted. Meetup details are pinned above.`,
    }],
  };
}
