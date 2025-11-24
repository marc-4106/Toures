// src/features/user/screens/UserHomeScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image,
  ActivityIndicator, ScrollView, Keyboard, Platform, RefreshControl, Alert // <--- Added Alert
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// --- FIREBASE IMPORTS (ADDED) ---
import { auth, db } from "../../../services/firebaseConfig"; 
import { doc, getDoc, updateDoc } from "firebase/firestore";

import { useDestinations } from "../hooks/useDestinations";
import DestinationCard from "../components/DestinationCard";
import DestinationDetailsModal from "../components/DestinationDetailsModal";
import { haversineKm } from "../../recommender/distance";
import useNotificationsBadge from "../../notifications/useNotificationsBadge";

const KIND_CHIPS = [
  "All (10 km)",
  "Hotel",
  "Restaurant",
  "Resort",
  "Mall",
  "Heritage",
  "Pasalubong Centers",
];

const MAX_FEATURED_RADIUS_KM = 50;
const NEARBY_RADIUS_KM = 10;

export default function UserHomeScreen() {
  
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { unreadCount, markAllRead } = useNotificationsBadge();

  const { destinations, isLoading, errorMsg, refetch  } = useDestinations();

  // 🔵 user location
  const [userLocation, setUserLocation] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({});
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {}
    })();
  }, []);

  // 🔴 CHECK ACCOUNT DELETION STATUS
  useEffect(() => {
    const checkAccountStatus = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // If account is marked for deletion
          if (data.accountStatus === 'pending_deletion') {
            Alert.alert(
              "Account Deletion Pending",
              "Your account is currently scheduled for deletion. Do you want to restore it?",
              [
                {
                  text: "No, Logout",
                  onPress: async () => await auth.signOut(),
                  style: "cancel"
                },
                {
                  text: "Yes, Restore Account",
                  onPress: async () => {
                    // Cancel the deletion
                    await updateDoc(userDocRef, {
                      accountStatus: 'active',
                      deletionScheduledAt: null 
                    });
                    Alert.alert("Success", "Your account has been restored.");
                  }
                }
              ],
              { cancelable: false } // Force user to choose
            );
          }
        }
      } catch (error) {
        console.log("Error checking account status:", error);
      }
    };

    checkAccountStatus();
  }, []);


  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    try {
      setRefreshing(true);
      if (typeof refetch === "function") {
        await refetch();              // preferred: real data reload
      } else {
        // fallback: short spinner so the gesture feels responsive
        await new Promise((r) => setTimeout(r, 900));
      }
    } finally {
      setRefreshing(false);
    }
  };


  // --- search & chips ---
  const [search, setSearch] = useState("");
  const [selectedChip, setSelectedChip] = useState("Featured");
  const hasQuery = search.trim().length > 0;

  // 🎠 Featured carousel (within 50km)
  const featuredNearby = useMemo(() => {
    if (!userLocation) return [];
    return destinations
      .filter((d) => d.isFeatured === true && d.imageUrl)
      .filter((d) => {
        const lat = d?.Coordinates?.latitude;
        const lng = d?.Coordinates?.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
        const km = haversineKm(userLocation.latitude, userLocation.longitude, lat, lng);
        return km <= MAX_FEATURED_RADIUS_KM;
      });
  }, [destinations, userLocation]);

  // 📋 Main list
  const filtered = useMemo(() => {
    const q = (search || "").toLowerCase().trim();

    // 🔎 Search overrides distance filters: name + kind + tags
    if (q.length > 0) {
      return destinations.filter((d) => {
        const inName = (d.name || "").toLowerCase().includes(q);
        const inKind = (d.kind || "").toLowerCase().includes(q);
        const inTags = (Array.isArray(d.tags) ? d.tags : []).join(" ").toLowerCase().includes(q);
        return inName || inKind || inTags;
      });
    }

    // No search → chip logic
    if (selectedChip === "Featured") {
      if (!userLocation) return [];
      return destinations.filter((d) => {
        if (d.isFeatured !== true) return false;
        const lat = d?.Coordinates?.latitude;
        const lng = d?.Coordinates?.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
        const km = haversineKm(userLocation.latitude, userLocation.longitude, lat, lng);
        return km <= MAX_FEATURED_RADIUS_KM;
      });
    }

    if (selectedChip === "All (10 km)") {
      if (!userLocation) return [];
      return destinations.filter((d) => {
        const lat = d?.Coordinates?.latitude;
        const lng = d?.Coordinates?.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
        const km = haversineKm(userLocation.latitude, userLocation.longitude, lat, lng);
        return km <= NEARBY_RADIUS_KM;
      });
    }

    // Kinds (no distance restriction)
    const kindKey = selectedChip.toLowerCase();
    return destinations.filter((d) => (d.kind || "") === kindKey);
  }, [destinations, search, selectedChip, userLocation]);

  // 🔎 Details modal state
  const [selected, setSelected] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const openDetails = (item) => {
    setSelected(item);
    setModalVisible(true);
  };

  // Loading / error
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color="#0f37f1" />
          <Text style={styles.mutedText}>Finding great places…</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (errorMsg) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centerFill}>
          <Ionicons name="cloud-offline-outline" size={36} color="#ef4444" />
          <Text style={[styles.mutedText, { color: "#ef4444", marginTop: 8 }]}>{errorMsg}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ListEmpty = () => (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={styles.emptyCard}>
        <Ionicons name={hasQuery ? "search-outline" : "map-outline"} size={28} color="#64748b" />
        <Text style={styles.emptyTitle}>
          {hasQuery
            ? "No matches"
            : selectedChip === "Featured" || selectedChip === "All (10 km)"
            ? userLocation
              ? "Nothing nearby yet"
              : "Turn on location"
            : "Nothing in this category"}
        </Text>
        <Text style={styles.emptyText}>
          {hasQuery
            ? "Try a different name, kind, or tag."
            : selectedChip === "Featured"
            ? `No featured places within ${MAX_FEATURED_RADIUS_KM} km.`
            : selectedChip === "All (10 km)"
            ? userLocation
              ? `No places within ${NEARBY_RADIUS_KM} km.`
              : "Enable location to see nearby places."
            : "Pick another chip above."}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header (logo + inline search + notifications) */}
      <View style={styles.headerRow}>
        
        {/* Inline search */}
        <View style={styles.headerSearchWrap}>
          <Ionicons name="search" size={18} color="#64748b" style={{ marginHorizontal: 8 }} />
          <TextInput
            placeholder="Search by name, kind, tags…"
            placeholderTextColor="#94a3b8"
            style={styles.headerSearchInput}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {hasQuery && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Notifications */}
       <TouchableOpacity
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => {
           navigation.navigate("Notification");
           markAllRead();
         }}
        >
          <Ionicons name="notifications-outline" size={22} color="#0f172a" />
          {unreadCount > 0 && (
          <View style={styles.badgeCount}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? "9+" : String(unreadCount)}
            </Text>
          </View>
        )}
        </TouchableOpacity>

      </View>

      {/* CTA */}
      <TouchableOpacity
        onPress={() => navigation.navigate("TravelPreferences")}
        style={styles.primaryCta}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Start Fuzzy Plan"
      >
        <Ionicons name="bulb-outline" size={18} color="#fff" />
        <Text style={styles.primaryCtaText}>Start Fuzzy Plan</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </TouchableOpacity>

      {/* Featured carousel (if user has location & there are items) */}
      {userLocation && featuredNearby.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured near you</Text>
            <Text style={styles.sectionHint}>within {MAX_FEATURED_RADIUS_KM} km</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {featuredNearby.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={styles.featureCard}
                onPress={() => openDetails(d)}
                activeOpacity={0.92}
              >
                <Image source={{ uri: d.imageUrl }} style={styles.featureImage} />
                <View style={styles.featureCaption}>
                  <Text style={styles.featureTitle} numberOfLines={1}>
                    {d.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Chips */}
      <View style={styles.chipsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          {KIND_CHIPS.map((item) => {
            const active = selectedChip === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.chipFixed, active ? styles.chipActive : styles.chipInactive]}
                onPress={() => setSelectedChip(item)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.chipTextFixed,
                    active ? { color: "#0f37f1" } : { color: "#0f172a" },
                  ]}
                  numberOfLines={1}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        keyboardShouldPersistTaps="handled"
        data={filtered.map((x) => ({ ...x, __nav: navigation }))}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => (
          <DestinationCard item={item} userLocation={userLocation} onPress={openDetails} />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 65 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={<ListEmpty />}
        onScrollBeginDrag={() => Keyboard.dismiss()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={onRefresh}
            colors={["#0f37f1"]}                // Android spinner color
            progressBackgroundColor="#ffffff"   // Android background
          />
        }
      />

      {/* Details Modal */}
      <DestinationDetailsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        destination={selected}
        userLocation={userLocation}
      />
    </SafeAreaView>
  );
}

const ANDROID = Platform.OS === "android";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  centerFill: { flex: 1, justifyContent: "center", alignItems: "center" },
  mutedText: { color: "#6b7280", marginTop: 8 },

  // HEADER
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    gap: 10,
  },
  brandLogo: { width: 32, height: 32, borderRadius: 6 },

  headerSearchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 40,
    ...(ANDROID ? { elevation: 3 } : {}),
  },
  headerSearchInput: {
    flex: 1,
    height: 40,
    color: "#0f172a",
    paddingRight: 8,
  },
  clearBtn: { paddingHorizontal: 10, height: 40, justifyContent: "center" },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  // CTA
  primaryCta: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#0f37f1",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    ...(ANDROID ? { elevation: 4 } : {}),
  },
  primaryCtaText: { color: "#fff", fontWeight: "800" },

  // FEATURED
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  sectionHint: { color: "#64748b", fontSize: 12 },

  featureCard: {
    width: 220,
    height: 130,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#e2e8f0",
    marginRight: 12,
    ...(ANDROID ? { elevation: 3 } : {}),
  },
  featureImage: { width: "100%", height: "100%" },
  featureCaption: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  featureTitle: { color: "#fff", fontWeight: "800" },

  // CHIPS
  chipsRow: { height: 48, marginBottom: 8 },
  chipsContent: { paddingHorizontal: 16, alignItems: "center" },
  chipFixed: {
    height: 36,
    minWidth: 84,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    ...(ANDROID ? { elevation: 1 } : {}),
  },
  chipTextFixed: { fontWeight: "700", fontSize: 13 },
  chipActive: { backgroundColor: "#dbeafe", borderColor: "#93c5fd" },
  chipInactive: { backgroundColor: "#fff", borderColor: "#e2e8f0" },

  // EMPTY
  emptyCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    ...(ANDROID ? { elevation: 2 } : {}),
  },
  emptyTitle: { fontWeight: "800", fontSize: 16, color: "#0f172a", marginTop: 6 },
  emptyText: { color: "#64748b", textAlign: "center", marginTop: 4 },
   badgeCount: {
   position: "absolute",
  top: -4,
   right: -4,
   minWidth: 18,
   height: 18,
   paddingHorizontal: 4,
   borderRadius: 9,
   backgroundColor: "#ef4444",
   alignItems: "center",
   justifyContent: "center",
 },
 badgeText: {
   color: "#fff",
   fontSize: 10,
   fontWeight: "900",
 },
});