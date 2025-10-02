import React from "react";
import { Modal, View, TextInput, Pressable, Text, StyleSheet, TouchableWithoutFeedback } from "react-native";

const CATEGORY_OPTIONS = ["Nature", "Adventure", "Culture", "Relaxation", "Hotel", "Restaurant", "Resort", "Mall", "Heritage"];

const DestinationModal = ({ visible, onClose, onSave, form, setForm, editId, isLoading, error }) => {
  const title = editId ? "Edit Destination" : "Add Destination";

  // Existing coordinate and parse helpers
  const handleCoordinateChange = (key, text) => {
    if (text === "") {
      setForm({ ...form, coordinates: { ...form.coordinates, [key]: "" } });
      return;
    }
    const validNumberRegex = /^-?\d*\.?\d*$/;
    if (validNumberRegex.test(text)) {
      setForm({ ...form, coordinates: { ...form.coordinates, [key]: text } });
    }
  };
  const safeParseFloat = (text) => parseFloat(text) || 0;

  // New: Budget Input Validation
  const handleBudgetChange = (text) => {
    // Regex: Match only digits (0-9) and limit to 8 characters
    const numericRegex = /^\d{0,8}$/;
    if (numericRegex.test(text)) {
      setForm({ ...form, budget: parseInt(text) || 0 });
    }
  };

  // New: Category Checkbox Handler
  const handleCategoryToggle = (category) => {
    // FIX: Use 'category' (singular) to match state structure
    const currentCategories = form.category || []; 
    if (currentCategories.includes(category)) {
      setForm({
        ...form,
        // FIX: Use 'category' (singular)
        category: currentCategories.filter(c => c !== category),
      });
    } else {
      setForm({
        ...form,
        // FIX: Use 'category' (singular)
        category: [...currentCategories, category],
      });
    }
  };

  // New: Featured Radio Button Handler
  const handleFeaturedChange = (value) => {
    setForm({ ...form, isFeatured: value });
  };


  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
     
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>

              <Text style={styles.title}>{title}</Text>
              
              {/* --- Name Input --- */}
              <TextInput
                placeholder="Name"
                placeholderTextColor="#999"
                style={styles.input}
                value={form.name || ""}
                onChangeText={(text) => setForm({ ...form, name: text })}
              />

              {/* Display Error Message */}
              {error && <Text style={styles.errorText}>{error}</Text>} 
              
              <TextInput
                placeholder="Description"
                placeholderTextColor="#999"
                multiline={true} 
                numberOfLines={4} 
                style={styles.multilineInput}
                value={form.description || ""}
                onChangeText={(text) => setForm({ ...form, description: text })}
              />
              <TextInput
                placeholder="Image URL"
                placeholderTextColor="#999"
                style={styles.input}
                value={form.imageURL || ""}
                onChangeText={(text) => setForm({ ...form, imageURL: text })}
              />

              {/* Budget Input with 8-figure limit */}
              <TextInput
                placeholder="Budget (PHP, max 8 digits)"
                placeholderTextColor="#999"
                style={styles.input}
                keyboardType="numeric"
                value={form.budget?.toString() || ""}
                onChangeText={handleBudgetChange} // Use custom handler
              />
              <TextInput
                placeholder="Popularity (0–10)"
                placeholderTextColor="#999"
                style={styles.input}
                keyboardType="numeric"
                value={form.popularity?.toString() || ""}
                onChangeText={(text) => setForm({ ...form, popularity: safeParseFloat(text) })}
              />

               {/* Other Fields (Latitude/Longitude) */}
              <TextInput
                placeholder="Latitude"
                placeholderTextColor="#999"
                style={styles.input}
                keyboardType='default'
                value={form.coordinates?.latitude?.toString() || ""}
                onChangeText={(text) => handleCoordinateChange("latitude", text)}
              />
              <TextInput
                placeholder="Longitude"
                placeholderTextColor="#999"
                style={styles.input}
                keyboardType='default'
                value={form.coordinates?.longitude?.toString() || ""}
                onChangeText={(text) => handleCoordinateChange("longitude", text)}
              />
              
              {/* --- Category Checkboxes --- */}
              <Text style={styles.label}>Categories:</Text>
              <View style={styles.categoryContainer}>
                {CATEGORY_OPTIONS.map((category) => (
                  <Pressable
                    key={category}
                    style={styles.checkboxWrapper}
                    onPress={() => handleCategoryToggle(category)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        // FIX: Use 'category' (singular)
                        (form.category || []).includes(category) && styles.checkboxChecked,
                      ]}
                    >
                      {/* FIX: Use 'category' (singular) */}
                      {(form.category || []).includes(category) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.categoryText}>{category}</Text>
                  </Pressable>
                ))}
              </View>


              {/* --- isFeatured Radio Buttons --- */}
              <Text style={styles.label}>Featured?</Text>
              <View style={styles.radioContainer}>
                <Pressable style={styles.radioWrapper} onPress={() => handleFeaturedChange(true)}>
                  <View style={styles.radio}>
                    {form.isFeatured === true && <View style={styles.radioSelected} />}
                  </View>
                  <Text style={styles.radioText}>True</Text>
                </Pressable>
                <Pressable style={styles.radioWrapper} onPress={() => handleFeaturedChange(false)}>
                  <View style={styles.radio}>
                    {form.isFeatured === false && <View style={styles.radioSelected} />}
                  </View>
                  <Text style={styles.radioText}>False</Text>
                </Pressable>
              </View>

              {/* --- Actions --- */}
              <View style={styles.actions}>
                <Pressable 
                  style={[styles.button, styles.saveButton, isLoading && styles.disabledButton]} 
                  onPress={onSave}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? "Saving..." : "Save"}
                  </Text>
                </Pressable>
                <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
    </Modal>
  );
};

export default DestinationModal;

const styles = StyleSheet.create({
  // ... (Styles remain the same) ...
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 600,
    borderRadius: 12,
    padding: 20,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
    color: "#0f37f1",
  },
  input: {
    borderWidth: 1,
    borderColor: "#3b3a3aff",
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
    color: "#2e2c2cff",
  },
  multilineInput: {
    minHeight: 100, // Set a fixed or minimum height
    textAlignVertical: 'top', // Ensures text starts at the top (Android fix)
    borderWidth: 1,
    borderColor: "#3b3a3aff",
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
    color: "#2e2c2cff",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#0f37f1",
  },
  cancelButton: {
    backgroundColor: "#913b3bff",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
  
  // --- New Styles for Checkbox/Radio ---
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
    marginBottom: 5,
  },
  // Checkbox Styles
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 5,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#0f37f1',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#0f37f1',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
  },
  // Radio Button Styles
  radioContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  radioWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  radio: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0f37f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0f37f1',
  },
  radioText: {
    fontSize: 14,
    color: '#333',
  }
});