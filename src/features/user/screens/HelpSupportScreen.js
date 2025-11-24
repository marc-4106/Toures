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

// --- Main Screen Component ---
export default function HelpSupportScreen({ navigation }) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [userId, setUserId] = useState(null); // ✅ Added userId state
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);

  useEffect(() => {
    const fetchUserData = () => {
      const user = auth.currentUser;
      if (user) {
        if (user.email) setUserEmail(user.email);
        if (user.uid) setUserId(user.uid); // ✅ Fetch userId from Firebase
      }
      setIsLoadingEmail(false);
    };
    fetchUserData();
  }, []);

  const openSupportForm = () => {
    if (!userEmail || !userId) {
      Alert.alert(
        "Authentication Error",
        "User data is not available. Please wait or re-log in."
      );
      return;
    }
    setIsModalVisible(true);
  };

  const closeSupportForm = () => setIsModalVisible(false);
  const openStatus = () =>
    Linking.openURL("https://example.com/status").catch(() => {});
  //const openFAQ = () => {};
  const openGuides = () => Alert.alert("Quick Start", "Show short how-to guides here.");

  const contactLabel = isLoadingEmail ? "Loading user data..." : "Submit a Request";
  const contactSub = isLoadingEmail ? "Please wait" : "Create a support ticket";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.screenTitle}>Help and Support</Text>

      <Section title="Overview">
        <View style={styles.blurb}>
          <Text style={styles.blurbText}>
            Find quick answers, contact our team, and learn how to use Toures.
            Trip reminders use Philippine time (GMT+8).
          </Text>
        </View>
      </Section>

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
            onPress={userEmail && userId ? openSupportForm : null} // ✅ Ensure both are present
          />
        )}
      </Section>

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

      <View style={{ height: 24 }} />

      {/* ✅ Pass both userEmail and userId to modal */}
      {userEmail && userId && (
        <SupportFormModal
          visible={isModalVisible}
          onClose={closeSupportForm}
          userEmail={userEmail}
          userId={userId}
        />
      )}
    </ScrollView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff" },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  section: { marginTop: 12 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 6,
    marginLeft: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
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
  rowLabel: { fontSize: 14, color: "#0f172a", fontWeight: "700" },
  rowSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  blurb: { paddingHorizontal: 12, paddingVertical: 10 },
  blurbText: { color: "#475569", fontSize: 13, lineHeight: 19 },
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
