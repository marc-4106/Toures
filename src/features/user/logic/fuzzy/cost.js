// src/features/user/logic/fuzzy/cost.js

/** Safe getter */
const get = (obj, path, fallback = 0) =>
  path.reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj) ?? fallback;

/** Hotel nightly price (per night) — from Firestore pricing */
export function hotelNightPrice(place) {
  return Number(get(place?.pricing, ["lodging", "base"], 0)) || 0;
}

/** Day-use price for activities (e.g., resort day pass) */
export function dayUsePrice(place) {
  return Number(get(place?.pricing, ["dayUse", "dayPassPrice"], 0)) || 0;
}

/** A-la-carte meal price — from Firestore pricing.mealPlan.aLaCarteDefault (fallback ₱300) */
export function mealAlaCartePrice(place) {
  const v = Number(get(place?.pricing, ["mealPlan", "aLaCarteDefault"], 0));
  return Number.isFinite(v) && v > 0 ? v : 300;
}

/**
 * Compute cost for a meal slot.
 * If the active hotel (that night) includes the meal, cost is ₱0; otherwise use a-la-carte of the chosen place.
 * @param {'breakfast'|'lunch'|'dinner'} mealType
 * @param {object|null} mealPlace
 * @param {object|null} hotelSelected
 * @param {boolean} hasHotelNightForThisDay  // true if this calendar day is covered by a hotel night
 */
export function mealCostWithHotel(mealType, mealPlace, hotelSelected, hasHotelNightForThisDay) {
  if (!mealPlace) return 0;

  if (hotelSelected && hasHotelNightForThisDay) {
    const mp = hotelSelected?.pricing?.mealPlan || {};
    const covered =
      (mealType === "breakfast" && !!mp.breakfastIncluded) ||
      (mealType === "lunch" && !!mp.lunchIncluded) ||
      (mealType === "dinner" && !!mp.dinnerIncluded);
    if (covered) return 0;
  }

  return mealAlaCartePrice(mealPlace);
}

/** Activity cost — prefer dayUse price; else 0 */
export function activityCost(place) {
  if (!place) return 0;
  const v = dayUsePrice(place);
  return Number.isFinite(v) ? v : 0;
}
