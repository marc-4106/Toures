import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions,
  FlatList,
  RefreshControl
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';

import { categorizeEvents } from '../../../utils/eventDateUtils';
import EventTabs from '../components/EventTabs';
import EventCard from '../components/EventCard';
import EventDetailsModal from '../../admin/components/EventDetailsModal';

const { height } = Dimensions.get("window");
const isSmallDevice = height < 680;

export default function EventScreen() {
  const [rawEvents, setRawEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ongoing');
  const [search, setSearch] = useState('');

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // -------------------------------
  // Fetch Data
  // -------------------------------
  useEffect(() => {
    const q = query(collection(db, 'events'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRawEvents(data);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // -------------------------------
  // Pull to Refresh
  // -------------------------------
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  // -------------------------------
  // Categorize + Filter
  // -------------------------------
  const { categorizedData, counts } = useMemo(() => {
    const filtered = rawEvents.filter(ev =>
      ev.title?.toLowerCase().includes(search.toLowerCase())
    );

    const categories = categorizeEvents(filtered);

    return {
      categorizedData: categories,
      counts: {
        ongoing: categories.ongoing.length,
        upcoming: categories.upcoming.length,
        past: categories.past.length
      }
    };
  }, [rawEvents, search]);

  const currentList = categorizedData[activeTab];

  // -------------------------------
  // Open Modal
  // -------------------------------
  const handleEventPress = (event) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  // -------------------------------
  // Header UI (MINIMAL + PREMIUM)
  // -------------------------------
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Events</Text>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={17} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#94a3b8"
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f37f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {renderHeader()}

      <EventTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
      />

      <View style={styles.contentWrapper}>
        {currentList.length > 0 ? (
          <FlatList
            data={currentList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EventCard
                item={item}
                category={activeTab}
                onPress={() => handleEventPress(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="calendar-clear-outline"
              size={48}
              color="#cbd5e1"
            />
            <Text style={styles.emptyText}>
              No {activeTab} events found.
            </Text>
          </View>
        )}
      </View>

      <EventDetailsModal
        visible={modalVisible}
        event={selectedEvent}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop:
      Platform.OS === "android"
        ? StatusBar.currentHeight * 0.25 // ✔ drastically reduced
        : 8,                             // ✔ smaller for iOS
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 4, // ✔ reduced from previous 12–20
    backgroundColor: '#fff',
  },

  headerTitle: {
    fontSize: isSmallDevice ? 22 : 26, // ✔ smaller = cleaner
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: isSmallDevice ? 38 : 44, // ✔ more compact
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    paddingVertical: 6,
    color: '#0f172a',
  },

  contentWrapper: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 50,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },

  emptyText: {
    marginTop: 10,
    fontSize: 15,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
