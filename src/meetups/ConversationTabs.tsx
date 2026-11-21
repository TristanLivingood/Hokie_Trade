import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CHAT_TAB, MEETING_TAB } from './viewState';
import type { ConversationTab } from './viewState';

type Props = {
  value: ConversationTab;
  needsAction: boolean;
  onChange: (tab: ConversationTab) => void;
};

const TABS: { id: ConversationTab; label: string }[] = [
  { id: CHAT_TAB, label: 'Chat' },
  { id: MEETING_TAB, label: 'Meeting' },
];

export default function ConversationTabs({ value, needsAction, onChange }: Props) {
  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {TABS.map(tab => {
        const selected = value === tab.id;
        const showBadge = tab.id === MEETING_TAB && needsAction;
        return (
          <TouchableOpacity
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={showBadge ? `${tab.label}, action needed` : tab.label}
            accessibilityState={{ selected }}
            style={[styles.tab, selected && styles.tabSelected]}
            onPress={() => onChange(tab.id)}>
            <Text style={[styles.label, selected && styles.labelSelected]}>{tab.label}</Text>
            {showBadge ? (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.badge}>
                <Text style={styles.badgeText}>!</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: '#FBF6F1', borderBottomWidth: 1, borderBottomColor: '#E6D9CE', paddingHorizontal: 10, gap: 6 },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, paddingHorizontal: 18, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabSelected: { borderBottomColor: '#7A1B3A' },
  label: { fontSize: 14, fontWeight: '600', color: '#89756D' },
  labelSelected: { color: '#7A1B3A', fontWeight: '800' },
  badge: { minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: '#E5751F', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', lineHeight: 14 },
});
