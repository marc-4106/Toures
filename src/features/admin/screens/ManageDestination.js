import React, { useEffect, useState } from "react";
import { View, FlatList, TextInput, Pressable, Text, StyleSheet } from "react-native";
// FIREBASE IMPORTS NEEDED FOR USER LOOKUP
import { getAuth } from 'firebase/auth'; 
import { getFirestore, doc, getDoc } from 'firebase/firestore'; 
// LOGGING AND DESTINATION CRUD IMPORTS
import { logActivity } from "../../../services/firestoreReportsAndLogs"; 
import { fetchDestinations, addDestination, updateDestination, archiveDestination, unarchiveDestination } from "../../../services/firestoreDestinations";
import DestinationItem from "../../../components/common/DestinationItem";
import DestinationModal from "../../../components/common/DestinationModal";

// Initial state for new/reset form
const INITIAL_FORM_STATE = {
  name: "",
  description: "",
  imageURL: "",
  budget: 0,
  popularity: 0,
  category: [], 
  isFeatured: false, 
  coordinates: {
    latitude: "",
    longitude: "",
  },
};

const ManageDestination = () => {
  const [destinations, setDestinations] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM_STATE); 
  const [editId, setEditId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false); 
  const [isLoading, setIsLoading] = useState(false); 
  const [saveError, setSaveError] = useState(null); 

  // NEW ASYNC HELPER: Fetches the user's full name from Firestore
  const getAdminUserNameFromFirestore = async () => {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
          return 'Guest/Unauthenticated';
      }

      try {
          // Use auth.app to get the correct Firebase App instance
          const db = getFirestore(auth.app); 
          // The document ID in the 'users' collection MUST match the Firebase Auth UID
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
              // ASSUMPTION: The user's full name is stored in a field named 'name'
              return userDoc.data().name || user.email || user.uid;
          } else {
              // Fallback if the profile document is missing
              return user.email || user.uid;
          }
      } catch (error) {
          console.error("Failed to fetch user name from Firestore:", error);
          // Safety fallback if the lookup fails
          return 'Admin User Error';
      }
  };


  const loadData = async () => {
    const data = await fetchDestinations();
    setDestinations(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Make handleSave ASYNC to await the user name
  const handleSave = async () => {
    setSaveError(null);
    setIsLoading(true);

    // CRITICAL: Await the ACTOR_NAME before proceeding
    const ACTOR_NAME = await getAdminUserNameFromFirestore(); 

    const destinationName = form.name.trim();

    // --- Data validation and parsing ---
    if (!destinationName) {
      setSaveError("Destination name cannot be empty.");
      setIsLoading(false);
      return;
    }

    const dataToSave = {
      ...form,
      name: destinationName,
      popularity: parseFloat(form.popularity) || 0,
      coordinates: {
        latitude: parseFloat(form.coordinates.latitude) || 0,
        longitude: parseFloat(form.coordinates.longitude) || 0,
      },
    };

    // --- PROCEED WITH SAVE/UPDATE ---
    try {
      if (editId) {
        await updateDestination(editId, dataToSave);
        
        // AUDIT LOGGING: Log update
        logActivity({ 
            actorName: ACTOR_NAME, // Use the fetched name
            actionType: 'UPDATE', 
            targetEntity: 'Destination', 
            targetId: editId, 
            details: `Updated details for destination: ${destinationName}` 
        });

      } else {
        const newDoc = await addDestination({ ...dataToSave, isArchived: false });
        
        // AUDIT LOGGING: Log creation
        logActivity({ 
            actorName: ACTOR_NAME, // Use the fetched name
            actionType: 'CREATE', 
            targetEntity: 'Destination', 
            targetId: newDoc.id, 
            details: `Created new destination: ${destinationName}` 
        });
      }

      // Success
      setModalVisible(false);
      setForm(INITIAL_FORM_STATE); // Reset form
      setEditId(null);
      loadData();
      
    } catch (error) {
      console.error("Firestore Save Error: ", error);
      setSaveError("An error occurred while saving. Please check your data and network.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      ...item,
      // Convert number fields back to string for the modal's controlled TextInput
      budget: item.budget?.toString() || "", 
      popularity: item.popularity?.toString() || "", 
      category: item.category || [],
      isFeatured: item.isFeatured === true,
      coordinates: {
        latitude: item.coordinates?.latitude?.toString() || "", 
        longitude: item.coordinates?.longitude?.toString() || "",
      }
    });
    setEditId(item.id);
    setModalVisible(true);
  };
  
  const handleArchive = async (id, name) => {
    const ACTOR_NAME = await getAdminUserNameFromFirestore(); // CRITICAL AWAIT
    await archiveDestination(id);
    loadData();
    // AUDIT LOGGING: Log archive
    logActivity({ 
        actorName: ACTOR_NAME, 
        actionType: 'ARCHIVE', 
        targetEntity: 'Destination', 
        targetId: id,
        details: `Archived destination: ${name}`
    });
  };

  const handleUnarchive = async (id, name) => {
    const ACTOR_NAME = await getAdminUserNameFromFirestore(); // CRITICAL AWAIT
    await unarchiveDestination(id);
    loadData();
    // AUDIT LOGGING: Log unarchive
    logActivity({ 
        actorName: ACTOR_NAME, 
        actionType: 'UNARCHIVE', 
        targetEntity: 'Destination', 
        targetId: id,
        details: `Unarchived destination: ${name}`
    });
  };

  const handleToggleFeatured = async (id, name, value) => {
    const ACTOR_NAME = await getAdminUserNameFromFirestore(); // CRITICAL AWAIT
    await updateDestination(id, { isFeatured: value });
    loadData();
    // AUDIT LOGGING: Log toggle featured
    logActivity({ 
        actorName: ACTOR_NAME, 
        actionType: 'TOGGLE_FEATURED', 
        targetEntity: 'Destination', 
        targetId: id, 
        details: `Set featured status to ${value} for destination: ${name}` 
    });
  };

  // Helper function to pass name to archive/unarchive/toggle functions
  // IMPORTANT: actionFunction must be made async (as we have done above)
  const handleItemAction = (actionFunction, item) => {
      actionFunction(item.id, item.name);
  };
  
  const renderItem = ({ item }) => (
    <DestinationItem
      item={item}
      onEdit={handleEdit}
      onArchive={() => handleItemAction(handleArchive, item)}
      onUnarchive={() => handleItemAction(handleUnarchive, item)}
      onToggleFeatured={(value) => handleToggleFeatured(item.id, item.name, value)}
      isArchivedView={showArchived} 
    />
  );


  const visibleDestinations = destinations
  .filter((d) => (showArchived ? d.isArchived : !d.isArchived))
  .filter(
    (d) =>
      d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category?.join(', ').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* ... (rest of the component structure) ... */}
      <TextInput
        style={styles.searchInput}
        placeholder={showArchived ? "Search archived..." : "Search destinations..."}
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Pressable
        style={[styles.toggleButton, showArchived ? styles.toggleActive : null]}
        onPress={() => setShowArchived(!showArchived)}
      >
        <Text
          style={[styles.toggleButtonText, showArchived ? styles.toggleActiveText : null]}
        >
          {showArchived ? "← Back to Active" : "📂 Show Archived"}
        </Text>
      </Pressable>

      {!showArchived && (
        <Pressable 
          style={styles.addButton} 
          onPress={() => {
            setForm(INITIAL_FORM_STATE); 
            setEditId(null);
            setSaveError(null);
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Add Destination</Text>
        </Pressable>
      )}

      <FlatList
        data={visibleDestinations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />

      <DestinationModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setForm(INITIAL_FORM_STATE); 
          setEditId(null);
          setSaveError(null); 
        }}
        onSave={handleSave}
        form={form}
        setForm={setForm}
        editId={editId}
        isLoading={isLoading} 
        error={saveError}    
      />
    </View>
  );
};

export default ManageDestination;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding:20,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    color: "#333",
  },
  addButton: {
    backgroundColor: "#0f37f1",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignSelf: "flex-start",
    marginBottom: 10,
    elevation: 3,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  toggleButton: {
    backgroundColor: "#ddd",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 25,
    alignSelf: "flex-start",
    marginBottom: 10,
    elevation: 2,
  },
  toggleButtonText: {
  fontWeight: "600",
  color: "#333",
  fontSize: 14,
  },
  toggleActiveText: {
    color: "#fff", 
  },
});