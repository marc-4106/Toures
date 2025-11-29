// src/features/user/logic/fuzzy/score.js

import { haversineKm } from "../../../recommender/distance";
import { INTEREST_TAG_ALIASES } from "./interestAliases";
import { normalizeKey } from "./normalizedTags";

/* -------------------------------------------
 * Utility: Distance calculation (km)
 * ------------------------------------------*/
export const kmFromStart = (place, start) => {
  // Destination coords
  const plat =
    place?.lat ||
    place?.latitude ||
    place?.Coordinates?.latitude ||
    null;

  const plng =
    place?.lng ||
    place?.longitude ||
    place?.Coordinates?.longitude ||
    null;

  // Start city coords
  const slat =
    start?.lat ||
    start?.latitude ||
    start?.Coordinates?.latitude ||
    null;

  const slng =
    start?.lng ||
    start?.longitude ||
    start?.Coordinates?.longitude ||
    null;

  // If anything missing → cannot compute
  if (!plat || !plng || !slat || !slng) {
    console.warn("⚠ Missing coordinates for distance calculation:", {
      plat,
      plng,
      slat,
      slng,
    });
    return 9999;
  }

  try {
    const dist = haversineKm(
      Number(slat),
      Number(slng),
      Number(plat),
      Number(plng)
    );
    return Number.isFinite(dist) ? dist : 9999;
  } catch (err) {
    console.warn("Distance calc error:", err);
    return 9999;
  }
};

/* -------------------------------------------
 * Fuzzy membership functions
 * ------------------------------------------*/

const triangular = (x, a, b, c) => {
  if (x <= a || x >= c) return 0;
  if (x === b) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  return (c - x) / (c - b);
};

const trapezoid = (x, a, b, c, d) => {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
};

/* -------------------------------------------
 * Price Extraction (based on Firestore fields)
 * ------------------------------------------*/
export function extractPrice(place) {
  if (!place?.pricing) return 0;

  const p = place.pricing;

  if (p.lodging?.base) return Number(p.lodging.base);
  if (p.mealPlan?.aLaCarteDefault) return Number(p.mealPlan.aLaCarteDefault);
  if (p.dayUse?.dayPassPrice) return Number(p.dayUse.dayPassPrice);

  return 0;
}

/* -------------------------------------------
 * Detect Place Category (hotel / meal / activity)
 * ------------------------------------------*/
export function getPlaceCategory(place) {
  const p = place?.pricing || {};
  if (p.lodging?.base) return "hotel";
  if (p.mealPlan?.aLaCarteDefault) return "meal";
  if (p.dayUse?.dayPassPrice) return "activity";

  const kind = (place.kind || "").toLowerCase();
  const tags = (place.tags || []).map(t => t.toLowerCase());

  if (["hotel", "resort", "inn"].includes(kind)) return "hotel";
  if (kind === "restaurant" || tags.includes("foodie")) return "meal";

  return "activity";
}

/* -------------------------------------------
 * Compute Budget Benchmarks (per night / meal / activity)
 * Only 1 user input: maxBudget
 * ------------------------------------------*/
export function computeBudgetBenchmarks(maxBudget, days) {
  const daily = maxBudget / days;

  return {
    hotel: daily * 0.45,           // per night
    meal: (daily * 0.30) / 3,      // per meal
    activity: (daily * 0.25) / 1.5 // per activity
  };
}

/* -------------------------------------------
 * Price membership (0–1)
 * ------------------------------------------*/
export function priceMembership(place, prefs) {
  const raw = extractPrice(place);
  const maxBudget = Number(prefs.maxBudget || 0);
const nights = Number(prefs?.nights ?? prefs?.meta?.nights ?? 0);

const days = Math.max(1, nights + 1);


  if (!maxBudget || raw <= 0) return 1;

  const cat = getPlaceCategory(place);
  const bench = computeBudgetBenchmarks(maxBudget, days);

  const benchmark =
    cat === "hotel" ? bench.hotel :
    cat === "meal" ? bench.meal :
    bench.activity;

  if (raw <= benchmark) return 1;

  const fit = 1 - (raw - benchmark) / benchmark;
  return Math.max(0, fit);
}


