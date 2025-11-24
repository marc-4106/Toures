import React, { useEffect, useState } from "react";
import { View, FlatList, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { getAuth } from "firebase/auth";
import { deleteObject, ref } from "firebase/storage";
import { logActivity } from "../../../services/firestoreReportsAndLogs";
import {
    fetchDestinations,
    addDestination,
    updateDestination,
    archiveDestination,
    unarchiveDestination,
} from "../../../services/firestoreDestinations";
import DestinationItem from "../../../components/common/DestinationItem"; 
import DestinationModal from "../../../components/common/DestinationModal"; 
import { DEFAULT_KIND_OPTIONS as KIND_OPTIONS } from "../../../components/common/DestinationModal";

const INITIAL_FORM_STATE = {
    name: "",
    description: "",
    imageUrl: "",
    cityOrMunicipality: "",
    kind: "",
    tags: [],
    isFeatured: false,
    Coordinates: { latitude: "", longitude: "" },
    contact: { email: "", phoneRaw: "" },
    pricing: {
        lodging: { base: "" },
        mealPlan: { breakfastIncluded: false, lunchIncluded: false, dinnerIncluded: false, aLaCarteDefault: "300" },
        dayUse: { dayPassPrice: "" },
    },
};

// Extract "folder/file.jpg" from Firebase Storage download URL
const extractStoragePath = (url) => {
    if (!url) return "";
    try {
        const m = url.match(/\/o\/([^?]+)/);
        if (!m) return "";
        return decodeURIComponent(m[1]);
    } catch {
        return "";
    }
};

const toNumOrZero = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
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

    const auth = getAuth();
    const getActorName = () => auth.currentUser?.email || auth.currentUser?.displayName || "system";

    const loadData = async () => {
        const data = await fetchDestinations();
        setDestinations(data);
    };

    useEffect(() => { loadData(); }, []);

    // ------------------- Save / Create / Update -------------------
    const handleSave = async (incomingForm) => {
        setSaveError(null);
        setIsLoading(true);
        const src = incomingForm ?? form;
        const destinationName = (src.name || "").trim();
        if (!destinationName) {
            setSaveError("Destination name cannot be empty.");
            setIsLoading(false);
            return;
        }

        const payload = {
            name: destinationName,
            description: src.description?.trim() || "",
            imageUrl: src.imageUrl?.trim() || "",
            cityOrMunicipality: src.cityOrMunicipality?.trim() || "",
            kind: (src.kind || "").toLowerCase(),
            tags: Array.isArray(src.tags) ? src.tags.map(String) : [],
            isFeatured: !!src.isFeatured,
            activities: Array.isArray(src.activities) ? src.activities.filter(a => a?.trim()).map(a => a.trim()) : [],
            Coordinates: {
                latitude: toNumOrZero(src?.Coordinates?.latitude),
                longitude: toNumOrZero(src?.Coordinates?.longitude),
            },
            contact: {
                email: (src?.contact?.email || "").trim(),
                phoneRaw: (src?.contact?.phoneRaw || "").trim(),
            },
            pricing: {
                lodging: { base: toNumOrZero(src?.pricing?.lodging?.base) },
                mealPlan: {
                    breakfastIncluded: !!src?.pricing?.mealPlan?.breakfastIncluded,
                    lunchIncluded: !!src?.pricing?.mealPlan?.lunchIncluded,
                    dinnerIncluded: !!src?.pricing?.mealPlan?.dinnerIncluded,
                    aLaCarteDefault: toNumOrZero(src?.pricing?.mealPlan?.aLaCarteDefault ?? 300),
                },
                dayUse: { dayPassPrice: toNumOrZero(src?.pricing?.dayUse?.dayPassPrice) },
            },
            imagePath: src.imagePath || "",
            previousImagePath: src.previousImagePath || "",
        };

        try {
            const actorName = getActorName();
            if (editId) {
                await updateDestination(editId, payload);
                logActivity({
                    actorName,
                    actorId,
                    actionType: "UPDATE",
                    targetEntity: "Destination",
                    targetId: editId,
                    details: `Updated destination: ${destinationName}`,
                });
            } else {
                const newDoc = await addDestination({ ...payload, isArchived: false });
                logActivity({
                    actorName,
                    actorId,
                    actionType: "CREATE",
                    targetEntity: "Destination",
                    targetId: newDoc.id,
                    details: `Created destination: ${destinationName}`,
                });
            }

            // Cleanup old image if replaced
            try {
                const oldPath = payload.previousImagePath;
                const newPath = payload.imagePath;
                if (oldPath && newPath && oldPath !== newPath) {
                    await deleteObject(ref(storage, oldPath));
                }
            } catch (e) {
                console.warn("[cleanup] Old image deletion failed:", e);
            }

            setModalVisible(false);
            setForm(INITIAL_FORM_STATE);
            setEditId(null);
            loadData();
        } catch (error) {
            console.error("Firestore Save Error:", error);
            setSaveError("An error occurred while saving. Please check your data and network.");
        } finally {
            setIsLoading(false);
        }
    };

    // ------------------- Edit Handler -------------------
    const handleEdit = (item) => {
        const existingUrl = item.imageUrl || item.imageURL || "";
        const existingPath = extractStoragePath(existingUrl);

        setForm({
            name: item.name || "",
            description: item.description || "",
            imageUrl: existingUrl,
            imagePath: existingPath,
            cityOrMunicipality: item.cityOrMunicipality || "",
            kind: (item.kind || "").toLowerCase(),
            tags: Array.isArray(item.tags) ? item.tags : (item.categories || []),
            isFeatured: item.isFeatured === true,
            activities: Array.isArray(item.activities) ? item.activities : [],
            Coordinates: {
                latitude: item?.Coordinates?.latitude != null ? String(item.Coordinates.latitude) : item?.coordinates?.latitude != null ? String(item.coordinates.latitude) : "",
                longitude: item?.Coordinates?.longitude != null ? String(item.Coordinates.longitude) : item?.coordinates?.longitude != null ? String(item.coordinates.longitude) : "",
            },
            contact: {
                email: item?.contact?.email || "",
                phoneRaw: item?.contact?.phoneRaw || "",
            },
            pricing: {
                lodging: { base: item?.pricing?.lodging?.base != null ? String(item.pricing.lodging.base) : "" },
                mealPlan: {
                    breakfastIncluded: !!item?.pricing?.mealPlan?.breakfastIncluded,
                    lunchIncluded: !!item?.pricing?.mealPlan?.lunchIncluded,
                    dinnerIncluded: !!item?.pricing?.mealPlan?.dinnerIncluded,
                    aLaCarteDefault: item?.pricing?.mealPlan?.aLaCarteDefault != null ? String(item.pricing.mealPlan.aLaCarteDefault) : "300",
                },
                dayUse: { dayPassPrice: item?.pricing?.dayUse?.dayPassPrice != null ? String(item.pricing.dayUse.dayPassPrice) : "" },
            },
        });

        setEditId(item.id);
        setModalVisible(true);
    };

    // ------------------- Archive / Unarchive / Toggle Featured -------------------
    const handleArchive = async (id, name) => {
        const actorName = getActorName();
        await archiveDestination(id);
        logActivity({
            actorName,
            actorId,
            actionType: "ARCHIVE",
            targetEntity: "Destination",
            targetId: id,
            details: `Archived destination: ${name}`,
        });
        loadData();
    };

    const handleUnarchive = async (id, name) => {
        const actorName = getActorName();
        await unarchiveDestination(id);
        logActivity({
            actorName,
            actorId,
            actionType: "UNARCHIVE",
            targetEntity: "Destination",
            targetId: id,
            details: `Unarchived destination: ${name}`,
        });
        loadData();
    };

    const handleToggleFeatured = async (id, name, value) => {
        const actorName = getActorName();
        await updateDestination(id, { isFeatured: value });
        logActivity({
            actorName,
            actorId,
            actionType: "TOGGLE_FEATURED",
            targetEntity: "Destination",
            targetId: id,
            details: `Set featured status to ${value} for destination: ${name}`,
        });
        loadData();
    };

    const handleItemAction = (actionFunction, item) => actionFunction(item.id, item.name);

    const visibleDestinations = destinations
        .filter((d) => (showArchived ? d.isArchived : !d.isArchived))
        .filter((d) => {
            const q = (searchQuery || "").toLowerCase();
            const name = (d.name || "").toLowerCase();
            const tgs = ((d.tags || []).join(", ") || "").toLowerCase();
            const city = (d.cityOrMunicipality || "").toLowerCase();
            return name.includes(q) || tgs.includes(q) || city.includes(q);
        });

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

    return (
        <View style={styles.container}>
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
                <Text style={[styles.toggleButtonText, showArchived ? styles.toggleActiveText : null]}>
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

            <FlatList data={visibleDestinations} keyExtractor={(item) => item.id} renderItem={renderItem} />

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
                kindOptions={KIND_OPTIONS}
            />
        </View>
    );
};

export default ManageDestination;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8f9fa", padding: 20 },
    searchInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 16, color: "#333" },
    addButton: { backgroundColor: "#0f37f1", paddingVertical: 10, paddingHorizontal: 24, borderRadius: 25, alignSelf: "flex-start", marginBottom: 10, elevation: 3 },
    addButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
    toggleButton: { backgroundColor: "#ddd", paddingVertical: 8, paddingHorizontal: 18, borderRadius: 25, alignSelf: "flex-start", marginBottom: 10, elevation: 2 },
    toggleButtonText: { fontWeight: "600", color: "#333", fontSize: 14 },
    toggleActiveText: { color: "#fff" },
    toggleActive: { backgroundColor: "#0f37f1" },
});
