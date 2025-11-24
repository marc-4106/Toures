import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../services/firebaseConfig";

export async function getItinerary(itineraryId) {
  const ref = doc(db, "itineraries", itineraryId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
