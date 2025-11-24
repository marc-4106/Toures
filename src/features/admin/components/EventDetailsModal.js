import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Pressable,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDateForInput } from "../services/eventService";

export default function EventDetailsModal({ visible, onClose, event }) {
  if (!event) return null;

  const formattedStart = formatDateForInput(event.startDate);
  const formattedEnd = event.endDate ? formatDateForInput(event.endDate) : null;
  const isWeb = Platform.OS === "web";
  const isAndroid = Platform.OS === "android";

  const screenHeight = Dimensions.get("window").height;

  // --- Grouping Logic ---
  const { sortedDates, groups } = useMemo(() => {
    const groups = {};
    const list = event.subEvents || [];

    list.forEach((item) => {
      const dateKey = item.date || "Undated";
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => {
      if (a === "Undated") return 1;
      if (b === "Undated") return -1;
      return new Date(a) - new Date(b);
    });

    sortedDates.forEach((date) => {
      groups[date].sort((a, b) => {
        const tA = a.time || "";
        const tB = b.time || "";
        return tA.localeCompare(tB);
      });
    });

    return { sortedDates, groups };
  }, [event]);

  return (
    <Modal
      visible={visible}
      animationType={isWeb ? "fade" : "slide"}
      transparent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={isAndroid ? onClose : undefined}>
        <View style={styles.modalBackdrop} />
      </TouchableWithoutFeedback>

      {/* Content Wrapper */}
      <View style={styles.centerContainer}>
        <View
          style={[
            styles.modalContent,
            isWeb && styles.webModalContent,
            {
              maxHeight: isAndroid ? screenHeight * 0.90 : "85%",
            },
          ]}
        >
          {/* Header Section */}
          <View style={styles.header}>
            {event.imageUrl ? (
              <Image
                source={{ uri: event.imageUrl }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.bannerImage, styles.placeholderBanner]}>
                <Ionicons name="image-outline" size={40} color="#94a3b8" />
              </View>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

                      {/* Title Row */}
            <View style={styles.titleRow}>
              <Text style={styles.title}>{event.title}</Text>

              <View
                style={[
                  styles.badge,
                  event.status === "active"
                    ? styles.activeBadge
                    : styles.archivedBadge,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    event.status === "active"
                      ? styles.activeText
                      : styles.archivedText,
                  ]}
                >
                  {event.status === "active" ? "Active" : "Archived"}
                </Text>
              </View>
            </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >


            {/* Description */}
            <Text style={styles.description}>
              {event.description || "No description provided."}
            </Text>

            {/* Date Info */}
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={18} color="#0f37f1" />
                <Text style={styles.infoText}>
                  {formattedStart}
                  {event.eventType === "range" && ` ➔ ${formattedEnd}`}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={18} color="#64748b" />
                <Text style={styles.infoText}>
                  {event.eventType === "range"
                    ? "Multi-day Event"
                    : "Single Day Event"}
                </Text>
              </View>
            </View>

            {/* Sub Events */}
            {sortedDates.length > 0 && (
              <View style={styles.subEventsSection}>
                <Text style={styles.sectionHeader}>Activities Schedule</Text>

                {sortedDates.map((dateKey) => (
                  <View key={dateKey} style={styles.dateGroup}>
                    <View style={styles.dateHeader}>
                      <Ionicons name="calendar-outline" size={14} color="#64748b" />
                      <Text style={styles.dateTitle}>{dateKey}</Text>
                    </View>

                    <View style={styles.groupList}>
                      {groups[dateKey].map((sub, index) => (
                        <View key={index} style={styles.scheduleRow}>
                          <View style={styles.timeCol}>
                            <Text style={styles.timeText}>
                              {sub.time || "--:--"}
                            </Text>
                            {index < groups[dateKey].length - 1 && (
                              <View style={styles.timelineLine} />
                            )}
                          </View>

                          <View style={styles.detailsCol}>
                            <Text style={styles.subTitle}>{sub.title}</Text>
                            {sub.location ? (
                              <View style={styles.locationRow}>
                                <Ionicons
                                  name="location-sharp"
                                  size={12}
                                  color="#64748b"
                                />
                                <Text style={styles.locationText}>
                                  {sub.location}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable style={styles.closeFooterBtn} onPress={onClose}>
              <Text style={styles.closeFooterText}>Close View</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ============= STYLES (Fully Optimized for Android) ============= */

const styles = StyleSheet.create({
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  centerContainer: {
    flex: 1,
    justifyContent: Platform.OS === "web" ? "center" : "flex-end",
    paddingHorizontal: Platform.OS === "web" ? 20 : 0,
  },

  modalContent: {
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 600,
    borderTopLeftRadius: Platform.OS === "android" ? 18 : 16,
    borderTopRightRadius: Platform.OS === "android" ? 18 : 16,

    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 12,
    overflow: "hidden",
  },

  webModalContent: {
    borderRadius: 16,
  },

  header: {
    position: "relative",
    height: 200,
    backgroundColor: "#f1f5f9",
  },

  bannerImage: {
    width: "100%",
    height: "100%",
  },

  placeholderBanner: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e2e8f0",
  },

  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },

  scrollContent: {
    padding: 20,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    //marginBottom: 5,
    gap: 10,
    padding: 8,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    flex: 1,
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },

  activeBadge: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  archivedBadge: {
    backgroundColor: "#fef3c7",
    borderColor: "#fde68a",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  activeText: { color: "#059669" },
  archivedText: { color: "#d97706" },

  description: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
    marginBottom: 24,
  },

  infoBox: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 24,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  infoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },

  /* Sub Events */
  subEventsSection: { marginTop: 0 },
  sectionHeader: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 14,
  },

  dateGroup: { marginBottom: 20 },

  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 14,
  },

  dateTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
  },

  groupList: {
    paddingLeft: 6,
  },

  scheduleRow: {
    flexDirection: "row",
    marginBottom: 16,
  },

  timeCol: {
    width: 70,
    alignItems: "flex-start",
    position: "relative",
  },

  timeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },

  timelineLine: {
    position: "absolute",
    top: 20,
    bottom: -10,
    left: 14,
    width: 2,
    backgroundColor: "#e2e8f0",
  },

  detailsCol: {
    flex: 1,
    backgroundColor: "#fff",
    borderLeftWidth: 2,
    borderLeftColor: "#3b82f6",
    paddingLeft: 12,
    paddingVertical: 4,
  },

  subTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 3,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  locationText: {
    fontSize: 12,
    color: "#64748b",
  },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#f1f5f9",
    backgroundColor: "#fff",
  },

  closeFooterBtn: {
    backgroundColor: "#f1f5f9",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  closeFooterText: {
    color: "#475569",
    fontWeight: "700",
  },
});
