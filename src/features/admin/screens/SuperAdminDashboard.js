import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert, 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  collection, 
  getDocs,
} from "firebase/firestore";
import { getStorage, ref, listAll, getMetadata } from "firebase/storage";
import app from "../../../services/firebaseConfig";
import { fetchAuditLogs } from "../../../services/firestoreReportsAndLogs";

// --- CONSTANTS ---
// 🔴 TODO: PASTE YOUR DEPLOYED HTTPS FUNCTION URL HERE
const CLOUD_FUNCTION_URL = "https://asia-east1-toures-2025.cloudfunctions.net/runMetricsAggregation";

const FIXED_STORAGE_LIMIT_GB = 1;
const STORAGE_THRESHOLD_PERCENT = 80; 
const DESTINATIONS_COLLECTION = "destinations";
const SUPPORT_TICKETS_COLLECTION = "supportTickets"; 
const METRICS_DOC_REF_PATH = "adminDashboard/metrics"; 

// --- Utility function for log time formatting ---
const formatLogTime = (timestamp) => {
    if (!timestamp) return "N/A";
    // Handle both Firestore Timestamp and standard Date strings
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
};

// --- Role Distribution Chart Components (Unchanged) ---
const RoleLegend = ({ color, label, value }) => (
    <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text style={styles.legendText}>{label}</Text>
        <Text style={styles.legendValue}>{value}</Text>
    </View>
);

