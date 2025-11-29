// src/features/admin/screens/ReportsScreen.js
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
} from "react-native";

import { BarChart, PieChart } from "react-native-chart-kit";
import ViewShot from "react-native-view-shot";
import { fetchReportMetrics } from "../../../services/firestoreReportsAndLogs";

const screenWidth = Dimensions.get("window").width;
const CHART_WIDTH = Math.min(screenWidth - 60, 900);

const chartConfig = {
  backgroundColor: "#fff",
  backgroundGradientFrom: "#f9fafb",
  backgroundGradientTo: "#f9fafb",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(15, 55, 241, ${opacity})`,
  labelColor: () => "#333",
  fillShadowGradient: "#0f37f1",
  fillShadowGradientOpacity: 1,
  propsForBackgroundLines: { stroke: "transparent" },
};

const safeName = (v) => (!v ? "Unknown" : String(v).trim());
const safeNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));

/* ================================================================
   EXPORT OPTIONS MODAL
================================================================ */
const ExportOptionsModal = ({
  visible,
  selection,
  setSelection,
  onClose,
  onConfirm,
}) => {
  const toggle = (key) => {
    setSelection((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Export Reports</Text>
          <Text style={styles.modalSubtitle}>Choose what to export</Text>

          <View style={styles.modalGrid}>
            <TouchableOpacity
              style={[
                styles.optionCard,
                selection.summary && styles.optionCardSelected,
              ]}
              onPress={() => toggle("summary")}
            >
              <Text style={styles.optionTitle}>Destination Overview</Text>
              <Text style={styles.optionDesc}>
                Summary + Completeness
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                selection.engagement && styles.optionCardSelected,
              ]}
              onPress={() => toggle("engagement")}
            >
              <Text style={styles.optionTitle}>Engagement</Text>
              <Text style={styles.optionDesc}>
                Interests + Most Used
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                selection.user && styles.optionCardSelected,
              ]}
              onPress={() => toggle("user")}
            >
              <Text style={styles.optionTitle}>User Reports</Text>
              <Text style={styles.optionDesc}>User stats</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                selection.ticket && styles.optionCardSelected,
              ]}
              onPress={() => toggle("ticket")}
            >
              <Text style={styles.optionTitle}>Ticket Reports</Text>
              <Text style={styles.optionDesc}>Support metrics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                styles.optionCardFull,
                selection.fullPage && styles.optionCardSelected,
              ]}
              onPress={() => toggle("fullPage")}
            >
              <Text style={styles.optionTitle}>Export Full Page</Text>
              <Text style={styles.optionDesc}>All sections</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalExportBtn} onPress={onConfirm}>
              <Text style={styles.modalExportText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ================================================================
   DESTINATION REPORTS
================================================================ */
const DestinationReports = ({
  metrics,
  summaryRef,
  engagementRef,
  isWide,
}) => {
  const destinationData = {
    labels: ["Total", "Active", "Archived", "Featured"],
    datasets: [
      {
        data: [
          metrics.totalDestinations || 0,
          metrics.activeDestinations || 0,
          metrics.archivedDestinations || 0,
          metrics.featuredDestinations || 0,
        ],
      },
    ],
  };

  const comp = metrics.dataCompleteness || {};
  const completenessData = {
    labels: ["Image", "Contact", "Coords", "Desc", "City", "Tags", "Activities"],
    datasets: [
      {
        data: [
          comp.missingImage || 0,
          comp.missingContact || 0,
          comp.missingCoordinates || 0,
          comp.missingDescription || 0,
          comp.missingCity || 0,
          comp.missingTags || 0,
          comp.missingActivities || 0,
        ],
      },
    ],
  };

  const tagData = (metrics.topTags || []).map((t, i) => ({
    name: `${t.tag} (${t.count})`,
    population: t.count,
    color: ["#0f37f1", "#3b82f6", "#f59e0b", "#16a34a", "#8b5cf6"][i % 5],
  }));

  const mostUsed = metrics.mostUsedDestinations || [];
  const totalMU = mostUsed.reduce((a, m) => a + safeNum(m.count), 0);

  return (
    <>
      {/* SUMMARY + COMPLETENESS */}
      <ViewShot ref={summaryRef} options={{ format: "png", quality: 1 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Destination Overview</Text>

          {/* Summary full width */}
          <View style={styles.subCard}>
            <Text style={styles.subTitle}>Destination Summary</Text>
            <BarChart
              data={destinationData}
              width={CHART_WIDTH}
              height={240}
              fromZero
              chartConfig={chartConfig}
              showValuesOnTopOfBars
              style={styles.chartBox}
            />
          </View>

          {/* Completeness full width */}
          <View style={styles.subCard}>
            <Text style={styles.subTitle}>Data Completeness</Text>
            <BarChart
              data={completenessData}
              width={CHART_WIDTH}
              height={240}
              fromZero
              chartConfig={chartConfig}
              showValuesOnTopOfBars
              style={styles.chartBox}
            />
            <Text style={styles.smallNote}>
              Quality: <Text style={styles.highlight}>{comp.completeness || 0}%</Text>
            </Text>
          </View>
        </View>
      </ViewShot>

      {/* INTERESTS + MOST USED (50/50) */}
      <ViewShot ref={engagementRef} options={{ format: "png", quality: 1 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Destination Engagement</Text>

          <View style={[styles.row, { flexDirection: isWide ? "row" : "column" }]}>
            {/* Interests */}
            <View style={[styles.subCard, styles.half]}>
              <Text style={styles.subTitle}>Most Selected Interests</Text>

              {tagData.length ? (
                tagData.map((item, i) => {
                  const total = tagData.reduce((a, b) => a + b.population, 0);
                  const percent = ((item.population / total) * 100).toFixed(1);
                  const interest = item.name.split(" (")[0];

                  return (
                    <View key={i} style={styles.interestRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.interestName}>{interest}</Text>
                        <Text style={styles.interestPercent}>{percent}%</Text>
                        <View style={styles.interestProgressBg}>
                          <View
                            style={[
                              styles.interestProgressFill,
                              { width: `${percent}%`, backgroundColor: item.color },
                            ]}
                          />
                        </View>
                      </View>
                      <Text style={styles.interestCount}>{item.population}</Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noData}>No interest data</Text>
              )}
            </View>

            {/* Most Used */}
            <View style={[styles.subCard, styles.half]}>
              <Text style={styles.subTitle}>Most Used Destinations</Text>

              {mostUsed.length ? (
                mostUsed.map((m, i) => {
                  const p = totalMU ? ((m.count / totalMU) * 100).toFixed(1) : 0;
                  return (
                    <View key={i} style={styles.interestRow}>
                      <Text style={styles.rank}>{i + 1}.</Text>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.interestName}>{safeName(m.name)}</Text>
                        <Text style={styles.interestPercent}>{p}% usage</Text>
                        <View style={styles.interestProgressBg}>
                          <View
                            style={[
                              styles.interestProgressFill,
                              { width: `${p}%`, backgroundColor: "#0f37f1" },
                            ]}
                          />
                        </View>
                      </View>
                      <Text style={styles.interestCount}>{m.count}</Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noData}>No usage data</Text>
              )}
            </View>
          </View>
        </View>
      </ViewShot>
    </>
  );
};

/* ================================================================
   USER REPORTS
================================================================ */
const UserReports = ({ metrics, userRef }) => {
  const barData = {
    labels: ["Total", "Active", "Restricted"],
    datasets: [
      {
        data: [
          metrics.totalUsers || 0,
          metrics.activeUsers || 0,
          metrics.restrictedUsers || 0,
        ],
      },
    ],
  };

  const roleData = Object.entries(metrics.roleCounts || {}).map(
    ([role, count], i) => ({
      name: role,
      population: count,
      color: ["#0f37f1", "#3b82f6", "#f59e0b", "#16a34a", "#8b5cf6"][i % 5],
    })
  );

  return (
    <ViewShot ref={userRef} options={{ format: "png", quality: 1 }}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>User Reports</Text>

        <View style={styles.subCard}>
          <Text style={styles.subTitle}>User Summary</Text>
          <BarChart
            data={barData}
            width={CHART_WIDTH}
            height={240}
            fromZero
            showValuesOnTopOfBars
            chartConfig={chartConfig}
          />
        </View>

        <View style={styles.subCard}>
          <Text style={styles.subTitle}>Role Distribution</Text>
          <PieChart
            data={roleData}
            width={CHART_WIDTH}
            height={240}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
          />
        </View>
      </View>
    </ViewShot>
  );
};

/* ================================================================
   TICKET REPORTS
================================================================ */
const TicketReports = ({ metrics, ticketRef }) => {
  const statusData = [
    {
      name: "Resolved",
      population: metrics.resolvedTickets || 0,
      color: "#16a34a",
    },
    {
      name: "Pending",
      population: metrics.newTickets || 0,
      color: "#f59e0b",
    },
  ];

  return (
    <ViewShot ref={ticketRef} options={{ format: "png", quality: 1 }}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Support Ticket Reports</Text>

        <View style={styles.subCard}>
          <Text style={styles.subTitle}>Status Overview</Text>
          <PieChart
            data={statusData}
            width={CHART_WIDTH}
            height={240}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
          />
        </View>

        <View style={styles.subCard}>
          <Text style={styles.subTitle}>Ticket Summary</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.blueLeftBorder]}>
              <Text style={styles.statLabel}>Total Tickets</Text>
              <Text style={styles.statValue}>{metrics.totalTickets || 0}</Text>
            </View>

            <View style={[styles.statCard, styles.greenLeftBorder]}>
              <Text style={styles.statLabel}>Resolved</Text>
              <Text style={styles.statValue}>{metrics.resolvedTickets || 0}</Text>
            </View>

            <View style={[styles.statCard, styles.yellowLeftBorder]}>
              <Text style={styles.statLabel}>Pending / New</Text>
              <Text style={styles.statValue}>{metrics.newTickets || 0}</Text>
            </View>

            <View style={[styles.statCard, styles.purpleLeftBorder]}>
              <Text style={styles.statLabel}>Avg. Resolution Time</Text>
              <Text style={styles.statValue}>
                {metrics.averageResolutionTime || 0} hrs
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ViewShot>
  );
};

/* ================================================================
   MAIN SCREEN + CLOUD PDF EXPORT
================================================================ */
const ReportsScreen = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportSelection, setExportSelection] = useState({
    summary: true,
    engagement: false,
    user: false,
    ticket: false,
    fullPage: false,
  });

  // Refs for screenshots
  const summaryRef = useRef();
  const engagementRef = useRef();
  const userRef = useRef();
  const ticketRef = useRef();

  useEffect(() => {
    const load = async () => {
      const data = await fetchReportMetrics();
      setMetrics(data);
      setLoading(false);
    };
    load();
  }, []);

  /* CAPTURE as base64 */
  const captureSection = async (ref, label) => {
    try {
      setLoadingMessage(`Capturing: ${label}`);
      const base64 = await ref.current.capture();
      return base64;
    } catch (err) {
      console.log("Capture failed:", label);
      return null;
    }
  };

  /* EXPORT TO FIREBASE CLOUD PDF */
  const handlePerformExport = async () => {
    try {
      setExportModalVisible(false);
      setLoading(true);
      setLoadingMessage("Preparing export...");

      let sectionsToExport = [];

      if (exportSelection.fullPage) {
        sectionsToExport = ["summary", "engagement", "user", "ticket"];
      } else {
        Object.keys(exportSelection).forEach((key) => {
          if (exportSelection[key] && key !== "fullPage") {
            sectionsToExport.push(key);
          }
        });
      }

      const payloadSections = [];

      for (const sec of sectionsToExport) {
        let img = null;

        if (sec === "summary")
          img = await captureSection(summaryRef, "Destination Overview");
        if (sec === "engagement")
          img = await captureSection(engagementRef, "Engagement");
        if (sec === "user")
          img = await captureSection(userRef, "User Reports");
        if (sec === "ticket")
          img = await captureSection(ticketRef, "Ticket Reports");

        if (img) {
          payloadSections.push({
            title:
              sec === "summary"
                ? "Destination Overview"
                : sec === "engagement"
                ? "Destination Engagement"
                : sec === "user"
                ? "User Reports"
                : "Support Ticket Reports",
            image: img,
          });
        }
      }

      if (!payloadSections.length) {
        Alert.alert("Export failed", "No sections captured.");
        setLoading(false);
        return;
      }

      setLoadingMessage("Generating PDF on server...");

      const response = await fetch(
        "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/generateReportPDF",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Toures Reports",
            sections: payloadSections,
          }),
        }
      );

      const data = await response.json();

      if (data.url) {
        setLoading(false);
        Alert.alert("PDF Ready", "Your report is generated.", [
          { text: "Open PDF", onPress: () => Linking.openURL(data.url) },
        ]);
      } else {
        throw new Error("Invalid server response");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Export Failed", "Could not generate PDF.");
      setLoading(false);
    }
  };

  if (loading && !metrics)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0f37f1" />
        <Text>Loading Reports…</Text>
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={() => setExportModalVisible(true)}
        >
          <Text style={styles.exportText}>📄 Export Reports</Text>
        </TouchableOpacity>

        <DestinationReports
          metrics={metrics}
          summaryRef={summaryRef}
          engagementRef={engagementRef}
          isWide={screenWidth > 900}
        />

        <UserReports metrics={metrics} userRef={userRef} />
        <TicketReports metrics={metrics} ticketRef={ticketRef} />
      </ScrollView>

      <ExportOptionsModal
        visible={exportModalVisible}
        selection={exportSelection}
        setSelection={setExportSelection}
        onClose={() => setExportModalVisible(false)}
        onConfirm={handlePerformExport}
      />

      {/* EXPORT LOADING OVERLAY */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      )}
    </View>
  );
};

/* ================================================================
   STYLES
================================================================ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: {
    paddingBottom: 40,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  exportBtn: {
    backgroundColor: "#0f37f1",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  exportText: { color: "white", fontWeight: "700", fontSize: 14 },

  card: {
    width: "95%",
    maxWidth: 1000,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginVertical: 12,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 16,
  },

  subCard: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f37f1",
    textAlign: "center",
    marginBottom: 10,
  },

  row: {
    width: "100%",
    justifyContent: "space-between",
  },
  half: {
    width: "48%",
  },

  chartBox: {
    borderRadius: 12,
    marginTop: 10,
  },

  interestRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  interestName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  interestPercent: {
    fontSize: 11,
    color: "#64748b",
  },
  interestProgressBg: {
    width: "100%",
    height: 5,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
    marginTop: 4,
  },
  interestProgressFill: {
    height: 5,
    borderRadius: 4,
  },
  interestCount: {
    width: 40,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
  },
  rank: {
    fontWeight: "bold",
    marginRight: 8,
    color: "#0f37f1",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 1,
    borderLeftWidth: 5,
  },
  statLabel: { fontSize: 12, color: "#64748b" },
  statValue: { fontSize: 20, fontWeight: "800", color: "#0f172a" },

  blueLeftBorder: { borderLeftColor: "#0f37f1" },
  greenLeftBorder: { borderLeftColor: "#16a34a" },
  yellowLeftBorder: { borderLeftColor: "#f59e0b" },
  purpleLeftBorder: { borderLeftColor: "#8b5cf6" },

  smallNote: {
    marginTop: 6,
    textAlign: "center",
    color: "#64748b",
  },
  highlight: { color: "#0f37f1", fontWeight: "700" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "90%",
    maxWidth: 420,
    borderRadius: 14,
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  modalSubtitle: { color: "#64748b", marginBottom: 12 },

  modalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },

  optionCard: {
    width: "48%",
    backgroundColor: "#f9fafb",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  optionCardFull: { width: "100%" },
  optionCardSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#0f37f1",
  },

  optionTitle: { fontWeight: "700", fontSize: 14, marginBottom: 4 },
  optionDesc: { fontSize: 12, color: "#64748b" },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 14,
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalCancelText: { color: "#64748b" },
  modalExportBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0f37f1",
  },
  modalExportText: { color: "white", fontWeight: "700" },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 15,
    fontWeight: "600",
  },
});

export default ReportsScreen;
