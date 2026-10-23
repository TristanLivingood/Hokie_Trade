import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TextInput,
  TouchableOpacity, ScrollView,
} from 'react-native';
import MeetupChat, { chatId } from './src/meetups/MeetupChat';
import { conversationReducer, createConversation } from './src/meetups/model';
import type { Conversation, ConversationAction, Participant } from './src/meetups/model';

type Listing = {
  id: number;
  emoji: string;
  title: string;
  course: string;
  price: number;
  seller: string;
  desc: string;
};

const listings: Listing[] = [
  { id: 0, emoji: '📘', title: 'CS 3704 Software Engineering Textbook', course: 'CS 3704', price: 45, seller: 'Jordan Carter', desc: 'Used one semester, no highlighting, matches current edition.' },
  { id: 1, emoji: '🛋️', title: 'Mini Fridge — dorm size', course: '', price: 60, seller: 'Maria Lopez', desc: '3.2 cu ft, barely used, pickup near West AJ.' },
  { id: 2, emoji: '📐', title: 'MATH 2114 Notes + Old Exams', course: 'MATH 2114', price: 15, seller: 'Sam Patel', desc: 'Full semester of notes plus two practice exams, PDF delivery.' },
];

type Screen = 'login' | 'verify' | 'browse' | 'detail' | 'thread' | 'rating';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [activeListing, setActiveListing] = useState<Listing | null>(null);
  const [conversations, setConversations] = useState<Record<number, Conversation>>(() =>
    Object.fromEntries(listings.map(listing => [listing.id, createConversation()]))
  );
  const replyTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [rating, setRating] = useState(0);

  useEffect(() => {
    const timers = replyTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const updateConversation = (listingId: number, action: ConversationAction) => {
    setConversations(previous => ({
      ...previous,
      [listingId]: conversationReducer(previous[listingId], action),
    }));
  };

  const filtered = listings.filter(l =>
    !query ||
    l.course.toLowerCase().includes(query.toLowerCase()) ||
    l.title.toLowerCase().includes(query.toLowerCase())
  );

  const openListing = (l: Listing) => {
    setActiveListing(l);
    setScreen('detail');
  };

  const sendMessage = (listingId: number, from: Participant, text: string) => {
    updateConversation(listingId, { type: 'message', id: chatId(), from, text });
    if (from !== 'buyer') return;
    // Capture the listing and sender now. Navigating to another chat or
    // switching demo roles must never redirect this scripted reply.
    const timer = setTimeout(() => {
      updateConversation(listingId, {
        type: 'message', id: chatId(), from: 'seller',
        text: 'Thanks! Use a meetup proposal to confirm a place and time.',
      });
      replyTimers.current.delete(timer);
    }, 600);
    replyTimers.current.add(timer);
  };

  const handleSendCode = () => {
    if (!email.toLowerCase().endsWith('@vt.edu')) {
      setEmailError('Enter a VT email ending in @vt.edu to get a code.');
      return;
    }
    setEmailError('');
    setScreen('verify');
  };

  // ---------- LOGIN ----------
  if (screen === 'login') {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <View style={styles.hero}>
          <Text style={styles.wordmark}>Hokie<Text style={{ color: '#F2A65A' }}>Trade</Text></Text>
          <Text style={styles.tagline}>Buy, sell, and trade with verified VT students.</Text>

          <Text style={styles.fieldLabel}>VT Email</Text>
          <TextInput
            style={[styles.field, emailError ? styles.fieldError : null]}
            placeholder="yourname@vt.edu"
            placeholderTextColor="#D9B9A6"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(''); }}
          />
          <Text style={styles.hint}>Must end in @vt.edu — that’s how we verify you’re a Hokie.</Text>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          <TouchableOpacity style={styles.btn} onPress={handleSendCode}>
            <Text style={styles.btnText}>Send code</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------- VERIFY CODE ----------
  if (screen === 'verify') {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <View style={styles.hero}>
          <Text style={styles.wordmark}>Check your inbox</Text>
          <Text style={styles.tagline}>We sent a 6-digit code to {email}.</Text>
          <Text style={styles.fieldLabel}>Verification code</Text>
          <TextInput
            style={styles.field}
            placeholder="123456"
            placeholderTextColor="#D9B9A6"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            maxLength={6}
          />
          <TouchableOpacity style={styles.btn} onPress={() => setScreen('browse')}>
            <Text style={styles.btnText}>Verify</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen('login')}>
            <Text style={styles.linkText}>← Use a different email</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------- BROWSE ----------
  if (screen === 'browse') {
    return (
      <SafeAreaView style={styles.browseContainer}>
        <View style={styles.topbar}>
          <Text style={styles.wordmarkSmall}>Hokie<Text style={{ color: '#F2A65A' }}>Trade</Text></Text>
        </View>
        <View style={{ padding: 20, flex: 1 }}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search course number, e.g. CS 3704"
            value={query}
            onChangeText={setQuery}
          />
          <ScrollView style={{ marginTop: 16 }}>
            {filtered.map(l => (
              <TouchableOpacity key={l.id} style={styles.card} onPress={() => openListing(l)}>
                <Text style={{ fontSize: 28 }}>{l.emoji}</Text>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.cardTitle}>{l.title}</Text>
                  <Text style={styles.cardMeta}>{l.seller}</Text>
                  <Text style={styles.cardPrice}>${l.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // ---------- DETAIL ----------
  if (screen === 'detail' && activeListing) {
    return (
      <SafeAreaView style={styles.browseContainer}>
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => setScreen('browse')}>
            <Text style={styles.backArrow}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 64, textAlign: 'center', marginBottom: 16 }}>{activeListing.emoji}</Text>
          <Text style={styles.detailTitle}>{activeListing.title}</Text>
          <Text style={styles.detailPrice}>${activeListing.price}</Text>
          <Text style={styles.detailDesc}>{activeListing.desc}</Text>
          <View style={styles.sellerRow}>
            <View style={styles.avatar}>
              <Text style={{ color: '#FBF6F1', fontWeight: '800' }}>
                {activeListing.seller.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontWeight: '700' }}>{activeListing.seller}</Text>
              <Text style={{ color: '#6A5750', fontSize: 13 }}>✓ Verified @vt.edu</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.btn} onPress={() => setScreen('thread')}>
            <Text style={styles.btnText}>Contact Seller</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------- MESSAGE THREAD ----------
  if (screen === 'thread' && activeListing) {
    const listingId = activeListing.id;
    return (
      <SafeAreaView style={styles.browseContainer}>
        <MeetupChat
          key={listingId}
          seller={activeListing.seller}
          listingTitle={activeListing.title}
          conversation={conversations[listingId]}
          onAction={action => updateConversation(listingId, action)}
          onSendMessage={(from, text) => sendMessage(listingId, from, text)}
          onBack={() => setScreen('detail')}
          onComplete={() => { setRating(0); setScreen('rating'); }}
        />
      </SafeAreaView>
    );
  }

  // ---------- RATING ----------
  if (screen === 'rating' && activeListing) {
    return (
      <SafeAreaView style={styles.browseContainer}>
        <View style={styles.topbar}>
          <Text style={styles.wordmarkSmall}>Rate your trade</Text>
        </View>
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ fontWeight: '700', marginTop: 20 }}>
            How was your trade with {activeListing.seller}?
          </Text>
          <View style={{ flexDirection: 'row', marginVertical: 20 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => setRating(n)}>
                <Text style={{ fontSize: 36, color: n <= rating ? '#F2A65A' : '#E6D9CE' }}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.btn} onPress={() => setScreen('browse')}>
            <Text style={styles.btnText}>Submit Rating</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, backgroundColor: '#7A1B3A' },
  hero: { flex: 1, justifyContent: 'center', padding: 32, gap: 6 },
  wordmark: { fontSize: 34, fontWeight: '800', color: '#FBF6F1', marginBottom: 4 },
  wordmarkSmall: { fontSize: 20, fontWeight: '800', color: '#FBF6F1' },
  tagline: { fontSize: 15, color: '#F0DCC9', marginBottom: 18 },
  fieldLabel: { fontSize: 13, color: '#F0DCC9', marginBottom: 6 },
  field: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    padding: 14,
    color: '#FBF6F1',
    fontSize: 16,
  },
  fieldError: { borderColor: '#E5751F' },
  hint: { fontSize: 12, color: '#D9B9A6', marginTop: 6 },
  errorText: { fontSize: 12, color: '#F2A65A', marginTop: 6, fontWeight: '700' },
  btn: { backgroundColor: '#E5751F', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 18 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkText: { color: '#F0DCC9', fontSize: 13, textAlign: 'center', marginTop: 16 },
  browseContainer: { flex: 1, backgroundColor: '#FBF6F1' },
  topbar: { backgroundColor: '#7A1B3A', padding: 20 },
  backArrow: { color: '#FBF6F1', fontWeight: '700' },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6D9CE', borderRadius: 12, padding: 14, fontSize: 15 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6D9CE', borderRadius: 16, padding: 14, marginBottom: 12, alignItems: 'center' },
  cardTitle: { fontWeight: '700', fontSize: 15 },
  cardMeta: { color: '#6A5750', fontSize: 13, marginTop: 2 },
  cardPrice: { color: '#7A1B3A', fontWeight: '800', fontSize: 15, marginTop: 4 },
  detailTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  detailPrice: { fontSize: 22, fontWeight: '800', color: '#7A1B3A', marginBottom: 12 },
  detailDesc: { fontSize: 15, color: '#3A2A26', lineHeight: 22, marginBottom: 16 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6D9CE', borderRadius: 14, padding: 14, marginBottom: 20 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7A1B3A', alignItems: 'center', justifyContent: 'center' },
});
