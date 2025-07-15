/**
 * Fisher-Yates shuffle implementation
 * @param {Array} array - Array to shuffle
 * @returns {Array} New shuffled array
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
 * Stratified shuffle - ensures variety across view count ranges
 * @param {Array} clips - Array of clip objects with viewCount property
 * @returns {Array} Shuffled array with better view count distribution
 */
export function stratifiedShuffle(clips) {
  if (clips.length === 0) return clips;

  // Sort clips by view count to create strata
  const sorted = [...clips].sort((a, b) => b.viewCount - a.viewCount);

  // Create view count buckets (quartiles)
  const bucketSize = Math.ceil(sorted.length / 4);
  const buckets = [];

  for (let i = 0; i < sorted.length; i += bucketSize) {
    buckets.push(sorted.slice(i, i + bucketSize));
  }

  // Shuffle each bucket individually
  const shuffledBuckets = buckets.map((bucket) => shuffle(bucket));

  // Interleave clips from different buckets to ensure variety
  const result = [];
  const maxBucketSize = Math.max(...shuffledBuckets.map((b) => b.length));

  for (let i = 0; i < maxBucketSize; i++) {
    for (const bucket of shuffledBuckets) {
      if (bucket[i]) {
        result.push(bucket[i]);
      }
    }
  }

  console.log(
    `Stratified shuffle: distributed ${clips.length} clips across ${buckets.length} view count ranges`
  );
  return result;
}

/**
 * Weighted shuffle - gives less popular clips a chance while still favoring popular ones
 * @param {Array} clips - Array of clip objects with viewCount property
 * @param {number} diversityFactor - How much to favor less popular clips (0-1, default 0.3)
 * @returns {Array} Shuffled array with weighted distribution
 */
export function weightedShuffle(clips, diversityFactor = 0.3) {
  if (clips.length === 0) return clips;

  // Calculate weights - higher diversityFactor means more equal weighting
  const maxViews = Math.max(...clips.map((c) => c.viewCount));
  const minViews = Math.min(...clips.map((c) => c.viewCount));
  const viewRange = maxViews - minViews || 1;

  const weightedClips = clips.map((clip) => {
    // Normalize view count to 0-1 range
    const normalizedViews = (clip.viewCount - minViews) / viewRange;

    // Apply diversity factor - higher factor reduces the impact of view count
    const weight = normalizedViews * (1 - diversityFactor) + diversityFactor;

    return { clip, weight };
  });

  // Weighted random selection
  const result = [];
  const remaining = [...weightedClips];

  while (remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < remaining.length; i++) {
      random -= remaining[i].weight;
      if (random <= 0) {
        result.push(remaining[i].clip);
        remaining.splice(i, 1);
        break;
      }
    }
  }

  console.log(
    `Weighted shuffle: applied diversity factor ${diversityFactor} to ${clips.length} clips`
  );
  return result;
}

/**
 * Smart shuffle that combines multiple strategies for optimal variety
 * @param {Array} clips - Array of clip objects with viewCount property
 * @param {string} strategy - Shuffling strategy: 'random', 'stratified', 'weighted', 'smart'
 * @returns {Array} Shuffled array optimized for variety
 */
export function smartShuffle(clips, strategy = "smart") {
  if (clips.length === 0) return clips;

  console.log(`Applying ${strategy} shuffle to ${clips.length} clips`);

  switch (strategy) {
    case "random":
      return shuffle(clips);

    case "stratified":
      return stratifiedShuffle(clips);

    case "weighted":
      return weightedShuffle(clips, 0.4); // Moderate diversity

    case "smart":
    default:
      // Smart strategy: Use stratified for large pools, weighted for smaller ones
      if (clips.length > 200) {
        return stratifiedShuffle(clips);
      } else if (clips.length > 50) {
        return weightedShuffle(clips, 0.3);
      } else {
        return shuffle(clips);
      }
  }
}

/**
 * Filter clips by date range
 * @param {Array} clips - Array of clip objects
 * @param {number} days - Number of days to look back
 * @returns {Array} Filtered clips
 */
export function filterByDateRange(clips, days) {
  if (!days || days <= 0) return clips;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return clips.filter((clip) => {
    const clipDate = new Date(clip.createdAt);
    return clipDate >= cutoffDate;
  });
}
