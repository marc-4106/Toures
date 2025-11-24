// utils/navigateToExplore.js
export function navigateToExplore(navigation, place, { showRoute = true } = {}) {
  if (!place) return;
  const lat = Number(place?.Coordinates?.latitude ?? place?.latitude);
  const lng = Number(place?.Coordinates?.longitude ?? place?.longitude);

  navigation.navigate("Explore", {
    focus: {
      id: place.id,
      name: place.name,
      latitude: lat,
      longitude: lng,
      showRoute,
    },
  });
}
