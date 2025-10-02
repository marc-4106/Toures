import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Keyboard, 
  Alert, 
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../services/firebaseConfig";
import { mapStyle } from "../../../constant/MapStyle";

const NEAR_ME_DISTANCE_KM = 5; 
const MAP_API_KEY = Constants.expoConfig.extra?.googleMapsApiKey;

const BACOLOD_REGION = {
  latitude: 10.6667,
  longitude: 122.95,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// 🗺️ Haversine Distance Helper (for Near Me and Straight-Line distance)
const toRad = (value) => (value * Math.PI) / 180;
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Helper function to decode a Google Maps Encoded Polyline string
const decodePolyline = (encoded) => {
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};


const UserExploreScreen = () => {
  const mapRef = useRef(null);

  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [filteredDestinations, setFilteredDestinations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Directions state
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null); 
  const [routeInfo, setRouteInfo] = useState(null); 
  
  // 👇 NEW STATE: Straight-line distance
  const [straightLineDistance, setStraightLineDistance] = useState(null); 


  // Location Watch Effect 
  useEffect(() => {
    let locationSubscription;
    const requestLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Permission to access location was denied.");
        return;
      }
      try {
        locationSubscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 },
          (location) => {
            setCurrentLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: BACOLOD_REGION.latitudeDelta,
              longitudeDelta: BACOLOD_REGION.longitudeDelta,
            });
            setLocationError(null);
          }
        );
      } catch (error) {
        console.error("Error watching location:", error);
        setLocationError("Could not retrieve current location.");
      }
    };
    requestLocation();
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // ... (Load Firestore destinations and Filter destinations effects remain the same) ...
  useEffect(() => {
    const fetchDestinations = async () => {
        try {
            const snapshot = await getDocs(collection(db, "destinations"));
            const data = snapshot.docs.map((doc) => {
                const dest = doc.data();
                let categoryText = "Uncategorized";
                if (Array.isArray(dest.category)) categoryText = dest.category.join(", ");
                else if (typeof dest.category === "string") categoryText = dest.category;

                return {
                    id: doc.id,
                    name: dest.name || "Unnamed",
                    description: dest.description || "No description",
                    category: categoryText,
                    coordinates: dest.coordinates,
                };
            });

            setDestinations(data);
            setFilteredDestinations(data);
        } catch (err) {
            console.error("Error fetching destinations:", err);
        }
    };
    fetchDestinations();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDestinations(destinations);
      return;
    }
    const lowerQuery = searchQuery.toLowerCase();
    const isNearMeQuery = lowerQuery.includes("near me");

    let filtered = destinations;

    if (isNearMeQuery && currentLocation) {
      const userLat = currentLocation.latitude;
      const userLon = currentLocation.longitude;
      
      filtered = filtered.filter((d) => {
        if (!d.coordinates) return false;
        
        const distance = haversineDistance(
          userLat, 
          userLon, 
          d.coordinates.latitude, 
          d.coordinates.longitude
        );
        return distance <= NEAR_ME_DISTANCE_KM; 
      });
      
      if (lowerQuery.trim() === "near me") {
          setFilteredDestinations(filtered);
          return;
      }
    }

    const finalFiltered = filtered.filter(
      (d) =>
        d.name.toLowerCase().includes(lowerQuery) ||
        d.category.toLowerCase().includes(lowerQuery)
    );

    setFilteredDestinations(finalFiltered);
  }, [searchQuery, destinations, currentLocation]); 


  // Function to handle marker press (OPENS MODAL AND CALCULATES STRAIGHT-LINE DISTANCE)
  const handleMarkerPress = (destination) => {
    setSelectedDestination(destination);
    setRouteCoordinates(null);
    setRouteInfo(null);
    
    // 👇 NEW LOGIC: Calculate straight-line distance immediately
    if (currentLocation && destination.coordinates) {
        const distanceKm = haversineDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            destination.coordinates.latitude,
            destination.coordinates.longitude
        );
        // Format to one decimal place and set state
        setStraightLineDistance(`${distanceKm.toFixed(1)} km`);
    } else {
        setStraightLineDistance(null);
    }
  };


  // Function to handle text change 
  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  // 🧹 Function to cancel and clear the route
  const cancelRoute = () => {
    setRouteCoordinates(null);
    setRouteInfo(null);
    // Note: selectedDestination is NOT cleared, keeping the modal open
  };

  // Function to clear the modal and route on map tap
  const handleMapPress = () => {
    setRouteCoordinates(null);
    setRouteInfo(null); 
    setStraightLineDistance(null); // 👇 CLEAR straight-line distance
    setSelectedDestination(null); 
  };

  // 🛣️ Directions Function (Calculates ROAD route)
  const fetchDirections = async (destination) => {
    if (!currentLocation) {
      Alert.alert(
        "Location Error", 
        "Cannot get directions. Your current location is unknown. Please ensure location services are enabled for this app.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Clear previous route/info
    setRouteCoordinates(null);
    setRouteInfo(null); 
    
    setRouteLoading(true);

    const origin = `${currentLocation.latitude},${currentLocation.longitude}`;
    const dest = `${destination.coordinates.latitude},${destination.coordinates.longitude}`;

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${MAP_API_KEY}`;

    try {
      const response = await fetch(url);
      const json = await response.json();

      if (json.status !== "OK" || !json.routes.length) {
        Alert.alert("Directions Error", `Failed to get directions: ${json.status}. Check API key.`);
        setRouteCoordinates(null);
        return;
      }
      
      const encodedPolyline = json.routes[0].overview_polyline.points;
      const coords = decodePolyline(encodedPolyline);
      
      const routeDetails = json.routes[0].legs[0]; 
      setRouteInfo({
          distance: routeDetails.distance.text, // ROAD DISTANCE
          duration: routeDetails.duration.text,
      });

      setRouteCoordinates(coords);
      
      if (mapRef.current) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 150, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }

    } catch (error) {
      console.error("Network error fetching directions:", error);
      Alert.alert("Network Error", "A network error occurred while fetching directions.");
      setRouteCoordinates(null);
      setRouteInfo(null);
    } finally {
      setRouteLoading(false);
      setSelectedDestination(destination); 
    }
  };

  const initialMapRegion = BACOLOD_REGION;

  // Determine button action and text
  const isRouteDrawn = !!routeCoordinates;
  const buttonText = isRouteDrawn ? 'Cancel Route' : 'Route Directions';
  const buttonAction = isRouteDrawn ? cancelRoute : () => fetchDirections(selectedDestination);
  const buttonColor = isRouteDrawn ? '#FF3B30' : '#007AFF'; 

  // Determine the distance/info display for the modal
  const infoDisplay = (() => {
      if (routeCoordinates && routeInfo) {
          // Display Road Distance/Duration when route is drawn
          return (
              <View style={styles.routeSummary}>
                  <Text style={styles.routeDetailText}>{routeInfo.distance}</Text>
                  <View style={styles.routeDetailSeparator} />
                  <Text style={styles.routeDetailText}>{routeInfo.duration}</Text>
              </View>
          );
      } else if (currentLocation && straightLineDistance) {
          // Display Straight-Line Distance when no route is drawn
          return (
              <View style={styles.routeSummary}>
                  <Text style={styles.routeDetailText}>{straightLineDistance} away</Text>
              </View>
          );
      }
      return null;
  })();


  return (
    <View style={styles.container}>
      {/* 🔎 Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search destinations (e.g. 'park' or 'near me')"
          value={searchQuery}
          onChangeText={handleSearchChange} 
        />
      </View>
      
      <MapView
        ref={mapRef}
        key={MAP_API_KEY}
        style={styles.map}
        initialRegion={initialMapRegion}
        showsUserLocation={false} 
        showsCompass={false} 
        provider="google"
        customMapStyle={mapStyle}
        onPress={handleMapPress} 
      >
        
        {/* 🛣️ Directions Polyline (Route) */}
        {routeCoordinates && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor="purple"
            lineCap="round"
          />
        )}
        
        {/* 📍 Firestore destinations */}
        {filteredDestinations.map((dest) =>
          dest.coordinates ? (
            <Marker
              key={dest.id}
              coordinate={{
                latitude: dest.coordinates.latitude,
                longitude: dest.coordinates.longitude,
              }}
              title={dest.name}
              description={dest.category} 
              pinColor={selectedDestination && selectedDestination.id === dest.id && isRouteDrawn ? "red" : "green"} 
              // 👇 UPDATED to call new handler
              onPress={() => handleMarkerPress(dest)} 
            />
          ) : null
        )}
      </MapView>
      
      {/* Loading Overlay */}
      {routeLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Calculating Route...</Text>
        </View>
      )}

      {/* Destination Detail Modal */}
      {selectedDestination && (
        <View style={styles.modalContainer}>
            <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setSelectedDestination(null)}
            >
                <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>{selectedDestination.name}</Text>
            <Text style={styles.modalCategory}>{selectedDestination.category}</Text>
            
            {/* 👇 Display either Road Distance or Straight-Line Distance */}
            {infoDisplay}

            <Text style={[styles.modalDescription, {marginTop: infoDisplay ? 10 : 0}]} numberOfLines={2}>
                {selectedDestination.description}
            </Text>

            <TouchableOpacity 
                style={[styles.directionButton, {backgroundColor: buttonColor}]}
                onPress={buttonAction}
                disabled={routeLoading}
            >
                <Text style={styles.directionButtonText}>
                    {buttonText}
                </Text>
            </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: "100%", height: "100%" },
  searchContainer: {
    position: "absolute",
    top: Constants.statusBarHeight + 5, 
    left: 10,
    right: 10, 
    zIndex: 3,
    backgroundColor: "white",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchInput: { height: 40, fontSize: 14 },
  loadingOverlay: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    zIndex: 10,
  },
  loadingText: {
    marginLeft: 8,
    color: '#333',
    fontWeight: 'bold',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 20,
    paddingBottom: 100, 
    zIndex: 5, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  modalCategory: {
    fontSize: 14,
    color: 'darkgreen',
    marginBottom: 10,
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  directionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  directionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 6,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#999',
  },
  routeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  routeDetailText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  routeDetailSeparator: {
    width: 1,
    height: '80%',
    backgroundColor: '#999',
    marginHorizontal: 8,
  }
});

export default UserExploreScreen;