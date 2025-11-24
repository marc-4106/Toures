// features/recommender/fuzzyScorer.js
const tri = (x, a, b, c) => (x <= a || x >= c) ? 0 : (x < b ? (x - a) / (b - a) : (c - x) / (c - b));
const clamp01 = x => Math.max(0, Math.min(1, x));

export function fuzzyScore({ user, place }) {
  // user: { budget:0..1, interests:[], prefDistanceKm:number, season:"dry"|"wet", weather:0..1 }
  // place: { priceBand:1|2|3, tags:[], indoorOutdoor:"indoor"|"outdoor"|"mixed", distanceKm:number, rating?:number, seasonBest?:[] }

  const B = {
    low:  tri(user.budget, 0, 0.15, 0.4),
    mid:  tri(user.budget, 0.3, 0.5, 0.7),
    high: tri(user.budget, 0.6, 0.85, 1)
  };
  const W = {
    poor:  tri(user.weather, 0, 0.2, 0.45),
    fair:  tri(user.weather, 0.35, 0.55, 0.75),
    great: tri(user.weather, 0.6, 0.85, 1)
  };
  const D = {
    near: tri(place.distanceKm, 0, 0.8, 1.6),
    mod:  tri(place.distanceKm, 1, 2.5, 4.5),
    far:  tri(place.distanceKm, 3.5, 6, 8),
  };

  // Jaccard interest match
  const jaccard = (a, b) => {
    const A = new Set(a), Bset = new Set(b);
    const inter = [...A].filter(x => Bset.has(x)).length;
    const uni = new Set([...A, ...Bset]).size || 1;
    return inter / uni;
  };
  const interest = jaccard(user.interests || [], place.tags || []);
  const I = {
    none:    tri(interest, 0, 0, 0.2),
    partial: tri(interest, 0.15, 0.45, 0.75),
    strong:  tri(interest, 0.6, 0.85, 1)
  };

  const indoor  = place.indoorOutdoor === "indoor"  ? 1 : place.indoorOutdoor === "mixed" ? 0.5 : 0;
  const outdoor = place.indoorOutdoor === "outdoor" ? 1 : place.indoorOutdoor === "mixed" ? 0.5 : 0;
  const seasonFit = (place.seasonBest || ["all"]).includes("all") || (place.seasonBest || []).includes(user.season) ? 1 : 0.5;

  const HIGH = 0.9, MED = 0.6, LOW = 0.3, VLOW = 0.1;
  let s = 0, w = 0;
  const add = (weight, value) => { s += weight * value; w += weight; };

  // rules
  add(Math.min(B.low,  place.priceBand === 1 ? 1 : 0), HIGH);
  add(Math.min(B.high, place.priceBand === 3 ? 1 : 0), HIGH);
  add(I.strong, HIGH);
  add(I.partial, MED);
  add(D.near, HIGH);
  add(Math.min(D.far, W.great), MED);
  add(Math.min(W.poor, indoor), HIGH);
  add(Math.min(W.great, outdoor), HIGH);
  add(seasonFit, MED);
  add(Math.min(B.low, place.priceBand >= 2 ? 1 : 0), LOW);
  add(Math.min(D.far, W.poor), VLOW);

  if (place.rating != null) add(0.2, clamp01(place.rating / 5));

  const score = w > 0 ? s / w : 0;

  // for explain UI
  const reasons = [];
  if (I.strong > 0.5) reasons.push("Strong interest match");
  else if (I.partial > 0.5) reasons.push("Partial interest match");
  if (D.near > 0.5) reasons.push("Near");
  if (W.great > 0.5 && outdoor > 0.5) reasons.push("Outdoor & good weather");
  if (W.poor > 0.5 && indoor > 0.5) reasons.push("Indoor & poor weather");
  if (seasonFit > 0.7) reasons.push("Good for this season");
  if (B.low > 0.6 && place.priceBand === 1) reasons.push("Fits low budget");
  if (B.high > 0.6 && place.priceBand === 3) reasons.push("Premium option");

  return { score, reasons };
}
