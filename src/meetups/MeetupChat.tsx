import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import ChatPanel from './ChatPanel';
import ConversationTabs from './ConversationTabs';
import MeetingPanel from './MeetingPanel';
import MeetupForm from './MeetupForm';
import { meetupFormSeed, selectMeetingView } from './meetingView';
import { conversationViewReducer, createConversationViewState } from './viewState';
import type { ConversationViewAction, ConversationViewState } from './viewState';
import type { Conversation, ConversationAction, MeetupProposal, Participant } from './model';

type Props = {
  seller: string;
  listingTitle: string;
  conversation: Conversation;
  onAction: (action: ConversationAction) => void;
  onSendMessage: (from: Participant, text: string) => void;
  onBack: () => void;
  onComplete: () => void;
};

let nextId = 0;
export function chatId(): string {
  nextId += 1;
  return `chat-${Date.now()}-${nextId}`;
}

/**
 * Conversation screen. Both tabs read the same `Conversation`; only the tab
 * choice and unsent drafts live here. Meetup derivation goes through
 * `selectMeetingView` so the two tabs cannot disagree.
 */
export default function MeetupChat({
  seller, listingTitle, conversation, onAction, onSendMessage, onBack, onComplete,
}: Props) {
  const [viewer, setViewer] = useState<Participant>('buyer');
  const [view, setView] = useState<ConversationViewState>(createConversationViewState);
  const [form, setForm] = useState<{ proposal?: MeetupProposal } | null>(null);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const meeting = selectMeetingView(conversation, viewer, now);
  const draft = view.drafts[viewer];

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const dispatchView = (action: ConversationViewAction) => {
    setView(previous => conversationViewReducer(previous, action));
  };

  const openForm = (proposal?: MeetupProposal) => {
    setNotice('');
    setForm({ proposal });
  };

  const accept = (proposal: MeetupProposal) => {
    const currentTime = Date.now();
    setNow(currentTime);
    if (proposal.startsAt <= currentTime) {
      setNotice('That time has passed. Suggest a new date and time.');
      return;
    }
    setNotice('');
    onAction({ type: 'accept', proposalId: proposal.id, actor: viewer, now: currentTime });
  };

  const withdraw = (proposal: MeetupProposal) => {
    setNotice('');
    onAction({ type: 'withdraw', proposalId: proposal.id, actor: viewer });
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    onSendMessage(viewer, text);
    dispatchView({ type: 'clearDraft', from: viewer });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to listing" style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.flex}>
          <Text style={styles.headerName}>{viewer === 'buyer' ? seller : 'Buyer (demo)'}</Text>
          <Text numberOfLines={1} style={styles.headerListing}>{listingTitle}</Text>
        </View>
        <Text style={styles.verified}>✓ VT</Text>
      </View>

      <View style={styles.demoBar}>
        <View style={styles.flex}>
          <Text style={styles.demoLabel}>PROTOTYPE · DEMO VIEW</Text>
          <Text style={styles.demoHint}>Switch roles to try both sides</Text>
        </View>
        <View style={styles.switcher}>
          {(['buyer', 'seller'] as Participant[]).map(person => (
            <TouchableOpacity key={person} accessibilityRole="button"
              accessibilityLabel={`View as ${person}`} accessibilityState={{ selected: viewer === person }}
              style={[styles.roleButton, viewer === person && styles.roleSelected]}
              onPress={() => { setViewer(person); setNotice(''); }}>
              <Text style={[styles.roleText, viewer === person && styles.roleTextSelected]}>
                {person === 'buyer' ? 'Buyer' : 'Seller'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ConversationTabs
        value={view.tab}
        needsAction={meeting.needsAction}
        onChange={tab => dispatchView({ type: 'selectTab', tab })}
      />

      {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}

      {view.tab === 'chat' ? (
        <ChatPanel
          conversation={conversation}
          viewer={viewer}
          seller={seller}
          draft={draft}
          now={now}
          onChangeDraft={text => dispatchView({ type: 'draft', from: viewer, text })}
          onSend={sendMessage}
          onViewMeeting={() => dispatchView({ type: 'selectTab', tab: 'meeting' })}
          onComplete={onComplete}
        />
      ) : (
        <MeetingPanel
          conversation={conversation}
          view={meeting}
          viewer={viewer}
          seller={seller}
          now={now}
          onPropose={() => openForm()}
          onChange={proposal => openForm(proposal)}
          onAccept={accept}
          onWithdraw={withdraw}
        />
      )}

      {form ? (
        <MeetupForm
          initial={meetupFormSeed(form.proposal)}
          isChange={Boolean(form.proposal)}
          onClose={() => setForm(null)}
          onSubmit={details => {
            onAction({
              type: 'propose', id: chatId(), from: viewer, details,
              now: Date.now(), replacesId: form.proposal?.id,
            });
            setNotice('');
            setForm(null);
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF6F1' },
  flex: { flex: 1 },
  header: { backgroundColor: '#7A1B3A', flexDirection: 'row', alignItems: 'center', paddingRight: 18, paddingVertical: 10, gap: 8 },
  back: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 36, lineHeight: 38 },
  headerName: { color: '#fff', fontSize: 17, fontWeight: '800' },
  headerListing: { color: '#F0DCC9', fontSize: 12, marginTop: 4 },
  verified: { color: '#F2C08C', fontSize: 12, fontWeight: '700' },
  demoBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E6D9CE', gap: 8 },
  demoLabel: { color: '#6A5750', fontSize: 9, letterSpacing: 0.7, fontWeight: '800' },
  demoHint: { color: '#6A5750', fontSize: 10, marginTop: 3 },
  switcher: { flexDirection: 'row', backgroundColor: '#EDE2D8', borderRadius: 10, padding: 3 },
  roleButton: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  roleSelected: { backgroundColor: '#fff' },
  roleText: { color: '#6A5750', fontSize: 12, fontWeight: '600' },
  roleTextSelected: { color: '#7A1B3A', fontWeight: '800' },
  notice: { backgroundColor: '#FBE6DF', color: '#962D16', padding: 10, fontSize: 12 },
});
