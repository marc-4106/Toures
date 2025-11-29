import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  Image, // Added Image for leaderboards if needed
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit'; // Added PieChart
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import app from '../../../services/firebaseConfig';
import { fetchReportMetrics } from '../../../services/firestoreReportsAndLogs';

const db = getFirestore(app);

/* ---------------------- CONSTANTS ---------------------- */
const PRIMARY_COLOR = '#0f37f1';
const TEXT_COLOR = '#1e293b';
const SUBTEXT_COLOR = '#64748b';
const BG_COLOR = '#f8fafc';
const DESTINATIONS_COLLECTION = "destinations";

/* ---------------------- KPICard ---------------------- */
const KPICard = ({ iconName, title, value, color }) => (
  <View style={[styles.kpiCard, { borderLeftColor: color }]}>
    <View style={styles.kpiContent}>
      <View>
        <Text style={styles.kpiTitle}>{title}</Text>
        <Text style={[styles.kpiValue, { color: color }]}>{value}</Text>
      </View>
      <View style={[styles.kpiIconWrap, { backgroundColor: `${color}15` }]}>
        <Ionicons name={iconName} size={24} color={color} />
      </View>
    </View>
  </View>
);

/* ---------------------- ItineraryTrend ---------------------- */
const ItineraryTrend = ({ itineraries }) => {
  const [range, setRange] = useState('7days');
  const [trendData, setTrendData] = useState({ labels: [], values: [] });
  const [chartWidth, setChartWidth] = useState(0);

  const getDateRange = () => {
    if (range === 'all') return { start: new Date(2000, 0, 1), end: new Date() };
    const today = new Date();
    let startDate;
    switch (range) {
      case '7days': startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6); break;
      case '30days': startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29); break;
      case '3months': startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1); break;
      default: startDate = today;
    }
    return { start: startDate, end: today };
  };

  const loadTrend = () => {
    const { start, end } = getDateRange();
    const counts = {};
    if (range !== 'all') {
        let current = new Date(start);
        while (current <= end) {
            const dayLabel = current.toLocaleDateString('default', { month: 'short', day: 'numeric' });
            counts[dayLabel] = 0;
            current.setDate(current.getDate() + 1);
        }
    }
    itineraries.forEach(d => {
      const created = d.createdAt?.toDate?.() || new Date(d.createdAt);
      if (!created || created < start || created > end) return;
      const dayLabel = created.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      counts[dayLabel] = (counts[dayLabel] || 0) + 1;
    });
    const sortedLabels = Object.keys(counts);
    if (range === 'all') sortedLabels.sort((a, b) => new Date(a) - new Date(b));
    const values = sortedLabels.map(l => counts[l]);
    setTrendData({ labels: sortedLabels, values });
  };

  useEffect(() => { loadTrend(); }, [itineraries, range]);

  return (
    <View style={styles.chartCard} onLayout={e => setChartWidth(e.nativeEvent.layout.width)}>
      <View style={styles.chartHeader}>
        <View style={styles.chartTitleWrap}>
            <Ionicons name="trending-up" size={20} color={PRIMARY_COLOR} />
            <Text style={styles.chartTitle}>Itinerary Generation</Text>
        </View>
        <View style={styles.pillContainer}>
            {[{ key: '7days', label: '7D' }, { key: '30days', label: '30D' }, { key: '3months', label: '3M' }].map(opt => (
            <TouchableOpacity 
                key={opt.key} 
                onPress={() => setRange(opt.key)}
                style={[styles.pill, range === opt.key && styles.pillActive]}
            >
                <Text style={[styles.pillText, range === opt.key && styles.pillTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
            ))}
        </View>
      </View>
      {chartWidth > 0 && trendData.values.length > 0 ? (
        <LineChart
          data={{ labels: trendData.labels, datasets: [{ data: trendData.values }] }}
          width={chartWidth - 32}
          height={220}
          chartConfig={chartConfig}
          style={styles.chartStyle}
          bezier withDots={true} withShadow={false} withInnerLines={true}
        />
      ) : (
        <View style={styles.emptyState}><Ionicons name="bar-chart-outline" size={40} color="#cbd5e1" /><Text style={styles.noDataText}>No data for this period</Text></View>
      )}
    </View>
  );
};

/* ---------------------- NEW: Leaderboard Chart (Horizontal Bars) ---------------------- */
const LeaderboardChart = ({ title, data, icon, color = PRIMARY_COLOR }) => {
    const topItems = data.slice(0, 5); // Top 5 only
    const maxValue = Math.max(...topItems.map(d => d.value), 1);

    return (
        <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
                <View style={styles.chartTitleWrap}>
                    <Ionicons name={icon} size={20} color={color} />
                    <Text style={styles.chartTitle}>{title}</Text>
                </View>
            </View>
            
            <View style={styles.leaderboardContainer}>
                {topItems.length > 0 ? (
                    topItems.map((item, index) => {
                        const widthPct = (item.value / maxValue) * 100;
                        return (
                            <View key={index} style={styles.lbRow}>
                                <View style={styles.lbInfo}>
                                    <Text style={[styles.lbRank, index < 3 && {color: color, fontWeight: '800'}]}>
                                        #{index + 1}
                                    </Text>
                                    <Text numberOfLines={1} style={styles.lbLabel}>{item.label}</Text>
                                </View>
                                
                                <View style={styles.lbBarContainer}>
                                    <View style={[styles.lbBarBg]}>
                                        <View style={[styles.lbBarFill, { width: `${widthPct}%`, backgroundColor: color }]} />
                                    </View>
                                    <Text style={styles.lbValue}>{item.value}</Text>
                                </View>
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="list-outline" size={40} color="#cbd5e1" />
                        <Text style={styles.noDataText}>No data available</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

/* ---------------------- NEW: Interest Donut Chart ---------------------- */
const InterestDonutChart = ({ data }) => {
    const [chartWidth, setChartWidth] = useState(0);
    
    // Prepare data for PieChart
    const chartData = data.slice(0, 5).map((item, index) => ({
        name: item.tag,
        population: item.count,
        color: ['#0f37f1', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'][index % 5],
        legendFontColor: "#7F7F7F",
        legendFontSize: 12
    }));

    return (
        <View style={styles.chartCard} onLayout={e => setChartWidth(e.nativeEvent.layout.width)}>
            <View style={styles.chartHeader}>
                <View style={styles.chartTitleWrap}>
                    <Ionicons name="pricetags-outline" size={20} color={PRIMARY_COLOR} />
                    <Text style={styles.chartTitle}>Top Interest Categories</Text>
                </View>
            </View>

            {chartData.length > 0 ? (
                <View style={{ alignItems: 'center' }}>
                    <PieChart
                        data={chartData}
                        width={chartWidth - 10}
                        height={200}
                        chartConfig={chartConfig}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        center={[10, 0]}
                        absolute
                    />
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Ionicons name="pie-chart-outline" size={40} color="#cbd5e1" />
                    <Text style={styles.noDataText}>No tags available</Text>
                </View>
            )}
        </View>
    );
};


/* ---------------------- Main Dashboard ---------------------- */
const DashboardHome = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({});
  const [itinerariesList, setItinerariesList] = useState([]);
  const [topDestinations, setTopDestinations] = useState([]);
  const [mostVisited, setMostVisited] = useState([]);
  const [topTags, setTopTags] = useState([]);
  
  const [incompleteDestinations, setIncompleteDestinations] = useState([]);
  const [showIncompleteList, setShowIncompleteList] = useState(false);

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [usersSnap, itinerariesSnap, destSnap, reportMetrics] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'itineraries')),
        getDocs(collection(db, 'destinations')),
        fetchReportMetrics()
      ]);

      const usersOnly = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === 'user');
      
      const cityCounts = {};
      const itinerariesArr = itinerariesSnap.docs.map(d => {
        const data = d.data();
        const city = data.preferences?.startCity?.label || 'Unknown';
        cityCounts[city] = (cityCounts[city] || 0) + 1;
        return { createdAt: data.createdAt, startCity: city };
      });

      const sortedCities = Object.keys(cityCounts)
        .map(city => ({ label: city, value: cityCounts[city] }))
        .sort((a, b) => b.value - a.value);

      setKpis({
        totalTourist: usersOnly.length,
        activeItineraries: itinerariesSnap.docs.filter(d => (d.data().status || '').toLowerCase() !== 'completed').length,
        featuredDestinations: destSnap.docs.filter(d => d.data().isFeatured).length,
        totalDestinations: reportMetrics.totalDestinations,
        dataCompleteness: reportMetrics.dataCompleteness || { completeness: 0 },
      });

      setItinerariesList(itinerariesArr);
      setMostVisited(sortedCities);
      
      const popularity = (reportMetrics.mostUsedDestinations || []).map(d => ({ label: d.name, value: d.count }));
      setTopDestinations(popularity);
      setTopTags(reportMetrics.topTags || []);

    } catch (err) {
      console.error('Overview load failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const runQualityCheck = async () => {
    Alert.alert("Running Check", "Analyzing all destinations...");
    try {
        const destinationsSnapshot = await getDocs(collection(db, DESTINATIONS_COLLECTION));
        const incompleteList = [];
        destinationsSnapshot.forEach(doc => {
            const data = doc.data();
            const missing = {};
            const kind = data.kind ? data.kind.trim().toLowerCase() : '';
            const isHotelOrRestaurant = kind === 'hotel' || kind === 'restaurant';
            
            const contactData = data.contact;
            const hasPhone = contactData?.phoneRaw && contactData.phoneRaw.trim() !== '';
            const hasEmail = contactData?.email && contactData.email.trim() !== '';
            
            if (!hasPhone && !hasEmail) missing.contact = true;
            const coords = data.Coordinates;
            if (!coords || !coords.latitude || !coords.longitude) missing.coordinates = true;
            const hasImage = (typeof data.imageUrl === "string" && data.imageUrl.trim().length > 0) || (typeof data.imagePath === "string" && data.imagePath.trim().length > 0);
            if (!hasImage) missing.image = true;
            if (!isHotelOrRestaurant && (!data.activities || data.activities.length === 0)) missing.activities = true;
            if (!data.tags || data.tags.length === 0) missing.tags = true;
            if (!data.kind || data.kind.trim() === '') missing.kind = true;
            if (!data.cityOrMunicipality || data.cityOrMunicipality.trim() === '') missing.cityOrMunicipality = true;
            if (!data.description || data.description.trim() === '') missing.description = true;

            if (Object.keys(missing).length > 0) {
                incompleteList.push({ name: data.name || `[ID: ${doc.id}]`, id: doc.id, missing });
            }
        });
        setIncompleteDestinations(incompleteList);
        setShowIncompleteList(true); 
        if (incompleteList.length > 0) {
            Alert.alert("⚠️ Issues Found", `Found ${incompleteList.length} destinations with incomplete data.`);
        } else {
            Alert.alert("✅ Perfect", "All destinations passed data quality checks.");
            setShowIncompleteList(false); 
        }
    } catch (error) {
        console.error("Error during quality check:", error);
        Alert.alert("Error", "Failed to run quality check.");
    }
  };

  const exportToSheets = () => {
    if (incompleteDestinations.length === 0) { Alert.alert("No Data", "Run the quality check first."); return; }
    Alert.alert("Export Simulated", `CSV generated for ${incompleteDestinations.length} items.`);
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      <Text style={styles.loadingText}>Gathering insights...</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      
      <View style={styles.header}>
        <Text style={styles.greeting}>Dashboard Overview</Text>
        <Text style={styles.subGreeting}>Welcome back, Admin</Text>
      </View>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiWrapper}><KPICard iconName="people" title="Total Tourists" value={kpis.totalTourist} color="#2563eb" /></View>
        <View style={styles.kpiWrapper}><KPICard iconName="map" title="Active Itineraries" value={kpis.activeItineraries} color="#16a34a" /></View>
        <View style={styles.kpiWrapper}><KPICard iconName="star" title="Featured Spots" value={kpis.featuredDestinations} color="#d97706" /></View>
        <View style={styles.kpiWrapper}><KPICard iconName="location" title="Total Spots" value={kpis.totalDestinations} color="#7c3aed" /></View>
      </View>

      {/* 1. Main Trend Chart */}
      <ItineraryTrend itineraries={itinerariesList} />

      {/* 2. Leaderboards Row (Replaces Bar Charts) */}
      <View style={[styles.row, isSmallScreen && styles.column]}>
        <View style={[styles.halfCard, isSmallScreen && styles.fullWidth]}>
            {/* NEW: Leaderboard for Destinations */}
            <LeaderboardChart 
                title="Top Destinations" 
                data={topDestinations} 
                icon="trophy-outline" 
                color="#0f37f1" 
            />
        </View>
        <View style={[styles.halfCard, isSmallScreen && styles.fullWidth]}>
            {/* NEW: Leaderboard for Cities */}
            <LeaderboardChart 
                title="Most Visited Cities" 
                data={mostVisited} 
                icon="business-outline" 
                color="#8b5cf6" 
            />
        </View>
      </View>

      {/* 3. Interests & Health Row */}
      <View style={[styles.row, isSmallScreen && styles.column]}>
        
        {/* NEW: Donut Chart for Interests */}
        <View style={[styles.halfCard, isSmallScreen && styles.fullWidth]}>
          <InterestDonutChart data={topTags} />
        </View>
        
        {/* Data Health Card */}
        <View style={[styles.halfCard, isSmallScreen && styles.fullWidth]}>
          <View style={styles.chartCard}>
             <View style={styles.chartHeader}>
                <View style={styles.chartTitleWrap}>
                    <Ionicons name="fitness-outline" size={20} color={PRIMARY_COLOR} />
                    <Text style={styles.chartTitle}>Data Health Score</Text>
                </View>
            </View>
            
            <View style={styles.healthContainer}>
                <View style={styles.healthCircle}>
                    <Text style={styles.healthScore}>{kpis.dataCompleteness?.completeness || 0}%</Text>
                    <Text style={styles.healthLabel}>Completeness</Text>
                </View>
                <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${kpis.dataCompleteness?.completeness || 0}%` }]} />
                </View>
                
                <View style={styles.statGrid}>
                    <Text style={styles.statItem}>Missing Img: {kpis.dataCompleteness?.missingImage || 0}</Text>
                    <Text style={styles.statItem}>Missing Loc: {kpis.dataCompleteness?.missingCoordinates || 0}</Text>
                    <Text style={styles.statItem}>Missing Desc: {kpis.dataCompleteness?.missingDescription || 0}</Text>
                    <Text style={styles.statItem}>Missing Contact: {kpis.dataCompleteness?.missingContact || 0}</Text>
                </View>

                <View style={{width: '100%', marginTop: 15, gap: 8}}>
                    <TouchableOpacity style={[styles.controlButton, {backgroundColor: '#0f37f1'}]} onPress={runQualityCheck}>
                        <Text style={styles.controlButtonText}>Run Manual Check</Text>
                    </TouchableOpacity>
                    {incompleteDestinations.length > 0 && (
                        <TouchableOpacity style={[styles.controlButton, {backgroundColor: '#16a34a'}]} onPress={exportToSheets}>
                            <Text style={styles.controlButtonText}>Export CSV</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
          </View>
        </View>

      </View>

      {/* Incomplete List View */}
      {showIncompleteList && incompleteDestinations.length > 0 && (
        <View style={styles.incompleteListContainer}>
            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Destinations Needing Data ({incompleteDestinations.length})</Text>
                <TouchableOpacity onPress={() => setShowIncompleteList(false)}>
                    <Ionicons name="close-circle" size={24} color="#dc2626" />
                </TouchableOpacity>
            </View>
            {incompleteDestinations.map((item, index) => (
                <View key={item.id} style={styles.incompleteItem}>
                    <Text style={styles.incompleteName}>{index + 1}. {item.name}</Text>
                    <Text style={styles.incompleteMissing}>Missing: {Object.keys(item.missing).join(', ')}</Text>
                </View>
            ))}
        </View>
       )}
      <View style={{height: 40}} />
    </ScrollView>
  );
};

/* ---------------------- Styles & Config ---------------------- */
const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(15, 55, 241, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#fff' },
  propsForBackgroundLines: { strokeDasharray: "", stroke: "#f1f5f9" }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  scrollContent: { padding: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG_COLOR },
  loadingText: { marginTop: 12, color: SUBTEXT_COLOR, fontWeight: '500' },
  header: { marginBottom: 24 },
  greeting: { fontSize: 28, fontWeight: '800', color: TEXT_COLOR },
  subGreeting: { fontSize: 16, color: SUBTEXT_COLOR, marginTop: 4 },

  /* KPI Grid */
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8, marginBottom: 24 },
  kpiWrapper: { width: '25%', paddingHorizontal: 8, minWidth: 200, marginBottom: 16 },
  kpiCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 3 },
  kpiContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiTitle: { fontSize: 13, color: SUBTEXT_COLOR, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  kpiIconWrap: { padding: 10, borderRadius: 12 },
  /* Charts Common */
  chartCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, flex: 1 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  chartTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: TEXT_COLOR },
  chartStyle: { marginVertical: 8, borderRadius: 16 },
  pillContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 4 },
  pill: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 6 },
  pillActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  pillText: { fontSize: 12, color: SUBTEXT_COLOR, fontWeight: '600' },
  pillTextActive: { color: PRIMARY_COLOR },
  emptyState: { alignItems: 'center', justifyContent: 'center', height: 180 },
  noDataText: { marginTop: 8, color: SUBTEXT_COLOR, fontSize: 14 },
  row: { flexDirection: 'row', marginHorizontal: -12, marginBottom: 12 },
  column: { flexDirection: 'column', marginHorizontal: 0 },
  halfCard: { width: '50%', paddingHorizontal: 12 },
  fullWidth: { width: '100%', marginBottom: 24, paddingHorizontal: 0 },

  /* NEW: Leaderboard Styles */
  leaderboardContainer: { marginTop: 5 },
  lbRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  lbInfo: { width: '35%', marginRight: 10 },
  lbRank: { fontSize: 12, color: SUBTEXT_COLOR, marginBottom: 2 },
  lbLabel: { fontSize: 14, color: TEXT_COLOR, fontWeight: '600' },
  lbBarContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  lbBarBg: { flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, marginRight: 10 },
  lbBarFill: { height: 8, borderRadius: 4 },
  lbValue: { width: 30, fontSize: 13, fontWeight: '700', color: TEXT_COLOR, textAlign: 'right' },

  /* Health & Data Quality Styles */
  healthContainer: { alignItems: 'center', paddingVertical: 10 },
  healthCircle: { alignItems: 'center', marginBottom: 16 },
  healthScore: { fontSize: 36, fontWeight: '800', color: TEXT_COLOR },
  healthLabel: { fontSize: 14, color: SUBTEXT_COLOR, fontWeight: '600' },
  progressBarBackground: { width: '100%', height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, marginBottom: 12 },
  progressBarFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 4 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  statItem: { width: '48%', fontSize: 12, color: SUBTEXT_COLOR, marginBottom: 4 },
  controlButton: { paddingVertical: 10, borderRadius: 8, alignItems: 'center', width: '100%' },
  controlButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  /* Incomplete List Styles */
  incompleteListContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#f59e0b', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#fef3c7', paddingBottom: 8 },
  listTitle: { fontSize: 16, fontWeight: '700', color: '#f59e0b' },
  incompleteItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  incompleteName: { fontSize: 14, fontWeight: '600', color: TEXT_COLOR },
  incompleteMissing: { fontSize: 12, color: '#ef4444', marginTop: 2, fontStyle: 'italic' },
});

export default DashboardHome;