// src/components/LogsList.js
import React, { useMemo } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";

const LogsList = ({
  logs = [],
  filters = {},         // { actorName, targetEntity, actionType, startDate, endDate }
  pagination = {},      // { currentPage, logsPerPage, onPageChange }
  exportCSV,            // optional export callback
}) => {
  const { currentPage = 1, logsPerPage = 10, onPageChange } = pagination;

  // --- Filter logs locally ---
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchActor = !filters.actorName || log.actorName?.toLowerCase().includes(filters.actorName.toLowerCase());
      const matchEntity = !filters.targetEntity || log.targetEntity === filters.targetEntity;
      const matchAction = !filters.actionType || log.actionType === filters.actionType;
      const matchDate =
        (!filters.startDate || new Date(log.timestamp) >= filters.startDate) &&
        (!filters.endDate || new Date(log.timestamp) <= filters.endDate);
      return matchActor && matchEntity && matchAction && matchDate;
    });
  }, [logs, filters]);

  // --- Pagination ---
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) onPageChange(currentPage + 1);
  };
  const handlePrev = () => {
    if (currentPage > 1 && onPageChange) onPageChange(currentPage - 1);
  };

  return (
    <View>
      {exportCSV && (
        <TouchableOpacity style={styles.exportButton} onPress={() => exportCSV(filteredLogs)}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Export CSV ({filteredLogs.length})</Text>
        </TouchableOpacity>
      )}

      {currentLogs.length === 0 ? (
        <Text style={styles.noData}>No logs found.</Text>
      ) : (
        <FlatList
          data={currentLogs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.logItem}>
              <Text style={styles.logText}>
                <Text style={styles.logAction}>[{item.actionType || "GENERIC"}]</Text> {item.details || "No details"}
              </Text>
              <Text style={styles.logMeta}>
                👤 {item.actorName || "Unknown"} • 🧭 {item.targetEntity || "SYSTEM"} {item.targetId ? `(${item.targetId})` : ""} •{" "}
                {item.timestamp ? new Date(item.timestamp).toLocaleString() : "N/A"}
              </Text>
            </View>
          )}
        />
      )}

      {totalPages > 1 && (
        <View style={styles.paginationRow}>
          <TouchableOpacity onPress={handlePrev} disabled={currentPage === 1} style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}>
            <Text style={styles.pageButtonText}>Previous</Text>
          </TouchableOpacity>

          <Text style={styles.pageIndicator}>
            Page {currentPage} of {totalPages}
          </Text>

          <TouchableOpacity onPress={handleNext} disabled={currentPage === totalPages} style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}>
            <Text style={styles.pageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  logItem: { backgroundColor: "#f9fafb", borderRadius: 6, padding: 10, marginVertical: 4 },
  logText: { fontSize: 13, color: "#0f172a" },
  logAction: { fontWeight: "700", color: "#0f37f1" },
  logMeta: { fontSize: 11, color: "#64748b", marginTop: 2 },
  noData: { textAlign: "center", fontStyle: "italic", color: "#94a3b8", marginVertical: 10 },
  paginationRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  pageButton: { backgroundColor: "#0f37f1", paddingHorizontal: 15, paddingVertical: 6, borderRadius: 6 },
  pageButtonDisabled: { backgroundColor: "#cbd5e1" },
  pageButtonText: { color: "#fff", fontWeight: "600" },
  pageIndicator: { fontSize: 14, fontWeight: "600", color: "#334155" },
  exportButton: { backgroundColor: "#16a34a", padding: 8, borderRadius: 6, marginBottom: 8, alignItems: "center" },
});

export default LogsList;
