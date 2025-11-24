// src/components/common/DestinationModal.js
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Image,
} from 'react-native';

import { pickSingleImageNative } from '../../utils/imagePicker.native';
import { resizeImageNative } from '../../utils/resizeNative';
import { Platform } from 'react-native';

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '../../services/firebaseConfig';

const toKey = (s) => String(s).toLowerCase().trim();

// allow only digits and a single dot (no other chars)
const sanitizeMoney = (s) =>
  String(s || '')
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1');

// coords allow minus and one dot
const sanitizeCoord = (s) =>
  String(s || '')
    .replace(/[^-\d.]/g, '')
    .replace(/(.*-.*)-/g, '$1') // keep only first minus
    .replace(/(\..*)\./g, '$1'); // keep only first dot

// ❗ UPDATED TAG_OPTIONS to use simple, non-redundant tags for Firebase data
// Categorized and fuzzy-compatible tag options
// --- FRIENDLY TAG CATEGORIES ---
// Each group title and tags are aligned with interestAliases.js for fuzzy accuracy
export const TAG_GROUPS = [
  {
    title: "🏛️ Culture & Heritage",
    tags: [
      "culture",
      "heritage",
      "history",
      "museum",
      "art_gallery",
      "local_crafts",
      "architecture",
      "religious_site",
      "photography",
    ],
  },
  {
    title: "🌿 Nature & Outdoors",
    tags: [
      "nature",
      "mountain",
      "hiking",
      "waterfall",
      "beach",
      "island",
      "forest",
      "lake",
      "park",
      "eco_resort",
      "scenic_view",
    ],
  },
  {
    title: "🎢 Adventure & Activities",
    tags: [
      "adventure",
      "activity",
      "boat",
      "snorkeling",
      "diving",
      "surfing",
      "zipline",
      "trekking",
      "kayaking",
      "camping",
      "thrills",
      "group_event",
    ],
  },
  {
    title: "🍽️ Food & Cuisine",
    tags: [
      "foodie",
      "local_cuisine",
      "seafood",
      "buffet",
      "street_food",
      "fine_dining",
      "cafe",
      "pasalubong",
      "desserts",
    ],
  },
  {
    title: "🛍️ Shopping & Urban Life",
    tags: [
      "shopping",
      "mall",
      "market",
      "souvenir",
      "city",
      "urban",
      "nightlife",
      "entertainment",
    ],
  },
  {
    title: "🧘 Relaxation & Wellness",
    tags: [
      "relaxation",
      "spa",
      "resort",
      "wellness",
      "quiet_place",
      "retreat",
      "romantic",
      "beach_resort",
    ],
  },
  {
    title: "👨‍👩‍👧 Family & Group Travel",
    tags: [
      "family_friendly",
      "kids_activity",
      "amusement",
      "pool",
      "picnic",
    ],
  },
  {
    title: "🏨 Lodging & Accommodation",
    tags: [
      "lodging",
      "hotel",
      "luxury_hotel",
      "budget_inn",
      "villa",
      "homestay",
      "transient_house",
      "bed_and_breakfast",
    ],
  },
  {
    title: "⭐ Other Attributes",
    tags: ["budget", "premium", "hidden_gem", "must_visit"],
  },
];


export const DEFAULT_KIND_OPTIONS = [
  'Hotel',
  'Restaurant',
  'Resort',
  'Mall',
  'Heritage',
  'Pasalubong Center',
  'Activity',
];

