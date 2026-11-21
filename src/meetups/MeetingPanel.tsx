import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatMeetupDateTime, locationLabel } from './model';
import { participantName, proposalStatusText } from './meetingView';
import type { MeetingView } from './meetingView';
import type { Conversation, MeetupProposal, Participant } from './model';

type Props = {
  conversation: Conversation;
  view: MeetingView;
  viewer: Participant;
  seller: string;
  now: number;
  onPropose: () => void;
  onChange: (proposal: MeetupProposal) => void;
  onAccept: (proposal: MeetupProposal) => void;
  onWithdraw: (proposal: MeetupProposal) => void;
};

/**
 * The canonical surface for meetup logistics. The confirmed plan comes first so
 * it is visible without scrolling; the pending change is described separately
 * because the confirmed plan stays in effect until it is accepted.
 */
export default function MeetingPanel({
  conversation, view, viewer, seller, now, onPropose, onChange, onAccept, onWithdraw,
}: Props) {
  const { confirmed, pending } = view;
  const isOwnPending = Boolean(pending && pending.from === viewer);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {confirmed ? (
        <View style={styles.confirmedCard}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.confirmedEyebrow}>CURRENT AGREEMENT</Text>
            <Text accessibilityLiveRegion="polite" style={styles.confirmedStatus}>Confirmed</Text>
          </View>
          <Text style={styles.location}>{locationLabel(confirmed.details.locationId)}</Text>
          <Text style={styles.time}>{formatMeetupDateTime(confirmed.startsAt)}</Text>
          {view.isConfirmedPast ? (
            <Text accessibilityRole="alert" style={styles.pastNotice}>
              Time has passed. You can still propose a new meetup.
            </Text>
          ) : null}
          {pending ? (
            <Text style={styles.hint}>
              This plan stays confirmed until the pending change is accepted.
            </Text>
          ) : null}
        </View>
      ) : null}

      {pending ? (
        <View style={[styles.pendingCard, view.needsAction && styles.pendingAction]}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>
              {isOwnPending ? 'YOUR PROPOSAL' : `PROPOSAL FROM ${participantName(pending.from, seller).toUpperCase()}`}
            </Text>
            <Text accessibilityLiveRegion="polite" style={styles.badge}>
              {proposalStatusText(pending, conversation, now)}
            </Text>
          </View>
          <Text style={styles.proposedBy}>
            {isOwnPending ? 'You proposed' : `${participantName(pending.from, seller)} proposed`}
          </Text>
          <Text style={styles.location}>{locationLabel(pending.details.locationId)}</Text>
          <Text style={styles.time}>{formatMeetupDateTime(pending.startsAt)}</Text>

          {view.needsAction ? (
            <Text style={styles.actionNeeded}>Action needed — review this proposal and respond.</Text>
          ) : null}
          {view.isPendingPast ? (
            <Text accessibilityRole="alert" style={styles.pastNotice}>
              Time has passed. Accept is unavailable; suggest a new time instead.
            </Text>
          ) : null}
          {isOwnPending && !view.isPendingPast ? (
            <Text style={styles.hint}>
              Awaiting response from {viewer === 'buyer' ? seller.split(' ')[0] : 'the buyer'}.
            </Text>
          ) : null}

          <View style={styles.actions}>
            {view.canAccept ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Accept meetup proposal"
                style={styles.primarySmall}
                onPress={() => onAccept(pending)}>
                <Text style={styles.primarySmallText}>Accept meetup</Text>
              </TouchableOpacity>
            ) : null}
            {view.canSuggestChange || view.canEdit ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={isOwnPending ? 'Edit meetup proposal' : 'Suggest a meetup change'}
                style={styles.outline}
                onPress={() => onChange(pending)}>
                <Text style={styles.outlineText}>{isOwnPending ? 'Edit proposal' : 'Suggest change'}</Text>
              </TouchableOpacity>
            ) : null}
            {view.canWithdraw ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Withdraw meetup proposal"
                style={styles.withdraw}
                onPress={() => onWithdraw(pending)}>
                <Text style={styles.withdrawText}>Withdraw</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      {!confirmed && !pending ? (
        <View style={styles.empty}>
          <Text accessibilityRole="header" style={styles.emptyTitle}>No meetup planned yet</Text>
          <Text style={styles.emptyText}>
            Agree on a public campus spot and a time. Your plan is confirmed once
            the other person accepts, and then it is always one tap away.
          </Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        {view.pending ? (
          <>
            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel="Propose meetup, unavailable because a proposal is already pending"
              accessibilityState={{ disabled: true }}
              style={[styles.primary, styles.primaryDisabled]}>
              <Text style={[styles.primaryText, styles.primaryTextDisabled]}>
                {view.confirmed ? 'Change meetup' : 'Propose meetup'}
              </Text>
            </View>
            <Text style={styles.footerHint}>
              A proposal is already pending. Edit it or wait for a response before proposing again.
            </Text>
          </>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: false }}
            style={styles.primary}
            onPress={() => (confirmed ? onChange(confirmed) : onPropose())}>
            <Text style={styles.primaryText}>
              {confirmed ? 'Change meetup' : 'Propose meetup'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  confirmedCard: { backgroundColor: '#EAF2EB', borderWidth: 1, borderColor: '#CDDFD1', borderRadius: 16, padding: 16 },
  confirmedEyebrow: { color: '#2C6640', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  confirmedStatus: { color: '#2C6640', fontSize: 11, fontWeight: '800' },
  pendingCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9BEC9', borderRadius: 16, padding: 16 },
  pendingAction: { borderColor: '#E5751F' },
  eyebrow: { fontSize: 9, letterSpacing: 1, color: '#7A1B3A', fontWeight: '800', flexShrink: 1 },
  badge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3ECE6', color: '#6A5750', fontSize: 10, fontWeight: '700' },
  proposedBy: { fontSize: 11, color: '#89756D', marginTop: 8, marginBottom: 8 },
  location: { fontSize: 16, color: '#321D25', fontWeight: '700', lineHeight: 22 },
  time: { fontSize: 13, color: '#6A5750', marginTop: 6, lineHeight: 19 },
  pastNotice: { marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: '#FBE6DF', color: '#962D16', fontSize: 12, lineHeight: 17 },
  actionNeeded: { marginTop: 10, color: '#8A4B0F', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  hint: { fontSize: 11, color: '#6A5750', marginTop: 10, lineHeight: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  primarySmall: { flexGrow: 1, minHeight: 44, paddingHorizontal: 14, backgroundColor: '#7A1B3A', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  primarySmallText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  outline: { flexGrow: 1, minHeight: 44, paddingHorizontal: 14, borderWidth: 1, borderColor: '#D9BEC9', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  outlineText: { color: '#7A1B3A', fontSize: 13, fontWeight: '700' },
  withdraw: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  withdrawText: { color: '#89756D', fontSize: 12, fontWeight: '600' },
  empty: { backgroundColor: '#F2ECE4', borderRadius: 16, padding: 18 },
  emptyTitle: { color: '#3A1725', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#6A5750', fontSize: 13, lineHeight: 19, marginTop: 8 },
  footer: { gap: 8 },
  primary: { minHeight: 50, borderRadius: 12, backgroundColor: '#7A1B3A', justifyContent: 'center', alignItems: 'center' },
  primaryDisabled: { backgroundColor: '#EDE2D8' },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  primaryTextDisabled: { color: '#6A5750' },
  footerHint: { color: '#6A5750', fontSize: 12, lineHeight: 17 },
});
