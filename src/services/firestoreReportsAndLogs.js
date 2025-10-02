// src/services/firestoreReportsAndLogs.js

import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  addDoc,         
  serverTimestamp 
} from 'firebase/firestore'; 
import app from './firebaseConfig'; 
// NOTE: Ensure 'firebaseConfig.js' is in the same directory, or correct the path above.

// Initialize Firestore instance using the app object
const db = getFirestore(app);

// --- LOG ACTIVITY FUNCTION (Used by ManageDestination) ---
export const logActivity = async (logData) => {
  try {
    const logsCollectionRef = collection(db, 'activityLogs');
    await addDoc(logsCollectionRef, {
      ...logData,
      timestamp: serverTimestamp(), 
    });
  } catch (error) {
    console.error("Failed to write audit log:", error); 
  }
};

// --- AUDIT TRAIL FETCH FUNCTION (fetchAuditLogs) ---
export const fetchAuditLogs = async () => {
  try {
    const activityLogsRef = collection(db, 'activityLogs');
    const q = query(activityLogsRef, orderBy('timestamp', 'desc'), limit(100));
    
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : new Date(), 
    }));
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    throw new Error("Failed to fetch audit logs from Firestore.");
  }
};


// --- REPORT FETCH FUNCTION (fetchReportMetrics) - ABSOLUTE MINIMAL VERSION ---

export const fetchReportMetrics = async () => {
  try {
    // CRITICAL LINE: This fetches raw documents only.
    const destinationsSnapshot = await getDocs(collection(db, 'destinations')); 
    
    const allDestinations = destinationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));

    const categoryCounts = {};
    const activeDestinations = allDestinations.filter(d => !d.isArchived);

    // Only calculating categories, as this relies on a string array, not numbers.
    activeDestinations.forEach(d => {
        (d.category || []).forEach(cat => {
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
    });

    return {
      totalDestinations: allDestinations.length,
      activeDestinations: activeDestinations.length,
      archivedDestinations: allDestinations.filter(d => d.isArchived).length,
      featuredDestinations: allDestinations.filter(d => d.isFeatured).length,
      
      // Removed all numerical calculations, setting to 0 or {}
      averagePopularity: 0,
      totalBudgetPHP: 0, 
      categoryCounts: categoryCounts,
    };
  } catch (error) {
    // CRITICAL: This error is the key if it still fails.
    console.error("REPORT METRICS FETCH FAILED. Code:", error.code, "Message:", error.message); 
    throw new Error("Failed to fetch report metrics from Firestore. See console for code."); 
  }
};