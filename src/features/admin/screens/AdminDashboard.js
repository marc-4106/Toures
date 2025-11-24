import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import app from '../../../services/firebaseConfig';
import { fetchReportMetrics } from '../../../services/firestoreReportsAndLogs';

const db = getFirestore(app);

/* ---------------------- KPICard ---------------------- */
const KPICard = ({ iconName, title, value }) => (
  <View style={styles.kpiCard}>
    <View style={styles.kpiTopRow}>
      <View style={styles.kpiIconWrap}>
        <Ionicons name={iconName} size={22} color="#0f37f1" />
      </View>
      <Text style={styles.kpiTitle}>{title}</Text>
    </View>
    <View style={styles.kpiBottomRow}>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  </View>
);

/* ---------------------- ItineraryTrend ---------------------- */
const ItineraryTrend = ({ itineraries }) => {
  const [range, setRange] = useState('all');
  const [trendData, setTrendData] = useState({ labels: [], values: [] });
  const [chartWidth, setChartWidth] = useState(0);

  const getDateRange = () => {
    if (range === 'all') return { start: new Date(2000, 0, 1), end: new Date() };
    const today = new Date();
    let startDate;
    switch (range) {
      case '7days':
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
        break;
      case '30days':
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
        break;
      case '3months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        break;
      default:
        startDate = today;
    }
    return { start: startDate, end: today };
  };

  const loadTrend = () => {
    const { start, end } = getDateRange();
    const counts = {};
    itineraries.forEach(d => {
      const created = d.createdAt?.toDate?.() || new Date(d.createdAt);
      if (!created || created < start || created > end) return;
      const dayLabel = created.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      counts[dayLabel] = (counts[dayLabel] || 0) + 1;
    });
    const sortedLabels = Object.keys(counts).sort((a, b) => new Date(a) - new Date(b));
    const values = sortedLabels.map(l => counts[l]);
    setTrendData({ labels: sortedLabels, values });
  };

  useEffect(() => { loadTrend(); }, [itineraries, range]);

  return (
    <View
      style={styles.chartCard}
      onLayout={e => setChartWidth(e.nativeEvent.layout.width)}
    >
      <Text style={styles.chartTitle}>Itinerary Generation Trend</Text>
      {chartWidth > 0 && trendData.values.length > 0 ? (
        <LineChart
          data={{ labels: trendData.labels, datasets: [{ data: trendData.values }] }}
          width={chartWidth - 24}
          height={180}
          chartConfig={chartConfig}
          style={{ borderRadius: 12 }}
          bezier
          fromZero
        />
      ) : (
        <Text style={styles.noData}>No data available</Text>
      )}

      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'All Time' },
          { key: '7days', label: '7 Days' },
          { key: '30days', label: '30 Days' },
          { key: '3months', label: '3 Months' },
        ].map(opt => (
          <TouchableOpacity key={opt.key} onPress={() => setRange(opt.key)}>
            <Text style={[styles.filterText, range === opt.key && styles.filterActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

/* ---------------------- Top Destination ---------------------- */
const DestinationPopularity = ({ data }) => {
  const [chartWidth, setChartWidth] = useState(0);
  const top6 = data.slice(0, 6);
  const labels = top6.map(d => d.label);
  const values = top6.map(d => d.value);

  return (
    <View
      style={styles.chartCard}
      onLayout={e => setChartWidth(e.nativeEvent.layout.width)}
    >
      <Text style={styles.chartTitle}>Top Destinations</Text>
      {chartWidth > 0 && values.length > 0 ? (
        <BarChart
          data={{ labels, datasets: [{ data: values }] }}
          width={chartWidth - 24}
          height={180}
          chartConfig={chartConfig}
          style={{ borderRadius: 12 }}
          fromZero
        />
      ) : (
        <Text style={styles.noData}>No data available</Text>
      )}
    </View>
  );
};

/* ---------------------- Most Visited Cities ---------------------- */
const MostVisitedCities = ({ itineraries }) => {
  const [chartWidth, setChartWidth] = useState(0);
  const cityCounts = {};
  itineraries.forEach(it => {
    const city = it.startCity || 'Unknown';
    cityCounts[city] = (cityCounts[city] || 0) + 1;
  });

  const sortedCities = Object.keys(cityCounts)
    .map(city => ({ label: city, value: cityCounts[city] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const labels = sortedCities.map(c => c.label);
  const values = sortedCities.map(c => c.value);

  return (
    <View
      style={styles.chartCard}
      onLayout={e => setChartWidth(e.nativeEvent.layout.width)}
    >
      <Text style={styles.chartTitle}>Most Visited Cities/Municipalities</Text>
      {chartWidth > 0 && values.length > 0 ? (
        <BarChart
          data={{ labels, datasets: [{ data: values }] }}
          width={chartWidth - 24}
          height={180}
          chartConfig={chartConfig}
          style={{ borderRadius: 12 }}
          fromZero
        />
      ) : (
        <Text style={styles.noData}>No data available</Text>
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
  const [topTags, setTopTags] = useState([]);
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

      setKpis({
        totalTourist: usersOnly.length,
        activeItineraries: itinerariesSnap.docs.filter(d => (d.data().status || '').toLowerCase() !== 'completed').length,
        featuredDestinations: destSnap.docs.filter(d => d.data().isFeatured).length,
        totalDestinations: reportMetrics.totalDestinations,
        dataCompleteness: reportMetrics.dataCompleteness.completeness,
      });

      const itinerariesArr = itinerariesSnap.docs.map(d => {
        const data = d.data();
        return {
          createdAt: data.createdAt,
          startCity: data.preferences?.startCity?.label || 'Unknown',
        };
      });
      setItinerariesList(itinerariesArr);

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

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#0f37f1" />
      <Text>Loading overview...</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* KPI */}
      <View style={styles.kpiRow}>
        <KPICard iconName="people-outline" title="Total Tourist" value={kpis.totalTourist} />
        <KPICard iconName="map-outline" title="Active Itineraries" value={kpis.activeItineraries} />
        <KPICard iconName="star-outline" title="Featured Destinations" value={kpis.featuredDestinations} />
        <KPICard iconName="location-outline" title="Total Destinations" value={kpis.totalDestinations} />
        <KPICard iconName="shield-checkmark-outline" title="Data Completeness" value={`${kpis.dataCompleteness}%`} />
      </View>

      {/* Charts */}
      <ItineraryTrend itineraries={itinerariesList} />

      {/* Top Destination - Full Width */}
      <View style={{ width: '100%', marginBottom: 12 }}>
        <DestinationPopularity data={topDestinations} />
      </View>

      {/* Most Visited Cities - Full Width */}
      <View style={{ width: '100%', marginBottom: 12 }}>
        <MostVisitedCities itineraries={itinerariesList} />
      </View>

      {/* Top Tags & Data Completeness Side by Side */}
      <View style={[styles.twoColRow, isSmallScreen && { flexDirection: 'column' }]}>
        <View style={[styles.colItem, isSmallScreen && { width: '100%', marginBottom: 12 }]}>
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Top Tags</Text>
            <View style={styles.tagsRow}>
              {topTags.map((tag, idx) => (
                <View key={idx} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={[styles.colItem, isSmallScreen && { width: '100%' }]}>
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Destination Data Completeness</Text>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${kpis.dataCompleteness}%` }]} />
            </View>
            <Text style={styles.progressText}>{kpis.dataCompleteness}% Complete</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

/* ---------------------- Styles & Config ---------------------- */
const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(15,55,241, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(51,65,85, ${opacity})`,
  style: { borderRadius: 12 },
  propsForDots: { r: '3' },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 18 },
  kpiCard: { width: '31%', backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 2, marginBottom: 12 },
  kpiTopRow: { flexDirection: 'row', alignItems: 'center' },
  kpiIconWrap: { backgroundColor: '#eef2ff', padding: 8, borderRadius: 8, marginRight: 8 },
  kpiTitle: { fontSize: 14, color: '#475569', fontWeight: '600' },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#0f37f1', marginTop: 6 },

  chartCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 14, elevation: 2 },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 8 },

  filterRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  filterText: { color: '#64748b' },
  filterActive: { fontWeight: '700', color: '#0f37f1', textDecorationLine: 'underline' },

  noData: { textAlign: 'center', color: '#94a3b8', paddingVertical: 12 },

  twoColRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  colItem: { width: '49%' },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBadge: { backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 6, marginBottom: 6 },
  tagText: { color: '#0f37f1', fontWeight: '600', fontSize: 12 },

  progressBarBackground: { width: '100%', height: 12, backgroundColor: '#e2e8f0', borderRadius: 6, marginVertical: 6 },
  progressBarFill: { height: '100%', backgroundColor: '#0f37f1', borderRadius: 6 },
  progressText: { textAlign: 'right', color: '#475569', fontSize: 12, marginTop: 4 },
});

export default DashboardHome;
