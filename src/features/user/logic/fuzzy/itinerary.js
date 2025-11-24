// src/features/user/logic/fuzzy/itinerary.js
import { mealCostWithHotel, hotelNightPrice, activityCost } from "./cost";
import { fuzzyScore, kmFromStart } from "./score";

// ----------------------------------------------------------------------
// CATEGORY GROUPS
const HOTEL_KINDS = ["hotel", "resort"];
const ACTIVITY_KINDS = [
  "resort",
  "heritage",
  "mall",
  "pasalubong centers",
  "activity",
  "park",
  "museum",
  "beach",
];
const MEAL_PRIMARY_KINDS = ["restaurant"];

const toKey = (s) => String(s || "").toLowerCase().trim();

// ----------------------------------------------------------------------
// RANKING HELPERS

function rankByKinds(places, prefs, kinds) {
  return places
    .filter((p) => kinds.includes(toKey(p.kind)))
    .map((p) => ({
      place: p,
      score: fuzzyScore(p, prefs), // ✅ FIXED: Removed third argument
    }))
    .sort((a, b) => b.score - a.score);
}

function isMealCandidate(p) {
  const kind = toKey(p.kind);
  if (MEAL_PRIMARY_KINDS.includes(kind)) return true;

  const tags = Array.isArray(p.tags) ? p.tags.map(toKey) : [];
  const hasFoodTag = ["foodie", "cafe", "coffee", "market", "pasalubong"].some((t) =>
    tags.includes(t)
  );
  const ala = Number(p?.pricing?.mealPlan?.aLaCarteDefault ?? 0);
  return hasFoodTag || (Number.isFinite(ala) && ala > 0);
}

function rankMeals(places, prefs) {
  const pool = places.filter(isMealCandidate);
  return pool
    .map((p) => ({
      place: p,
      score: fuzzyScore(p, prefs), // ✅ FIXED: Removed third argument
    }))
    .sort((a, b) => b.score - a.score);
}

// ----------------------------------------------------------------------
// BUCKETING PURELY BY FUZZY SCORE

function bucketAlts(ranked, prefs) {
  const highly = [];
  const considerable = [];

  for (const r of ranked) {
    if (r.score >= 0.75) highly.push({ ...r.place, fuzzyScore: r.score });
    else if (r.score >= 0.45) considerable.push({ ...r.place, fuzzyScore: r.score });
  }

  // Apply priority sorting refinement
  if (prefs?.priority === "distance") {
    highly.sort((a, b) => kmFromStart(a, prefs.startCity) - kmFromStart(b, prefs.startCity));
    considerable.sort(
      (a, b) => kmFromStart(a, prefs.startCity) - kmFromStart(b, prefs.startCity)
    );
  } else if (prefs?.priority === "budget") {
    highly.sort((a, b) => (a.idealCost ?? 0) - (b.idealCost ?? 0));
    considerable.sort((a, b) => (a.idealCost ?? 0) - (b.idealCost ?? 0));
  } else {
    // Default: sort by fuzzyScore descending
    highly.sort((a, b) => b.fuzzyScore - a.fuzzyScore);
    considerable.sort((a, b) => b.fuzzyScore - a.fuzzyScore);
  }

  // Keep only top items for UI clarity
  return {
    highly: highly.slice(0, 5),
    considerable: considerable.slice(0, 15),
  };
}

// ----------------------------------------------------------------------
// COST UTILITIES

const withCost = (place, computedCost) =>
  place ? { ...place, computedCost: Number(computedCost) || 0 } : null;

const dayHasHotelCoverage = (dayIdx, nights) => dayIdx >= 1 && dayIdx <= nights;

export function recomputeAllMealCosts(plan) {
  const nights = Number(plan?.meta?.nights || 0);
  const hotel = plan?.accommodation?.selected || null;

  plan.days = plan.days.map((d, idx) => {
    const covered = dayHasHotelCoverage(idx, nights);

    const upd = (slot, key) =>
      slot
        ? {
            ...slot,
            selected: withCost(
              slot.selected,
              mealCostWithHotel(key, slot.selected, hotel, covered)
            ),
            alternatives: {
              highly: (slot.alternatives?.highly || []).map((p) =>
                withCost(p, mealCostWithHotel(key, p, hotel, covered))
              ),
              considerable: (slot.alternatives?.considerable || []).map((p) =>
                withCost(p, mealCostWithHotel(key, p, hotel, covered))
              ),
            },
          }
        : slot;

    return {
      ...d,
      breakfast: upd(d.breakfast, "breakfast"),
      lunch: upd(d.lunch, "lunch"),
      dinner: upd(d.dinner, "dinner"),
    };
  });

  return plan;
}

// ----------------------------------------------------------------------
// MAIN BUILDER LOGIC

