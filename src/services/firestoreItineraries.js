// src/services/firestoreItineraries.js
import { db } from "./firebaseConfig";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export async function saveItinerary(userId, plan) {
  const col = collection(db, "itineraries");
  const docRef = await addDoc(col, {
    userId: userId || null,
    plan,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
