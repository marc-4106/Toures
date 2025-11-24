// src/services/firestoreReportsAndLogs.js

import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,  query, orderBy, limit, where,
} from "firebase/firestore";
import app from "./firebaseConfig";


const db = getFirestore(app);

// ✅ Fetch recent 5 logs (default)

export const fetchRecentActivityLogs = async (filters = {}) => {
  try {
    console.log("🧭 Fetching activity logs with filters:", filters);
    const logsRef = collection(db, "activityLogs");

    const conditions = [];

    // 🔹 Filter by date range (only these go to Firestore)
    if (filters.startDate && filters.endDate) {
      conditions.push(where("timestamp", ">=", filters.startDate));
      conditions.push(where("timestamp", "<=", filters.endDate));
    }

    // 🔹 Always order by timestamp desc
    const q = query(logsRef, ...conditions, orderBy("timestamp", "desc"), limit(100));
    const snap = await getDocs(q);

    let logs = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(),
    }));

    // 🔹 Apply case-insensitive filter *client-side*
    if (filters.actionType) {
      const normalized = filters.actionType.trim().toLowerCase();
      logs = logs.filter(
        (log) => log.actionType?.toString().trim().toLowerCase() === normalized
      );
    }

    console.log("📄 Final filtered logs:", logs.length);
    return logs;
  } catch (error) {
    console.error("❌ Error fetching logs:", error);
    return [];
  }
};