export function buildItinerary(places, prefs) {
  const startISO = new Date(prefs.startDate).toISOString();
  const endISO = new Date(prefs.endDate).toISOString();
  const start = new Date(startISO);
  const end = new Date(endISO);

  const ONE = 24 * 3600 * 1000;
  const nights = Math.max(
    0,
    Math.round((end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0)) / ONE)
  );
  const days = nights + 1;

  // Rank all categories
  let rankedHotels = rankByKinds(places, prefs, HOTEL_KINDS);
  let rankedActivities = rankByKinds(places, prefs, ACTIVITY_KINDS);
  let rankedMeals = rankMeals(places, prefs);

  // ⭐ LODGING PREFERENCE FILTERING (New logic)
  const lodgingPref = (prefs?.lodging || "any").toLowerCase();
  if (lodgingPref !== "any") {
      // Filter out hotels that don't match the preferred lodging type
      rankedHotels = rankedHotels.filter(r => 
          toKey(r.place.kind).includes(lodgingPref) || r.score >= 0.8 // Keep highly scored hotels even if they don't exactly match
      );
      rankedHotels.sort((a, b) => b.score - a.score); // Re-sort after filtering
  }

  // 🌦️ Apply season bias to activities
  const month = new Date(prefs.startDate).getMonth() + 1;
  const isWet = month >= 6 && month <= 10;
  rankedActivities = rankedActivities.map((r) => {
    const kind = toKey(r.place.kind);
    let bias = 1;
    if (prefs.seasonTolerance === "dry" && isWet && ["beach", "park"].includes(kind))
      bias *= 0.9;
    if (prefs.seasonTolerance === "wet" && !isWet && ["museum", "indoor"].includes(kind))
      bias *= 0.9;
    // Apply score * bias and clamp to ensure it doesn't go below zero
    return { ...r, score: Math.max(0, r.score * bias) }; 
  });
  rankedActivities.sort((a, b) => b.score - a.score); // Re-sort after applying bias

  // Create fuzzy-based buckets
  const hotelAlts = bucketAlts(rankedHotels, prefs);
  const actAlts = bucketAlts(rankedActivities, prefs);
  const mealAlts = bucketAlts(rankedMeals, prefs);

  const topHotel = rankedHotels[0]?.place || null;

  // ---------------- Accommodation ----------------
  const nightly = topHotel ? hotelNightPrice(topHotel) : 0;
  const accommodation = {
    nights,
    selected: topHotel
      ? { ...topHotel, nightlyPrice: nightly, totalCost: nights * nightly }
      : null,
    alternatives: {
      highly: hotelAlts.highly.map((p) => ({
        ...p,
        nightlyPrice: hotelNightPrice(p),
        totalCost: nights * hotelNightPrice(p),
      })),
      considerable: hotelAlts.considerable.map((p) => ({
        ...p,
        nightlyPrice: hotelNightPrice(p),
        totalCost: nights * hotelNightPrice(p),
      })),
    },
  };

  // ---------------- Day-by-day Plan ----------------
  const outDays = [];
  for (let d = 0; d < days; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const covered = dayHasHotelCoverage(d, nights);

    const breakfastPick = rankedMeals[0]?.place || null;
    const lunchPick = rankedMeals[1]?.place || rankedMeals[0]?.place || null;
    const dinnerPick = rankedMeals[2]?.place || rankedMeals[0]?.place || null;

    const makeMealSlot = (pick, key) => ({
      selected: withCost(pick, mealCostWithHotel(key, pick, accommodation.selected, covered)),
      alternatives: {
        highly: mealAlts.highly.map((p) =>
          withCost(p, mealCostWithHotel(key, p, accommodation.selected, covered))
        ),
        considerable: mealAlts.considerable.map((p) =>
          withCost(p, mealCostWithHotel(key, p, accommodation.selected, covered))
        ),
      },
    });

    const makeActSlot = (pick) => ({
      selected: withCost(pick, activityCost(pick)),
      alternatives: {
        highly: actAlts.highly.map((p) => withCost(p, activityCost(p))),
        considerable: actAlts.considerable.map((p) => withCost(p, activityCost(p))),
      },
    });

    const morningPick = rankedActivities[0]?.place || null;
    const afternoonPick = rankedActivities[1]?.place || morningPick || null;
    const nightPick = rankedActivities[2]?.place || afternoonPick || null;

    outDays.push({
      date: date.toISOString().slice(0, 10),
      breakfast: makeMealSlot(breakfastPick, "breakfast"),
      morning: [makeActSlot(morningPick)],
      lunch: makeMealSlot(lunchPick, "lunch"),
      afternoon: [makeActSlot(afternoonPick)],
      dinner: makeMealSlot(dinnerPick, "dinner"),
      night: [makeActSlot(nightPick)],
    });
  }

  // ---------------- Final Plan Object ----------------
  const plan = {
    meta: {
      ...prefs,
      startDate: startISO,
      endDate: endISO,
      nights,
      generatedAt: new Date().toISOString(),
    },
    accommodation,
    days: outDays,
    alternatives: {
      meal: mealAlts,
      activity: actAlts,
    },
  };

  return recomputeAllMealCosts(plan);
}