// src/features/user/components/ItineraryPreview.js

import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { useNavigation, useRoute } from "@react-navigation/native";

import { db, auth } from "../../../services/firebaseConfig";
import { activityCost } from "../logic/fuzzy/cost";
import { fuzzyScore, explainScore } from "../logic/fuzzy/score";
import { haversineKm } from "../../recommender/distance";
import DestinationPreviewModal from "./DestinationPreviewModal";
import {
  scheduleDayBefore,
  cancelAllForItinerary
} from "../../../services/notifications";
import WhyThisPlaceModal from "./WhyThisPlaceModal";

/* -------------------------------------------------------
   Money Component
------------------------------------------------------- */

const Peso = ({ value }) => (
  <Text style={styles.peso}>₱{Number(value || 0).toLocaleString()}</Text>
);

/* -------------------------------------------------------
   Mini Button
------------------------------------------------------- */

const SmallButton = ({ title, onPress, disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[styles.sbtn, disabled && styles.sbtnDisabled]}
  >
    <Text style={styles.sbtnText}>{title}</Text>
  </TouchableOpacity>
);

/* -------------------------------------------------------
   Tab Bar
------------------------------------------------------- */

const TabBar = ({ tabs, current, onChange }) => (
  <View style={styles.tabBar}>
    {tabs.map((t, idx) => {
      const active = current === idx;
      return (
        <TouchableOpacity
          key={t.key}
          onPress={() => onChange(idx)}
          style={[styles.tab, active && styles.tabActive]}
        >
          <Text style={[styles.tabText, active && styles.tabTextActive]}>
            {t.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

/* -------------------------------------------------------
   Day Tabs
------------------------------------------------------- */

const DayTabs = ({ daysCount, day, setDay }) => {
  if (!Number.isFinite(daysCount) || daysCount <= 1) return null;

  return (
    <View style={styles.dayTabsRow}>
      {Array.from({ length: daysCount }, (_, i) => i + 1).map((d) => {
        const active = d === day;
        return (
          <TouchableOpacity
            key={d}
            onPress={() => setDay(d)}
            style={[styles.dayTab, active && styles.dayTabActive]}
          >
            <Text style={[styles.dayTabText, active && styles.dayTabTextActive]}>
              Day {d}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/* -------------------------------------------------------
   Lock Banner (48h rule)
------------------------------------------------------- */

const LockBanner = ({ lockedHint }) => {
  if (!lockedHint) return null;
  return (
    <View style={styles.lockBanner}>
      <Text style={styles.lockBannerTitle}>{lockedHint}</Text>
      <Text style={styles.lockBannerText}>
        You can only edit days more than 48 hours from now.
      </Text>
    </View>
  );
};

/* -------------------------------------------------------
   Score & Utilities
------------------------------------------------------- */

const scoreLabel = (score) => {
  const pct = Math.round(score * 100);
  if (pct >= 85) return { text: `Excellent (${pct}%)`, color: "#16a34a" };
  if (pct >= 65) return { text: `Good (${pct}%)`, color: "#ccab28ff" };
  if (pct >= 45) return { text: `Fair (${pct}%)`, color: "#f97316" };
  return { text: `Low (${pct}%)`, color: "#dc2626" };
};

const kmText = (km) => {
  if (!Number.isFinite(km)) return "—";
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
};

const cleanData = (obj) => {
  if (Array.isArray(obj))
    return obj.map(cleanData).filter((v) => v !== undefined && v !== null);

  if (obj && typeof obj === "object") {
    const cleaned = {};
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== undefined && v !== null) cleaned[k] = cleanData(v);
    });
    return cleaned;
  }
  return obj;
};

/* -------------------------------------------------------
   Tier List for Lodging / Meals / Activities
------------------------------------------------------- */

const TierList = ({
  title,
  items,
  renderRight,
  renderLeftContent,
  openWhy,
  openPreview
}) => {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <View style={styles.tier}>
      <Text style={styles.tierTitle}>{title}</Text>

      {items.map((p) => (
        <View key={p.id} style={styles.card}>
          {/* LEFT SIDE */}
          <TouchableOpacity
            style={styles.cardLeft}
            onPress={() => openPreview && openPreview(p)}
          >
            <Text style={styles.placeName}>{p.name || p.title}</Text>
            <Text style={styles.placeMeta}>{p.__metaLine}</Text>

            {typeof p.__score === "number" && (
              <Text
                style={[
                  styles.scoreChip,
                  {
                    backgroundColor: scoreLabel(p.__score).color + "20",
                    color: scoreLabel(p.__score).color
                  }
                ]}
              >
                {scoreLabel(p.__score).text}
              </Text>
            )}

            {renderLeftContent ? renderLeftContent(p) : null}
          </TouchableOpacity>

          {/* RIGHT SIDE */}
          <View style={styles.cardRight}>
            <TouchableOpacity
              onPress={() => openWhy && openWhy(p)}
              style={styles.whyBtn}
            >
              <Ionicons
                name="help-circle-outline"
                size={20}
                color="#0f37f1"
              />
            </TouchableOpacity>

            {renderRight && renderRight(p)}
          </View>
        </View>
      ))}
    </View>
  );
};

/* =====================================================================
   MAIN COMPONENT — FIXED VERSION
===================================================================== */

export default function ItineraryPreview({ plan, onSave }) {
  const navigation = useNavigation();
  useRoute(); // future proof

  /* -------------------------------------------------------
     All scrolling fixes implemented here
  ------------------------------------------------------- */

  const scrollRef = useRef(null);

  const scrollToTop = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
  }, []);

  /* -------------------------------------------------------
     Tabs & Day Controls
  ------------------------------------------------------- */

  const [tab, setTab] = useState(0);
  const [mealTab, setMealTab] = useState(0); // 0,1,2
  const [dayIdx, setDayIdx] = useState(1);

  // When switching day → scroll to top
  const handleDayChange = useCallback(
    (d) => {
      setDayIdx(d);
      scrollToTop();
    },
    [scrollToTop]
  );

  // When switching meal tab → scroll reset
  const handleMealTabChange = useCallback(
    (newTab) => {
      setMealTab(newTab);
      scrollToTop();
    },
    [scrollToTop]
  );

  // When switching main tab
  const handleMainTabChange = useCallback(
    (newTab) => {
      setTab(newTab);
      scrollToTop();

      // Meals or Activities should always start at Day 1
      if (newTab === 1 || newTab === 2) {
        setDayIdx(1);
      }
    },
    [scrollToTop]
  );

  const nights = Number(plan?.meta?.nights || 0);
  const daysCount = Math.max(1, nights + 1);

  const [primaryHotel, setPrimaryHotel] = useState(null);
  const [allowSplitStay, setAllowSplitStay] = useState(nights > 2);
  const [secondaryHotel, setSecondaryHotel] = useState(null);

  const [itineraryName, setItineraryName] = useState("");

  const [whyVisible, setWhyVisible] = useState(false);
  const [whyData, setWhyData] = useState(null);

  const defaultName = `${plan?.meta?.startCity?.label || "Trip"} • ${new Date(
    plan?.meta?.startDate || Date.now()
  ).toLocaleDateString()}`;

  useEffect(() => {
    setItineraryName(plan?.meta?.name || defaultName);
  }, [plan?.meta?.name, plan?.meta?.startCity, plan?.meta?.startDate]);

  /* -------------------------------------------------------
     Selected Day State
  ------------------------------------------------------- */

  const blankDay = {
    breakfast: null,
    lunch: null,
    dinner: null,
    activities: []
  };

  const [selectedDays, setSelectedDays] = useState(
    Array.from({ length: daysCount }, () => ({ ...blankDay }))
  );

  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewDestination, setPreviewDestination] = useState(null);
  const [saving, setSaving] = useState(false);

  const openPreview = useCallback((p) => {
    setPreviewDestination(p);
    setPreviewModalVisible(true);
  }, []);

  const openWhy = useCallback(
    (place) => {
      const result = explainScore(place, plan?.meta || {});
      setWhyData(result);
      setWhyVisible(true);
    },
    [plan?.meta]
  );

  /* -------------------------------------------------------
     48-hour Locking
  ------------------------------------------------------- */

  const startDateObj = useMemo(() => {
    const d = new Date(plan?.meta?.startDate);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [plan?.meta?.startDate]);

  const dayDate = useCallback(
    (idx) => {
      if (!startDateObj) return null;
      const d = new Date(startDateObj);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + (idx - 1));
      return d;
    },
    [startDateObj]
  );

  const isDayLocked48h = useCallback(
    (idx) => {
      const d = dayDate(idx);
      if (!d) return false;
      const cutoffMs = Date.now() + 48 * 60 * 60 * 1000;
      return d.getTime() <= cutoffMs;
    },
    [dayDate]
  );

  const lockedHint = useMemo(() => {
    if (!startDateObj) return null;
    const locked = [];
    for (let i = 1; i <= daysCount; i++) {
      if (isDayLocked48h(i)) locked.push(i);
    }
    if (!locked.length) return null;
    if (locked.length === 1) return `Locked by 48-hour rule: Day ${locked[0]}`;
    return `Locked by 48-hour rule: Day ${locked[0]} to Day ${
      locked[locked.length - 1]
    }`;
  }, [startDateObj, daysCount, isDayLocked48h]);

  /* -------------------------------------------------------
     Recommendation Lists
  ------------------------------------------------------- */

  const hotelReco = useMemo(() => {
    const alts = plan?.accommodation?.alternatives || {
      highly: [],
      considerable: []
    };
    const filter = (p) => {
      const kind = String(p.kind || "").toLowerCase();
      const tags = Array.isArray(p.tags)
        ? p.tags.map((t) => String(t).toLowerCase())
        : [];
      return (
        ["hotel", "resort", "inn"].includes(kind) || tags.includes("lodging")
      );
    };

    return {
      highly: (alts.highly || []).filter(filter),
      considerable: (alts.considerable || []).filter(filter),
      nights
    };
  }, [plan, nights]);

  const mealReco = useMemo(() => {
    const day = (plan?.days || [])[1] || plan?.days?.[0] || null;
    const pick = (slot) => {
      const alt = day?.[slot]?.alternatives || {
        highly: [],
        considerable: []
      };
      const filter = (p) => {
        const kind = String(p.kind || "").toLowerCase();
        const tags = Array.isArray(p.tags)
          ? p.tags.map((t) => String(t).toLowerCase())
          : [];
        return kind === "restaurant" || tags.includes("foodie");
      };
      return {
        highly: (alt.highly || []).filter(filter),
        considerable: (alt.considerable || []).filter(filter)
      };
    };

    return ["breakfast", "lunch", "dinner"].map(pick);
  }, [plan]);

    const activityReco = useMemo(() => {
      // When editing saved itinerary → fallback to fuzzy plan recommendations
      const alts =
        plan?.alternatives?.activity ||
        plan?.activity?.alternatives || // fallback structure
        {
          highly: [],
          considerable: [],
        };

      const filt = (p) => {
        const kind = String(p.kind || "").toLowerCase();
        return !["hotel", "restaurant"].includes(kind);
      };

      const decorate = (arr) =>
        (arr || [])
          .filter(filt)
          .map((p) => ({
            ...p,
            activities: p.activities || [],
            computedCost: Number(activityCost(p)) || 0,
          }));

      return {
        highly: decorate(alts.highly),
        considerable: decorate(alts.considerable),
      };
    }, [plan]);


  /* -------------------------------------------------------
     Decorate with Score + Meta
  ------------------------------------------------------- */

  const addMeta = useCallback(
    (p) => {
      const start = plan?.meta?.startCity;
      let meta = "—";

      try {
        if (
          start &&
          start.lat != null &&
          start.lng != null &&
          p?.Coordinates?.latitude != null &&
          p?.Coordinates?.longitude != null
        ) {
          const km = haversineKm(
            Number(start.lat),
            Number(start.lng),
            Number(p.Coordinates.latitude),
            Number(p.Coordinates.longitude)
          );
          meta = `${(p.kind || "").toUpperCase()} • ${
            p.cityOrMunicipality || "—"
          } • ${kmText(km)}`;
        } else {
          meta = `${(p.kind || "").toUpperCase()} • ${
            p.cityOrMunicipality || "—"
          } • —`;
        }
      } catch {
        meta = `${(p.kind || "").toUpperCase()} • ${
          p.cityOrMunicipality || "—"
        }`;
      }

      return {
        ...p,
        __metaLine: meta,
        __score: fuzzyScore(p, plan?.meta)
      };
    },
    [plan?.meta]
  );

  const hotelHighly = useMemo(
    () => (hotelReco.highly || []).map(addMeta),
    [hotelReco.highly, addMeta]
  );
  const hotelConsiderable = useMemo(
    () => (hotelReco.considerable || []).map(addMeta),
    [hotelReco.considerable, addMeta]
  );
  const actHighly = useMemo(
    () => (activityReco.highly || []).map(addMeta),
    [activityReco.highly, addMeta]
  );
  const actConsiderable = useMemo(
    () => (activityReco.considerable || []).map(addMeta),
    [activityReco.considerable, addMeta]
  );
  const mealHighly = useMemo(
    () => (mealReco[mealTab]?.highly || []).map(addMeta),
    [mealReco, mealTab, addMeta]
  );
  const mealConsiderable = useMemo(
    () => (mealReco[mealTab]?.considerable || []).map(addMeta),
    [mealReco, mealTab, addMeta]
  );

  /* -------------------------------------------------------
     Saved Itinerary Hydration
  ------------------------------------------------------- */

  useEffect(() => {
    const loadSaved = async () => {
      const saved = plan?.savedItinerary;
      if (!saved) return;

      if (saved.hotel) {
        setPrimaryHotel(saved.hotel.primary || null);
        setSecondaryHotel(saved.hotel.secondary || null);
        setAllowSplitStay(saved.hotel.allowSplitStay || false);
      }

      if (Array.isArray(saved.days)) {
        const hydrateDestination = async (item) => {
          if (!item?.id) return item;
          try {
            const ref = doc(db, "destinations", item.id);
            const snap = await getDoc(ref);
            return snap.exists() ? { id: snap.id, ...snap.data() } : item;
          } catch {
            return item;
          }
        };

        const hydrated = await Promise.all(
          saved.days.map(async (d) => {
            const breakfast = d.breakfast
              ? await hydrateDestination(d.breakfast)
              : null;
            const lunch = d.lunch ? await hydrateDestination(d.lunch) : null;
            const dinner = d.dinner ? await hydrateDestination(d.dinner) : null;
            const activities = await Promise.all(
              (d.activities || []).map(hydrateDestination)
            );
            return { ...d, breakfast, lunch, dinner, activities };
          })
        );
        setSelectedDays(hydrated);
      }
    };

    loadSaved();
  }, [plan]);

  /* -------------------------------------------------------
     Selection Handlers
  ------------------------------------------------------- */

  const canPickHotel = nights >= 1;

  const pickHotel = useCallback(
    (p) => {
      if (primaryHotel?.id === p.id) {
        setPrimaryHotel(null);
        setSecondaryHotel(null);
        return;
      }

      if (allowSplitStay && nights > 2) {
        if (!primaryHotel) {
          setPrimaryHotel(p);
        } else if (!secondaryHotel && p.id !== primaryHotel.id) {
          setSecondaryHotel(p);
        } else if (secondaryHotel?.id === p.id) {
          setSecondaryHotel(null);
        } else {
          setPrimaryHotel(p);
        }
      } else {
        setPrimaryHotel(p);
        setSecondaryHotel(null);
      }
    },
    [primaryHotel, secondaryHotel, allowSplitStay, nights]
  );

  const setMealForDay = useCallback(
    (slot, p) => {
      if (isDayLocked48h(dayIdx)) {
        Alert.alert("Locked", "This day is locked by the 48-hour rule.");
        return;
      }
      setSelectedDays((prev) => {
        const next = [...prev];
        const idx = Math.max(1, Math.min(daysCount, dayIdx)) - 1;
        next[idx] = { ...next[idx], [slot]: p };
        return next;
      });
    },
    [isDayLocked48h, dayIdx, daysCount]
  );

  const toggleActivityForDay = useCallback(
    (p) => {
      if (isDayLocked48h(dayIdx)) {
        Alert.alert("Locked", "This day is locked by the 48-hour rule.");
        return;
      }
      setSelectedDays((prev) => {
        const next = [...prev];
        const idx = Math.max(1, Math.min(daysCount, dayIdx)) - 1;
        const arr = Array.isArray(next[idx].activities)
          ? [...next[idx].activities]
          : [];
        const i = arr.findIndex((x) => x.id === p.id);
        if (i >= 0) arr.splice(i, 1);
        else arr.push(p);
        next[idx] = { ...next[idx], activities: arr };
        return next;
      });
    },
    [isDayLocked48h, dayIdx, daysCount]
  );

  /* -------------------------------------------------------
     Totals
  ------------------------------------------------------- */

  const totalHotelCost = useMemo(() => {
    if (!primaryHotel) return 0;
    const nightP = Number(primaryHotel.nightlyPrice || 0);
    const primaryCost = nightP * nights;
    if (allowSplitStay && secondaryHotel && nights > 2) {
      const half = Math.floor(nights / 2);
      return Number(
        Number(secondaryHotel.nightlyPrice || 0) * (nights - half) +
          nightP * half
      );
    }
    return Number(primaryCost);
  }, [primaryHotel, secondaryHotel, allowSplitStay, nights]);

  const totalMealsCost = useMemo(
    () =>
      selectedDays.reduce((sum, d) => {
        const b = Number(d?.breakfast?.computedCost || 0);
        const l = Number(d?.lunch?.computedCost || 0);
        const di = Number(d?.dinner?.computedCost || 0);
        return sum + b + l + di;
      }, 0),
    [selectedDays]
  );

  const totalActivitiesCost = useMemo(
    () =>
      selectedDays.reduce((sum, d) => {
        const arr = Array.isArray(d?.activities) ? d.activities : [];
        const s = arr.reduce(
          (acc, a) => acc + Number(a?.computedCost || 0),
          0
        );
        return sum + s;
      }, 0),
    [selectedDays]
  );

  const grandTotal = useMemo(
    () => Number(totalHotelCost + totalMealsCost + totalActivitiesCost),
    [totalHotelCost, totalMealsCost, totalActivitiesCost]
  );

  const maxBudget = Number(plan?.meta?.maxBudget || 0);
  const budgetExceeded = maxBudget > 0 && grandTotal > maxBudget;

  /* -------------------------------------------------------
     Save Handler
  ------------------------------------------------------- */

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);

      const userId = auth?.currentUser?.uid || "guest";
      const safePreferences = cleanData(plan?.meta);
      const safeDays = cleanData(selectedDays);
      const safeHotel = cleanData({
        primary: primaryHotel,
        secondary: secondaryHotel,
        allowSplitStay
      });

      const newData = {
        userId,
        name: itineraryName || "Untitled Itinerary",
        preferences: safePreferences,
        hotel: safeHotel,
        days: safeDays,
        totals: {
          hotel: Number(totalHotelCost || 0),
          meals: Number(totalMealsCost || 0),
          activities: Number(totalActivitiesCost || 0),
          grandTotal: Number(grandTotal || 0)
        },
        isArchived: false,
        isDone: false,
        updatedAt: serverTimestamp()
      };

      const start = new Date(newData.preferences?.startDate);
      if (Number.isNaN(start.getTime())) {
        Alert.alert(
          "Invalid date",
          "Your trip start date is missing or invalid."
        );
        setSaving(false);
        return;
      }

      if (plan?.itineraryId) {
        const ref = doc(db, "itineraries", plan.itineraryId);
        await cancelAllForItinerary(plan.itineraryId);
        await updateDoc(ref, newData);

        const notifId = await scheduleDayBefore(
          { id: plan.itineraryId, preferences: newData.preferences },
          9,
          0
        );
        await updateDoc(ref, {
          notifDayBeforeId: notifId || null,
          notificationUpdatedAt: serverTimestamp()
        });

        Alert.alert("Success", "Itinerary updated successfully!");
        navigation.navigate("FuzzyPlan");
      } else {
        const createdRef = await addDoc(collection(db, "itineraries"), {
          ...newData,
          createdAt: serverTimestamp()
        });
        await cancelAllForItinerary(createdRef.id);

        const notifId = await scheduleDayBefore(
          { id: createdRef.id, preferences: newData.preferences },
          9,
          0
        );
        await updateDoc(createdRef, {
          notifDayBeforeId: notifId || null,
          notificationUpdatedAt: serverTimestamp()
        });

        Alert.alert("Success", "Itinerary saved successfully!");
        navigation.navigate("FuzzyPlan");
      }
    } catch (err) {
      console.error("Error saving itinerary:", err);
      Alert.alert("Error", "Failed to save itinerary.");
    } finally {
      setSaving(false);
    }
  }, [
    plan?.meta,
    plan?.itineraryId,
    itineraryName,
    selectedDays,
    primaryHotel,
    secondaryHotel,
    allowSplitStay,
    totalHotelCost,
    totalMealsCost,
    totalActivitiesCost,
    grandTotal,
    navigation
  ]);

  /* -------------------------------------------------------
     Render Helpers
  ------------------------------------------------------- */

  const renderActivityBullets = useCallback((p) => {
    const listedActs = Array.isArray(p.activities) ? p.activities : [];
    if (!listedActs.length) {
      return <Text style={styles.noActs}>No listed activities</Text>;
    }
    return (
      <View style={styles.activitiesList}>
        {listedActs.map((act, idx) => (
          <Text key={idx} style={styles.actBullet}>
            • {act}
          </Text>
        ))}
      </View>
    );
  }, []);

  const tabs = useMemo(
    () => [
      { key: "lodging", label: "Lodging" },
      { key: "meals", label: "Meals" },
      { key: "activities", label: "Activities" },
      { key: "build", label: "Build Plan" }
    ],
    []
  );

  const mealTabs = useMemo(
    () => [
      { key: "breakfast", label: "Breakfast" },
      { key: "lunch", label: "Lunch" },
      { key: "dinner", label: "Dinner" }
    ],
    []
  );

  const dayLocked = isDayLocked48h(dayIdx);

  /* -------------------------------------------------------
     Render
  ------------------------------------------------------- */

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.nameCard}>
          <Text style={styles.label}>Itinerary Name</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g. Bacolod Trip 2025"
            placeholderTextColor="#9ca3af"
            value={itineraryName}
            onChangeText={setItineraryName}
          />
        </View>

        <Text style={styles.screenTitle}>Recommendations</Text>
      </View>

      {/* Main Tab Bar */}
      <TabBar
        tabs={tabs}
        current={tab}
        onChange={(newTab) => {
          setTab(newTab);
          scrollToTop();
          if (newTab === 1 || newTab === 2) {
            setDayIdx(1);
          }
        }}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Lodging */}
        {tab === 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bed-outline" size={18} color="#1f2937" />
              <Text style={styles.sectionTitle}>Hotels & Accommodation</Text>
            </View>

            {nights < 2 && (
              <Text style={styles.note}>
                Hotel selection is available for trips of{" "}
                <Text style={styles.noteBold}>2 days / 1 night and beyond</Text>.
              </Text>
            )}

            {nights > 2 && (
              <View style={styles.rowBetween}>
                <Text style={styles.smallLabel}>
                  Allow split-stay (optional)
                </Text>
                <Switch
                  value={allowSplitStay}
                  onValueChange={setAllowSplitStay}
                />
              </View>
            )}

            <TierList
              title="Highly Recommended"
              items={hotelHighly}
              openWhy={openWhy}
              openPreview={openPreview}
              renderRight={(p) => (
                <View style={styles.rightCostBlock}>
                  <Peso
                    value={
                      p.totalCost ??
                      hotelReco.nights * (p.nightlyPrice || 0)
                    }
                  />
                  <Text style={styles.subNote}>
                    for {hotelReco.nights} night(s)
                  </Text>
                  <SmallButton
                    title={
                      (primaryHotel?.id === p.id && "Primary ✓") ||
                      (secondaryHotel?.id === p.id && "Secondary ✓") ||
                      "Select"
                    }
                    onPress={() => pickHotel(p)}
                    disabled={!canPickHotel}
                  />
                </View>
              )}
            />

            <TierList
              title="Considerate"
              items={hotelConsiderable}
              openWhy={openWhy}
              openPreview={openPreview}
              renderRight={(p) => (
                <View style={styles.rightCostBlock}>
                  <Peso
                    value={
                      p.totalCost ??
                      hotelReco.nights * (p.nightlyPrice || 0)
                    }
                  />
                  <Text style={styles.subNote}>
                    for {hotelReco.nights} night(s)
                  </Text>
                  <SmallButton
                    title={
                      (primaryHotel?.id === p.id && "Primary ✓") ||
                      (secondaryHotel?.id === p.id && "Secondary ✓") ||
                      "Select"
                    }
                    onPress={() => pickHotel(p)}
                    disabled={!canPickHotel}
                  />
                </View>
              )}
            />
          </View>
        )}

        {/* Meals */}
        {tab === 1 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="restaurant-outline" size={18} color="#1f2937" />
              <Text style={styles.sectionTitle}>Meal Plan</Text>
            </View>

              <DayTabs
                  daysCount={daysCount}
                  day={dayIdx}
                  setDay={(d) => {
                    scrollToTop();
                    setDayIdx(d);
                  }}
                />

            <LockBanner lockedHint={lockedHint} />

            {/* Meal sub-tabs */}
            <TabBar
              tabs={mealTabs}
              current={mealTab}
              onChange={(newMealTab) => {
                setMealTab(newMealTab);
                scrollToTop();
              }}
            />

            <TierList
              title="Highly Recommended"
              items={mealHighly}
              openWhy={openWhy}
              openPreview={openPreview}
              renderRight={(p) => {
                const slot = mealTabs[mealTab].key;
                const isSel = selectedDays?.[dayIdx - 1]?.[slot]?.id === p.id;
                return (
                  <SmallButton
                    title={isSel ? "Selected ✓" : "Select"}
                    onPress={() => setMealForDay(slot, p)}
                    disabled={dayLocked || isSel}
                  />
                );
              }}
            />

            <TierList
              title="Considerate"
              items={mealConsiderable}
              openWhy={openWhy}
              openPreview={openPreview}
              renderRight={(p) => {
                const slot = mealTabs[mealTab].key;
                const isSel = selectedDays?.[dayIdx - 1]?.[slot]?.id === p.id;
                return (
                  <SmallButton
                    title={isSel ? "Selected ✓" : "Select"}
                    onPress={() => setMealForDay(slot, p)}
                    disabled={dayLocked || isSel}
                  />
                );
              }}
            />

            <View style={[styles.section, styles.sectionNested]}>
              <Text style={styles.tierTitle}>Day {dayIdx} — Chosen Meals</Text>
              <Text style={styles.selLine}>
                Breakfast: {selectedDays[dayIdx - 1]?.breakfast?.name || "—"}
              </Text>
              <Text style={styles.selLine}>
                Lunch: {selectedDays[dayIdx - 1]?.lunch?.name || "—"}
              </Text>
              <Text style={styles.selLine}>
                Dinner: {selectedDays[dayIdx - 1]?.dinner?.name || "—"}
              </Text>
            </View>
          </View>
        )}

        {/* Activities */}
        {tab === 2 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bicycle-outline" size={18} color="#1f2937" />
              <Text style={styles.sectionTitle}>Activities</Text>
            </View>

          <DayTabs
            daysCount={daysCount}
            day={dayIdx}
            setDay={(d) => {
              scrollToTop();
              setDayIdx(d);
            }}
          />

            <LockBanner lockedHint={lockedHint} />

            <TierList
              title="Highly Recommended"
              items={actHighly}
              openWhy={openWhy}
              openPreview={openPreview}
              renderLeftContent={renderActivityBullets}
              renderRight={(p) => {
                const selected = (selectedDays[dayIdx - 1]?.activities || []).some(
                  (x) => x.id === p.id
                );
                return (
                  <SmallButton
                    title={selected ? "Remove" : "Add"}
                    onPress={() => toggleActivityForDay(p)}
                    disabled={dayLocked}
                  />
                );
              }}
            />

            <TierList
              title="Considerate"
              items={actConsiderable}
              openWhy={openWhy}
              openPreview={openPreview}
              renderLeftContent={renderActivityBullets}
              renderRight={(p) => {
                const selected = (selectedDays[dayIdx - 1]?.activities || []).some(
                  (x) => x.id === p.id
                );
                return (
                  <SmallButton
                    title={selected ? "Remove" : "Add"}
                    onPress={() => toggleActivityForDay(p)}
                    disabled={dayLocked}
                  />
                );
              }}
            />

            <View style={[styles.section, styles.sectionNested]}>
              <Text style={styles.tierTitle}>Day {dayIdx} — Activities</Text>
              <Text style={styles.selLine}>
                {(selectedDays[dayIdx - 1]?.activities || [])
                  .map((a) => a.name || a.title)
                  .join(", ") || "—"}
              </Text>
            </View>
          </View>
        )}

        {/* Build Plan */}
        {tab === 3 && (
          <View style={styles.section}>
            {budgetExceeded && (
              <View style={styles.budgetBanner}>
                <Text style={styles.budgetBannerTitle}>Over budget</Text>
                <Text style={styles.budgetBannerText}>
                  Max budget: ₱{maxBudget.toLocaleString()} • Current total: ₱
                  {grandTotal.toLocaleString()}
                </Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Build Plan — Summary</Text>
            <Text style={styles.selLine}>
              Hotel: {primaryHotel?.name || "—"}
              {allowSplitStay && secondaryHotel
                ? ` + ${secondaryHotel.name}`
                : ""}
            </Text>
            <Text style={styles.selLine}>
              Hotel Cost: <Peso value={totalHotelCost} />
            </Text>

            <View style={styles.smallSpacer} />
            {selectedDays.map((d, idx) => (
              <View key={idx} style={styles.daySummaryBlock}>
                <Text style={styles.tierTitle}>Day {idx + 1}</Text>
                <Text style={styles.selLine}>
                  Breakfast: {d.breakfast?.name || "—"}
                </Text>
                <Text style={styles.selLine}>
                  Lunch: {d.lunch?.name || "—"}
                </Text>
                <Text style={styles.selLine}>
                  Dinner: {d.dinner?.name || "—"}
                </Text>
                <Text style={styles.selLine}>
                  Activities:{" "}
                  {(d.activities || [])
                    .map((a) => a.name || a.title)
                    .join(", ") || "—"}
                </Text>
              </View>
            ))}

            <View style={styles.smallSpacer} />
            <Text style={styles.selLine}>
              Meals Total: <Peso value={totalMealsCost} />
            </Text>
            <Text style={styles.selLine}>
              Activities Total: <Peso value={totalActivitiesCost} />
            </Text>
            <Text style={[styles.selLine, styles.totalBold]}>
              Grand Total:{" "}
              <Peso
                value={Number(
                  totalHotelCost + totalMealsCost + totalActivitiesCost
                )}
              />
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Save button fixed footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name="save-outline" size={18} color="white" />
          <Text style={styles.saveText}>
            {saving ? "Saving..." : "Save Itinerary"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Destination Preview Modal */}
      <DestinationPreviewModal
        visible={previewModalVisible}
        onClose={() => setPreviewModalVisible(false)}
        destination={previewDestination}
        startCity={plan?.meta?.startCity}
      />

      {/* Why This Place Modal */}
      <WhyThisPlaceModal
        visible={whyVisible}
        onClose={() => setWhyVisible(false)}
        data={whyData}
      />
    </View>
  );
}

/* =======================================================
   Styles (same as you already have)
======================================================= */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f9fafb"
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8
  },
  container: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 120
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 12
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 4
  },
  tabActive: {
    backgroundColor: "#1877F2"
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827"
  },
  tabTextActive: {
    color: "white"
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  sectionNested: {
    marginTop: 8
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginLeft: 8
  },
  tier: {
    marginBottom: 8
  },
  tierTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4b5563",
    marginBottom: 6
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#ffffff"
  },
  cardLeft: {
    flex: 1,
    paddingRight: 8
  },
  cardRight: {
    alignItems: "flex-end",
    justifyContent: "flex-start"
  },
  placeName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827"
  },
  placeMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2
  },
  scoreChip: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4
  },
  peso: {
    fontWeight: "800",
    color: "#0f172a"
  },
  subNote: {
    fontSize: 11,
    color: "#6b7280"
  },
  note: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 10
  },
  noteBold: {
    fontWeight: "700"
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  smallLabel: {
    fontSize: 13,
    color: "#0f172a"
  },
  dayTabsRow: {
    flexDirection: "row",
    marginBottom: 8
  },
  dayTab: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    marginRight: 6
  },
  dayTabActive: {
    backgroundColor: "#1877F2"
  },
  dayTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827"
  },
  dayTabTextActive: {
    color: "white"
  },
  selLine: {
    fontSize: 13,
    color: "#0f172a",
    marginBottom: 2
  },
  sbtn: {
    marginTop: 6,
    backgroundColor: "#111827",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8
  },
  sbtnDisabled: {
    opacity: 0.5
  },
  sbtnText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700"
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb"
  },
  saveBtn: {
    backgroundColor: "#0f37f1",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row"
  },
  saveBtnDisabled: {
    opacity: 0.7
  },
  saveText: {
    color: "white",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8
  },
  nameCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4
  },
  nameInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#f9fafb"
  },
  lockBanner: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
    borderWidth: 1,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8
  },
  lockBannerTitle: {
    color: "#92400E",
    fontWeight: "700"
  },
  lockBannerText: {
    color: "#92400E",
    fontSize: 12,
    marginTop: 2
  },
  budgetBanner: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },
  budgetBannerTitle: {
    color: "#991B1B",
    fontWeight: "800"
  },
  budgetBannerText: {
    color: "#7F1D1D"
  },
  noActs: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4
  },
  activitiesList: {
    marginTop: 6,
    alignItems: "flex-start"
  },
  actBullet: {
    fontSize: 11,
    color: "#475569",
    marginBottom: 1
  },
  whyBtn: {
    padding: 4,
    marginBottom: 4,
    alignSelf: "flex-end"
  },
  rightCostBlock: {
    alignItems: "flex-end"
  },
  smallSpacer: {
    height: 8
  },
  daySummaryBlock: {
    marginBottom: 8
  },
  totalBold: {
    fontWeight: "800"
  }
});
