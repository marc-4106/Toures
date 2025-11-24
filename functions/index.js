/**
 * Firebase Functions v2 – Full Admin Dashboard Backend
 * Includes:
 *  - Destination Metrics
 *  - User Metrics
 *  - Support Ticket Metrics
 *  - Completeness Scoring (unified 8-field)
 *  - Daily Scheduled Aggregation
 *  - Manual Admin Refresh via HTTPS
 *  - Historical Daily Metrics
 *  - User Sync (toggle disabled)
 */

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const cors = require("cors")({ origin: true });

initializeApp();
const db = getFirestore();

const METRICS_DOC_REF_PATH = "adminDashboard/metrics";

/**
 * 🔥 Main aggregation logic
 * Fetches Destinations, Users, Tickets
 * Computes completeness, verification, ticket resolution, etc.
 */
const runAggregationAndCache = async () => {
  console.log("📊 Starting metrics aggregation...");
  const start = Date.now();

  const [destSnap, userSnap, ticketSnap] = await Promise.all([
    db.collection("destinations").get(),
    db.collection("users").get(),
    db.collection("supportTickets").get(),
  ]);

  /** ============================================================
   * DESTINATION METRICS
   ============================================================ */
  const totalDest = destSnap.size;
  let archived = 0,
      featured = 0,
      missingImage = 0,
      missingContact = 0,
      missingCoord = 0,
      missingKind = 0,
      missingDescription = 0,
      missingCity = 0,
      missingTags = 0,
      missingActivities = 0;

  destSnap.forEach((doc) => {
    const d = doc.data();
    if (d.isArchived) archived++;
    if (d.isFeatured) featured++;

    if (!d.imageUrl) missingImage++;
    if (!d.contact?.email && !d.contact?.phoneRaw) missingContact++;
    if (!d.Coordinates?.latitude || !d.Coordinates?.longitude) missingCoord++;
    if (!d.kind?.trim()) missingKind++;
    if (!d.description?.trim()) missingDescription++;
    if (!d.cityOrMunicipality?.trim()) missingCity++;
    if (!d.tags?.length) missingTags++;

    // Hotels & restaurants do not require activities
    if (!["hotel", "restaurant"].includes((d.kind || "").toLowerCase()) &&
        (!d.activities || d.activities.length === 0)) {
      missingActivities++;
    }
  });

  const totalChecks = totalDest * 8;
  const totalMissing = missingImage + missingContact + missingCoord + missingKind +
                       missingDescription + missingCity + missingTags + missingActivities;

  const completenessScore = totalChecks > 0 ? Math.round(((totalChecks - totalMissing)/totalChecks)*100) : 0;

  /** ============================================================
   * USER METRICS
   ============================================================ */
  const totalUsers = userSnap.size;
  let activeUsers = 0,
      restrictedUsers = 0,
      verifiedCount = 0;

  const roleCounts = { superadmin: 0, admin: 0, user: 0 };

  userSnap.forEach((doc) => {
    const u = doc.data();
    const role = u.role || "user";
    roleCounts[role] = (roleCounts[role] || 0) + 1;

    if (u.isActive !== false) activeUsers++;
    else restrictedUsers++;

    if (u.isVerified || u.emailVerified) verifiedCount++;
  });

  const verificationRate = totalUsers > 0 ? Number((verifiedCount/totalUsers)*100).toFixed(1) : 0;

  /** ============================================================
   * SUPPORT TICKET METRICS
   ============================================================ */
  const tickets = ticketSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const totalTickets = tickets.length;

  const newTickets = tickets.filter(t =>
    ["new","pending"].includes(String(t.status || "").toLowerCase())
  ).length;

  const resolvedTickets = tickets.filter(t =>
    String(t.status || "").toLowerCase() === "resolved"
  ).length;

  let totalHours = 0;
  let resolvedCount = 0;

  tickets.forEach((t) => {
    const status = String(t.status || "").toLowerCase();
    if (status === "resolved" && t.createdAt && t.resolvedAt) {
      const created = t.createdAt.toDate();
      const resolved = t.resolvedAt.toDate();
      totalHours += (resolved - created) / (1000*60*60);
      resolvedCount++;
    }
  });

  const avgResolutionHours = resolvedCount > 0 ? Number(totalHours/resolvedCount).toFixed(1) : 0;

  /** ============================================================
   * FINAL METRICS OBJECT
   ============================================================ */
  const finalMetrics = {
    lastUpdated: new Date().toISOString(),
    aggregationDurationMs: Date.now() - start,

    // DESTINATIONS
    totalDestinations: totalDest,
    archivedDestinations: archived,
    featuredDestinations: featured,
    dataCompleteness: {
      completeness: completenessScore,
      missingImage,
      missingContact,
      missingCoordinates: missingCoord,
      missingKind,
      missingDescription,
      missingCity,
      missingTags,
      missingActivities
    },

    // USERS
    totalUsers,
    activeUsers,
    restrictedUsers,
    verificationRate,
    roleCounts,

    // TICKETS
    totalTickets,
    newTickets,
    resolvedTickets,
    avgResolutionHours
  };

  // Save aggregated metrics to main doc
  await db.doc(METRICS_DOC_REF_PATH).set(finalMetrics, { merge: true });

  // Save historical daily metrics
  const dateKey = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  try {
    await db
      .collection("adminDashboard")
      .doc("history")
      .collection("dailyMetrics")
      .doc(dateKey)
      .set(finalMetrics);

    console.log("✅ Daily metrics saved:", dateKey);
  } catch (err) {
    console.error("❌ History write failed:", err);
  }

  return finalMetrics;
};


