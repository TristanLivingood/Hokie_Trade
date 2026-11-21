import type { Participant } from './model';

/**
 * Presentation-only state for the conversation screen. Kept out of
 * `Conversation` on purpose: tab choice and unsent text are not domain data
 * and must not be persisted or synchronized.
 */
export type ConversationTab = 'chat' | 'meeting';

export const CHAT_TAB: ConversationTab = 'chat';
export const MEETING_TAB: ConversationTab = 'meeting';

export type ConversationViewState = {
  tab: ConversationTab;
  drafts: Record<Participant, string>;
};

export type ConversationViewAction =
  | { type: 'selectTab'; tab: ConversationTab }
  | { type: 'draft'; from: Participant; text: string }
  | { type: 'clearDraft'; from: Participant };

/** Opening a conversation always starts on Chat with empty drafts. */
export function createConversationViewState(): ConversationViewState {
  return { tab: CHAT_TAB, drafts: { buyer: '', seller: '' } };
}

/**
 * Pure view-state reducer. Switching tabs never touches the drafts, which is
 * what keeps an unsent message alive while the Meeting tab is open.
 */
export function conversationViewReducer(
  state: ConversationViewState,
  action: ConversationViewAction,
): ConversationViewState {
  if (action.type === 'selectTab') {
    return state.tab === action.tab ? state : { ...state, tab: action.tab };
  }
  if (action.type === 'draft') {
    if (state.drafts[action.from] === action.text) return state;
    return { ...state, drafts: { ...state.drafts, [action.from]: action.text } };
  }
  if (!state.drafts[action.from]) return state;
  return { ...state, drafts: { ...state.drafts, [action.from]: '' } };
}
