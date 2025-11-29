import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  TextInput,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function FAQScreen( ) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [search, setSearch] = useState("");
  const navigation = useNavigation();

  const faqs = [
    {
      q: "What is TOURES?",
      a: "TOURES is your smart travel buddy! It helps you plan trips, explore destinations, and discover activities in Negros Occidental using fuzzy logic for personalized recommendations."
    },
    {
      q: "Who can use TOURES?",
      a: "Anyone who loves to travel! Tourists use the mobile app, while tourism staff use the web dashboard to manage destinations and updates."
    },
    {
      q: "How does TOURES know where to take me?",
      a: "You tell TOURES your interests, budget, distance, and time. It creates a personalized itinerary using fuzzy logic to recommend the best places."
    },
    {
      q: "Can I use TOURES without the internet?",
      a: "Some features like saved itineraries may work offline, but internet is needed for maps, updates, and event notifications."
    },
    {
      q: "Does TOURES keep my personal data private?",
      a: "Yes. Your information is secure and used only to improve your experience. It is never shared without your permission."
    },
    {
      q: "Where can I use TOURES?",
      a: "TOURES currently focuses on Bacolod City as the pilot area and will soon expand across Negros Occidental."
    },
    {
      q: "How can local businesses join TOURES?",
      a: "Business owners can contact the local tourism office. They will add the business through the TOURES admin dashboard."
    },
    {
      q: "What makes TOURES different from other travel apps?",
      a: "TOURES uses fuzzy logic and mapping tools to tailor recommendations based on your travel style, time, and budget."
    },
    {
      q: "How often is the information updated?",
      a: "Tourism administrators regularly update destinations and events to ensure accuracy."
    },
    {
      q: "Who created TOURES?",
      a: "TOURES was developed by STI West Negros University students in partnership with the Negros Occidental Tourism Office."
    }
  ];

  const filteredFAQs = useMemo(() => {
    return faqs.filter(item =>
      item.q.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const toggleItem = (index) => {
    LayoutAnimation.easeInEaseOut();
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.safeArea}>

        {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={24} color="#0f172a" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>FAQs</Text>
            </View>

      <ScrollView contentContainerStyle={styles.container}>

        {/* Header */}
       
        <Text style={styles.subHeader}>Find quick answers to common questions.</Text>

        {/* Card Wrapper */}
        <View style={styles.card}>
          {filteredFAQs.map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleItem(index)}
                style={styles.questionRow}
              >
                <Text style={styles.question}>{item.q}</Text>
                <Ionicons
                  name={activeIndex === index ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#0f172a"
                />
              </TouchableOpacity>

              {activeIndex === index && (
                <Text style={styles.answer}>{item.a}</Text>
              )}
            </View>
          ))}

          {filteredFAQs.length === 0 && (
            <Text style={styles.noResults}>No results found.</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  container: {
    padding: 16,
    paddingBottom: 40,
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
  subHeader: {
    fontSize: 15,
    color: "#64748b",
    marginBottom: 18,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: "#0f172a",
    fontSize: 15,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  faqItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  questionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  question: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    flex: 1,
    paddingRight: 10,
  },
  answer: {
    marginTop: 8,
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  noResults: {
    textAlign: "center",
    padding: 20,
    color: "#94a3b8",
    fontStyle: "italic",
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
});