/* -------------------------------------------
 * Enhanced Interest Fuzzy Fit (NORMALIZED)
 * tags: raw place.tags array (strings)
 * interests: user selected interests (strings)
 * ------------------------------------------*/
export const interestFit = (tags = [], interests = []) => {
  if (!tags.length || !interests.length) return 0;

  const normalize = (v) => normalizeKey(String(v).toLowerCase().trim());

  // Normalize destination tags
  const normalizedTags = tags.map((t) => normalize(t));

  // Build expanded interest pool
  const expandedInterests = new Set();

  for (const interest of interests) {
    const core = normalize(interest);
    if (!core) continue;

    expandedInterests.add(core);

    // Expand using alias map
    const aliases = INTEREST_TAG_ALIASES[core] || [];
    for (const a of aliases) {
      expandedInterests.add(normalize(a));
    }
  }

  const interestPool = Array.from(expandedInterests);
  if (interestPool.length === 0) return 0;

  let matchCount = 0;

  for (const tag of normalizedTags) {
    if (!tag) continue;

    const exact = interestPool.includes(tag);
    const partial = interestPool.some(
      (i) => i && (tag.includes(i) || i.includes(tag))
    );

    // Direct matches > partial matches
    matchCount += exact ? 1 : partial ? 0.5 : 0;
  }

  // Normalized fuzzy match: more matches vs total tags
  const baseScore = matchCount / Math.sqrt(normalizedTags.length || 1);

  // Keep within [0,1] with a gentle trapezoid
  return Math.min(trapezoid(baseScore, 0.15, 0.5, 1.0, 1.4), 1);
};

/* -------------------------------------------
 * Helper: compute base weights (lodging vs non-lodging)
 * ------------------------------------------*/
const getBaseWeights = ({ isLodging }) => {
  if (isLodging) {
    // For hotels/resorts: price important, but interest still matters
    return {
      wInterest: 0.4,
      wDistance: 0.25,
      wPrice: 0.35,
    };
  }

  // For activities / POIs: interest is king
  return {
    wInterest: 0.6,
    wDistance: 0.25,
    wPrice: 0.15,
  };
};

/* -------------------------------------------
 * Helper: apply thematic boosts based on explicit interests
 * ------------------------------------------*/
const applyThemeBoosts = (normTags, userInterestsSet, multiplier) => {
  // Mountain-focused user & place
  if (userInterestsSet.has("mountain") && normTags.includes("mountain")) {
    multiplier *= 1.15;
  }

  // Nature trips + nature / scenic / trekking / zipline
  if (userInterestsSet.has("nature")) {
    if (
      normTags.includes("nature") ||
      normTags.includes("scenic_view") ||
      normTags.includes("trekking") ||
      normTags.includes("hiking") ||
      normTags.includes("zipline")
    ) {
      multiplier *= 1.12;
    }
  }

  // Beach-focused user & place
  if (userInterestsSet.has("beach") && normTags.includes("beach")) {
    multiplier *= 1.08; // smaller than mountain/nature to avoid bias
  }

  // Eco resort
  if (userInterestsSet.has("eco_resort")) {
    if (normTags.includes("eco_resort") || normTags.includes("resort")) {
      multiplier *= 1.12;
    }
  }

  // City hotel / hotel focus
  if (userInterestsSet.has("hotel") && normTags.includes("hotel")) {
    multiplier *= 1.1;
  }

  // Family-friendly preference
  if (userInterestsSet.has("family_friendly") && normTags.includes("family_friendly")) {
    multiplier *= 1.15;
  }

  // Cultural / heritage
  if (
    (userInterestsSet.has("culture") || userInterestsSet.has("heritage")) &&
    (normTags.includes("culture") ||
      normTags.includes("heritage") ||
      normTags.includes("museum") ||
      normTags.includes("art_gallery"))
  ) {
    multiplier *= 1.1;
  }

  return multiplier;
};

