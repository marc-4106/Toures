import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../services/firebaseConfig";
import { buildItinerary } from "../logic/fuzzy/itinerary";
import * as Location from "expo-location";
import { getItinerary } from "../logic/getItinerary";

export const INTEREST_CATEGORIES = {
  food: {
    label: "Food & Dining",
    icon: "restaurant-outline",
    items: [
      { key: "local_cuisine", label: "Local Cuisine" },
      { key: "seafood", label: "Seafood" },
      { key: "buffet", label: "Buffet / Eat-All-You-Can" },
      { key: "fine_dining", label: "Fine Dining" },
      { key: "street_food", label: "Street Food" },
      { key: "cafe", label: "Cafés & Bakeries" },
    ],
  },

  accommodation: {
    label: "Accommodation & Lodging",
    icon: "bed-outline",
    items: [
      { key: "luxury_hotel", label: "Luxury" },
      { key: "budget_inn", label: "Budget" },
      { key: "family_friendly", label: "Family Friendly" },
      { key: "romantic", label: "Romantic" },
      { key: "eco_resort", label: "Eco Resort" },
      { key: "beach_resort", label: "Beachfront Resort" },
      { key: "hotel", label: "City Hotel" },
      { key: "camping", label: "Camping" },
    ],
  },

  activities: {
    label: "Activities & Experiences",
    icon: "walk-outline",
    items: [
      { key: "adventure", label: "Adventure" },
      { key: "hiking", label: "Hiking" },
      { key: "diving", label: "Diving" },
      { key: "boat", label: "Boating / Island Hopping" },
      { key: "culture", label: "Cultural" },
      { key: "heritage", label: "Heritage & History" },
      { key: "nature", label: "Nature Trips" },
      { key: "photography", label: "Photography" },
      { key: "relaxation", label: "Relaxation / Spa" },
      { key: "spiritual", label: "Spiritual / Retreats" },
    ],
  },

  environment: {
    label: "Destination Type",
    icon: "earth-outline",
    items: [
      { key: "beach", label: "Beach" },
      { key: "mountain", label: "Mountain" },
      { key: "island", label: "Island" },
      { key: "city", label: "City" },
      { key: "rural", label: "Countryside" },
      { key: "park", label: "Eco Park" },
      { key: "farm", label: "Farm / Agri-tourism" },
      { key: "lake", label: "Lake" },
    ],
  },

  lifestyle: {
    label: "Lifestyle & Social",
    icon: "sparkles-outline",
    items: [
      { key: "nightlife", label: "Nightlife" },
      { key: "shopping", label: "Shopping" },
      { key: "arts", label: "Art & Crafts" },
      { key: "music_events", label: "Music Events" },
      { key: "romantic", label: "Romantic Spots" },
      { key: "family_friendly", label: "Family Activities" },
      { key: "market", label: "Local Market" },
      { key: "cafe", label: "Relaxing Cafés" },
    ],
  },
};


const formatDate = (d) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);

function getMinStartDate48h() {
  const now = new Date();
  const fortyEightLater = new Date(now.getTime() + 48 * 3600 * 1000);

  // Round DOWN to midnight
  const min = new Date(fortyEightLater);
  min.setHours(0, 0, 0, 0);

  // If midnight is BEFORE 48-hour mark → shift to next day
  if (min < fortyEightLater) {
    min.setDate(min.getDate() + 1);
  }

  return min;
}



const START_CITIES = [
  { label: "Bacolod", lat: 10.6767, lng: 122.9511 },
  { label: "Bago", lat: 10.5333, lng: 122.8333 },
  { label: "Cadiz", lat: 10.95, lng: 123.31 },
  { label: "Escalante", lat: 10.8333, lng: 123.5 },
  { label: "Himamaylan", lat: 10.1, lng: 122.87 },
  { label: "Kabankalan", lat: 9.9833, lng: 122.8167 },
  { label: "La Carlota", lat: 10.4167, lng: 122.9167 },
  { label: "Sagay", lat: 10.9447, lng: 123.424 },
  { label: "San Carlos", lat: 10.48, lng: 123.42 },
  { label: "Silay", lat: 10.753, lng: 122.9674 },
  { label: "Sipalay", lat: 9.7513, lng: 122.4048 },
  { label: "Talisay", lat: 10.737, lng: 122.9671 },
  { label: "Victorias", lat: 10.9012, lng: 123.0701 },
];

