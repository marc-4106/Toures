// services/firestoreDestinations.js
import { db } from "./firebaseConfig"; // adjust to your actual path
import {
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const guessKind = (data) => {
  const cats = (data.tags || data.categories || [])
    .map(String)
    .map((s) => s.toLowerCase());
  if (cats.includes("restaurant")) return "restaurant";
  if (cats.includes("hotel")) return "lodging";
  if (cats.includes("mall")) return "shop";
  return data.kind || "activity";
};

export async function fetchDestinations() {
  const snap = await getDocs(collection(db, "destinations")); // <— collection name
  return snap.docs.map((d) => {
    const data = d.data();

    // normalize tags (prefer new tags; fall back to old categories)
    const tags = Array.isArray(data.tags)
      ? data.tags.map((t) => String(t).toLowerCase())
      : Array.isArray(data.categories)
      ? data.categories.map((c) => String(c).toLowerCase())
      : [];

    return {
      id: d.id,
      ...data,

      // NEW normalized fields (always present to callers)
      kind: data.kind || guessKind({ tags }),
      tags,

      // back-compat: still provide categories for old UIs
      categories: Array.isArray(data.categories) ? data.categories : tags,

      // safe defaults
      Coordinates: data.Coordinates || { latitude: 0, longitude: 0 },
      contact: data.contact || { email: "", phoneRaw: "", phoneE164: "" },
    };
  });
}

export async function addDestination(payload) {
  const ref = await addDoc(collection(db, "destinations"), payload); // <— collection name
  return { id: ref.id };
}

export async function updateDestination(id, payload) {
  await setDoc(doc(db, "destinations", id), payload, { merge: true }); // <—
}

export async function archiveDestination(id) {
  await updateDoc(doc(db, "destinations", id), { isArchived: true }); // <—
}

export async function unarchiveDestination(id) {
  await updateDoc(doc(db, "destinations", id), { isArchived: false }); // <—
}
