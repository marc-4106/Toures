import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
// IMPORT CONCEPTUAL: Ensure you implement and export this function in your service file
import { fetchAuditLogs } from "../../../services/firestoreReportsAndLogs"; 

const AuditTrailScreen = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // --- LIVE DATA: Calling the service function ---
      const data = await fetchAuditLogs();
      setLogs(data);
    } catch (e) {
      console.error("Failed to load audit logs:", e);
      // NOTE: User should check their Firebase and service layer configuration
      setError("Failed to load audit logs. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const renderLogItem = ({ item }) => (
    <View style={styles.logItem}>
      {/* Use the timestamp property, which should be converted to a JS Date in the service layer */}
      <Text style={styles.timestamp}>
        {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
      </Text>
      <Text style={styles.actor}>
        <Text style={styles.label}>Actor:</Text> {item.actorName || 'Unknown'}
      </Text>
      <Text style={styles.action}>
        <Text style={styles.label}>Action:</Text> {item.actionType || 'GENERIC'} - {item.targetEntity || 'SYSTEM'} ({item.targetId || 'N/A'})
      </Text>
      <Text style={styles.details}>
        <Text style={styles.label}>Details:</Text> {item.details || 'No additional details provided.'}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0f37f1" />
        <Text>Loading Audit Trail...</Text>
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
    <View style={styles.container}>
      <Text style={styles.title}>System Audit Trail</Text>
      {logs.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.noDataText}>No audit records found.</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
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
    marginBottom: 15,
  },
  logItem: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  label: {
    fontWeight: "bold",
    color: "#333",
  },
  actor: {
    fontSize: 16,
    marginBottom: 3,
  },
  action: {
    fontSize: 16,
    color: "#0f37f1",
    marginBottom: 3,
  },
  details: {
    fontSize: 14,
    color: "#555",
  },
  errorText: {
    color: 'red',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
  }
});

export default AuditTrailScreen;