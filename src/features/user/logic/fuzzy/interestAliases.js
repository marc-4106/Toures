// interestAliases.js
// Fully cleaned, normalized, and aligned alias map for fuzzy scoring
import { normalizeKey } from "./normalizedTags";

export const INTEREST_TAG_ALIASES = {
  /* --------------------------------------------------------------------------
   * CULTURE & HERITAGE
   * -------------------------------------------------------------------------- */
  culture: [
    "heritage",
    "museum",
    "art_gallery",
    "local_crafts",
    "religious_site",
    "architecture",
    "photography",
    "history",
    "city",
  ],
  heritage: ["culture", "history", "museum"],
  history: ["heritage", "museum", "culture"],
  museum: ["culture", "heritage", "art_gallery"],
  art_gallery: ["culture", "photography"],
  local_crafts: ["culture", "heritage"],
  religious_site: ["culture", "heritage"],
  architecture: ["culture", "heritage"],

  /* --------------------------------------------------------------------------
   * NATURE & OUTDOORS
   * -------------------------------------------------------------------------- */
  nature: [
    "park",
    "mountain",
    "waterfall",
    "forest",
    "beach",
    "island",
    "eco_resort",
    "scenic_view",
    "lake",
  ],
  park: ["nature", "scenic_view"],
  mountain: ["nature", "hiking", "adventure"],
  waterfall: ["nature", "scenic_view"],
  forest: ["nature"],
  scenic_view: ["nature"],
  beach: ["nature", "island", "relaxation"],
  island: ["beach", "nature"],
  eco_resort: ["resort", "relaxation"],
  lake: ["nature", "relaxation"],

  /* --------------------------------------------------------------------------
   * ADVENTURE / ACTIVITIES
   * -------------------------------------------------------------------------- */
  adventure: [
    "activity",
    "hiking",
    "surfing",
    "snorkeling",
    "diving",
    "zipline",
    "trekking",
    "kayaking",
    "camping",
  ],
  activity: ["adventure"],
  hiking: ["nature", "adventure"],
  snorkeling: ["beach", "island", "adventure"],
  diving: ["island", "adventure"],
  zipline: ["adventure"],
  trekking: ["hiking", "adventure"],
  kayaking: ["adventure"],
  camping: ["adventure", "nature"],
  boat: ["island", "beach", "adventure"],

  /* --------------------------------------------------------------------------
   * FOOD & CUISINE
   * -------------------------------------------------------------------------- */
  foodie: ["restaurant", "local_cuisine", "seafood", "buffet", "street_food"],
  local_cuisine: ["restaurant", "foodie"],
  seafood: ["foodie", "beach"],
  buffet: ["foodie"],
  street_food: ["foodie", "market"],
  fine_dining: ["restaurant", "luxury_hotel"],
  cafe: ["foodie", "desserts"],
  desserts: ["cafe"],

  /* --------------------------------------------------------------------------
   * SHOPPING & URBAN
   * -------------------------------------------------------------------------- */
  shopping: ["mall", "market", "souvenir"],
  mall: ["shopping", "city"],
  market: ["shopping", "street_food"],
  souvenir: ["shopping"],
  city: ["shopping", "nightlife"],
  urban: ["city", "shopping"],
  nightlife: ["entertainment", "music_events"],

  /* --------------------------------------------------------------------------
   * RELAXATION & WELLNESS
   * -------------------------------------------------------------------------- */
  relaxation: ["resort", "spa", "quiet_place"],
  spa: ["relaxation", "wellness"],
  wellness: ["spa"],
  romantic: ["relaxation", "beach", "cafe"],
  resort: ["relaxation"],
  quiet_place: ["relaxation"],
  retreat: ["nature", "relaxation"],

  /* --------------------------------------------------------------------------
   * FAMILY & GROUP TRAVEL
   * -------------------------------------------------------------------------- */
  family_friendly: ["park", "pool", "amusement"],
  kids_activity: ["family_friendly"],
  amusement: ["family_friendly"],
  pool: ["family_friendly"],
  picnic: ["family_friendly"],
  group_event: ["family_friendly"],

  /* --------------------------------------------------------------------------
   * LODGING & ACCOMMODATION
   * -------------------------------------------------------------------------- */
  lodging: ["hotel", "resort"],
  hotel: ["lodging"],
  luxury_hotel: ["hotel"],
  budget_inn: ["hotel"],
  villa: ["lodging"],
  homestay: ["lodging"],
  transient_house: ["lodging"],
  bed_and_breakfast: ["lodging"],

  /* --------------------------------------------------------------------------
   * OTHER ATTRIBUTES
   * -------------------------------------------------------------------------- */
  budget: ["lodging"],
  premium: ["lodging"],
  hidden_gem: ["scenic_view", "nature"],
  must_visit: ["scenic_view"],

};

/* --------------------------------------------------------------------------
 * NORMALIZED fuzzy alias lookup
 * -------------------------------------------------------------------------- */
export const getAliasesForTag = (key = "") => {
  const normalized = normalizeKey(key);
  return INTEREST_TAG_ALIASES[normalized] || [];
};
