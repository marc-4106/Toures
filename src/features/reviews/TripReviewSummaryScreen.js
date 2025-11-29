// src/features/reviews/TripReviewSummaryScreen.js

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../services/firebaseConfig"; // adjust import path if needed

const INITIAL_VISIBLE_DESTINATIONS = 5;

export default function TripReviewSummaryScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  /**
   * Expected route params:
   *  - itineraryId: string
   *  - destinations: Array<{
   *        id: string;
   *        name?: string;
   *        title?: string;
   *        kind?: string;           // hotel, attraction, etc.
   *     }>
   */
  const { itineraryId, destinations = [] } = route.params || {};

  const user = auth.currentUser;
  const userId = user?.uid;

  const [showAll, setShowAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Local state structure:
   * reviewsState = {
   *   [destinationId]: {
   *      visited: boolean;
   *      rating: number;        // 0–5
   *      showComment: boolean;
   *      comment: string;
   *   }
   * }
   */
  const [reviewsState, setReviewsState] = useState(() => {
    const base = {};
    (destinations || []).forEach((d) => {
      if (!d?.id) return;
      base[d.id] = {
        visited: false, // user must explicitly confirm
        rating: 0,
        showComment: false,
        comment: "",
      };
    });
    return base;
  });

  const visibleDestinations = useMemo(() => {
    if (showAll) return destinations;
    return destinations.slice(0, INITIAL_VISIBLE_DESTINATIONS);
  }, [destinations, showAll]);

  const toggleVisited = (destId) => {
    setReviewsState((prev) => ({
      ...prev,
      [destId]: {
        ...prev[destId],
        visited: !prev[destId]?.visited,
      },
    }));
  };

  const setRating = (destId, rating) => {
    setReviewsState((prev) => ({
      ...prev,
      [destId]: {
        ...prev[destId],
        rating,
      },
    }));
  };

  const toggleComment = (destId) => {
    setReviewsState((prev) => ({
      ...prev,
      [destId]: {
        ...prev[destId],
        showComment: !prev[destId]?.showComment,
      },
    }));
  };

  const setComment = (destId, text) => {
    setReviewsState((prev) => ({
      ...prev,
      [destId]: {
        ...prev[destId],
        comment: text,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!userId) {
      Alert.alert("Login required", "You must be logged in to submit reviews.");
      return;
    }

    // Collect only valid reviews:
    // visited === true AND rating >= 1
    const payloads = destinations
      .map((d) => {
        const state = reviewsState[d.id];
        if (!state) return null;

        if (!state.visited || state.rating < 1) return null;

        return {
          userId,
          itineraryId,
          destinationId: d.id,
          destinationName: d.name || d.title || "",
          rating: state.rating,
          comment: state.comment.trim() || null,
          visited: state.visited,
          createdAt: serverTimestamp(),
        };
      })
      .filter(Boolean);

    if (!payloads.length) {
      Alert.alert(
        "No reviews selected",
        "Please mark at least one destination as visited and give it a rating."
      );
      return;
    }

    try {
      setSubmitting(true);

      const reviewsRef = collection(db, "reviews");

      // Simple sequential writes (fine for a small number of reviews).
      for (const review of payloads) {
        await addDoc(reviewsRef, review);
      }

      // In production, you might want:
      // - a Cloud Function that updates aggregated rating per destination
      // - or a transaction that updates destination.ratingAvg + ratingCount

      Alert.alert("Thank you!", "Your reviews have been submitted.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.error("Error submitting trip reviews:", err);
      Alert.alert("Error", "Failed to submit your reviews. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (destId, rating) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => setRating(destId, star)}
          style={{ paddingHorizontal: 2 }}
        >
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={24}
            color="#fbbf24"
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDestinationCard = (dest) => {
    const id = dest.id;
    if (!id) return null;

    const state = reviewsState[id] || {
      visited: false,
      rating: 0,
      showComment: false,
      comment: "",
    };

    const displayName = dest.name || dest.title || "Unnamed destination";
    const subtitle = dest.kind ? `(${dest.kind})` : "";

    return (
      <View key={id} style={styles.card}>
        <Text style={styles.destName}>{displayName}</Text>
        {!!subtitle && <Text style={styles.destSubtitle}>{subtitle}</Text>}

        {/* Stars */}
        {renderStars(id, state.rating)}

        {/* Visited checkbox */}
        <TouchableOpacity
          style={styles.visitedRow}
          onPress={() => toggleVisited(id)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={state.visited ? "checkbox-outline" : "square-outline"}
            size={20}
            color={state.visited ? "#0f37f1" : "#64748b"}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.visitedLabel}>Did you visit this place?</Text>
        </TouchableOpacity>

        {/* Write / show comment */}
        <TouchableOpacity
          onPress={() => toggleComment(id)}
          style={{ marginTop: 6 }}
        >
          <Text style={styles.commentLink}>
            {state.showComment ? "Hide comment" : "Write a comment"}
          </Text>
        </TouchableOpacity>

        {state.showComment && (
          <TextInput
            style={styles.commentInput}
            placeholder="Share a short comment (optional)"
            multiline
            value={state.comment}
            onChangeText={(text) => setComment(id, text)}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Review Your Trip</Text>
        <Text style={styles.subtitle}>
          Tell us how your experience was. Only destinations you confirm as
          visited and rate will be saved.
        </Text>

        {visibleDestinations.map(renderDestinationCard)}

        {destinations.length > INITIAL_VISIBLE_DESTINATIONS && (
          <TouchableOpacity
            onPress={() => setShowAll((prev) => !prev)}
            style={{ marginTop: 8, alignSelf: "center" }}
          >
            <Text style={styles.showMore}>
              {showAll
                ? "Show fewer places"
                : `Show ${destinations.length - INITIAL_VISIBLE_DESTINATIONS} more visited places`}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Footer submit bar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerBtn, styles.footerCancel]}
          onPress={() => navigation.goBack()}
          disabled={submitting}
        >
          <Text style={[styles.footerText, { color: "#0f172a" }]}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerBtn, styles.footerPrimary]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={18} color="#fff" />
              <Text style={styles.footerText}>Submit Reviews</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  destName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  destSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
    marginBottom: 6,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
  },
  visitedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  visitedLabel: {
    fontSize: 14,
    color: "#0f172a",
  },
  commentLink: {
    fontSize: 13,
    color: "#2563eb",
    fontWeight: "600",
  },
  commentInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 10,
    minHeight: 80,
    textAlignVertical: "top",
    backgroundColor: "#f8fafc",
    fontSize: 13,
    color: "#0f172a",
  },
  showMore: {
    fontSize: 13,
    color: "#2563eb",
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    gap: 10,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  footerCancel: {
    backgroundColor: "#e2e8f0",
  },
  footerPrimary: {
    backgroundColor: "#0f37f1",
  },
  footerText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
});
