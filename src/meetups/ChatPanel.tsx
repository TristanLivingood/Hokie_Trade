import React, { useRef } from 'react';
import {
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import MeetupCard from './MeetupCard';
import { participantName } from './meetingView';
import type { Conversation, Participant } from './model';

type Props = {
  conversation: Conversation;
  viewer: Participant;
  seller: string;
  draft: string;
  now: number;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
  onViewMeeting: () => void;
  onComplete: () => void;
};

/** Message timeline, read-only meetup records, and the composer. */
export default function ChatPanel({
  conversation, viewer, seller, draft, now, onChangeDraft, onSend, onViewMeeting, onComplete,
}: Props) {
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const hasPlan = Boolean(conversation.confirmedId || conversation.pendingId);
  const canSend = Boolean(draft.trim());

  return (
    <View style={styles.flex}>
      <ScrollView
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        <Text style={styles.conversationLabel}>YOUR CONVERSATION</Text>
        {conversation.messages.map(message => {
          if (message.type === 'event') {
            return <Text key={message.id} style={styles.event}>{message.text}</Text>;
          }
          if (message.type === 'meetup') {
            const proposal = conversation.proposals[message.proposalId];
            return proposal ? (
              <MeetupCard
                key={message.id}
                proposal={proposal}
                conversation={conversation}
                viewer={viewer}
                seller={seller}
                now={now}
                onViewMeeting={onViewMeeting}
              />
            ) : null;
          }
          const mine = message.from === viewer;
          return (
            <View key={message.id} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleSender, mine && styles.lightSender]}>
                {mine ? 'You' : participantName(message.from, seller)}
              </Text>
              <Text style={[styles.bubbleText, mine && styles.lightText]}>{message.text}</Text>
            </View>
          );
        })}
        {!hasPlan ? (
          <View style={styles.emptyHint}>
            <Text style={styles.emptyTitle}>Make a plan to meet</Text>
            <Text style={styles.emptyText}>
              Open the Meeting tab to propose a public campus spot and a time.
              Once accepted, your plan is always one tap away.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open the Meeting tab"
              style={styles.emptyButton}
              onPress={onViewMeeting}>
              <Text style={styles.emptyButtonText}>Go to Meeting</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.composer}>
        {viewer === 'buyer' ? (
          <View style={styles.toolbar}>
            <TouchableOpacity accessibilityRole="button" style={styles.completeButton} onPress={onComplete}>
              <Text style={styles.completeText}>Trade complete →</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.inputRow}>
          <TextInput
            accessibilityLabel={`Message as ${viewer}`}
            style={styles.messageInput}
            placeholder={`Message as ${viewer}…`}
            placeholderTextColor="#89756D"
            value={draft}
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={onSend}
            onChangeText={onChangeDraft}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            style={[styles.send, !canSend && styles.disabled]}
            onPress={onSend}>
            <Text style={styles.sendText}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  messages: { padding: 16, paddingBottom: 20 },
  conversationLabel: { fontSize: 9, letterSpacing: 1.2, color: '#89756D', textAlign: 'center', marginBottom: 18, fontWeight: '700' },
  bubble: { maxWidth: '86%', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 16, marginBottom: 10 },
  bubbleMine: { backgroundColor: '#7A1B3A', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#E6D9CE', borderBottomLeftRadius: 4 },
  bubbleSender: { fontSize: 10, fontWeight: '700', color: '#89756D', marginBottom: 4 },
  lightSender: { color: '#E4B9C9' },
  bubbleText: { fontSize: 14, lineHeight: 20, color: '#231512' },
  lightText: { color: '#fff' },
  event: { textAlign: 'center', fontSize: 11, lineHeight: 17, color: '#6A5750', marginHorizontal: 20, marginVertical: 12 },
  emptyHint: { marginTop: 16, borderRadius: 14, padding: 16, backgroundColor: '#F2ECE4' },
  emptyTitle: { color: '#6A5750', fontSize: 13, fontWeight: '700' },
  emptyText: { color: '#89756D', fontSize: 12, lineHeight: 18, marginTop: 5 },
  emptyButton: { minHeight: 44, justifyContent: 'center', marginTop: 10 },
  emptyButtonText: { color: '#7A1B3A', fontSize: 12, fontWeight: '700' },
  composer: { backgroundColor: '#FBF6F1', borderTopWidth: 1, borderTopColor: '#E6D9CE', paddingHorizontal: 14, paddingBottom: 10 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingVertical: 6, flexWrap: 'wrap' },
  completeButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  completeText: { fontSize: 11, fontWeight: '600', color: '#6A5750' },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  messageInput: { flex: 1, minHeight: 46, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6D9CE', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#231512' },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#7A1B3A', justifyContent: 'center', alignItems: 'center' },
  sendText: { color: '#fff', fontSize: 25, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
