//src/features/user/componenets/EventCard.js

import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EventCard from './EventCard';

export default function EventList({ data, category, onEventPress }) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="calendar-clear-outline" size={40} color="#cbd5e1" />
        </View>
        <Text style={styles.emptyTitle}>No Events Found</Text>
        <Text style={styles.emptySub}>
          There are no {category} events at the moment.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <EventCard 
          item={item} 
          category={category} 
          onPress={() => onEventPress(item)} 
        />
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});