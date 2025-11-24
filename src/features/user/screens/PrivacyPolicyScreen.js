// src/features/user/screens/PrivacyPolicyScreen.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  Platform,
  StatusBar
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// --- Helper Components for Uniform Styling ---
const SectionTitle = ({ children }) => <Text style={styles.h2}>{children}</Text>;
const SubSection = ({ title, children }) => (
  <View style={styles.subSection}>
    <Text style={styles.h3}>{title}</Text>
    {children}
  </View>
);
const Paragraph = ({ children }) => <Text style={styles.p}>{children}</Text>;
const Bullet = ({ children }) => (
  <View style={styles.bulletRow}>
    <Text style={styles.bulletDot}>•</Text>
    <Text style={styles.bulletText}>{children}</Text>
  </View>
);

export default function PrivacyPolicyScreen({ navigation }) {
  
  const handleEmail = () => {
    Linking.openURL("mailto:toures.bcd@gmail.com");
  };

  const handleCall = () => {
    Linking.openURL("tel:09173087275");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Intro Box */}
        <View style={styles.introContainer}>
          <Text style={styles.appTitle}>TOURES</Text>
          <Text style={styles.meta}>Effective Date: December 5, 2025</Text>
          <Text style={styles.meta}>Last Updated: December 5, 2025</Text>
          <View style={styles.divider} />
          <Paragraph>
            TOURES ("we," "our," or "us") is a Smart Tourism Expert System utilizing GIS and Fuzzy Logic Modeling designed to enhance the tourism experience in Negros Occidental, with Bacolod City as the pilot site. This Privacy Policy explains how we collect, use, disclose, and protect your information when you use the TOURES Mobile Application and Web Dashboard.
          </Paragraph>
          <Paragraph>
            By accessing or using TOURES, you agree to the practices described in this Privacy Policy.
          </Paragraph>
        </View>

        {/* 1. Information We Collect */}
        <SectionTitle>1. Information We Collect</SectionTitle>
        <Paragraph>We collect information to provide essential features such as personalized itineraries, location-based services, and tourism content management.</Paragraph>
        
        <SubSection title="1.1 Personal Information">
          <Paragraph>Collected during account creation or login:</Paragraph>
          <Bullet>Full name</Bullet>
          <Bullet>Email address</Bullet>
          <Bullet>Password (encrypted)</Bullet>
          <Bullet>Profile settings and preferences</Bullet>
        </SubSection>

        <SubSection title="1.2 Location Data">
          <Paragraph>Used for:</Paragraph>
          <Bullet>Identifying nearby tourist destinations</Bullet>
          <Bullet>Navigation via GIS/Google Maps</Bullet>
          <Bullet>Generating personalized recommendations</Bullet>
          <Text style={[styles.p, styles.italic]}>Real-time GPS location is only collected with user permission.</Text>
        </SubSection>

        <SubSection title="1.3 User Preferences and Inputs">
          <Paragraph>Collected when using itinerary planning and expert system features:</Paragraph>
          <Bullet>Budget range & Interest levels</Bullet>
          <Bullet>Preferred destinations</Bullet>
          <Bullet>Season-related choices</Bullet>
          <Bullet>Saved favorites & Search queries</Bullet>
        </SubSection>

        <SubSection title="1.4 Device Information">
          <Paragraph>Automatically collected to ensure proper system performance:</Paragraph>
          <Bullet>Device type & Operating system</Bullet>
          <Bullet>App version</Bullet>
          <Bullet>Log data and crash reports</Bullet>
        </SubSection>

        <SubSection title="1.5 Administrator Data (Web Dashboard)">
          <Paragraph>For tourism office personnel:</Paragraph>
          <Bullet>Admin account details</Bullet>
          <Bullet>Content management actions & logs</Bullet>
        </SubSection>

        {/* 2. How We Use Your Information */}
        <SectionTitle>2. How We Use Your Information</SectionTitle>
        <SubSection title="2.1 System Functionality">
          <Bullet>Generating personalized travel recommendations through Fuzzy Logic Modeling</Bullet>
          <Bullet>Displaying tourist spots and navigation routes via GIS</Bullet>
          <Bullet>Showing updated tourism information and local events</Bullet>
        </SubSection>

        <SubSection title="2.2 Account & Security Management">
          <Bullet>User authentication</Bullet>
          <Bullet>Authorization of tourist and admin roles</Bullet>
          <Bullet>Fraud prevention & system monitoring</Bullet>
        </SubSection>

        <SubSection title="2.3 Application Improvement">
          <Bullet>Error detection & Feature updates</Bullet>
          <Bullet>Analytics to improve user experience</Bullet>
        </SubSection>

        <SubSection title="2.4 Communication">
          <Bullet>Sending event notifications and tourism updates</Bullet>
        </SubSection>

        {/* 3. Data Storage and Security */}
        <SectionTitle>3. Data Storage and Security</SectionTitle>
        <Paragraph>We prioritize user privacy and follow strict security standards:</Paragraph>
        
        <SubSection title="3.1 Secure Data Storage">
          <Paragraph>All data is stored in Firebase Firestore and Firebase Authentication, which provide:</Paragraph>
          <Bullet>Encrypted storage</Bullet>
          <Bullet>Controlled read/write permissions</Bullet>
          <Bullet>Real-time synchronization</Bullet>
        </SubSection>

        <SubSection title="3.2 Access Control">
          <Bullet>Only authorized administrators can modify tourism content</Bullet>
          <Bullet>Super Admin oversees account management</Bullet>
          <Bullet>All access is logged for security purposes</Bullet>
        </SubSection>

        <SubSection title="3.3 Protection Measures">
          <Bullet>Use of HTTPS for data transmission</Bullet>
          <Bullet>Strong password enforcement</Bullet>
          <Bullet>Regular security audits</Bullet>
        </SubSection>

        {/* 4. Data Sharing and Disclosure */}
        <SectionTitle>4. Data Sharing and Disclosure</SectionTitle>
        <Paragraph>TOURES does not sell or rent personal data. We may share information only under the following circumstances:</Paragraph>
        
        <SubSection title="4.1 With Authorized Tourism Administrators">
          <Bullet>Reviewing user feedback & content updates</Bullet>
          <Bullet>Ensuring accurate tourism information</Bullet>
        </SubSection>

        <SubSection title="4.2 Third-Party Services">
          <Paragraph>We may share limited data with:</Paragraph>
          <Bullet>Google Maps API (location & navigation)</Bullet>
          <Bullet>Firebase (authentication & database operations)</Bullet>
        </SubSection>

        <SubSection title="4.3 Legal Compliance">
          <Paragraph>We may disclose information if required by law, to respond to legal processes, or to protect system integrity or user safety.</Paragraph>
        </SubSection>

        {/* 5. Your Rights */}
        <SectionTitle>5. Your Rights</SectionTitle>
        <Paragraph>Users have the right to:</Paragraph>
        <Bullet>Access personal data stored in their account</Bullet>
        <Bullet>Update or correct profile information</Bullet>
        <Bullet>Delete their account</Bullet>
        <Bullet>Withdraw location permissions at any time</Bullet>
        <Bullet>Opt out of notifications</Bullet>
        <TouchableOpacity onPress={handleEmail}>
          <Text style={styles.linkText}>To exercise your rights, contact us.</Text>
        </TouchableOpacity>

        {/* 6. Data Retention */}
        <SectionTitle>6. Data Retention</SectionTitle>
        <Paragraph>
          We retain data only as long as necessary for providing services, complying with legal requirements, and maintaining security. If an account is deleted, associated personal data is securely removed from Firebase unless law requires otherwise.
        </Paragraph>

        {/* 7. Children's Privacy */}
        <SectionTitle>7. Children's Privacy</SectionTitle>
        <Paragraph>
          TOURES is not intended for users under 13 years old. We do not knowingly collect children’s personal information.
        </Paragraph>

        {/* 8. Ethical Considerations */}
        <SectionTitle>8. Ethical and Cultural Considerations</SectionTitle>
        <Bullet>Ensures transparency and accuracy of tourism information</Bullet>
        <Bullet>Promotes cultural sensitivity and sustainable tourism</Bullet>
        <Bullet>Avoids dissemination of misleading, harmful, or discriminatory content</Bullet>

        {/* 9. Changes */}
        <SectionTitle>9. Changes to This Privacy Policy</SectionTitle>
        <Paragraph>
          We may update this Privacy Policy periodically. Changes will be posted within the app and dashboard with a new effective date.
        </Paragraph>

        {/* 10. Contact Us */}
        <View style={styles.contactBox}>
          <Text style={styles.h2Center}>10. Contact Us</Text>
          <Paragraph>For questions, concerns, or data requests:</Paragraph>
          <Text style={styles.contactLabel}>TOURES Support Team</Text>
          
          <TouchableOpacity onPress={handleEmail} style={styles.contactRow}>
            <Ionicons name="mail-outline" size={20} color="#2563eb" />
            <Text style={styles.linkText}>toures.bcd@gmail.com</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCall} style={styles.contactRow}>
            <Ionicons name="call-outline" size={20} color="#2563eb" />
            <Text style={styles.linkText}>09173087275</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  backButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  introContainer: {
    marginBottom: 24,
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  appTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#cbd5e1",
    marginVertical: 12,
  },
  h2: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 24,
    marginBottom: 12,
  },
  h2Center: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 12,
    textAlign: "center",
  },
  h3: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  subSection: {
    paddingLeft: 8,
    marginBottom: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#e2e8f0",
    marginLeft: 4,
    paddingVertical: 2,
  },
  p: {
    fontSize: 14,
    lineHeight: 22,
    color: "#475569",
    marginBottom: 10,
  },
  italic: {
    fontStyle: "italic",
    color: "#64748b",
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 6,
    paddingRight: 10,
  },
  bulletDot: {
    fontSize: 14,
    color: "#0f172a",
    marginRight: 8,
    marginTop: 4,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: "#475569",
  },
  contactBox: {
    marginTop: 30,
    padding: 20,
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    alignItems: "center",
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a8a",
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  linkText: {
    fontSize: 15,
    color: "#2563eb",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});