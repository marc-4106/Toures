import { useMemo } from "react";

// --- Membership Functions ---
const triangle = (x, a, b, c) =>
  Math.max(Math.min((x - a) / (b - a), (c - x) / (c - b)), 0);

const trapezoid = (x, a, b, c, d) =>
  Math.max(Math.min((x - a) / (b - a), 1, (d - x) / (d - c)), 0);

// --- Fuzzy Model ---
const evaluateDestination = (budget, popularity, interest, category) => {
  // Budget memberships
  const lowBudget = trapezoid(budget, 0, 0, 1500, 3000);
  const mediumBudget = triangle(budget, 2000, 5000, 8000);
  const highBudget = trapezoid(budget, 6000, 9000, 12000, 12000);

  // Popularity memberships
  const lowPop = trapezoid(popularity, 0, 0, 1, 4);
  const mediumPop = triangle(popularity, 2, 5, 8);
  const highPop = trapezoid(popularity, 6, 8, 10, 10);

  let suitability = 0;

  // Example rules
  if (highBudget && highPop) suitability = Math.max(highBudget, highPop) * 9;
  else if (mediumBudget && mediumPop) suitability = Math.max(mediumBudget, mediumPop) * 7;
  else if (lowBudget && lowPop) suitability = Math.max(lowBudget, lowPop) * 3;

  // Adjust by interest-category match
  if (interest === "Nature" && category === "Nature" && highPop) suitability += 1;
  if (interest === "Relaxation" && category === "Relaxation" && lowPop) suitability += 0.5;

  // Normalize (0–10)
  return Math.min(10, suitability);
};

// --- Custom Hook ---
export const useFuzzyRecommendations = (destinations, userPreferences) => {
  const { interest } = userPreferences;

  return useMemo(() => {
    if (!destinations?.length) return [];

    const scored = destinations.map(d => ({
      ...d,
      score: evaluateDestination(d.budget, d.popularity, interest, d.category),
    }));

    // Sort highest first
    return scored.sort((a, b) => b.score - a.score);
  }, [destinations, interest]);
};
