import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import MeetupForm from './MeetupForm';
import { formatMeetupDateTime, locationLabel } from './model';
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

export default function MeetupChat({ seller, listingTitle, conversation, onAction, onSendMessage, onBack, onComplete }: Props) {
  const [viewer, setViewer] = useState<Participant>('buyer');
  const [drafts, setDrafts] = useState({ buyer: '', seller: '' });
  const [form, setForm] = useState<{ initial?: MeetupProposal } | null>(null);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const confirmed = conversation.confirmedId ? conversation.proposals[conversation.confirmedId] : undefined;
  const pending = conversation.pendingId ? conversation.proposals[conversation.pendingId] : undefined;
  const nameFor = (person: Participant) => person === 'buyer' ? 'Buyer' : seller;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const accept = (proposal: MeetupProposal, currentTime: number) => {
    setNow(currentTime);
    if (proposal.startsAt <= currentTime) {
      setNotice('That time has passed. Suggest a new date and time.');
      return;
    }
    setNotice('');
    onAction({ type: 'accept', proposalId: proposal.id, actor: viewer, now: currentTime });
  };

  const sendMessage = () => {
    if (!drafts[viewer].trim()) return;
    onSendMessage(viewer, drafts[viewer].trim());
    setDrafts(previous => ({ ...previous, [viewer]: '' }));
  };

  const renderProposal = (proposal: MeetupProposal) => {
    const isPending = proposal.status === 'pending' && conversation.pendingId === proposal.id;
    const isExpired = isPending && proposal.startsAt <= now;
    const ownProposal = proposal.from === viewer;
    const isConfirmed = proposal.status === 'accepted' && conversation.confirmedId === proposal.id;
    const status = isExpired ? 'Time has passed' : isPending ? 'Awaiting response' :
      isConfirmed ? 'Confirmed' : proposal.status === 'withdrawn' ? 'Withdrawn' : 'Replaced';
    return (
      <View style={[styles.meetupCard, isConfirmed && styles.confirmedCard]}>
        <View style={styles.cardHeading}>
          <Text style={styles.cardEyebrow}>MEETUP PROPOSAL</Text>
          <Text style={[styles.badge, isConfirmed && styles.confirmedBadge]}>{status}</Text>
        </View>
        <Text style={styles.proposedBy}>{ownProposal ? 'You' : nameFor(proposal.from)} proposed</Text>
        <Text style={styles.meetupLocation}>{locationLabel(proposal.details.locationId)}</Text>
        <Text style={styles.meetupTime}>{formatMeetupDateTime(proposal.startsAt)}</Text>
        {isPending ? (
          <>
            {ownProposal ? (
              <Text style={styles.waiting}>
                {isExpired ? 'Choose a future time to arrange this meetup.' : `Waiting for ${viewer === 'buyer' ? seller.split(' ')[0] : 'the buyer'} to respond.`}
              </Text>
            ) : null}
            <View style={styles.cardActions}>
              {!ownProposal && !isExpired ? (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Accept meetup"
                  style={styles.acceptButton} onPress={() => accept(proposal, Date.now())}>
                  <Text style={styles.acceptText}>Accept meetup</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={ownProposal ? 'Edit meetup proposal' : 'Suggest a meetup change'}
                style={styles.outlineButton} onPress={() => { setNotice(''); setForm({ initial: proposal }); }}>
                <Text style={styles.outlineText}>{ownProposal ? 'Edit proposal' : 'Suggest change'}</Text>
              </TouchableOpacity>
              {ownProposal ? (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Withdraw meetup proposal"
                  style={styles.withdrawButton} onPress={() => {
                    setNotice('');
                    onAction({ type: 'withdraw', proposalId: proposal.id, actor: viewer });
                  }}>
                  <Text style={styles.withdrawText}>Withdraw</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        ) : null}
      </View>
    );
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

      {/* This is intentionally outside the ScrollView: the agreed plan stays pinned. */}
      {confirmed ? (
        <View accessibilityLabel="Pinned confirmed meetup" style={styles.pin}>
          <View style={styles.pinHeader}>
            <Text style={styles.pinEyebrow}>⌖  CONFIRMED MEETUP</Text>
            {!pending ? (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Change confirmed meetup"
                style={styles.pinChange} onPress={() => { setNotice(''); setForm({ initial: confirmed }); }}>
                <Text style={styles.pinChangeText}>Change</Text>
              </TouchableOpacity>
            ) : <Text style={styles.changePending}>Change pending</Text>}
          </View>
          <Text style={styles.pinLocation}>{locationLabel(confirmed.details.locationId)}</Text>
          <Text style={styles.pinTime}>{formatMeetupDateTime(confirmed.startsAt)}</Text>
          {pending ? <Text style={styles.pinHint}>This plan stays confirmed until the new proposal is accepted.</Text> : null}
        </View>
      ) : null}

      {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
      <ScrollView ref={scroll} style={styles.flex} contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        <Text style={styles.conversationLabel}>YOUR CONVERSATION</Text>
        {conversation.messages.map(message => {
          if (message.type === 'event') {
            return <Text key={message.id} style={styles.event}>{message.text}</Text>;
          }
          if (message.type === 'meetup') {
            const proposal = conversation.proposals[message.proposalId];
            return proposal ? <View key={message.id}>{renderProposal(proposal)}</View> : null;
          }
          const mine = message.from === viewer;
          return (
            <View key={message.id} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleSender, mine && styles.lightSender]}>{mine ? 'You' : nameFor(message.from)}</Text>
              <Text style={[styles.bubbleText, mine && styles.lightText]}>{message.text}</Text>
            </View>
          );
        })}
        {!confirmed && !pending ? (
          <View style={styles.emptyHint}>
            <Text style={styles.emptyTitle}>Make a plan to meet</Text>
            <Text style={styles.emptyText}>Propose a public campus spot and a time. Once accepted, your plan stays pinned here.</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.composer}>
        <View style={styles.toolbar}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !!pending }}
            disabled={!!pending} style={[styles.scheduleButton, !!pending && styles.disabled]}
            onPress={() => { setNotice(''); setForm(confirmed ? { initial: confirmed } : {}); }}>
            <Text style={styles.scheduleText}>{pending ? 'Proposal pending' : confirmed ? 'Change meetup' : '+ Propose meetup'}</Text>
          </TouchableOpacity>
          {viewer === 'buyer' ? (
            <TouchableOpacity accessibilityRole="button" style={styles.completeButton} onPress={onComplete}>
              <Text style={styles.completeText}>Trade complete →</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.inputRow}>
          <TextInput accessibilityLabel={`Message as ${viewer}`} style={styles.messageInput}
            placeholder={`Message as ${viewer}…`} placeholderTextColor="#89756D"
            value={drafts[viewer]} maxLength={1000} returnKeyType="send" onSubmitEditing={sendMessage}
            onChangeText={text => setDrafts(previous => ({ ...previous, [viewer]: text }))} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Send message"
            accessibilityState={{ disabled: !drafts[viewer].trim() }} disabled={!drafts[viewer].trim()}
            style={[styles.send, !drafts[viewer].trim() && styles.disabled]} onPress={sendMessage}>
            <Text style={styles.sendText}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>

      {form ? <MeetupForm initial={form.initial?.details} isChange={!!form.initial} onClose={() => setForm(null)}
        onSubmit={details => {
          onAction({ type: 'propose', id: chatId(), from: viewer, details, now: Date.now(), replacesId: form.initial?.id });
          setNotice('');
          setForm(null);
        }} /> : null}
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
  pin: { backgroundColor: '#EAF2EB', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#CDDFD1' },
  pinHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 },
  pinEyebrow: { color: '#2C6640', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  pinChange: { minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' },
  pinChangeText: { fontSize: 12, fontWeight: '700', color: '#2C6640' },
  changePending: { fontSize: 11, color: '#5F714F', fontWeight: '600' },
  pinLocation: { fontSize: 13, color: '#203E2A', fontWeight: '700' },
  pinTime: { fontSize: 12, color: '#395544', marginTop: 4 },
  pinHint: { fontSize: 10, color: '#5B6D60', marginTop: 5 },
  notice: { backgroundColor: '#FBE6DF', color: '#962D16', padding: 10, fontSize: 12 },
  messages: { padding: 16, paddingBottom: 20 },
  conversationLabel: { fontSize: 9, letterSpacing: 1.2, color: '#89756D', textAlign: 'center', marginBottom: 18, fontWeight: '700' },
  bubble: { maxWidth: '86%', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 16, marginBottom: 10 },
  bubbleMine: { backgroundColor: '#7A1B3A', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#E6D9CE', borderBottomLeftRadius: 4 },
  bubbleSender: { fontSize: 10, fontWeight: '700', color: '#89756D', marginBottom: 4 },
  lightSender: { color: '#E4B9C9' },
  bubbleText: { fontSize: 14, lineHeight: 20, color: '#231512' },
  lightText: { color: '#fff' },
  meetupCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9BEC9', borderRadius: 16, padding: 15, marginVertical: 8 },
  confirmedCard: { borderColor: '#BFD3C4' },
  cardHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardEyebrow: { fontSize: 9, letterSpacing: 1, color: '#7A1B3A', fontWeight: '800' },
  badge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3ECE6', color: '#6A5750', fontSize: 10, fontWeight: '700' },
  confirmedBadge: { color: '#2C6640', backgroundColor: '#EAF2EB' },
  proposedBy: { fontSize: 11, color: '#89756D', marginTop: 8, marginBottom: 8 },
  meetupLocation: { fontSize: 15, color: '#321D25', fontWeight: '700', lineHeight: 21 },
  meetupTime: { fontSize: 13, color: '#6A5750', marginTop: 6, lineHeight: 19 },
  waiting: { fontSize: 12, color: '#89756D', marginTop: 12, lineHeight: 17 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  acceptButton: { flexGrow: 1, minHeight: 44, paddingHorizontal: 12, backgroundColor: '#7A1B3A', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  acceptText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  outlineButton: { flexGrow: 1, minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D9BEC9', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  outlineText: { color: '#7A1B3A', fontSize: 13, fontWeight: '700' },
  withdrawButton: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  withdrawText: { color: '#89756D', fontSize: 12, fontWeight: '600' },
  event: { textAlign: 'center', fontSize: 11, lineHeight: 17, color: '#6A5750', marginHorizontal: 20, marginVertical: 12 },
  emptyHint: { marginTop: 16, borderRadius: 14, padding: 16, backgroundColor: '#F2ECE4' },
  emptyTitle: { color: '#6A5750', fontSize: 13, fontWeight: '700' },
  emptyText: { color: '#89756D', fontSize: 12, lineHeight: 18, marginTop: 5 },
  composer: { backgroundColor: '#FBF6F1', borderTopWidth: 1, borderTopColor: '#E6D9CE', paddingHorizontal: 14, paddingBottom: 10 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 6, flexWrap: 'wrap' },
  scheduleButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#F2E0D1', justifyContent: 'center' },
  scheduleText: { fontSize: 12, color: '#713418', fontWeight: '700' },
  completeButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  completeText: { fontSize: 11, fontWeight: '600', color: '#6A5750' },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  messageInput: { flex: 1, minHeight: 46, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6D9CE', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#231512' },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#7A1B3A', justifyContent: 'center', alignItems: 'center' },
  sendText: { color: '#fff', fontSize: 25, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
