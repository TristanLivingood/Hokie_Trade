import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { CAMPUS_LOCATIONS, campusDate, validateMeetup } from './model';
import type { MeetupDetails } from './model';

type Props = {
  initial?: MeetupDetails;
  isChange: boolean;
  onClose: () => void;
  onSubmit: (details: MeetupDetails) => void;
};

/** Mounted only while open, so a cancelled draft never overwrites a proposal. */
export default function MeetupForm({ initial, isChange, onClose, onSubmit }: Props) {
  const [openedAt] = useState(() => Date.now());
  const [locationId, setLocationId] = useState(initial?.locationId ?? 'newman');
  const [date, setDate] = useState(initial?.date ?? campusDate(openedAt, 1));
  const [time, setTime] = useState(initial?.time ?? '15:00');
  const [error, setError] = useState('');

  const submit = () => {
    const result = validateMeetup({ locationId, date, time });
    if (!result.valid) {
      setError(result.error);
      return;
    }
    if (initial && initial.locationId === result.details.locationId &&
        initial.date === result.details.date && initial.time === result.details.time) {
      setError('Change the location, date, or time before sending a new proposal.');
      return;
    }
    onSubmit(result.details);
  };

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.surface}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.header}>
            <View style={styles.flex}>
              <Text accessibilityRole="header" style={styles.title}>
                {isChange ? 'Suggest a change' : 'Propose a meetup'}
              </Text>
              <Text style={styles.subtitle}>Find a time that works for both of you.</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close meetup form"
              style={styles.close} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>CAMPUS LOCATION</Text>
            {CAMPUS_LOCATIONS.map(location => (
              <TouchableOpacity key={location.id} accessibilityRole="radio"
                accessibilityState={{ checked: locationId === location.id }}
                accessibilityLabel={`${location.name}, ${location.detail}`}
                style={[styles.location, locationId === location.id && styles.locationSelected]}
                onPress={() => { setLocationId(location.id); setError(''); }}>
                <View style={styles.flex}>
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.secondary}>{location.detail}</Text>
                </View>
                <Text style={styles.selection}>{locationId === location.id ? '●' : '○'}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.hint}>Meet in a public area during open hours.</Text>

            <Text style={[styles.label, styles.section]}>DATE</Text>
            <View style={styles.chips}>
              {['Today', 'Tomorrow', 'In 2 days'].map((label, offset) => {
                const value = campusDate(openedAt, offset);
                return (
                  <TouchableOpacity key={label} accessibilityRole="button"
                    accessibilityState={{ selected: date === value }}
                    style={[styles.chip, date === value && styles.chipSelected]}
                    onPress={() => { setDate(value); setError(''); }}>
                    <Text style={[styles.chipText, date === value && styles.chipTextSelected]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput accessibilityLabel="Meetup date, YYYY-MM-DD" style={styles.input}
              value={date} placeholder="YYYY-MM-DD" placeholderTextColor="#89756D" maxLength={10}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              autoCorrect={false} onChangeText={value => { setDate(value); setError(''); }} />
            <Text style={styles.hint}>Year-month-day, for example 2026-11-05</Text>

            <Text style={[styles.label, styles.section]}>TIME · EASTERN (BLACKSBURG)</Text>
            <TextInput accessibilityLabel="Meetup time, 24-hour HH:MM" style={styles.input}
              value={time} placeholder="15:00" placeholderTextColor="#89756D" maxLength={5}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              autoCorrect={false} onChangeText={value => { setTime(value); setError(''); }} />
            <Text style={styles.hint}>24-hour time: 09:00 = 9 AM · 15:30 = 3:30 PM</Text>

            {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
            <View style={styles.note}>
              <Text style={styles.noteText}>The other person will accept or suggest a change. Your meetup is confirmed only after acceptance.</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={submit}>
              <Text style={styles.primaryText}>{isChange ? 'Send new proposal' : 'Send proposal'}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  surface: { flex: 1, backgroundColor: '#FBF6F1' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E6D9CE', gap: 8 },
  title: { fontSize: 23, fontWeight: '800', color: '#3A1725' },
  subtitle: { fontSize: 13, color: '#6A5750', marginTop: 5 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 22, color: '#7A1B3A' },
  content: { padding: 20, paddingBottom: 32 },
  label: { fontSize: 12, letterSpacing: 1, fontWeight: '800', color: '#6A5750', marginBottom: 10 },
  section: { marginTop: 24 },
  location: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6D9CE', borderRadius: 12, padding: 14, marginBottom: 8 },
  locationSelected: { borderColor: '#7A1B3A', backgroundColor: '#F5E8EE' },
  locationName: { fontSize: 15, fontWeight: '700', color: '#231512' },
  secondary: { fontSize: 13, color: '#6A5750', marginTop: 3 },
  selection: { fontSize: 24, color: '#7A1B3A', marginLeft: 12 },
  hint: { color: '#6A5750', fontSize: 12, lineHeight: 18, marginTop: 5 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: '#D6C3BA', justifyContent: 'center', backgroundColor: '#fff' },
  chipSelected: { backgroundColor: '#7A1B3A', borderColor: '#7A1B3A' },
  chipText: { fontWeight: '600', color: '#6A5750', fontSize: 13 },
  chipTextSelected: { color: '#fff' },
  input: { minHeight: 50, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D6C3BA', paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: '#231512' },
  error: { padding: 12, backgroundColor: '#FBE6DF', borderRadius: 10, color: '#962D16', marginTop: 16, lineHeight: 20, fontSize: 14 },
  note: { padding: 12, backgroundColor: '#F2ECE4', borderRadius: 10, marginTop: 20 },
  noteText: { color: '#6A5750', fontSize: 13, lineHeight: 19 },
  primary: { minHeight: 50, borderRadius: 12, backgroundColor: '#7A1B3A', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6A5750' },
});
