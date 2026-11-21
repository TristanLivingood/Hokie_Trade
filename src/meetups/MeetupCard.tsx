import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatMeetupDateTime, locationLabel } from './model';
import { participantName, proposalStatusText } from './meetingView';
import type { Conversation, MeetupProposal, Participant } from './model';

type Props = {
  proposal: MeetupProposal;
  conversation: Conversation;
  viewer: Participant;
  seller: string;
  now: number;
  onViewMeeting: () => void;
};

/**
 * Read-only record of a proposal in the Chat timeline. Mutating actions live in
 * the Meeting tab so every meetup action has exactly one home (ADR-0001).
 */
export default function MeetupCard({ proposal, conversation, viewer, seller, now, onViewMeeting }: Props) {
  const status = proposalStatusText(proposal, conversation, now);
  const isConfirmed = status === 'Confirmed';
  const isOwn = proposal.from === viewer;

  return (
    <View style={[styles.card, isConfirmed && styles.confirmedCard]}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>MEETUP PROPOSAL</Text>
        <Text style={[styles.badge, isConfirmed && styles.confirmedBadge]}>{status}</Text>
      </View>
      <Text style={styles.proposedBy}>
        {isOwn ? 'You' : participantName(proposal.from, seller)} proposed
      </Text>
      <Text style={styles.location}>{locationLabel(proposal.details.locationId)}</Text>
      <Text style={styles.time}>{formatMeetupDateTime(proposal.startsAt)}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="View meetup in the Meeting tab"
        style={styles.link}
        onPress={onViewMeeting}>
        <Text style={styles.linkText}>View in Meeting →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9BEC9', borderRadius: 16, padding: 15, marginVertical: 8 },
  confirmedCard: { borderColor: '#BFD3C4' },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  eyebrow: { fontSize: 9, letterSpacing: 1, color: '#7A1B3A', fontWeight: '800' },
  badge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3ECE6', color: '#6A5750', fontSize: 10, fontWeight: '700' },
  confirmedBadge: { color: '#2C6640', backgroundColor: '#EAF2EB' },
  proposedBy: { fontSize: 11, color: '#89756D', marginTop: 8, marginBottom: 8 },
  location: { fontSize: 15, color: '#321D25', fontWeight: '700', lineHeight: 21 },
  time: { fontSize: 13, color: '#6A5750', marginTop: 6, lineHeight: 19 },
  link: { minHeight: 44, justifyContent: 'center', marginTop: 6 },
  linkText: { color: '#7A1B3A', fontSize: 12, fontWeight: '700' },
});
