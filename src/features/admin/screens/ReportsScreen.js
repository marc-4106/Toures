import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
import { fetchReportMetrics } from "../../../services/firestoreReportsAndLogs";

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                         */
/* ------------------------------------------------------------------ */

const screenWidth = Dimensions.get("window").width;

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

const safeName = (val) =>
  !val || typeof val !== "string" ? "Unknown" : val.trim() || "Unknown";

const safeNumber = (val) => (isNaN(Number(val)) ? 0 : Number(val));

/* ------------------------------------------------------------------ */
/*  DESTINATION REPORTS COMPONENT                                     */
/* ------------------------------------------------------------------ */

const DestinationReports = ({ metrics, isWide, cardWidths, setCardWidths }) => {
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

  const completeness = metrics.dataCompleteness || {};

  const completenessValues = [
    completeness.missingImage || 0,
    completeness.missingContact || 0,
    completeness.missingCoordinates || 0,
    completeness.missingDescription || 0,
    completeness.missingCity || 0,
    completeness.missingTags || 0,
    completeness.missingActivities || 0,
  ];

  const completenessData = {
    labels: ["Image", "Contact", "Coords", "Desc", "City", "Tags", "Activities"],
    datasets: [{ data: completenessValues }],
  };

  const tagData = (metrics.topTags || []).map((item, i) => ({
    name: `${item.tag} (${item.count})`,
    population: item.count,
    color: ["#0f37f1", "#3b82f6", "#f59e0b", "#16a34a", "#8b5cf6"][i % 5],
    legendFontColor: "#333",
    legendFontSize: 12,
  }));

  const mostUsed = metrics.mostUsedDestinations || [];
  const totalMostUsedCount = mostUsed.reduce(
    (sum, d) => sum + safeNumber(d.count),
    0
  );

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Destination Reports</Text>

      {/* Row 1 */}
      <View
        style={[
          styles.row,
          { flexDirection: isWide ? "row" : "column", alignItems: "center" },
        ]}
      >
        {/* Summary */}
        <View
          style={[styles.subCard, isWide ? styles.half : styles.full]}
          onLayout={(e) =>
            setCardWidths((w) => ({
              ...w,
              summary: e.nativeEvent.layout.width,
            }))
          }
        >
          <Text style={styles.subTitle}>Destination Summary</Text>

          <BarChart
            data={destinationData}
            width={(cardWidths.summary || screenWidth) - 60}
            height={240}
            fromZero
            showValuesOnTopOfBars
            chartConfig={chartConfig}
            withInnerLines={false}
            style={styles.chartBox}
          />
        </View>

        {/* Tag Interest */}
        <View
          style={[styles.subCard, isWide ? styles.half : styles.full]}
          onLayout={(e) =>
            setCardWidths((w) => ({ ...w, tags: e.nativeEvent.layout.width }))
          }
        >
      <Text style={styles.subTitle}>Most Selected Interests</Text>

      {tagData.length > 0 ? (
        tagData
          .sort((a, b) => b.population - a.population)
          .map((item, index) => {
            const total = tagData.reduce((sum, t) => sum + t.population, 0);
            const percent = ((item.population / total) * 100).toFixed(1);
            const interest = item.name.split(" (")[0]; // Normalized interest text

            return (
              <View key={index} style={styles.interestRow}>
                {/* Text + bar */}
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text numberOfLines={1} style={styles.interestName}>
                    {interest}
                  </Text>
                  <Text style={styles.interestPercent}>{percent}%</Text>

                  {/* Slim progress bar */}
                  <View style={styles.interestProgressBg}>
                    <View
                      style={[
                        styles.interestProgressFill,
                        { width: `${percent}%`, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                </View>

                {/* Count */}
                <Text style={styles.interestCount}>{item.population}</Text>
              </View>
            );
          })
      ) : (
        <Text style={styles.noData}>No interest data available</Text>
      )}

  
        </View>
      </View>

      {/* Row 2 */}
      <View
        style={[
          styles.row,
          { flexDirection: isWide ? "row" : "column", alignItems: "center" },
        ]}
      >
        {/* Most Used */}
        <View style={[styles.subCard, isWide ? styles.oneThird : styles.full]}>
          <Text style={styles.subTitle}>Most Used Destinations</Text>

          {mostUsed.length > 0 ? (
            mostUsed.map((d, i) => {
              const count = safeNumber(d.count);
              const percentage =
                totalMostUsedCount > 0
                  ? ((count / totalMostUsedCount) * 100).toFixed(1)
                  : "0.0";

              return (
                <View key={i} style={styles.interestRow}>
                  {/* Rank Number - Kept but aligned with new style */}
                  <Text style={styles.rank}>{i + 1}.</Text>

                  {/* Text + Bar Container */}
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text numberOfLines={1} style={styles.interestName}>
                      {safeName(d.name)}
                    </Text>
                    <Text style={styles.interestPercent}>{percentage}% usage</Text>

                    {/* Slim progress bar */}
                    <View style={styles.interestProgressBg}>
                      <View
                        style={[
                          styles.interestProgressFill,
                          { width: `${percentage}%`, backgroundColor: "#0f37f1" },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Count */}
                  <Text style={styles.interestCount}>{count}×</Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.noData}>No usage data</Text>
          )}
        </View>

        {/* Completeness */}
        <View
          style={[styles.subCard, isWide ? styles.twoThird : styles.full]}
          onLayout={(e) =>
            setCardWidths((w) => ({
              ...w,
              completeness: e.nativeEvent.layout.width,
            }))
          }
        >
          <Text style={styles.subTitle}>Data Completeness</Text>

          <BarChart
            data={completenessData}
            width={(cardWidths.completeness || screenWidth) - 60}
            height={240}
            fromZero
            showValuesOnTopOfBars
            chartConfig={chartConfig}
            withInnerLines={false}
            style={styles.chartBox}
          />

          <Text style={styles.smallNote}>
            Overall Quality:{" "}
            <Text style={styles.highlight}>
              {completeness.completeness || 0}%
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/*  USER REPORTS                                                      */
/* ------------------------------------------------------------------ */

const UserReports = ({ metrics, isWide, cardWidths, setCardWidths }) => {
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

  const rolePieData = Object.entries(metrics.roleCounts || {}).map(
    ([role, count], index) => ({
      name: role,
      population: count,
      color: ["#0f37f1", "#3b82f6", "#f59e0b", "#8b5cf6", "#16a34a"][index % 5],
      legendFontColor: "#333",
      legendFontSize: 12,
    })
  );

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>User Reports</Text>

      <View
        style={[
          styles.row,
          { flexDirection: isWide ? "row" : "column", alignItems: "center" },
        ]}
      >
        <View
          style={[styles.subCard, isWide ? styles.half : styles.full]}
          onLayout={(e) =>
            setCardWidths((w) => ({
              ...w,
              userSummary: e.nativeEvent.layout.width,
            }))
          }
        >
          <Text style={styles.subTitle}>User Summary</Text>

          <BarChart
            data={barData}
            width={(cardWidths.userSummary || screenWidth) - 60}
            height={240}
            chartConfig={chartConfig}
            withInnerLines={false}
            showValuesOnTopOfBars
            style={styles.chartBox}
          />

          <Text style={styles.smallNote}>
            Verification Rate:{" "}
            <Text style={styles.highlight}>
              {metrics.verificationRate || 0}%
            </Text>
          </Text>
        </View>

        <View
          style={[styles.subCard, isWide ? styles.half : styles.full]}
          onLayout={(e) =>
            setCardWidths((w) => ({ ...w, roles: e.nativeEvent.layout.width }))
          }
        >
          <Text style={styles.subTitle}>Role Distribution</Text>

          {rolePieData.length > 0 ? (
            <PieChart
              data={rolePieData}
              width={(cardWidths.roles || screenWidth) - 80}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              absolute
            />
          ) : (
            <Text style={styles.noData}>No role data available</Text>
          )}
        </View>
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/*  TICKET REPORTS (Professional UI)                                 */
/* ------------------------------------------------------------------ */

const TicketReports = ({ metrics, isWide, cardWidths, setCardWidths }) => {
  const ticketStatusData = [
    {
      name: "Resolved",
      population: metrics.resolvedTickets || 0,
      color: "#16a34a",
      legendFontColor: "#333",
      legendFontSize: 12,
    },
    {
      name: "Pending / New",
      population: metrics.newTickets || 0,
      color: "#f59e0b",
      legendFontColor: "#333",
      legendFontSize: 12,
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Support Ticket Reports</Text>

      <View
        style={[
          styles.ticketContainer,
          { flexDirection: isWide ? "row" : "column" },
        ]}
      >
        {/* Status Chart */}
        <View
          style={[styles.ticketChartBox, !isWide && styles.fullWidth]}
          onLayout={(e) =>
            setCardWidths((w) => ({
              ...w,
              ticketStatus: e.nativeEvent.layout.width,
            }))
          }
        >
          <Text style={styles.sectionTitle}>Status Overview</Text>

          <PieChart
            data={ticketStatusData}
            width={(cardWidths.ticketStatus || screenWidth) - 60}
            height={240}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            absolute
          />
        </View>

        {/* Summary Cards */}
        <View style={[styles.ticketSummaryBox, !isWide && styles.fullWidth]}>
          <Text style={styles.sectionTitle}>Ticket Summary</Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.blueLeftBorder]}>
              <Text style={styles.statLabel}>Total Tickets</Text>
              <Text style={styles.statValue}>{metrics.totalTickets || 0}</Text>
            </View>

            <View style={[styles.statCard, styles.greenLeftBorder]}>
              <Text style={styles.statLabel}>Resolved</Text>
              <Text style={styles.statValue}>
                {metrics.resolvedTickets || 0}
              </Text>
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
    </View>
  );
};

/* ------------------------------------------------------------------ */
/*  MAIN SCREEN                                                       */
/* ------------------------------------------------------------------ */

const ReportsScreen = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardWidths, setCardWidths] = useState({});

  useEffect(() => {
    const loadReports = async () => {
      try {
        const data = await fetchReportMetrics();
        setMetrics(data);
      } catch (error) {
        console.error("Failed to load metrics:", error);
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0f37f1" />
        <Text>Loading Reports...</Text>
      </View>
    );

  if (!metrics)
    return (
      <View style={styles.centered}>
        <Text>No report data available.</Text>
      </View>
    );

  const isWide = screenWidth >= 1200;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <DestinationReports
        metrics={metrics}
        isWide={isWide}
        cardWidths={cardWidths}
        setCardWidths={setCardWidths}
      />

      <UserReports
        metrics={metrics}
        isWide={isWide}
        cardWidths={cardWidths}
        setCardWidths={setCardWidths}
      />

      <TicketReports
        metrics={metrics}
        isWide={isWide}
        cardWidths={cardWidths}
        setCardWidths={setCardWidths}
      />
    </ScrollView>
  );
};

/* ------------------------------------------------------------------ */
/*  STYLES                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { alignItems: "center", paddingBottom: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  /* Cards */
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 30,
    margin: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    width: "95%",
    marginTop: 30,
  },

  /* Card Titles */
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 16,
    textAlign: "center",
  },

  subTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f37f1",
    marginBottom: 8,
    alignSelf: "center",
  },

  /* Layout */
  row: {
    width: "100%",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  full: { width: "95%" },
  fullWidth: { width: "100%" },
  half: { flexBasis: "48%" },
  oneThird: { flexBasis: "32%" },
  twoThird: { flexBasis: "64%" },

  subCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 10,
    margin: 8,
    flexGrow: 1,
  },

  /* Charts */
  chartBox: {
    borderRadius: 12,
    marginVertical: 8,
    paddingTop: 10,
  },

  noData: {
    textAlign: "center",
    color: "#94a3b8",
    fontStyle: "italic",
    paddingVertical: 10,
  },

  /* Rank Number (Specific to Most Used) */
  rank: { 
    fontWeight: "bold", 
    color: "#0f37f1", 
    width: 24, 
    fontSize: 13,
    alignSelf: 'flex-start',
    marginTop: 1
  },

  /* Ticket Section */
  ticketContainer: {
    width: "100%",
    justifyContent: "space-between",
    gap: 20,
    marginTop: 10,
  },
  ticketChartBox: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  ticketSummaryBox: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 18,
    borderRadius: 12,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f37f1",
    marginBottom: 12,
    textAlign: "center",
  },

  statsGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    elevation: 2,
    borderLeftWidth: 5,
  },
  statLabel: { fontSize: 13, color: "#475569", marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: "800", color: "#0f172a" },

  blueLeftBorder: { borderLeftColor: "#0f37f1" },
  greenLeftBorder: { borderLeftColor: "#16a34a" },
  yellowLeftBorder: { borderLeftColor: "#f59e0b" },
  purpleLeftBorder: { borderLeftColor: "#8b5cf6" },

  smallNote: {
    textAlign: "center",
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
  },

  highlight: {
    color: "#0f37f1",
    fontWeight: "700",
  },

  /* ----------- SHARED LIST STYLES (Compact Professional Version) ----------- */
  /* Used for both "Interests" and "Most Used Destinations" */
  
  interestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6, 
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  interestName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 1,
  },

  interestPercent: {
    fontSize: 11, 
    color: "#64748b",
    marginTop: -2,
  },

  interestProgressBg: {
    width: "100%",
    height: 5, 
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginTop: 4,
  },

  interestProgressFill: {
    height: 5,
    borderRadius: 4,
  },

  interestCount: {
    width: 38, 
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
});

export default ReportsScreen;
