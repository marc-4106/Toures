export const NORMALIZED_TAGS = {
  // Interest → Core Tags
  cafes: "cafe",
  relaxing_cafes: "cafe",
  local_market: "market",

  romantic: "romantic",
  romantic_spots: "romantic",

  family_activities: "family_friendly",

  nature_tripping: "nature",
  eco_park: "park",

  boating: "boat",
  island_hopping: "boat",

  beachfront: "beach_resort",
  beach_resort: "beach_resort",

  city_hotel: "hotel",

  photospot: "photography",

  pasalubong_center: "pasalubong",
};

export const normalizeKey = (key = "") => {
  if (!key) return "";
  return NORMALIZED_TAGS[key] || key;
};
