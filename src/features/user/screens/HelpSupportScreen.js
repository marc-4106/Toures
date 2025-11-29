// src/features/user/screens/HelpSupportScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SupportFormModal from "../components/SupportFormModal";
import { auth } from "../../../services/firebaseConfig";
import { useNavigation } from "@react-navigation/native";

// --- Reusable Components ---
function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ icon, label, sub, onPress }) {
  const content = (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        {!!icon && <Ionicons name={icon} size={18} color="#0f172a" />}
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel} numberOfLines={1}>
            {label}
          </Text>
          {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
        </View>
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      {content}
    </TouchableOpacity>
  );
}

// --- Main Component ---
export default function HelpSupportScreen() {
  const navigation = useNavigation(); // ✅ FIXED: Only use this
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);

  useEffect(() => {
    const fetchUserData = () => {
      const user = auth.currentUser;
      if (user) {
        setUserEmail(user.email ?? null);
        setUserId(user.uid ?? null);
      }
      setIsLoadingEmail(false);
    };
    fetchUserData();
  }, []);

  const openSupportForm = () => {
    if (!userEmail || !userId) {
      Alert.alert(
        "Authentication Error",
        "User data is not available. Please re-open the app."
      );
      return;
    }
    setIsModalVisible(true);
  };

  const openGuides = () =>
    Alert.alert("Quick Start", "Show short how-to guides here.");

  const contactLabel = isLoadingEmail ? "Loading user data..." : "Submit a Request";
  const contactSub = isLoadingEmail ? "Please wait" : "Create a support ticket";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help and Support</Text>
      </View>

      {/* Overview Section */}
      <Section title="Overview">
        <View style={styles.blurb}>
          <Text style={styles.blurbText}>
            Find quick answers, contact our team, and learn how to use Toures.
            Trip reminders use Philippine time (GMT+8).
          </Text>
        </View>
      </Section>

      {/* Contact Section */}
      <Section title="Contact">
        {isLoadingEmail ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#0f37f1" />
            <Text style={styles.loadingText}>Loading support options...</Text>
          </View>
        ) : (
          <Row
            icon="document-text-outline"
            label={contactLabel}
            sub={contactSub}
            onPress={userEmail && userId ? openSupportForm : null}
          />
        )}
      </Section>

      {/* Guides */}
      <Section title="Guides">
        <Row
          icon="book-outline"
          label="Quick start"
          sub="Create and save a trip"
          onPress={openGuides}
        />
        <Row
          icon="help-circle-outline"
          label="FAQ"
          sub="Answers to common questions"
          onPress={() => navigation.navigate("FAQScreen")}
        />
      </Section>

      {/* Spacer */}
      <View style={{ height: 24 }} />

      {/* Support Modal */}
      {userEmail && userId && (
        <SupportFormModal
          visible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          userEmail={userEmail}
          userId={userId}
        />
      )}
    </ScrollView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#ffffff",
    paddingBottom: 40,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: {
    marginRight: 12,
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },

  /* Section */
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },

  /* Rows */
  row: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "700",
  },
  rowSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },

  /* Overview */
  blurb: { paddingHorizontal: 12, paddingVertical: 10 },
  blurbText: { color: "#475569", fontSize: 13, lineHeight: 19 },

  /* Loading Row */
  loadingRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  loadingText: { fontSize: 14, color: "#64748b" },
});
