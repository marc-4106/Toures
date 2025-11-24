// features/recommender/distance.js

// Haversine great-circle distance in **kilometers**
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (v) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Nice display: meters if < 1km; one decimal otherwise.
export function formatKm(km) {
  if (km == null || Number.isNaN(km)) return "—";
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
