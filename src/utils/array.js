/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
export function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Filter array by date range
 * @param {Array} items - Array of items with createdAt property
 * @param {number} days - Number of days to filter by
 * @returns {Array} Filtered array
 */
export function filterByDateRange(items, days) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return items.filter((item) => {
    const itemDate = new Date(item.createdAt);
    return itemDate >= cutoffDate;
  });
}
