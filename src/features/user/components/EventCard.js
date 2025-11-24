//src/features/user/componenets/EventCard.js

import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../../../utils/eventDateUtils';

export default function EventCard({ item, category, onPress }) {
  // Helper to get badge color based on category
  const getBadgeStyle = () => {
    switch(category) {
      case 'ongoing': return { bg: '#dcfce7', text: '#166534', label: 'Happening Now' };
      case 'upcoming': return { bg: '#e0e7ff', text: '#3730a3', label: 'Upcoming' };
      default: return { bg: '#f1f5f9', text: '#64748b', label: 'Past' };
    }
  };

  const badge = getBadgeStyle();
  const isRange = item.eventType === 'range' && item.endDate;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Image Section */}
      <View style={styles.imageContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={40} color="#cbd5e1" />
          </View>
        )}
        
        {/* Category Badge */}
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
        </View>

        {/* Sub-Events Indicator */}
        {item.hasSubEvents && (
          <View style={styles.subEventBadge}>
            <Ionicons name="list" size={12} color="#fff" />
            <Text style={styles.subEventText}>Has Activities</Text>
          </View>
        )}
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={14} color="#64748b" />
          <Text style={styles.dateText}>
            {formatDate(item.startDate)}
            {isRange && ` — ${formatDate(item.endDate)}`}
          </Text>
        </View>

        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  imageContainer: {
    height: 160,
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subEventBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subEventText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    lineHeight: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f37f1',
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});