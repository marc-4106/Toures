// features/recommender/derivePlace.js
export function derivePlace(raw) {
  // raw example fields:
  // raw.Coordinates.latitude, raw.Coordinates.longitude, raw.categories[], raw.idealCost, raw.name, raw.description, etc.
  const lat = raw?.Coordinates?.latitude ?? 0;
  const lng = raw?.Coordinates?.longitude ?? 0;
  const cats = (raw.categories || []).map(c => String(c).toLowerCase());

  // choose a single kind for logic; you can still keep categories for display
  const kind =
    cats.includes("restaurant") ? "restaurant" :
    cats.includes("mall") ? "shop" : "activity";

  // tags for interest matching
  const tags = Array.from(new Set([
    ...cats.map(c => c.replace(/\s+/g, "_")),
    cats.includes("mall") ? "shopping" : null,
    cats.includes("mall") ? "indoor" : null
  ].filter(Boolean)));

  // price band from idealCost (tweak thresholds to your locale)
  const cost = typeof raw.idealCost === "number" ? raw.idealCost : 0;
  const priceBand = cost < 150 ? 1 : cost <= 400 ? 2 : 3;

  const indoorOutdoor = cats.includes("mall") ? "indoor" : "mixed";

  return {
    id: raw.id || raw._id || raw.docId,
    name: raw.name,
    description: raw.description || "",
    lat, lng,
    kind,
    tags,
    priceBand,               // 1=$, 2=$$, 3=$$$
    indoorOutdoor,           // "indoor" | "outdoor" | "mixed"
    seasonBest: ["all"],     // default for now
    rating: raw.rating || 4, // optional, give a neutral default
  };
}
