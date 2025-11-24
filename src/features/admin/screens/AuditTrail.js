// src/features/admin/components/AuditTrailScreen.js
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { fetchAuditLogs } from "../../../services/firestoreReportsAndLogs";

const TARGET_ENTITIES = ["All", "SupportTicket", "Event", "Destination"];
const LOGS_PER_PAGE = 10;
const { width } = Dimensions.get("window");

// Row background colors per entity
const ENTITY_COLORS = {
  SupportTicket: "#bfdbfe", // lighter blue
  Event: "#fed7aa",         // lighter amber
  Destination: "#bbf7d0",   // lighter green
  Festival: "#d1d5db",      // gray
};

const AuditTrailScreen = () => {
  const listRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchActor, setSearchActor] = useState("");
  const [filterEntity, setFilterEntity] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const loadLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAuditLogs();
      const logsWithDate = data.map((log) => ({
        ...log,
        timestamp: log.timestamp?.toDate ? log.timestamp.toDate() : log.timestamp,
      }));
      logsWithDate.sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
      setLogs(logsWithDate);
    } catch (e) {
      console.error("Failed to load audit logs:", e);
      setError("Failed to load audit logs. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, []);
  useEffect(() => { listRef.current?.scrollToOffset({ offset: 0, animated: true }); }, [currentPage]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchEntity = filterEntity === "All" || log.targetEntity === filterEntity;
      const matchActor = !searchActor || (log.actorName || "").toLowerCase().includes(searchActor.toLowerCase());
      return matchEntity && matchActor;
    });
  }, [logs, filterEntity, searchActor]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * LOGS_PER_PAGE;
    return filteredLogs.slice(start, start + LOGS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const goToPrevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  const handleExportCSV = () => {
    if (!filteredLogs.length) return alert("No logs to export.");

    let csv = "Timestamp,Action Type,Actor,Actor ID,Target Entity,Target ID,Details\n";
    filteredLogs.forEach(log => {
      const row = [
        log.timestamp ? log.timestamp.toLocaleString() : "N/A",
        log.actionType || "N/A",
        log.actorName || "Unknown",
        log.actorId || "N/A",
        log.targetEntity || "N/A",
        log.targetId || "N/A",
        `"${(log.details || "").replace(/"/g, '""').replace(/\n/g, " ")}"`
      ].join(",");
      csv += row + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `AuditLogs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert(`Exported ${filteredLogs.length} logs to CSV.`);
  };

  const renderLogItem = ({ item }) => {
    const rowColor = ENTITY_COLORS[item.targetEntity] || "#ffffff";

    return (
      <View style={[styles.tableRow, { backgroundColor: rowColor + "90" }]}>
        <Text style={[styles.cell, styles.timestampCell]}>
          {item.timestamp?.toLocaleString() || "N/A"}
        </Text>
        <Text style={[styles.cell, styles.statusCell]}>
          {item.actionType || "GENERIC"}
        </Text>
        <Text style={[styles.cell, styles.actorCell]}>{item.actorName || "Unknown"}</Text>
        <Text style={[styles.cell, styles.idCell]}>{item.actorId || "N/A"}</Text>
        <Text style={[styles.cell, styles.entityCell]}>{item.targetEntity || "SYSTEM"}</Text>
        <Text style={[styles.cell, styles.idCell]}>{item.targetId || "N/A"}</Text>
        <Text style={[styles.cell, styles.detailsCell]}>{item.details || "No details"}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>System Audit Trail</Text>

      {/* Filters + Export */}
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by actor name..."
          value={searchActor}
          onChangeText={(text) => { setSearchActor(text); setCurrentPage(1); }}
        />

        <FlatList
          horizontal
          data={TARGET_ENTITIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.categoryButton, item === filterEntity && styles.categoryButtonActive]}
              onPress={() => { setFilterEntity(item); setCurrentPage(1); }}
            >
              <Text style={[styles.categoryText, item === filterEntity && styles.categoryTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingVertical: 10 }}
        />

        <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
          <Text style={styles.exportText}>Export to CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Table Header */}
      <ScrollView horizontal style={{ marginBottom: 10 }}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.timestampCell]}>Timestamp</Text>
          <Text style={[styles.headerCell, styles.statusCell]}>Action</Text>
          <Text style={[styles.headerCell, styles.actorCell]}>Actor</Text>
          <Text style={[styles.headerCell, styles.idCell]}>Actor ID</Text>
          <Text style={[styles.headerCell, styles.entityCell]}>Entity</Text>
          <Text style={[styles.headerCell, styles.idCell]}>Target ID</Text>
          <Text style={[styles.headerCell, styles.detailsCell]}>Details</Text>
        </View>
      </ScrollView>

      {/* Logs Table */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0f37f1" />
          <Text>Loading Audit Trail...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : paginatedLogs.length === 0 ? (
        <Text style={styles.noDataText}>No audit records found.</Text>
      ) : (
        <ScrollView horizontal>
          <FlatList
            ref={listRef}
            data={paginatedLogs}
            keyExtractor={(item) => item.id}
            renderItem={renderLogItem}
            contentContainerStyle={{ paddingBottom: 20, minWidth: width }}
          />
        </ScrollView>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.paginationRow}>
          <TouchableOpacity
            onPress={goToPrevPage}
            disabled={currentPage === 1}
            style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
          >
            <Text style={styles.pageButtonText}>Previous</Text>
          </TouchableOpacity>

          <Text style={styles.pageIndicator}>
            Page {currentPage} of {totalPages}
          </Text>

          <TouchableOpacity
            onPress={goToNextPage}
            disabled={currentPage === totalPages}
            style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f4f6fa" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 50 },
  title: { fontSize: 26, fontWeight: "bold", color: "#0f37f1", marginBottom: 15 },
  filtersContainer: { marginBottom: 15 },
  searchInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#e2e8f0",
  },
  categoryButtonActive: { backgroundColor: "#0f37f1" },
  categoryText: { color: "#1e293b", fontWeight: "600" },
  categoryTextActive: { color: "#fff" },
  exportButton: { backgroundColor: "#16a34a", padding: 12, borderRadius: 10, alignItems: "center", marginVertical: 5 },
  exportText: { color: "#fff", fontWeight: "700" },

  tableHeader: { flexDirection: "row", backgroundColor: "#e2e8f0", paddingVertical: 8, borderRadius: 8 },
  tableRow: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#cbd5e1", minWidth: width },
  headerCell: { fontWeight: "700", paddingHorizontal: 8 },
  cell: { paddingHorizontal: 8, color: "#374151" },
  timestampCell: { width: 180 },
  statusCell: { width: 160 },
  actorCell: { width: 150 },
  idCell: { width: 200 },
  entityCell: { width: 150 },
  detailsCell: { width: 350, flexShrink: 1 },
  paginationRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 15 },
  pageButton: { backgroundColor: "#0f37f1", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  pageButtonDisabled: { backgroundColor: "#cbd5e1" },
  pageButtonText: { color: "#fff", fontWeight: "600" },
  pageIndicator: { fontSize: 14, fontWeight: "600", color: "#334155" },
  noDataText: { fontSize: 16, color: "#6b7280", textAlign: "center", marginVertical: 20 },
  errorText: { color: "red", fontSize: 16 },
});

export default AuditTrailScreen;