/* -------------------------------------------
 * Core Fuzzy Score Computation (Rebalanced)
 * ------------------------------------------*/
export const fuzzyScore = (place, preferences = {}) => {
  const start = preferences.startCity || {};
  const maxBudget = Number(preferences.maxBudget || 0);
  const interests = preferences.interests || [];
  const priority = preferences.priority || "balanced";

  const travelerType = String(preferences.travelType || "any").toLowerCase();
  const lodgingPref = normalizeKey(preferences.lodgingPreference || "any");

  const distanceKm = kmFromStart(place, start);

  // Normalized tags for scoring logic
  const normTags = (place.tags || []).map((t) =>
    normalizeKey(String(t).toLowerCase())
  );

  // Build a normalized interest set for theme boosts
  const userInterestsSet = new Set(
    interests.map((i) => normalizeKey(String(i).toLowerCase()))
  );

  // Interest fit based on RAW tags (interestFit normalizes internally)
  const iFit = interestFit(place.tags || [], interests);

  // Distance fuzzy membership:
  //  0–15 km: perfect
  // 15–60 km: still quite good
  // 60–140 km: gradually decreasing
  const distMembership = trapezoid(distanceKm, 0, 15, 60, 140);


  const priceMembershipValue = priceMembership(place, preferences);


  const interestMembership = iFit;

  // Place type / lodging detection
  const kind = normalizeKey(place.kind || "");
  const isLodging =
    kind.includes("hotel") ||
    kind.includes("resort") ||
    kind.includes("inn") ||
    normTags.includes("lodging");

  // Base weights by type
  let { wInterest, wDistance, wPrice } = getBaseWeights({ isLodging });

  let kindMatchMultiplier = 1.0;

  /* -------------------------------------------
   * Lodging specific preference match
   * ------------------------------------------*/
  if (isLodging && lodgingPref !== "any") {
    if (normTags.includes(lodgingPref)) {
      kindMatchMultiplier *= 1.4;
    } else {
      kindMatchMultiplier *= 0.85;
    }
  }

  /* -------------------------------------------
   * Traveler Type Boosts
   * ------------------------------------------*/
  if (travelerType === "family" || travelerType === "group") {
    if (normTags.includes("family_friendly")) kindMatchMultiplier *= 1.2;
  } else if (travelerType === "couple") {
    if (normTags.includes("romantic")) kindMatchMultiplier *= 1.2;
  }

  /* -------------------------------------------
   * Thematic boosts based on explicit interests
   * ------------------------------------------*/
  kindMatchMultiplier = applyThemeBoosts(
    normTags,
    userInterestsSet,
    kindMatchMultiplier
  );

  /* -------------------------------------------
   * Priority boosts
   * ------------------------------------------*/
  const boosts = { interest: 0.3, distance: 0.25, price: 0.25 };

  if (priority === "interest") {
    wInterest *= 1 + boosts.interest;
  } else if (priority === "distance") {
    wDistance *= 1 + boosts.distance;
  } else if (priority === "price" || priority === "budget") {
    wPrice *= 1 + boosts.price;
  }
  // "balanced" = no extra boost, just base type weights

  // Normalize weights
  const sum = wInterest + wDistance + wPrice;
  wInterest /= sum;
  wDistance /= sum;
  wPrice /= sum;

/* -------------------------------------------
 * Seasonal Influence (Dry vs Rainy)
 * Based on Negros Occidental climate
 * ------------------------------------------*/
const seasonMode = preferences.seasonMode || "dry";

// DRY SEASON (Jan–May)
if (seasonMode === "dry") {
  if (normTags.includes("beach") || normTags.includes("island") || normTags.includes("scenic_view")) {
    kindMatchMultiplier *= 1.20;
  }
  if (normTags.includes("mountain") || normTags.includes("hiking") || normTags.includes("trekking")) {
    kindMatchMultiplier *= 1.10;
  }
  if (normTags.includes("waterfall") || normTags.includes("lake")) {
    kindMatchMultiplier *= 0.85;
  }
}

// RAINY SEASON (Jun–Dec)
else {
  if (normTags.includes("waterfall") || normTags.includes("lake") || normTags.includes("forest") || normTags.includes("nature")) {
    kindMatchMultiplier *= 1.18;
  }
  if (normTags.includes("beach") || normTags.includes("island")) {
    kindMatchMultiplier *= 0.80;
  }
  if (normTags.includes("mountain") || normTags.includes("trekking") || normTags.includes("camping") || normTags.includes("hiking")) {
    kindMatchMultiplier *= 0.75;
  }
  // Indoor activities get a boost (good during rainy days)
  const indoorTags = [
    "foodie", "local_cuisine", "seafood", "buffet", "street_food",
    "shopping", "mall", "market", "city", "urban",
    "museum", "heritage", "art_gallery"
  ];
  if (indoorTags.some(t => normTags.includes(t))) {
    kindMatchMultiplier *= 1.10;
  }
}


  /* -------------------------------------------
   * Final fuzzy score
   * ------------------------------------------*/
  const score =
    (wInterest * interestMembership +
      wDistance * distMembership +
      wPrice * priceMembershipValue) * kindMatchMultiplier;


  return Math.min(1, Math.max(0, score));
};

