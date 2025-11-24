//src/utils/eventDateUtils.js

import { Timestamp } from "firebase/firestore";

/**
 * Helper to categorize events into Upcoming, Ongoing, and Past.
 * @param {Array} events - Raw event list from Firestore
 * @returns {Object} { upcoming: [], ongoing: [], past: [] }
 */
export const categorizeEvents = (events) => {
  const now = new Date();
  // Set "Today" to midnight to ensure fair comparison for single-day events
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const categories = {
    upcoming: [],
    ongoing: [],
    past: []
  };

  events.forEach((ev) => {
    if (ev.status === 'archived') return; // Skip archived

    const start = parseDate(ev.startDate);
    const end = ev.endDate ? parseDate(ev.endDate) : start; // If single day, end = start

    // Set end date to end of day (23:59:59) for accurate 'ongoing' check
    if (end) end.setHours(23, 59, 59, 999);

    if (!start) return; // Skip invalid dates

    if (start > now) {
      categories.upcoming.push(ev);
    } else if (start <= now && end >= todayStart) {
      categories.ongoing.push(ev);
    } else {
      categories.past.push(ev);
    }
  });

  // Sort Upcoming: Soonest first
  categories.upcoming.sort((a, b) => parseDate(a.startDate) - parseDate(b.startDate));
  
  // Sort Ongoing: Ending soonest first
  categories.ongoing.sort((a, b) => parseDate(a.endDate || a.startDate) - parseDate(b.endDate || b.startDate));

  // Sort Past: Most recent first
  categories.past.sort((a, b) => parseDate(b.endDate || b.startDate) - parseDate(a.endDate || a.startDate));

  return categories;
};

const parseDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

export const formatDate = (timestamp) => {
  const date = parseDate(timestamp);
  if (!date) return "";
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};