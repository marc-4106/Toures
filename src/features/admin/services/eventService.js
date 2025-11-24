// src/features/admin/services/eventService.js

import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { db, storage } from "../../../services/firebaseConfig"; // Check your path
import { logActivity } from "../../../services/firestoreReportsAndLogs"; // Check your path

const EVENTS_COL = "events";

// Helper to format date object to YYYY-MM-DD string
export const formatDateForInput = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toISOString().split('T')[0];
};

// Fetch all events
export const fetchEvents = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, EVENTS_COL));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};

// Save (Create or Update) Event
export const saveEvent = async (eventData, imageUri) => {
  try {
    let imageUrl = eventData.imageUrl;

    // 1. Upload Image if a NEW URI is provided
    if (imageUri && imageUri !== imageUrl) {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const filename = imageUri.split('/').pop();
      const storageRef = ref(storage, `events/${Date.now()}_${filename}`);
      const snapshot = await uploadBytes(storageRef, blob);
      imageUrl = await getDownloadURL(snapshot.ref);
    }

    // 2. Prepare Payload
    const payload = {
      title: eventData.title,
      description: eventData.description || "",
      eventType: eventData.eventType,
      startDate: eventData.startDate ? Timestamp.fromDate(new Date(eventData.startDate)) : null,
      endDate: eventData.endDate ? Timestamp.fromDate(new Date(eventData.endDate)) : null,
      imageUrl: imageUrl || "",
      hasSubEvents: eventData.hasSubEvents,
      subEvents: eventData.subEvents || [],
      updatedAt: Timestamp.now(),
    };

    // 3. Update or Add
    if (eventData.id) {
      const eventRef = doc(db, EVENTS_COL, eventData.id);
      await updateDoc(eventRef, payload);
      return { id: eventData.id, ...payload };
    } else {
      payload.createdAt = Timestamp.now();
      payload.status = "active";
      const docRef = await addDoc(collection(db, EVENTS_COL), payload);
      return { id: docRef.id, ...payload };
    }
  } catch (error) {
    console.error("Error saving event:", error);
    throw error;
  }
};

// Archive/Restore Event
export const toggleArchiveEvent = async (id, currentStatus) => {
  const newStatus = currentStatus === "active" ? "archived" : "active";
  const eventRef = doc(db, EVENTS_COL, id);
  await updateDoc(eventRef, { status: newStatus });
  return newStatus;
};

// Delete Event
export const deleteEvent = async (id) => {
  const eventRef = doc(db, EVENTS_COL, id);
  await deleteDoc(eventRef);
};

// Helper for partial updates (used by auto-cleanup)
export const updateEventPartial = async (id, fields) => {
  const eventRef = doc(db, EVENTS_COL, id);
  await updateDoc(eventRef, fields);
};

/* ==================================================================
   🚀 GLOBAL AUTO-CLEANUP (ADMIN ONLY)
   Call this in App.js. It silently archives old events.
   ================================================================== */
export const runAutoEventCleanup = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) return;

  try {
    // 1. SECURITY CHECK: Check Custom Claims
    // We force refresh (true) to get the latest role
    const tokenResult = await user.getIdTokenResult(true);
    const role = tokenResult.claims.role;

    // STOP if not an Admin (Regular users cannot write to database)
    if (role !== 'admin' && role !== 'superadmin') {
      console.log(`👤 User role is '${role || 'user'}'. Skipping event cleanup.`);
      return; 
    }

    console.log(`🛡️ Admin '${role}' detected. Running Auto-Event Cleanup...`);

    // 2. Fetch Events
    const events = await fetchEvents();
    const now = new Date();
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    let updatesCount = 0;

    const updatePromises = events.map(async (ev) => {
      if (ev.status === 'archived') return null;

      let needsUpdate = false;
      let newStatus = ev.status;
      let updatedSubEvents = [...(ev.subEvents || [])];

      // A. Check Main Event Expiry
      const endDateTimestamp = ev.eventType === 'range' ? ev.endDate : ev.startDate;
      
      if (endDateTimestamp) {
        const endDate = endDateTimestamp.toDate ? endDateTimestamp.toDate() : new Date(endDateTimestamp);
        // Set to end of that day (23:59:59)
        endDate.setHours(23, 59, 59, 999);

        if (now > endDate) {
          newStatus = "archived";
          needsUpdate = true;
          
          await logActivity({
            actorName: user.email || "Auto-Cleaner",
            actorId: user.uid,
            actionType: "AUTO_ARCHIVE",
            targetEntity: "Event",
            targetId: ev.id,
            details: `Auto-archived ended event: ${ev.title}`,
          });
        }
      }

      // B. Check Sub-Events (If main event is still active)
      if (!needsUpdate && updatedSubEvents.length > 0) {
        let subChanged = false;
        updatedSubEvents = updatedSubEvents.map(sub => {
          if (sub.status === "completed") return sub; 

          if (sub.date) {
            const subDate = new Date(sub.date); 
            // If subDate < Today Midnight -> It was yesterday or older
            if (subDate < todayMidnight) {
              subChanged = true;
              return { ...sub, status: "completed" };
            }
          }
          return sub;
        });

        if (subChanged) needsUpdate = true;
      }

      // C. Commit Changes
      if (needsUpdate) {
        updatesCount++;
        await updateEventPartial(ev.id, {
          status: newStatus,
          subEvents: updatedSubEvents
        });
      }
    });

    await Promise.all(updatePromises);
    if (updatesCount > 0) console.log(`✅ Cleanup finished. Updated ${updatesCount} events.`);
    else console.log("✅ No events needed cleanup.");
    
  } catch (error) {
    console.warn("⚠️ Auto-cleanup failed (likely permission/network):", error);
  }
};