export default function TravelPreferencesScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const [startCityIdx, setStartCityIdx] = useState(0);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  const minStartDateCreate = useMemo(() => getMinStartDate48h(), []);
  const [startDate, setStartDate] = useState(minStartDateCreate);
  const [endDate, setEndDate] = useState(new Date(minStartDateCreate.getTime() + 86400000));

  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [maxBudget, setMaxBudget] = useState("");
  const [priority, setPriority] = useState("balanced");
  const [loading, setLoading] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  const [savedStartDate, setSavedStartDate] = useState(null);
  const [savedEndDate, setSavedEndDate] = useState(null);

  const now = useMemo(() => new Date(), []);
  const minStartEdit = useMemo(() => getMinStartDate48h(), []);

  const startLockedBecausePast = useMemo(() => {
  if (!isEditing || !savedStartDate) return false;
  return savedStartDate < minStartEdit;
  }, [isEditing, savedStartDate, minStartEdit]);


  useEffect(() => {
    const loadExisting = async () => {
      if (route.params?.mode === "edit" && route.params?.itineraryId) {
        setIsEditing(true);
        const data = await getItinerary(route.params.itineraryId);
        if (!data) return;
        const prefs = data.preferences;
        if (!prefs) return;

        setMaxBudget(String(prefs.maxBudget || ""));
        setPriority(prefs.priority || "balanced");
        setSelectedInterests(new Set(prefs.interests || []));

        const idx = START_CITIES.findIndex((c) => c.label === prefs.startCity?.label);
        if (idx !== -1) setStartCityIdx(idx);

        const loadedStart = new Date(prefs.startDate);
        const loadedEnd = new Date(prefs.endDate);

        setSavedStartDate(loadedStart);
        setSavedEndDate(loadedEnd);

        setStartDate(loadedStart); // force to saved start date
        setEndDate(loadedEnd);     // initialize to saved end date
      }
    };
    loadExisting();
  }, [route.params]);

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleInterest = (key) => {
    setSelectedInterests((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const submit = async () => {
    try {
      if (!isEditing) {
        if (startDate < minStartDateCreate) {
          Alert.alert(
            "Start date too soon",
            `You can only create an itinerary 48 hours before the travel date. Earliest available date is ${formatDate(
              minStartDateCreate
            )}.`
          );
          return;
        }
      } else {
      const minEdit = getMinStartDate48h();

      if (savedStartDate < minEdit) {
        // Must remain locked
        if (startDate.getTime() !== savedStartDate.getTime()) {
          Alert.alert(
            "Start date locked",
            `This trip is starting too soon. Start date cannot be moved.`
          );
          return;
        }
      } else {
        // Editable but must meet 48h rule
        if (startDate < minEdit) {
          Alert.alert(
            "Start date too soon",
            `Earliest allowed start date is ${formatDate(minEdit)}.`
          );
          return;
        }
      }
    }

      setLoading(true);

      const snap = await getDocs(
        query(collection(db, "destinations"), where("isArchived", "==", false))
      );
      const places = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const preferences = {
        startCity:
          useCurrentLocation && currentLocation
            ? currentLocation
            : START_CITIES[startCityIdx],
        startDate,
        endDate,
        maxBudget: Number(maxBudget) || 0,
        interests: Array.from(selectedInterests),
        priority,
      };

      const plan = buildItinerary(places, preferences);

      if (isEditing) {
        plan.itineraryId = route.params?.itineraryId;
        plan.savedItinerary = route.params?.savedItinerary;
      }

      navigation.navigate("ItineraryPreview", {
        plan,
        mode: isEditing ? "edit" : "create",
      });
    } catch (err) {
      console.error("Error building itinerary:", err);
      Alert.alert("Error", "Failed to generate itinerary.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>{isEditing ? "Edit Your Itinerary ✏️" : "Plan Your Adventure 🌴"}</Text>
          <Text style={styles.subtitle}>Customize your preferences for the best travel recommendations.</Text>

          {!isEditing ? (
            <View style={[styles.notice, { borderColor: "#f59e0b", backgroundColor: "#fffbeb" }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#b45309" style={{ marginRight: 6 }} />
              <Text style={{ color: "#92400e", fontWeight: "700" }}>
                You can only generate an itinerary starting {formatDate(minStartDateCreate)} or later.
              </Text>
            </View>
          ) : startLockedBecausePast ? (
            <View style={[styles.notice, { borderColor: "#60a5fa", backgroundColor: "#eff6ff" }]}>
              <Ionicons name="lock-closed-outline" size={16} color="#1d4ed8" style={{ marginRight: 6 }} />
              <Text style={{ color: "#1d4ed8", fontWeight: "700" }}>
                Start date is in the past and locked. You can only adjust the end date.
              </Text>
            </View>
          ) : (
            <View style={[styles.notice, { borderColor: "#60a5fa", backgroundColor: "#eff6ff" }]}>
              <Ionicons name="lock-closed-outline" size={16} color="#1d4ed8" style={{ marginRight: 6 }} />
              <Text style={{ color: "#1d4ed8", fontWeight: "700" }}>
                Start date is locked to the saved itinerary.
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location-outline" size={20} color="#0f37f1" />
              <Text style={styles.cardTitle}>Starting Location</Text>
            </View>

            <View style={styles.pickerWrap}>
              <Picker selectedValue={startCityIdx} onValueChange={setStartCityIdx} enabled={!isEditing}>
                {START_CITIES.map((c, idx) => (
                  <Picker.Item key={c.label} label={c.label} value={idx} />
                ))}
              </Picker>
            </View>

            <TouchableOpacity
              style={[styles.toggleBtn, useCurrentLocation && { backgroundColor: "#dbeafe" }]}
              onPress={async () => {
                if (isEditing) return; // lock location change in edit
                if (useCurrentLocation) {
                  setUseCurrentLocation(false);
                  setCurrentLocation(null);
                  return;
                }
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== "granted") {
                  Alert.alert("Permission denied", "Location access required.");
                  return;
                }
                try {
                  setLoading(true);
                  let pos = await Location.getLastKnownPositionAsync({});
                  if (!pos) {
                    pos = await Location.getCurrentPositionAsync({
                      accuracy: Location.Accuracy.Balanced,
                      maximumAge: 10000,
                      timeout: 5000,
                    });
                  }
                  if (pos) {
                    setCurrentLocation({
                      label: "Current Location",
                      lat: pos.coords.latitude,
                      lng: pos.coords.longitude,
                    });
                    setUseCurrentLocation(true);
                  } else {
                    Alert.alert("Location Error", "Unable to detect position.");
                  }
                } catch {
                  Alert.alert("Error", "Please ensure GPS is enabled.");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={isEditing}
            >
              <Ionicons
                name={useCurrentLocation ? "navigate" : "navigate-outline"}
                size={16}
                color={isEditing ? "#94a3b8" : useCurrentLocation ? "#0f37f1" : "#475569"}
                style={{ marginRight: 8 }}
              />
              <Text style={{ fontWeight: "600", color: isEditing ? "#94a3b8" : "#0f172a" }}>
                {isEditing
                  ? "Location locked in edit mode"
                  : useCurrentLocation
                  ? "Using Current Location"
                  : "Use My Location"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar-outline" size={20} color="#0f37f1" />
              <Text style={styles.cardTitle}>Travel Dates</Text>
            </View>
            <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.dateBtn,
                startLockedBecausePast ? styles.dateBtnDisabled : null,
              ]}
              onPress={() => {
                if (startLockedBecausePast) return;
                setShowStart(true);
              }}
              disabled={startLockedBecausePast}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.dateText}>{formatDate(startDate)}</Text>

                {startLockedBecausePast && (
                  <Ionicons name="lock-closed-outline" size={14} color="#94a3b8" />
                )}
              </View>
            </TouchableOpacity>

              <Text style={{ marginHorizontal: 8, color: "#64748b" }}>→</Text>

              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEnd(true)}>
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

            {showStart && (
              <DateTimePicker
                value={startDate}
                mode="date"
                minimumDate={isEditing ? minStartEdit : minStartDateCreate}
                onChange={(_, d) => {
                  setShowStart(false);
                  if (!d) return;

                  const minAllowed = isEditing ? minStartEdit : minStartDateCreate;

                  const chosen = d < minAllowed ? minAllowed : d;
                  setStartDate(chosen);

                  if (endDate <= chosen) {
                    setEndDate(new Date(chosen.getTime() + 86400000));
                  }
                }}
              />
            )}


          {showEnd && (
            <DateTimePicker
              value={endDate}
              mode="date"
              minimumDate={startDate}
              onChange={(_, d) => {
                setShowEnd(false);
                if (d) setEndDate(d < startDate ? startDate : d);
              }}
            />
          )}

          <View style={styles.card}>
            <View className="cardHeader" style={styles.cardHeader}>
              <Ionicons name="cash-outline" size={20} color="#0f37f1" />
              <Text style={styles.cardTitle}>Budget</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your max budget (₱)"
              keyboardType="number-pad"
              value={maxBudget}
              onChangeText={setMaxBudget}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="options-outline" size={20} color="#0f37f1" />
              <Text style={styles.cardTitle}>Priority</Text>
            </View>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={priority} onValueChange={setPriority}>
                <Picker.Item label="Balanced (Default)" value="balanced" />
                <Picker.Item label="Interest Focused" value="interest" />
                <Picker.Item label="Distance Focused" value="distance" />
                <Picker.Item label="Budget Focused" value="price" />
              </Picker>
            </View>
          </View>

          {Object.entries(INTEREST_CATEGORIES).map(([key, cat]) => {
            const expanded = expandedSections[key];
            return (
              <View key={key} style={styles.card}>
                <TouchableOpacity
                  style={styles.collapseHeader}
                  onPress={() => setExpandedSections((p) => ({ ...p, [key]: !p[key] }))}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name={cat.icon} size={18} color="#0f37f1" style={{ marginRight: 8 }} />
                    <Text style={styles.sectionTitle}>{cat.label}</Text>
                  </View>
                  <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#64748b" />
                </TouchableOpacity>

                {expanded && (
                  <>
                    <Text style={styles.categorySubtitle}>
                      Select interests related to {cat.label.toLowerCase()}
                    </Text>
                    <View style={styles.tagsGrid}>
                      {cat.items.map((item) => {
                        const active = selectedInterests.has(item.key);
                        return (
                          <TouchableOpacity
                            key={item.key}
                            onPress={() => {
                              setSelectedInterests((prev) => {
                                const next = new Set(prev);
                                next.has(item.key) ? next.delete(item.key) : next.add(item.key);
                                return next;
                              });
                            }}
                            style={[
                              styles.tagBox,
                              active && { backgroundColor: "#e0f2fe", borderColor: "#0ea5e9" },
                            ]}
                          >
                            <Ionicons
                              name={active ? "checkmark-circle" : "ellipse-outline"}
                              size={14}
                              color={active ? "#0284c7" : "#94a3b8"}
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              numberOfLines={1}
                              style={{
                                color: active ? "#0369a1" : "#1e293b",
                                fontSize: 13,
                                flexShrink: 1,
                              }}
                            >
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>
            );
          })}

          <View style={styles.footerSpacer} />
        </ScrollView>

        <View style={styles.footerContainer}>
          <TouchableOpacity style={[styles.btn, styles.btnGhost, { flex: 0.6 }]} onPress={() => navigation.goBack()}>
            <Text style={[styles.btnText, { color: "#0f172a" }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnPrimary, { flex: 1.4 }]} onPress={submit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>{isEditing ? "Update Plan" : "Discover Destinations"}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  container: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  subtitle: { color: "#475569", marginBottom: 14 },
  notice: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginLeft: 8, color: "#0f172a" },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    overflow: "hidden",
  },
  toggleBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 10,
  },
  row: { flexDirection: "row", alignItems: "center" },
  dateBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  dateBtnDisabled: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  dateText: { fontWeight: "600", color: "#0f172a" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f8fafc",
    color: "#0f172a",
  },
  sectionTitle: { fontWeight: "700", fontSize: 15, color: "#0f172a" },
  categorySubtitle: { fontSize: 12, color: "#64748b", marginBottom: 8 },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  tagBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "48%",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  footerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  footerSpacer: { height: 100 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  btnGhost: { backgroundColor: "#f1f5f9" },
  btnPrimary: { backgroundColor: "#0f37f1" },
  btnText: { color: "#fff", fontWeight: "800" },
  collapseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
});
