import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { fetchReportMetrics } from "../../../services/firestoreReportsAndLogs"; 

const ReportsScreen = () => {
  // Initialize metrics with the expected structure
  const [metrics, setMetrics] = useState({
    totalDestinations: 0,
    activeDestinations: 0,
    archivedDestinations: 0,
    featuredDestinations: 0,
    averagePopularity: 0, // Placeholder
    totalBudgetPHP: 0,    // Placeholder
    categoryCounts: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Calling the service function
      const data = await fetchReportMetrics();
      setMetrics(data);
    } catch (e) {
      console.error("Failed to load reports:", e);
      setError("Failed to load reports. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const renderMetricCard = (title, value) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0f37f1" />
        <Text>Loading Reports...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Destination & System Reports</Text>

      <Text style={styles.sectionTitle}>Content Overview</Text>
      <View style={styles.metricGrid}>
        {renderMetricCard("Total Destinations", metrics.totalDestinations)}
        {renderMetricCard("Active", metrics.activeDestinations)}
        {renderMetricCard("Archived", metrics.archivedDestinations)}
        {renderMetricCard("Featured", metrics.featuredDestinations)}
        {/* NOTE: Removed Avg. Popularity and Total Budget from UI */}
      </View>
      
      <Text style={styles.sectionTitle}>Category Distribution</Text>
      <View style={styles.categoryList}>
          {Object.entries(metrics.categoryCounts)
            .sort(([, countA], [, countB]) => countB - countA)
            .map(([name, count]) => (
              <View key={name} style={styles.categoryItem}>
                  <Text style={styles.categoryName}>{name}</Text>
                  <Text style={styles.categoryCount}>{count}</Text>
              </View>
          ))}
          {Object.keys(metrics.categoryCounts).length === 0 && (
             <Text style={styles.noDataText}>No category data available.</Text>
          )}
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0f37f1",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%', 
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0f37f1',
    elevation: 2,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f37f1',
    marginTop: 5,
  },
  categoryList: {
      marginTop: 5,
      padding: 10,
      backgroundColor: '#fff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ddd',
  },
  categoryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f1f1',
  },
  categoryName: {
      fontSize: 16,
      color: '#333',
  },
  categoryCount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#555',
  },
  errorText: {
    color: 'red', 
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    paddingVertical: 10,
    textAlign: 'center',
  }
});

export default ReportsScreen;