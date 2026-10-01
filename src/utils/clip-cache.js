const BASE_PREFIX = "brb-screen:clips:";
// Bump when cached pools stop being valid, e.g. when the fetching changes what
// a complete pool contains. Entries under older versions get pruned.
const KEY_PREFIX = `${BASE_PREFIX}v2:`;

// A deleted or unpublished clip in an old list just fails to load and gets
// skipped, so a week of staleness is harmless and keeps BRB reloads instant
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Build the cache key for a channel set and filter combination
 * @param {string[]} channels - Channel names
 * @param {number} days - Number of days to filter clips
 * @param {number} minViews - Minimum view count filter
 * @returns {string} localStorage key
 */
export function clipCacheKey(channels, days, minViews) {
  const channelPart = channels
    .map((ch) => ch.toLowerCase())
    .sort()
    .join(",");
  return `${KEY_PREFIX}${channelPart}:${days}:${minViews}`;
}

/**
 * Read a cached clip list, dropping it if it has expired
 * @param {string} key - Key from clipCacheKey
 * @returns {Array} Cached clips, or an empty array when there is nothing usable
 */
export function loadCachedClips(key) {
  try {
    const entry = parseEntry(localStorage.getItem(key));
    if (!entry || isExpired(entry)) {
      localStorage.removeItem(key);
      return [];
    }
    return entry.clips;
  } catch {
    // Storage can be blocked (browser source settings, private windows)
    return [];
  }
}

/**
 * Cache a clip list, clearing out expired and outdated lists first
 * @param {string} key - Key from clipCacheKey
 * @param {Array} clips - Clips to cache
 */
export function saveCachedClips(key, clips) {
  try {
    pruneExpired();
    localStorage.setItem(
      key,
      JSON.stringify({ savedAt: Date.now(), clips }),
    );
  } catch (error) {
    console.warn("Could not cache clips:", error.message);
  }
}

function parseEntry(raw) {
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw);
    return typeof entry?.savedAt === "number" && Array.isArray(entry.clips)
      ? entry
      : null;
  } catch {
    return null;
  }
}

function isExpired(entry) {
  return Date.now() - entry.savedAt > MAX_AGE_MS;
}

function pruneExpired() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key?.startsWith(BASE_PREFIX)) continue;

    const entry = parseEntry(localStorage.getItem(key));
    if (!key.startsWith(KEY_PREFIX) || !entry || isExpired(entry)) {
      localStorage.removeItem(key);
    }
  }
}