/* --------------------------------------------------
   MAIN: DESTINATION, USER, and SUPPORT REPORTS
-------------------------------------------------- */
export const fetchReportMetrics = async () => {
  try {
    console.log("🔥 Fetching combined report metrics...");

    // Fetch all collections
    const [destSnap, itinSnap, usersSnap, ticketsSnap] = await Promise.all([
      getDocs(collection(db, "destinations")),
      getDocs(collection(db, "itineraries")),
      getDocs(collection(db, "users")),
      getDocs(collection(db, "supportTickets")), // ✅ correct Firestore collection
    ]);

    console.log(
      `✅ Destinations: ${destSnap.size}, Itineraries: ${itinSnap.size}, Users: ${usersSnap.size}, Tickets: ${ticketsSnap.size}`
    );

    const destinations = destSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const itineraries = itinSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const users = usersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const tickets = ticketsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log("🎟 Sample ticket statuses:", tickets.map(t => t.status));

    /* ---------------------------
       DESTINATION REPORTS
    --------------------------- */
    const totalDestinations = destinations.length;
    const activeDestinations = destinations.filter((d) => !d.isArchived).length;
    const archivedDestinations = destinations.filter((d) => d.isArchived).length;
    const featuredDestinations = destinations.filter((d) => d.isFeatured).length;

    const tagCounts = {};

    itineraries.forEach((it) => {
      const interests = it.preferences?.interests;

      if (Array.isArray(interests)) {
        interests.forEach((tag) => {
          if (typeof tag === "string" && tag.trim().length > 0) {
            const clean = tag.trim();
            tagCounts[clean] = (tagCounts[clean] || 0) + 1;
          }
        });
      }
    });

    // Convert to sorted list
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({
        tag,
        count: Number(count) || 0,
      }));


    /* ---------------------------
       🔥 COMPLETENESS (FIXED)
       Uses 8 required fields
    --------------------------- */
    const missingImage = destinations.filter((d) => !d.imageUrl).length;
    const missingContact = destinations.filter(
      (d) => !d.contact?.phoneRaw && !d.contact?.email
    ).length;
    const missingCoordinates = destinations.filter(
      (d) => !d.Coordinates?.latitude || !d.Coordinates?.longitude
    ).length;
    const missingDescription = destinations.filter(
      (d) => !d.description?.trim()
    ).length;
    const missingCity = destinations.filter(
      (d) => !d.cityOrMunicipality?.trim()
    ).length;
    const missingTags = destinations.filter(
      (d) => !d.tags || d.tags.length === 0
    ).length;
    const missingKind = destinations.filter(
      (d) => !d.kind?.trim()
    ).length;

    const missingActivities = destinations.filter(
      (d) =>
        !["hotel", "restaurant"].includes(d.kind?.toLowerCase()) &&
        (!d.activities || d.activities.length === 0)
    ).length;

    // 🔥 FIX: now using 8 completeness fields
    const totalChecks = totalDestinations * 8;
    const totalMissing =
      missingImage +
      missingContact +
      missingCoordinates +
      missingKind +
      missingDescription +
      missingCity +
      missingTags +
      missingActivities;

    const completeness =
      totalDestinations > 0
        ? Math.round(((totalChecks - totalMissing) / totalChecks) * 100)
        : 0;


    const usageCounts = {};
    itineraries.forEach((it) =>
      (it.days || []).forEach((day) =>
        (day.activities || []).forEach((a) => {
          if (a?.name) usageCounts[a.name] = (usageCounts[a.name] || 0) + 1;
        })
      )
    );
    
    const mostUsedDestinations = Object.entries(usageCounts)
      .filter(([name, count]) => name && typeof count === "number")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name: name || "Unknown",
        count: Number(count) || 0,
      }));

    /* ---------------------------
       USER REPORTS
    --------------------------- */
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.isActive).length;
    const restrictedUsers = users.filter((u) => !u.isActive).length;
    const verifiedUsers = users.filter((u) => u.emailVerified).length;

    const roleCounts = {};
    users.forEach((u) => {
      const role = u.role || "unknown";
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    const verificationRate =
      totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0;

    const recentUsers = users
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB - dateA;
      })
      .slice(0, 5)
      .map((u) => ({ name: u.name || "Unknown", email: u.email }));

    /* ---------------------------
       SUPPORT TICKET REPORTS
    --------------------------- */
    const totalTickets = tickets.length;

    const newTickets = tickets.filter(
      (t) =>
        String(t.status || "").trim().toLowerCase() === "new" ||
        (t.status || "").trim().toLowerCase() === "pending"
    ).length;

    const resolvedTickets = tickets.filter(
      (t) => String(t.status || "").trim().toLowerCase() === "resolved"
    ).length;

    console.log(`🎫 Tickets — Total: ${totalTickets}, New: ${newTickets}, Resolved: ${resolvedTickets}`);

    const recentTickets = tickets
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB - dateA;
      })
      .slice(0, 5)
      .map((t) => ({
        subject: t.subject || "No subject",
        status: t.status || "Unknown",
        userEmail: t.userEmail || "",
      }));

    let totalHours = 0;
    let resolvedCount = 0;

    tickets.forEach((t) => {
      const status = String(t.status || "").trim().toLowerCase();

      if (status === "resolved" && t.createdAt && t.resolvedAt) {
        const created = t.createdAt.toDate();
        const resolved = t.resolvedAt.toDate();

        const diffMs = resolved.getTime() - created.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        totalHours += diffHours;
        resolvedCount++;
      }
    });

    const averageResolutionTime =
      resolvedCount > 0 ? Number(totalHours / resolvedCount).toFixed(2) : 0;


    /* ---------------------------
       FINAL REPORT RETURN
    --------------------------- */
    const report = {
      // Destination
      totalDestinations,
      activeDestinations,
      archivedDestinations,
      featuredDestinations,
      topTags,
      mostUsedDestinations,
      dataCompleteness: {
        completeness,
        missingImage,
        missingContact,
        missingCoordinates,
        missingKind,
        missingDescription,
        missingCity,
        missingTags,
        missingActivities,
      },
      // User
      totalUsers,
      activeUsers,
      restrictedUsers,
      roleCounts,
      verificationRate,
      recentUsers,
      // Support Tickets
      totalTickets,
      newTickets,
      resolvedTickets,
      recentTickets,
      averageResolutionTime
    };

    console.log("📊 Full Report Data:", report);
    return report;
  } catch (error) {
    console.error("❌ REPORT FETCH FAILED:", error);
    throw new Error("Failed to fetch reports from Firestore.");
  }
};

/* --------------------------------------------------
   OPTIONAL: AUDIT LOGS
-------------------------------------------------- */
export const fetchAuditLogs = async () => {
  try {
    const snap = await getDocs(collection(db, "activityLogs"));
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error("Error fetching logs:", error);
    return [];
  }
};

/* --------------------------------------------------
   LOG ACTIVITY
-------------------------------------------------- */
export const logActivity = async (logData) => {
  try {
    const normalizedAction =
      logData.actionType?.toString().trim().toUpperCase() || "UNKNOWN";

    await addDoc(collection(db, "activityLogs"), {
      ...logData,
      actionType: normalizedAction, // ✅ store uppercase only
      timestamp: serverTimestamp(),
    });

    console.log("🟢 Logged activity:", normalizedAction);
  } catch (error) {
    console.error("❌ Failed to log activity:", error);
  }
};