/* -------------------------------------------
 * Explain fuzzy score for debugging / UI
 * ------------------------------------------*/
export const explainScore = (place, preferences = {}) => {
  const start = preferences.startCity || {};
  const maxBudget = Number(preferences.maxBudget || 0);
  const interests = preferences.interests || [];
  const priority = preferences.priority || "balanced";

  const travelerType = String(preferences.travelType || "any").toLowerCase();
  const lodgingPrefRaw = preferences.lodgingPreference || "any";
  const lodgingPref = normalizeKey(lodgingPrefRaw);

  const normTags = (place.tags || []).map((t) =>
    normalizeKey(String(t).toLowerCase())
  );
  const userInterestsSet = new Set(
    interests.map((i) => normalizeKey(String(i).toLowerCase()))
  );

  const distanceKm = kmFromStart(place, start);
  const iFit = interestFit(place.tags || [], interests);

  const distMembership = trapezoid(distanceKm, 0, 15, 60, 140);


const priceFitValue = priceMembership(place, preferences);


  const seasonMode = preferences.seasonMode === "rainy" ? "rainy" : "dry";

let seasonalEffects = [];

if (seasonMode === "dry") {
  if (normTags.includes("beach") || normTags.includes("island") || normTags.includes("scenic_view")) {
    seasonalEffects.push("+20% boost for dry season beach/island conditions");
  }
  if (normTags.includes("mountain") || normTags.includes("hiking") || normTags.includes("trekking")) {
    seasonalEffects.push("+10% boost for dry season hiking/mountain visibility");
  }
  if (normTags.includes("waterfall") || normTags.includes("lake")) {
    seasonalEffects.push("-15% penalty: waterfalls/lakes weaker in dry season");
  }
}

if (seasonMode === "rainy") {
  if (normTags.includes("waterfall") || normTags.includes("lake") || normTags.includes("forest") || normTags.includes("nature")) {
    seasonalEffects.push("+18% boost: waterfalls/nature best during rainy season");
  }
  if (normTags.includes("beach") || normTags.includes("island")) {
    seasonalEffects.push("-20% penalty due to rainy season beach safety/weather");
  }
  if (normTags.includes("mountain") || normTags.includes("trekking") || normTags.includes("camping") || normTags.includes("hiking")) {
    seasonalEffects.push("-25% penalty: unsafe to hike/trek during rainy season");
  }

  const indoorTags = [
    "foodie","local_cuisine","seafood","buffet","street_food",
    "shopping","mall","market","city","urban",
    "museum","heritage","art_gallery"
  ];
  if (indoorTags.some(t => normTags.includes(t))) {
    seasonalEffects.push("+10% boost for indoor-friendly rainy-season activities");
  }
}

  const kind = normalizeKey(place.kind || "");
  const isLodging =
    kind.includes("hotel") ||
    kind.includes("resort") ||
    normTags.includes("lodging");

  let { wInterest, wDistance, wPrice } = getBaseWeights({ isLodging });

  let kindMultiplier = 1.0;

  if (isLodging && lodgingPref !== "any") {
    if (normTags.includes(lodgingPref)) kindMultiplier *= 1.4;
    else kindMultiplier *= 0.85;
  }

  if (travelerType === "family" || travelerType === "group") {
    if (normTags.includes("family_friendly")) kindMultiplier *= 1.2;
  } else if (travelerType === "couple") {
    if (normTags.includes("romantic")) kindMultiplier *= 1.2;
  }

  // Theme boosts (same logic as fuzzyScore)
  const beforeTheme = kindMultiplier;
  kindMultiplier = applyThemeBoosts(normTags, userInterestsSet, kindMultiplier);
  const themeBoostFactor = kindMultiplier / (beforeTheme || 1);

  const boosts = { interest: 0.3, distance: 0.25, price: 0.25 };
  const appliedBoosts = {};

  if (priority === "interest") {
    wInterest *= 1 + boosts.interest;
    appliedBoosts.interest = boosts.interest;
  } else if (priority === "distance") {
    wDistance *= 1 + boosts.distance;
    appliedBoosts.distance = boosts.distance;
  } else if (priority === "price" || priority === "budget") {
    wPrice *= 1 + boosts.price;
    appliedBoosts.price = boosts.price;
  }

  const sum = wInterest + wDistance + wPrice;
  const normWeights = {
    interest: wInterest / sum,
    distance: wDistance / sum,
    price: wPrice / sum,
  };

  const finalScore =
    (normWeights.interest * iFit +
      normWeights.distance * distMembership +
      normWeights.price * priceFitValue) *
    kindMultiplier;

  return {
    place: place.name || place.title,
    normalizedTags: normTags,
    distanceKm: Number(distanceKm.toFixed(2)),

    fuzzyComponents: {
      interestFit: Number(iFit.toFixed(3)),
      distanceFit: Number(distMembership.toFixed(3)),
      priceFit: Number(priceFitValue.toFixed(3)),

    },

    normalizedWeights: {
      interest: Number(normWeights.interest.toFixed(3)),
      distance: Number(normWeights.distance.toFixed(3)),
      price: Number(normWeights.price.toFixed(3)),
    },

    priorityUsed: priority,
    appliedBoosts,
    travelerType,
    lodgingPref,
    seasonMode,                  // "dry" or "rainy"
    seasonalEffects,             // array of explanations

    themeBoostFactor: Number(themeBoostFactor.toFixed(3)),
    kindMultiplierUsed: Number(kindMultiplier.toFixed(3)),

    finalScore: Number(Math.min(1, Math.max(0, finalScore)).toFixed(4)),
  };
};

/* -------------------------------------------
 * Rank destinations by fuzzy logic
 * ------------------------------------------*/
export const rankDestinations = (places = [], preferences = {}) =>
  places
    .map((place) => {
      const score = fuzzyScore(place, preferences);
      const distance = kmFromStart(place, preferences.startCity || {});
      const iFit = interestFit(place.tags || [], preferences.interests || []);
      return {
        ...place,
        dKm: distance,
        iFit,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
