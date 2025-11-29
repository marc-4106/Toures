// src/features/user/screens/TermsConditionsScreen.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TermsConditionsScreen({ navigation }) {
  const terms = [
    {
      title: "1. Acceptance of Terms",
      content:
        "By using the TOURES mobile application or web system, users agree to comply with these Terms and Conditions. Continued use constitutes acceptance of all provisions herein.",
    },
    {
      title: "2. System Purpose",
      content:
        "TOURES is designed as a smart tourism platform to improve itinerary planning, promote local attractions and support tourism administration within Negros Occidental.",
    },
    {
      title: "3. User Responsibilities",
      content:
        "• Users must provide accurate information when creating accounts or using system features.\n• Misuse of the system (e.g., false reports, unauthorized data entry, or misuse of content) is prohibited.\n• Users must respect local laws and cultural norms when visiting destinations.",
    },
    {
      title: "4. Data Privacy",
      content:
        "All data collected through TOURES is stored securely in Firebase databases and accessible only to authorized personnel. Personal information will not be sold or disclosed to third parties without consent.",
    },
    {
      title: "5. Intellectual Property",
      content:
        "All content within TOURES, including design, text, images and software, is owned by the TOURES development team and respective partners. Unauthorized reproduction or modification is prohibited.",
    },
    {
      title: "6. Accuracy of Information",
      content:
        "Tourism administrators are responsible for ensuring that destination and event information is up-to-date. TOURES and its developers are not liable for outdated or inaccurate content provided by third parties.",
    },
    {
      title: "7. Limitation of Liability",
      content:
        "TOURES provides travel recommendations for informational purposes only. Users are responsible for their travel decisions. The developers and affiliates are not liable for any damages, losses or injuries resulting from the use of the system.",
    },
    {
      title: "8. System Availability",
      content:
        "While TOURES aims to maintain continuous service, occasional downtimes may occur for maintenance or updates. The developers do not guarantee uninterrupted access.",
    },
    {
      title: "9. Modifications to Terms",
      content:
        "TOURES reserves the right to update or modify these Terms at any time without prior notice. Continued use after changes signifies acceptance of the revised Terms.",
    },
    {
      title: "10. Governing Law",
      content:
        "These Terms shall be governed by the laws of the Republic of the Philippines. Any disputes will be settled within the jurisdiction of Bacolod City courts.",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.container}>
        {terms.map((item, index) => (
          <View key={index} style={styles.termItem}>
            <Text style={styles.termTitle}>{item.title}</Text>
            <Text style={styles.termContent}>{item.content}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  backBtn: {
    marginRight: 12,
    padding: 6,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },

  container: {
    padding: 16,
    paddingBottom: 40,
  },

  termItem: {
    marginBottom: 20,
  },

  termTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },

  termContent: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
});