/* ================================================================
   DAILY SCHEDULED REFRESH
================================================================= */
exports.dailyMetricsScheduler = onSchedule(
  { schedule: "0 2 * * *", region: "asia-east1" },
  async () => {
    console.log("🕒 Scheduled daily metrics triggered");
    const start = Date.now();
    try {
      await runAggregationAndCache();
      console.log(`✅ Aggregation completed in ${Date.now() - start}ms`);
      return { success: true };
    } catch (err) {
      console.error("❌ Scheduled metrics error:", err);
      return { success: false, error: err.message };
    }
  }
);


/* ================================================================
   MANUAL ADMIN REFRESH
================================================================= */
exports.runMetricsAggregation = onRequest(
  { region: "asia-east1" },
  (req, res) => {
    cors(req, res, async () => {
      try {
        const authHeader = req.get("Authorization") || "";
        if (!authHeader.startsWith("Bearer ")) {
          return res.status(403).json({ success: false, error: "Unauthorized" });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decoded = await getAuth().verifyIdToken(idToken);
        if (!["admin", "superadmin"].includes(decoded.role)) {
          return res.status(403).json({ success: false, error: "Forbidden" });
        }

        console.log("⚡ Manual aggregation triggered by", decoded.uid);
        const data = await runAggregationAndCache();
        res.status(200).json({ success: true, data });
      } catch (err) {
        console.error("❌ Manual aggregation failed:", err);
        res.status(500).json({ success: false, error: err.message });
      }
    });
  }
);

/* ================================================================
   2. UNIFIED USER SYNC (Optimized)
   Handles both "Disable User" and "Sync Admin Role" in ONE function.
   Saves 50% cost compared to having two listeners.
================================================================= */

exports.onUserUpdate = onDocumentUpdated(
  { document: "users/{userId}", region: "asia-east1" },
  async (event) => {
    // Safety checks for deletion
    if (!event.data || !event.data.after.exists) return null;

    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;
    const promises = [];

    // A. SYNC DISABLED STATUS (isActive changed)
    if (before.isActive !== after.isActive && after.isActive !== undefined) {
      const togglePromise = getAuth().updateUser(userId, {
        disabled: !after.isActive,
      }).then(() => console.log(`🔄 User ${userId} access: ${after.isActive ? "ENABLED" : "DISABLED"}`));
      promises.push(togglePromise);
    }

    // B. SYNC ADMIN ROLE (role changed)
    if (before.role !== after.role) {
      const newRole = after.role || "user";
      const rolePromise = getAuth().setCustomUserClaims(userId, {
        role: newRole,
      }).then(() => console.log(`🛡️ User ${userId} role updated to: [${newRole}]`));
      promises.push(rolePromise);
    }

    // Execute both updates in parallel for speed
    if (promises.length > 0) {
      try {
        await Promise.all(promises);
      } catch (err) {
        console.error("❌ User sync failed:", err);
      }
    }

    return null;
  }
);
