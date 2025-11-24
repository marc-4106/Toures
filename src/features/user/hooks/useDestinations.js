// src/features/user/hooks/useDestinations.js
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../services/firebaseConfig";

function normalize(d, id) {
  const kind = (d.kind || "").toLowerCase();
  const tags = Array.isArray(d.tags) ? d.tags : Array.isArray(d.categories) ? d.categories : [];
  const Coordinates = d.Coordinates || { latitude: 0, longitude: 0 };
  return {
    id,
    ...d,
    kind,
    tags,
    Coordinates,
    cityOrMunicipality: d.cityOrMunicipality || "—",
    imageUrl: d.imageUrl || d.imageURL || null,
  };
}

/** Hook: loads non-archived destinations */
export function useDestinations() {
  const [destinations, setDestinations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, "destinations"), where("isArchived", "==", false));
        const snap = await getDocs(q);
        const rows = snap.docs.map((doc) => normalize(doc.data(), doc.id));
        setDestinations(rows);
      } catch (e) {
        console.error(e);
        setErrorMsg("Failed to load places. Please try again.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { destinations, isLoading, errorMsg };
}

// Export BOTH default and named, so either import style works.
export default useDestinations;