export default function DestinationModal({
  visible,
  onClose,
  onSave,
  form,
  setForm,
  isLoading,
  error,
  editId,
  // small fix: make sure this isn't a nested array
  kindOptions = DEFAULT_KIND_OPTIONS,
}) {
  const [localKind, setLocalKind] = useState(form.kind ? form.kind : '');

  useEffect(() => {
    setLocalKind(form.kind ? toKey(form.kind) : '');
  }, [form.kind]);

  const setKindLower = (label) => {
    const val = toKey(label);
    setLocalKind(val);
    setForm((f) => ({ ...f, kind: val }));
  };

  const toggleTag = (key) => {
    const k = toKey(key);
    setForm((f) => {
      const current = new Set(f.tags || []);
      if (current.has(k)) current.delete(k);
      else current.add(k);
      return { ...f, tags: Array.from(current) };
    });
  };

  const isTagChecked = (key) => (form.tags || []).includes(toKey(key));

  const field = (label, children, style = {}) => (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );

  const setDeep = (path, value) => {
    setForm((prev) => {
      const next = { ...prev };
      let cur = next;
      for (let i = 0; i < path.length - 1; i++) {
        const k = path[i];
        cur[k] = cur[k] ?? {};
        cur = cur[k];
      }
      cur[path[path.length - 1]] = value;
      return next;
    });
  };

  const showLodging = true;
  const showMealPlan = true;
  const showDayUse = true;

  // Track uploaded image so we can clean it up on cancel
  const [uploadedPath, setUploadedPath] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [draftImage, setDraftImage] = useState(null); // { file, name, type } on web OR { uri, fileName, mime } on native
  const [draftPreview, setDraftPreview] = useState(null); // string for <Image source={{uri: ...}}>

  async function pickWebImage() {
    return new Promise((resolve, reject) => {
      console.log('📸 pickWebImage started');
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        console.log('📁 pickWebImage onchange fired:', file);
        if (!file) return reject(new Error('No file selected'));
        resolve(file);
      };
      input.onerror = (e) => {
        console.error('❌ pickWebImage error:', e);
        reject(e);
      };
      input.click();
      console.log('📤 input.click() called');
    });
  }

  // pick *only* (no upload here)
  const pickImage = async () => {
    try {
      let previewUri = null;

      if (Platform.OS === 'web') {
        const file = await pickWebImage();
        setDraftImage({
          file,
          name: file.name,
          type: file.type || 'image/jpeg',
        });
        previewUri = URL.createObjectURL(file);
        setDraftPreview(previewUri);
        console.log('🌐 Picked (web):', file.name, file.size, file.type);
      } else {
        const picked = await pickSingleImageNative({
          quality: 0.9,
          maxWidth: 2048,
          maxHeight: 2048,
        });
        // Optional native resize for preview/upload efficiency
        const resizedUri = await resizeImageNative(picked.uri, {
          width: 1280,
          quality: 0.7,
          format: 'JPEG',
        });
        setDraftImage({
          uri: resizedUri, // use resized file for upload
          fileName: picked.fileName || 'upload.jpg',
          mime: picked.mime || 'image/jpeg',
        });
        previewUri = resizedUri;
        setDraftPreview(previewUri);
        console.log(
          '📱 Picked (native):',
          picked.fileName,
          picked.mime,
          'preview:',
          resizedUri
        );
      }

      Alert.alert(
        'Image selected',
        'This image will upload when you press Save.'
      );
    } catch (err) {
      console.warn('Pick image cancelled/failed:', err?.message || err);
    }
  };

  const handleSave = async () => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Start from the current form snapshot
      let nextForm = { ...form };
      let objectPath = uploadedPath || '';
      let imageUrl = nextForm.imageUrl || '';

      // Only upload if a new image was picked
      if (draftImage) {
        let body, mime, fileName;

        if (Platform.OS === 'web' && draftImage.file) {
          body = draftImage.file;
          mime = draftImage.type || 'image/jpeg';
          fileName = draftImage.name || `upload_${Date.now()}.jpg`;
        } else {
          const { uri, fileName: nName, mime: nMime } = draftImage;
          body = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => resolve(xhr.response);
            xhr.onerror = () =>
              reject(new TypeError('Failed to convert local URI to Blob'));
            xhr.responseType = 'blob';
            xhr.open('GET', uri, true);
            xhr.send(null);
          });
          if (!body || !body.size)
            throw new Error('Image blob is empty or invalid');
          mime = nMime || 'image/jpeg';
          fileName = nName || 'upload.jpg';
        }

        const safeName = (fileName || 'upload.jpg').split('?')[0];
        objectPath = `destinations/${Date.now()}_${safeName}`;
        const storageRef = ref(storage, objectPath);
        const uploadTask = uploadBytesResumable(storageRef, body, {
          contentType: mime,
        });

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snap) => {
              const total = snap.totalBytes || (body && body.size) || 0;
              const pct = total ? (snap.bytesTransferred / total) * 100 : 0;
              setUploadProgress(Math.round(pct));
            },
            reject,
            resolve
          );
        });

        imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
        setUploadedPath(objectPath);

        // Build the definitive form for saving
        nextForm = {
          ...nextForm,
          imageUrl,
          imagePath: objectPath, // ← add this
          previousImagePath: form.imagePath || '', // ← add this
        };
      }

      // 🔎 LOG what we're about to save
      console.log('[handleSave] final imageUrl:', nextForm.imageUrl);
      console.log('[handleSave] calling parent onSave with payload…');

      // If parent accepts a payload, use it; otherwise update form first and call no-arg onSave
      if (onSave?.length > 0) {
        await onSave(nextForm);
      } else {
        // Keep local state in sync for UIs that read from form after closing modal
        setForm(nextForm);
        await onSave?.();
      }

      // Clear draft after successful save
      setDraftImage(null);
      setDraftPreview(null);
      Alert.alert('Saved', 'Destination saved successfully.');
    } catch (err) {
      console.error('Save failed:', err);
      Alert.alert('Save failed', err?.message || 'Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  //Cancel
  const resetImageState = () => {
    setDraftImage(null);
    setDraftPreview(null);
    setUploadedPath(null);
    setForm((f) => ({ ...f, imageUrl: '', imagePath: '' })); // imagePath optional if you use it
  };

  const handleCancelPress = () => {
    const hasUpload = !!uploadedPath;

    if (Platform.OS === 'web') {
      // Web: use confirm since Alert buttons aren't supported
      const ok = window.confirm(
        hasUpload
          ? 'Discard changes? This will delete the uploaded image.'
          : 'Discard changes?'
      );
      if (!ok) return;

      (async () => {
        try {
          if (hasUpload) {
            await deleteObject(ref(storage, uploadedPath));
          }
        } catch (e) {
          console.warn('Failed to delete uploaded image:', e);
        } finally {
          resetImageState();
          onClose?.();
        }
      })();

      return;
    }

    // Native (iOS/Android): proper Alert with buttons
    if (hasUpload) {
      Alert.alert('Discard changes?', 'This will delete the uploaded image.', [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteObject(ref(storage, uploadedPath));
            } catch (e) {
              console.warn('Failed to delete uploaded image:', e);
            } finally {
              resetImageState();
              onClose?.();
            }
          },
        },
      ]);
    } else {
      // No upload to delete — just clear draft and close
      resetImageState();
      onClose?.();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>×</Text>
          </Pressable>

          <Text style={styles.title}>
            {editId ? 'Edit Destination' : 'Add Destination'}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <ScrollView
            contentContainerStyle={{ paddingBottom: 115 }}
            showsVerticalScrollIndicator={false}>
            {field(
              'Name',
              <TextInput
                placeholder="Place name"
                placeholderTextColor="#999"
                style={styles.input}
                value={form.name}
                onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
              />,
              { marginBottom: 6 }
            )}

            {field(
              'Description',
              <TextInput
                placeholder="Short description"
                placeholderTextColor="#999"
                style={[styles.input, { minHeight: 80 }]}
                value={form.description}
                onChangeText={(text) =>
                  setForm((f) => ({ ...f, description: text }))
                }
                multiline
              />,
              { marginBottom: 6 }
            )}

            {field(
              'Image',
              <View style={{ gap: 8 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                  <Pressable
                    onPress={pickImage}
                    disabled={uploading}
                    style={{
                      backgroundColor: '#0f37f1',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      opacity: uploading ? 0.6 : 1,
                    }}>
                    <Text style={{ color: 'white', fontWeight: '700' }}>
                      {uploading
                        ? `Uploading ${uploadProgress.toFixed(0)}%…`
                        : 'Pick Image'}
                    </Text>
                  </Pressable>

                  {draftPreview ? (
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, color: '#0f172a' }}>
                      📝 Draft selected (will upload on Save)
                    </Text>
                  ) : form.imageUrl ? (
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, color: '#0f172a' }}>
                      ✅ Uploaded
                    </Text>
                  ) : (
                    <Text style={{ color: '#999' }}>No image yet</Text>
                  )}
                </View>

                {/* Small thumbnail preview */}
                {draftPreview || form.imageUrl ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                    <Image
                      source={{ uri: draftPreview || form.imageUrl }}
                      style={{
                        width: 80,
                        height: 60,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#e5e7eb',
                      }}
                      resizeMode="cover"
                    />
                    <Text
                      style={{ flex: 1, color: '#334155' }}
                      numberOfLines={2}>
                      {draftPreview
                        ? 'Draft preview (not uploaded yet)'
                        : form.imageUrl}
                    </Text>
                  </View>
                ) : null}
              </View>,
              { marginBottom: 6 }
            )}

            {field(
              'City / Municipality',
              <TextInput
                placeholder="e.g., Dumaguete City or Valencia"
                placeholderTextColor="#999"
                style={styles.input}
                value={form.cityOrMunicipality}
                onChangeText={(text) =>
                  setForm((f) => ({ ...f, cityOrMunicipality: text }))
                }
              />,
              { marginBottom: 6 }
            )}

            {/* Coordinates */}
            {field(
              'Coordinates (latitude, longitude)',
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  placeholder="10.6596"
                  placeholderTextColor="#999"
                  style={[styles.input, { flex: 1 }]}
                  keyboardType="decimal-pad"
                  value={String(form?.Coordinates?.latitude ?? '')}
                  onChangeText={(text) =>
                    setForm((f) => ({
                      ...f,
                      Coordinates: {
                        ...f.Coordinates,
                        latitude: sanitizeCoord(text),
                      },
                    }))
                  }
                />
                <TextInput
                  placeholder="122.9397"
                  placeholderTextColor="#999"
                  style={[styles.input, { flex: 1 }]}
                  keyboardType="decimal-pad"
                  value={String(form?.Coordinates?.longitude ?? '')}
                  onChangeText={(text) =>
                    setForm((f) => ({
                      ...f,
                      Coordinates: {
                        ...f.Coordinates,
                        longitude: sanitizeCoord(text),
                      },
                    }))
                  }
                />
              </View>,
              { marginBottom: 6 }
            )}

            {/* Kind */}
            <Text style={[styles.label, { marginTop: 4 }]}>
              Kind (pick one)
            </Text>
            <View style={[styles.grid, { marginBottom: 6 }]}>
              {kindOptions.map((label) => {
                const val = toKey(label);
                const selected = (form.kind || localKind) === val;
                return (
                  <Pressable
                    key={label}
                    onPress={() => setKindLower(label)}
                    style={[
                      styles.checkRow,
                      {
                        borderColor: selected ? '#0f37f1' : '#e5e7eb',
                        backgroundColor: selected ? '#dbeafe' : 'transparent',
                      },
                    ]}>
                    <View
                      style={[
                        styles.checkbox,
                        selected && styles.checkboxCheckedBlue,
                      ]}
                    />
                    <Text
                      style={[
                        styles.checkLabel,
                        { color: selected ? '#0f37f1' : '#111' },
                      ]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Tags */}
            <Text style={styles.label}>Tags (select all that apply)</Text>
            {TAG_GROUPS.map((group) => (
              <View key={group.title} style={{ marginBottom: 10 }}>
                <Text style={styles.groupLabel}>{group.title}</Text>
                <View style={styles.grid}>
                  {group.tags.map((label) => {
                    const checked = isTagChecked(label);
                    return (
                      <Pressable
                        key={label}
                        onPress={() => toggleTag(label)}
                        style={[
                          styles.checkRow,
                          {
                            borderColor: checked ? '#10b981' : '#e5e7eb',
                            backgroundColor: checked
                              ? '#d1fae5'
                              : 'transparent',
                          },
                        ]}>
                        <View
                          style={[
                            styles.checkbox,
                            checked && styles.checkboxCheckedGreen,
                          ]}
                        />
                        <Text
                          style={[
                            styles.checkLabel,
                            { color: checked ? '#065f46' : '#111' },
                          ]}>
                          {label.replace(/_/g, ' ')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Contact */}
            {field(
              'Contact Email',
              <TextInput
                placeholder="name@example.com"
                placeholderTextColor="#999"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                value={form?.contact?.email || ''}
                onChangeText={(text) =>
                  setForm((f) => ({
                    ...f,
                    contact: { ...f.contact, email: text },
                  }))
                }
              />,
              { marginBottom: 6 }
            )}

            {field(
              'Contact Phone',
              <TextInput
                placeholder="(034) 123-4567 or 0917 123 4567"
                placeholderTextColor="#999"
                style={styles.input}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                value={form?.contact?.phoneRaw || ''}
                onChangeText={(text) =>
                  setForm((f) => ({
                    ...f,
                    contact: { ...f.contact, phoneRaw: text },
                  }))
                }
              />,
              { marginBottom: 6 }
            )}

            {/* Pricing */}
            {(showLodging || showMealPlan || showDayUse) && (
              <Text style={[styles.label, { marginTop: 4, marginBottom: 6 }]}>
                Pricing
              </Text>
            )}

            {/* Lodging */}
            {showLodging && (
              <View style={{ marginBottom: 6 }}>
                <Text style={styles.subLabel}>Lodging (per night)</Text>
                <TextInput
                  placeholder="e.g., 2800"
                  placeholderTextColor="#999"
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={sanitizeMoney(form?.pricing?.lodging?.base ?? '')}
                  onChangeText={(text) =>
                    setDeep(['pricing', 'lodging', 'base'], sanitizeMoney(text))
                  }
                />
              </View>
            )}

            {/* Meal Plan */}
            {showMealPlan && (
              <>
                <Text style={[styles.subLabel, { marginTop: 4 }]}>
                  Meal Plan
                </Text>
                <View style={styles.switchRow}>
                  <Text style={styles.switchText}>Breakfast Included</Text>
                  <Switch
                    value={!!form?.pricing?.mealPlan?.breakfastIncluded}
                    onValueChange={(v) =>
                      setDeep(['pricing', 'mealPlan', 'breakfastIncluded'], v)
                    }
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchText}>Lunch Included</Text>
                  <Switch
                    value={!!form?.pricing?.mealPlan?.lunchIncluded}
                    onValueChange={(v) =>
                      setDeep(['pricing', 'mealPlan', 'lunchIncluded'], v)
                    }
                  />
                </View>
                <View style={[styles.switchRow, { marginBottom: 6 }]}>
                  <Text style={styles.switchText}>Dinner Included</Text>
                  <Switch
                    value={!!form?.pricing?.mealPlan?.dinnerIncluded}
                    onValueChange={(v) =>
                      setDeep(['pricing', 'mealPlan', 'dinnerIncluded'], v)
                    }
                  />
                </View>

                {field(
                  'À-la-carte Default (₱)',
                  <TextInput
                    placeholder="e.g., 300"
                    placeholderTextColor="#999"
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={sanitizeMoney(
                      form?.pricing?.mealPlan?.aLaCarteDefault ?? '300'
                    )}
                    onChangeText={(text) =>
                      setDeep(
                        ['pricing', 'mealPlan', 'aLaCarteDefault'],
                        sanitizeMoney(text)
                      )
                    }
                  />,
                  { marginBottom: 6 }
                )}
              </>
            )}

            {/* Day Use */}
            {showDayUse && (
              <View style={{ marginBottom: 6 }}>
                <Text style={styles.subLabel}>Day Use (Resort)</Text>
                <TextInput
                  placeholder="Day pass price, e.g., 300"
                  placeholderTextColor="#999"
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={sanitizeMoney(
                    form?.pricing?.dayUse?.dayPassPrice ?? ''
                  )}
                  onChangeText={(text) =>
                    setDeep(
                      ['pricing', 'dayUse', 'dayPassPrice'],
                      sanitizeMoney(text)
                    )
                  }
                />
              </View>
            )}

            {/* Activities List */}
            <Text style={[styles.label, { marginTop: 6 }]}>
              List of Activities
            </Text>

            {(form.activities || []).map((activity, idx) => (
              <View key={idx} style={styles.activityRow}>
                <TextInput
                  placeholder={`Activity ${idx + 1}`}
                  placeholderTextColor="#999"
                  style={[styles.input, { flex: 1, paddingRight: 36 }]} // padding for icon space
                  value={activity}
                  onChangeText={(text) =>
                    setForm((f) => {
                      const next = [...(f.activities || [])];
                      next[idx] = text;
                      return { ...f, activities: next };
                    })
                  }
                />
                <Pressable
                  onPress={() =>
                    setForm((f) => ({
                      ...f,
                      activities: (f.activities || []).filter(
                        (_, i) => i !== idx
                      ),
                    }))
                  }
                  style={styles.removeIconBtn}>
                  <Text style={styles.removeIconText}>×</Text>
                </Pressable>
              </View>
            ))}

            <Pressable
              onPress={() =>
                setForm((f) => ({
                  ...f,
                  activities: [...(f.activities || []), ''],
                }))
              }
              style={styles.addActivityBtn}>
              <Text style={styles.addActivityText}>+ Add Activity</Text>
            </Pressable>

            {/* Featured flag */}
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                marginTop: 4,
                marginBottom: 8,
              }}>
              <Pressable
                onPress={() =>
                  setForm((f) => ({ ...f, isFeatured: !f.isFeatured }))
                }
                style={[
                  styles.pill,
                  { borderColor: form.isFeatured ? '#0f37f1' : '#ccc' },
                ]}>
                <Text style={{ color: form.isFeatured ? '#0f37f1' : '#333' }}>
                  {form.isFeatured ? '★ Featured' : '☆ Not featured'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {/* Cancel Button with cleanup */}
            <Pressable
              onPress={handleCancelPress}
              style={[styles.btn, styles.btnCancel]}>
              <Text style={styles.btnText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              style={[styles.btn, styles.btnSave]}
              disabled={isLoading || uploading}>
              {isLoading || uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>
                  {editId ? 'Save Changes' : 'Create'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 5,
    borderRadius: 16,
    maxHeight: '92%',
    width: '80%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#961515ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 22,
    lineHeight: 30,
    color: '#ffffffff',
    fontWeight: '800',
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    paddingRight: 36,
  },
  label: { fontWeight: '600', marginBottom: 4 },
  subLabel: {
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 4,
    color: '#0f172a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    color: '#111',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: '#9ca3af',
    borderRadius: 3,
    backgroundColor: 'transparent',
    marginRight: 6,
  },
  checkboxCheckedBlue: { borderColor: '#0f37f1', backgroundColor: '#0f37f1' },
  checkboxCheckedGreen: { borderColor: '#10b981', backgroundColor: '#10b981' },
  checkLabel: { fontSize: 14 },

  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchText: { fontWeight: '600', color: '#0f172a' },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: { backgroundColor: '#ef4444' },
  btnSave: { backgroundColor: '#0f37f1' },
  btnText: { color: 'white', fontWeight: '700' },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
  },

  removeIconBtn: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -10 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
  },

  removeIconText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },

  addActivityBtn: {
    backgroundColor: '#0f37f1',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },

  addActivityText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  groupLabel: {
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    marginTop: 10,
    fontSize: 15,
  },
});