const RoleDistributionChart = ({ roleCounts, totalUsers }) => {
    const total = totalUsers || 1; 
    const superAdminPct = (roleCounts?.superadmin || 0) / total * 100;
    const adminPct = (roleCounts?.admin || 0) / total * 100;
    const userPct = (roleCounts?.user || 0) / total * 100;

    const barHeight = 20;

    return (
        <View style={{ marginBottom: 15, marginTop: 5 }}>
            <Text style={styles.chartTitle}>Role Distribution ({totalUsers} Total)</Text>
            
            <View style={{ flexDirection: 'row', height: barHeight, borderRadius: 5, overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
                <View style={{ width: `${superAdminPct}%`, backgroundColor: '#0f37f1'}}/>
                <View style={{ width: `${adminPct}%`, backgroundColor: '#60a5fa'}}/>
                <View style={{ width: `${userPct}%`, backgroundColor: '#94a3b8'}}/>
            </View>

            <View style={styles.legendContainer}>
                <RoleLegend color="#0f37f1" label={`SuperAdmins (${superAdminPct.toFixed(1)}%)`} value={roleCounts?.superadmin} />
                <RoleLegend color="#60a5fa" label={`Admins (${adminPct.toFixed(1)}%)`} value={roleCounts?.admin} />
                <RoleLegend color="#94a3b8" label={`Tourists (${userPct.toFixed(1)}%)`} value={roleCounts?.user} />
            </View>
        </View>
    );
};


// --- MAIN COMPONENT ---
const SuperAdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [dbLatency, setDbLatency] = useState(null);
  const [incompleteDestinations, setIncompleteDestinations] = useState([]);
  const [showIncompleteList, setShowIncompleteList] = useState(false);
  const navigation = useNavigation();
  
  // Storage Stats (Still Client Side as CF doesn't handle storage metadata)
  const [systemHealth, setSystemHealth] = useState({
    storageStats: [],
    totalStorageMB: 0,
  });

  /** ------------------ MEMOIZED FIRESTORE/STORAGE REFERENCES ------------------ **/
  const { db, storage, METRICS_DOC_REF } = useMemo(() => {
    const firestoreDb = getFirestore(app);
    const storageRef = getStorage(app);
    const metricsDoc = doc(firestoreDb, METRICS_DOC_REF_PATH);
    return { db: firestoreDb, storage: storageRef, METRICS_DOC_REF: metricsDoc };
  }, []); 


  /** ------------------ 1. DATA LOADING (SERVER AGGREGATION READ) ------------------ **/
  
  // A. Load Metrics from Firestore (Written by Cloud Function)
  const loadMetricsFromFirestoreCache = useCallback(async () => {
    const startTime = Date.now();
    try {
        const docSnap = await getDoc(METRICS_DOC_REF); 
        setDbLatency(Date.now() - startTime); 
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("✅ Firestore Read: Metrics loaded from existing cache document.");
            setMetrics(data);
            setLastUpdated(data.lastUpdated);
            return data;
        } else {
            console.log("⚠️ Firestore Read: No existing cache document found.");
            return null;
        }
    } catch (e) {
        console.error("❌ Firestore Read Error: Failed to load metrics cache:", e);
        return null; 
    }
  }, [METRICS_DOC_REF]);

  // B. Load Logs (Independent Fetch)
  const loadAuditLogs = useCallback(async () => {
    try {
        const fetchedLogs = await fetchAuditLogs();
        if (fetchedLogs) {
            const sortedLogs = fetchedLogs
            .sort((a, b) => {
                const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
                const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
                return timeB - timeA;
            })
            .slice(0, 5);
            setLogs(sortedLogs);
        }
    } catch (e) {
        console.error("Error fetching logs:", e);
    }
  }, []);

  // C. Load System Health (Storage - Client Side)
  const fetchSystemHealth = useCallback(async () => {
    try {
      const folders = [DESTINATIONS_COLLECTION, "profilePhotos", SUPPORT_TICKETS_COLLECTION];
      let totalSize = 0;
      const storageStats = [];

      for (const folder of folders) {
        const folderRef = ref(storage, folder + "/");
        let folderSize = 0;

        try {
            const listed = await listAll(folderRef);
            for (const item of listed.items) {
                try {
                    const meta = await getMetadata(item);
                    folderSize += meta.size || 0;
                } catch {}
            }
        } catch (e) {
            console.log(`Storage access error for ${folder}:`, e);
        }

        const folderMB = folderSize / (1024 * 1024);
        totalSize += folderMB;
        storageStats.push({ name: folder, sizeMB: folderMB });
      }

      setSystemHealth({
        storageStats,
        totalStorageMB: totalSize,
      });
    } catch (err) {
      console.error("⚠️ System health fetch failed:", err);
    }
  }, [storage]);


  /** ------------------ 2. MANUAL REFRESH (VIA CLOUD FUNCTION) ------------------ **/
  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Not authenticated");

        const token = await currentUser.getIdToken();
        console.log("⚡ Triggering Cloud Function for Manual Refresh...");

        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: 'GET', // Your CF is onRequest, usually GET or POST
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${errorText}`);
        }

        const result = await response.json();
        
        if (result.success) {
            setMetrics(result.data);
            setLastUpdated(new Date().toISOString());
            loadAuditLogs(); // Refresh logs too
            Alert.alert("Update Complete", "Dashboard data has been refreshed via Server.");
        } else {
            throw new Error(result.error || "Unknown error");
        }

    } catch (e) {
        console.error("Manual refresh failed:", e);
        Alert.alert("Error", "Dashboard refresh failed. See console.");
    } finally {
        setRefreshing(false);
    }
  }, [loadAuditLogs]);


  // --- INITIAL FETCH ON MOUNT ---
  useEffect(() => {
    const init = async () => {
        setLoading(true);
        setRefreshing(true);
        
        // 1. User Info
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
            const userSnap = await getDoc(doc(db, "users", currentUser.uid));
            if (userSnap.exists()) {
                const data = userSnap.data();
                setUserInfo({
                    name: data.name || currentUser.displayName || "User",
                    role: data.role || "SuperAdmin",
                });
            }
        }

        // 2. Parallel Fetch
        await Promise.all([
            loadMetricsFromFirestoreCache(),
            loadAuditLogs(),
            fetchSystemHealth()
        ]);

        setLoading(false);
        setRefreshing(false);
    };
    init();
  }, [db, loadMetricsFromFirestoreCache, loadAuditLogs, fetchSystemHealth]);


  /** ------------------ RUN MANUAL QUALITY CHECK (Client Side Logic Preserved) ------------------ **/
  const runQualityCheck = async () => {
    Alert.alert("Running Check", "Analyzing all destination records for incomplete data...");
    
    try {
        const destinationsSnapshot = await getDocs(collection(db, DESTINATIONS_COLLECTION));
        const incompleteList = [];
        
        destinationsSnapshot.forEach(doc => {
            const data = doc.data();
            const missing = {};
            const kind = data.kind ? data.kind.trim().toLowerCase() : '';
            const isHotelOrRestaurant = kind === 'hotel' || kind === 'restaurant';
            
            // Match Logic with Cloud Function for consistency
            const contactData = data.contact;
            const hasPhone = contactData?.phoneRaw && contactData.phoneRaw.trim() !== '';
            const hasEmail = contactData?.email && contactData.email.trim() !== '';
            
            if (!hasPhone && !hasEmail) missing.contact = true;
            
            const coords = data.Coordinates;
            if (!coords || !coords.latitude || !coords.longitude) missing.coordinates = true;

            const hasImage =
              (typeof data.imageUrl === "string" && data.imageUrl.trim().length > 0) ||
              (typeof data.imagePath === "string" && data.imagePath.trim().length > 0);

            if (!hasImage) missing.image = true;
            if (!isHotelOrRestaurant && (!data.activities || data.activities.length === 0)) missing.activities = true;
            if (!data.tags || data.tags.length === 0) missing.tags = true;
            if (!data.kind || data.kind.trim() === '') missing.kind = true;
            if (!data.cityOrMunicipality || data.cityOrMunicipality.trim() === '') missing.cityOrMunicipality = true;
            if (!data.description || data.description.trim() === '') missing.description = true;

            if (Object.keys(missing).length > 0) {
                incompleteList.push({
                    name: data.name || `[ID: ${doc.id}]`,
                    id: doc.id,
                    missing,
                });
            }
        });

        setIncompleteDestinations(incompleteList);
        setShowIncompleteList(true); 
        
        if (incompleteList.length > 0) {
            Alert.alert(
                "⚠️ Data Quality Warning", 
                `Found ${incompleteList.length} destinations with incomplete data.`,
                [{ text: "OK" }]
            );
        } else {
            Alert.alert("✅ Data Quality Check Passed", "All destinations passed.");
            setShowIncompleteList(false); 
        }

    } catch (error) {
        console.error("Error during quality check:", error);
        Alert.alert("Error", "Failed to run quality check.");
    }
  };

  /** ------------------ UTILITY CONTROLS (Export Logic Preserved) ------------------ **/
  const exportToSheets = () => {
    if (incompleteDestinations.length === 0) {
        Alert.alert("No Data", "Run the quality check first.");
        return;
    }
    
    let csvContent = "Name,ID,Missing Fields\n";

    incompleteDestinations.forEach(item => {
        const missingFields = Object.keys(item.missing).join(';');
        const nameClean = item.name.replace(/,/g, ''); 
        csvContent += `${nameClean},${item.id},"${missingFields}"\n`;
    });

    Alert.alert(
        "Export Simulated",
        `Generated CSV for ${incompleteDestinations.length} items. (In production, this triggers a download).`,
        [{ text: "OK" }]
    );
  };


  if (loading || !metrics)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0f37f1" />
        <Text style={{ marginTop: 10, color: '#334155' }}>
            Loading SuperAdmin Dashboard...
        </Text>
        <Text style={{ marginTop: 5, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
            Fetching latest metrics from Server...
        </Text>
      </View>
    );

  // --- DATA PREP FOR RENDER ---
  // Map Cloud Function keys to UI variables
  const completeness = metrics?.dataCompleteness?.completeness || 0;
  const formattedRole = userInfo?.role ? userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1) : "Admin";

  // Storage Calculations
  const usageMB = systemHealth.totalStorageMB;
  const limitMB = FIXED_STORAGE_LIMIT_GB * 1024;
  const usagePct = (usageMB / limitMB) * 100;
  
  const statusColor = usagePct > STORAGE_THRESHOLD_PERCENT 
      ? (usagePct >= 100 ? '#dc2626' : '#f59e0b')
      : '#16a34a';
      
  const statusText = usagePct >= 100 
      ? 'CAPACITY REACHED' 
      : (usagePct > STORAGE_THRESHOLD_PERCENT ? 'THRESHOLD WARNING' : 'NOMINAL');

  return (
    <View style={styles.wrapper}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hi, {userInfo?.name || "SuperAdmin"} 👋
          </Text>
          <Text style={styles.title}>{formattedRole} Dashboard</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.liveIndicator}>● Active</Text>
          <TouchableOpacity
            onPress={handleManualRefresh}
            style={[styles.refreshButton, {backgroundColor: refreshing ? '#e2e8f0' : '#f1f5f9'}]}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size={18} color="#0f37f1" />
            ) : (
              <Ionicons name="refresh" size={22} color="#0f37f1" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container}>
        <Text style={styles.lastUpdated}>
          Metrics from Server. **Last Aggregated: {lastUpdated ? formatLogTime(lastUpdated) : "N/A"}**
        </Text>
        
        {/* GRID START */}
        <View style={styles.grid}>
          {/* USER OVERVIEW CARD */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>User Overview 👤</Text>
            
            <RoleDistributionChart 
                roleCounts={metrics.roleCounts} 
                totalUsers={metrics.totalUsers} 
            />

            <View style={styles.userStatRow}>
                <Text style={styles.statDetail}>**Active Users:** {metrics.activeUsers}</Text>
                <Text style={styles.statDetail}>**Restricted:** {metrics.restrictedUsers}</Text>
            </View>
            <Text style={[styles.stat, { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 5, marginTop: 5 }]}>
                **Verification Rate:** {metrics.verificationRate}%
            </Text>

            <TouchableOpacity 
                style={[styles.controlButton, {backgroundColor: '#1d4ed8', marginTop: 15}]} 
                onPress={() => {navigation.navigate('User Management')}}
            >
                <Text style={styles.controlButtonText}>Manage Users</Text>
            </TouchableOpacity>
          </View>

          {/* SYSTEM HEALTH & PERFORMANCE */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>System Health & Performance ⚡</Text>

            <Text style={[styles.stat, {fontWeight: '700'}]}>
                Firestore Read Latency: {dbLatency !== null ? `**${dbLatency} ms**` : 'N/A'}
            </Text>
            
            {/* STORAGE LIMITS */}
            <View style={styles.limitSection}>
                <Text style={styles.limitTitle}>Storage Free-Tier Limit 💾</Text>
                
                <Text style={styles.stat}>Current Usage: **{usageMB.toFixed(2)} MB**</Text>
                <Text style={styles.stat}>**Limit: {FIXED_STORAGE_LIMIT_GB.toFixed(2)} GB** (1024 MB)</Text>
                
                <View style={styles.limitStatusContainer}>
                    <Text style={[styles.limitStatus, { color: statusColor }]}>
                        {statusText} - **{usagePct.toFixed(1)}%** Used
                    </Text>
                    <View style={styles.barBackground}>
                        <View
                            style={[
                                styles.barFill,
                                { width: `${Math.min(usagePct, 100)}%`, backgroundColor: statusColor },
                            ]}
                        />
                    </View>
                </View>

                {/* Folder Breakdown */}
                <View style={styles.folderBreakdownContainer}>
                    <Text style={[styles.barLabel, {fontWeight: '700', marginTop: 5}]}>
                        Folder Breakdown (Total: {usageMB.toFixed(2)} MB)
                    </Text>
                    {systemHealth.storageStats.map((folder, i) => {
                        const pct = (folder.sizeMB / usageMB) * 100 || 0;
                        const color = pct > 60 ? "#0f37f1" : "#475569";
                        
                        return (
                            <View key={i} style={styles.barGroup}>
                                <Text style={styles.barLabel}>{folder.name}</Text>
                                <View style={styles.barBackgroundSmall}>
                                    <View
                                        style={[
                                            styles.barFillSmall,
                                            { width: `${pct}%`, backgroundColor: color },
                                        ]}
                                    />
                                </View>
                                <Text style={styles.barText}>
                                    {folder.sizeMB.toFixed(2)} MB ({pct.toFixed(1)}%)
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
          </View>
          
          {/* SUPPORT TICKET METRICS CARD (Using Server Data) */}
          <View style={[styles.card, metrics.newTickets > 0 ? styles.alertCardBorder : {}]}>
            <Text style={styles.cardTitle}>Support Ticket Metrics 💬</Text>
            
            <View style={styles.queueItem}>
                <Text style={styles.stat}>**Total Tickets:**</Text>
                <Text style={styles.queueCount}>
                    **{metrics.totalTickets}**
                </Text>
            </View>
            
            <View style={styles.queueItem}>
                <Text style={styles.stat}>Pending (New):</Text>
                <Text style={[styles.queueCount, metrics.newTickets > 0 && styles.queueAlertCount]}>
                    **{metrics.newTickets}**
                </Text>
            </View>
            
            <View style={styles.queueItem}>
                <Text style={styles.stat}>Resolved:</Text>
                <Text style={styles.queueCount}>
                    **{metrics.resolvedTickets}**
                </Text>
            </View>

            <View style={[styles.queueItem, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 5 }]}>
                <Text style={[styles.stat, { fontWeight: '700' }]}>Avg. Resolution Time:</Text>
                <Text style={styles.queueCount}>
                    **{metrics.avgResolutionHours} hrs**
                </Text>
            </View>
            
            <TouchableOpacity 
                style={[styles.controlButton, {backgroundColor: '#1d4ed8', marginTop: 15}]} 
                onPress={() => {navigation.navigate('Support / Tickets')}} 
            >
                <Text style={styles.controlButtonText}>Go to Tickets</Text>
            </TouchableOpacity>
          </View>

          {/* DATA QUALITY (Using Server Data) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Destination Data Quality 📊</Text>
            <Text style={[styles.stat, {fontWeight: '700'}]}>Completeness: **{completeness}%**</Text>
            <Text style={styles.stat}>Missing Images: {metrics.dataCompleteness?.missingImage || 0}</Text>
            <Text style={styles.stat}>Missing Coordinates: {metrics.dataCompleteness?.missingCoordinates || 0}</Text>
            <Text style={styles.stat}>Missing Contacts: {metrics.dataCompleteness?.missingContact || 0}</Text>
            <Text style={styles.stat}>Missing Activities: {metrics.dataCompleteness?.missingActivities || 0}</Text>
            <Text style={styles.stat}>Missing Tags: {metrics.dataCompleteness?.missingTags || 0}</Text>
            <Text style={styles.stat}>Missing Kind: {metrics.dataCompleteness?.missingKind || 0}</Text>
            <Text style={styles.stat}>Missing City: {metrics.dataCompleteness?.missingCity || 0}</Text>

            {incompleteDestinations.length > 0 && (
                 <Text style={[styles.stat, { color: '#dc2626', fontWeight: '700', marginTop: 8 }]}>
                    Incomplete found: {incompleteDestinations.length}
                </Text>
            )}

            <TouchableOpacity 
                style={[styles.controlButton, {backgroundColor: '#0f37f1', marginTop: 15}]} 
                onPress={runQualityCheck}
            >
                <Text style={styles.controlButtonText}>Run Manual Quality Check</Text>
            </TouchableOpacity>

            {incompleteDestinations.length > 0 && (
                <TouchableOpacity 
                    style={[styles.controlButton, {backgroundColor: '#16a34a'}]} 
                    onPress={exportToSheets}
                >
                    <Text style={styles.controlButtonText}>Export to Sheets (CSV)</Text>
                </TouchableOpacity>
            )}
          </View>
          
{/* RECENT ACTIVITIES */}
          <View style={[styles.card, { width: '100%', marginBottom: 20 }]}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 10, borderBottomWidth: 1, borderColor: "#e2e8f0", paddingBottom: 4}}>
                <Text style={[styles.cardTitle, {borderBottomWidth: 0, marginBottom: 0}]}>Recent System Activities 📜</Text>
            </View>

            {logs.length ? (
              logs.map((log, i) => (
                <View key={i} style={styles.logItemContainer}>
                    <Text style={styles.logTimestamp}>{formatLogTime(log.timestamp)}</Text>
                    <Text style={styles.logDetail}>
                        <Text style={[styles.logActor, {color: log.actionType === 'DELETE' ? '#dc2626' : '#0f37f1'}]}>
                            **{log.actorName}**
                        </Text>
                        <Text style={styles.logAction}> ({log.actionType}) </Text>
                        <Text style={styles.logDescription}>{log.details}</Text>
                    </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noData}>No recent logs.</Text>
            )}

            {/* 👇 NEW BUTTON ADDED HERE 👇 */}
            <TouchableOpacity 
                style={[styles.controlButton, {backgroundColor: '#475569', marginTop: 10}]} 
                onPress={() => navigation.navigate('Audit Trail')} 
            >
                <Text style={styles.controlButtonText}>View Audit Trail</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* GRID END */}


        {/* INCOMPLETE DESTINATIONS LIST VIEW (Unchanged) */}
        {showIncompleteList && incompleteDestinations.length > 0 && (
            <View style={styles.incompleteListContainer}>
                <Text style={styles.listTitle}>
                    Destinations Needing Data ({incompleteDestinations.length})
                </Text>
                
                <TouchableOpacity onPress={() => setShowIncompleteList(false)} style={styles.closeButton}>
                    <Ionicons name="close-circle-outline" size={24} color="#dc2626" />
                </TouchableOpacity>

                {incompleteDestinations.map((item, index) => (
                    <View key={item.id} style={styles.incompleteItem}>
                        <Text style={styles.incompleteName}>
                            {index + 1}. **{item.name}** </Text>
                        <Text style={styles.incompleteMissing}>
                            Missing: {Object.keys(item.missing).join(', ')}
                        </Text>
                    </View>
                ))}
            </View>
        )}
        
      </ScrollView>
    </View>
  );
};

/* ------------------ STYLES (UNCHANGED) ------------------ */
const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    boxShadowColor: "#000",
    boxShadowOpacity: 0.05,
    boxShadowOffset: { width: 0, height: 2 },
    boxShadowRadius: 3,
    elevation: 2,
  },
  greeting: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  title: { fontSize: 22, fontWeight: "800", color: "#0f37f1" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  liveIndicator: { color: "#16a34a", fontWeight: "700", fontSize: 12 },
  refreshButton: {
    backgroundColor: "#f1f5f9",
    borderRadius: 50,
    padding: 8,
  },
  container: { padding: 20 },
  lastUpdated: {
    textAlign: "right",
    color: "#64748b",
    fontSize: 12,
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%", 
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    boxShadowColor: "#000",
    boxShadowOpacity: 0.05,
    boxShadowRadius: 4,
    boxShadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  alertCardBorder: { 
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingBottom: 4,
  },
  stat: { fontSize: 14, color: "#334155", marginVertical: 2 },
  
  // USER CARD STYLES
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  legendContainer: {
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  userStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  statDetail: {
    fontSize: 14,
    color: '#334155',
    width: '49%', 
  },

  // Storage Bars
  barGroup: { marginTop: 4, marginBottom: 8 },
  barLabel: { fontSize: 13, color: "#475569" },
  barBackground: {
    height: 10,
    backgroundColor: "#e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
  },
  barFill: { height: 10, borderRadius: 6 },
  barText: { fontSize: 12, color: "#475569", marginTop: 2, textAlign: 'right' },
  
  // Smaller bars for breakdown
  barBackgroundSmall: {
    height: 6, 
    backgroundColor: "#e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
  },
  barFillSmall: { height: 6, borderRadius: 6 },
  
  // LOG STYLES 
  logItemContainer: {
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderColor: "#e2e8f0",
    paddingBottom: 4,
  },
  logTimestamp: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: '500',
    marginBottom: 2,
  },
  logDetail: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  logActor: {
    fontWeight: '700',
  },
  logAction: {
    fontWeight: '600',
    color: '#475569',
  },
  logDescription: {
    fontStyle: 'italic',
  },
  noData: {
    color: "#94a3b8",
    fontStyle: "italic",
    textAlign: "center",
    fontSize: 13,
  }, 
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#f8fafc' },
  
  // Controls Styles 
  controlButton: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
    alignItems: 'center',
    boxShadowColor: "#000",
    boxShadowOpacity: 0.1,
    boxShadowRadius: 2,
    elevation: 1,
  },
  controlButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  
  // LIMIT STYLES
  limitSection: {
    marginTop: 15,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  limitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 5,
  },
  limitStatusContainer: {
    marginTop: 8,
    marginBottom: 5,
  },
  limitStatus: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  folderBreakdownContainer: { 
      marginTop: 10,
      paddingTop: 5,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
  },
  
  // SUPPORT TICKET STYLES
  queueItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
      alignItems: 'center',
  },
  queueCount: {
      fontSize: 16,
      fontWeight: '700',
      color: '#16a34a',
  },
  queueAlertCount: {
      color: '#f59e0b', 
  },

  // INCOMPLETE LIST VIEW STYLES
  incompleteListContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
    position: 'relative',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#fef3c7',
  },
  incompleteItem: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  incompleteName: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '600',
  },
  incompleteMissing: {
    fontSize: 13,
    color: '#ef4444',
    fontStyle: 'italic',
    marginTop: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  }
});

export default SuperAdminDashboard;